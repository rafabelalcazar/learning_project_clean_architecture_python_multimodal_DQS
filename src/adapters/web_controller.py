import json
import os
import queue
import threading
from flask import Blueprint, Response, request, render_template, send_file, jsonify
from src.domain.interfaces import FileScanner, MetricsExporter, ModalityClassifier
from src.use_cases.scan_dataset import ScanDatasetUseCase
from src.use_cases.factory import AbstractProcessorFactory
from src.adapters.observers import QueueProgressObserver

web_bp = Blueprint(
    'web', 
    __name__, 
    template_folder='../web/templates', 
    static_folder='../web/static'
)

# Injected Dependencies
scanner_impl = None
factory_impl = None
exporter_impl = None
classifier_impl = None
OUTPUT_CSV_PATH = "scan_results.csv"

def init_app_dependencies(scanner: FileScanner, factory: AbstractProcessorFactory, exporter: MetricsExporter, classifier: ModalityClassifier) -> None:
    global scanner_impl, factory_impl, exporter_impl, classifier_impl
    scanner_impl = scanner
    factory_impl = factory
    exporter_impl = exporter
    classifier_impl = classifier

@web_bp.route('/')
def index():
    return render_template('index.html')

@web_bp.route('/api/browse-directory')
def browse_directory():
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        return jsonify({'error': 'Native folder picker is not available on this system.'}), 500

    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    selected_path = filedialog.askdirectory()
    root.destroy()

    return jsonify({'path': selected_path})

@web_bp.route('/api/scan')
def scan():
    dataset_path = request.args.get('path', '').strip()
    
    if not dataset_path:
        return Response(
            f"data: {json.dumps({'event': 'SCAN_ERROR', 'data': {'error': 'Path parameter is required.'}})}\n\n",
            mimetype='text/event-stream'
        )
        
    if not os.path.exists(dataset_path):
        return Response(
            f"data: {json.dumps({'event': 'SCAN_ERROR', 'data': {'error': f'The path \"{dataset_path}\" does not exist.'}})}\n\n",
            mimetype='text/event-stream'
        )
        
    if not os.path.isdir(dataset_path):
        return Response(
            f"data: {json.dumps({'event': 'SCAN_ERROR', 'data': {'error': f'The path \"{dataset_path}\" is not a directory.'}})}\n\n",
            mimetype='text/event-stream'
        )

    # Instantiate the thread-safe queue observer
    observer = QueueProgressObserver()

    # Worker thread logic to run the core use case without blocking the SSE connection
    def worker_thread():
        try:
            use_case = ScanDatasetUseCase(scanner_impl, factory_impl, classifier_impl)
            use_case.attach(observer)
            reports = use_case.execute(dataset_path)
            # Export reports to CSV file
            exporter_impl.export(reports, OUTPUT_CSV_PATH)
        except Exception as e:
            observer.update("SCAN_ERROR", {"error": str(e)})
        finally:
            observer.update("SCAN_FINISHED", {})

    t = threading.Thread(target=worker_thread)
    t.start()

    # Generator streaming events to client
    def event_stream():
        while True:
            try:
                # Wait for scan events from Queue (timeout keeps thread from hanging if worker fails)
                event_data = observer.q.get(timeout=60.0)
                yield f"data: {json.dumps(event_data)}\n\n"
                
                # End stream when scan is completed or fails
                if event_data["event"] in ["SCAN_FINISHED", "SCAN_ERROR"]:
                    break
            except queue.Empty:
                yield f"data: {json.dumps({'event': 'PING'})}\n\n"
                break

    return Response(event_stream(), mimetype='text/event-stream')

@web_bp.route('/api/download')
def download():
    if not os.path.exists(OUTPUT_CSV_PATH):
        return "No scan results available. Please run a scan first.", 404
        
    return send_file(
        os.path.abspath(OUTPUT_CSV_PATH),
        mimetype='text/csv',
        as_attachment=True,
        download_name='dataset_quality_report.csv'
    )
