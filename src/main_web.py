from flask import Flask
from src.infrastructure.scanner import OsFileScanner
from src.infrastructure.processors.factory_impl import ProcessorFactory
from src.adapters.exporters import CsvMetricsExporter
from src.adapters.web_controller import web_bp, init_app_dependencies

def create_app() -> Flask:
    app = Flask(
        __name__,
        # Overwrite template/static folders context to point correctly
        template_folder='web/templates',
        static_folder='web/static'
    )

    # Dependency Injection (Composition Root for Web App)
    scanner = OsFileScanner()
    factory = ProcessorFactory()
    exporter = CsvMetricsExporter()

    init_app_dependencies(scanner, factory, exporter)

    # Register routes blueprint
    app.register_blueprint(web_bp)

    return app

if __name__ == '__main__':
    app = create_app()
    print("\n=======================================================")
    print("[+] Launching Unimodal Analyzer Web Application Dashboard")
    print("[+] Connect to: http://localhost:5000")
    print("=======================================================\n")
    # Run locally
    app.run(host='127.0.0.1', port=5000, debug=True)
