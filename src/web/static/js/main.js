document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputPath = document.getElementById('dataset-path');
    const btnScan = document.getElementById('btn-scan');
    const btnDownload = document.getElementById('btn-download');
    
    const progressContainer = document.getElementById('progress-container');
    const progressStatus = document.getElementById('progress-status');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressBar = document.getElementById('progress-bar');
    const currentFileText = document.getElementById('current-file-text');
    
    const countText = document.getElementById('count-text');
    const countImage = document.getElementById('count-image');
    const countAudio = document.getElementById('count-audio');
    const countUnknown = document.getElementById('count-unknown');
    
    const consoleOutput = document.getElementById('console-output');
    const scanIndicator = document.getElementById('scan-indicator');

    let eventSource = null;
    
    // Modality Counters State
    let counts = {
        structured_text: 0,
        image: 0,
        audio: 0,
        unknown: 0
    };

    // Helper: Reset UI & Stats
    function resetUI() {
        counts = { structured_text: 0, image: 0, audio: 0, unknown: 0 };
        countText.innerText = '0';
        countImage.innerText = '0';
        countAudio.innerText = '0';
        countUnknown.innerText = '0';
        
        progressBar.style.width = '0%';
        progressPercentage.innerText = '0%';
        progressStatus.innerText = 'Initializing...';
        currentFileText.innerText = 'Connecting to server...';
        
        // Clear log and print initial message
        consoleOutput.innerHTML = '';
        appendLog('system-msg', '[System] Starting scan connection...');
        
        btnScan.disabled = true;
        btnDownload.classList.add('disabled');
        btnDownload.setAttribute('tabindex', '-1'); // Disable focus
        
        scanIndicator.classList.add('active');
    }

    // Helper: Append a line to the console log
    function appendLog(className, text, badgeType = null) {
        const line = document.createElement('div');
        line.className = `log-line ${className}`;
        
        if (badgeType) {
            const badge = document.createElement('span');
            badge.className = `badge-${badgeType}`;
            badge.innerText = badgeType;
            line.appendChild(document.createTextNode(text));
            line.appendChild(badge);
        } else {
            line.innerText = text;
        }
        
        consoleOutput.appendChild(line);
        // Auto-scroll to bottom
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Main Scan Execution
    btnScan.addEventListener('click', () => {
        const path = inputPath.value.trim();
        
        if (!path) {
            alert('Please specify a directory path to scan.');
            return;
        }
        
        resetUI();
        
        // Construct the SSE URL
        const url = `/api/scan?path=${encodeURIComponent(path)}`;
        eventSource = new EventSource(url);
        
        eventSource.onmessage = (event) => {
            const packet = JSON.parse(event.data);
            const { event: eventType, data } = packet;
            
            if (eventType === 'SCAN_START') {
                const total = data.total;
                progressStatus.innerText = 'Scanning...';
                currentFileText.innerText = `Preparing to scan ${total} files...`;
                appendLog('system-msg', `[System] Scanning started. Found ${total} files in directory.`);
            }
            
            else if (eventType === 'SCAN_PROGRESS') {
                const current = data.current;
                const total = data.total;
                const filePath = data.file_path;
                const modality = data.modality;
                
                // Update Progress UI
                const pct = ((current / total) * 100).toFixed(1);
                progressBar.style.width = `${pct}%`;
                progressPercentage.innerText = `${pct}%`;
                progressStatus.innerText = `Scanning (${current}/${total})`;
                
                const fileName = filePath.split(/[/\\]/).pop();
                currentFileText.innerText = `Processing: ${fileName}`;
                
                // Increment counters
                if (modality in counts) {
                    counts[modality]++;
                    updateCounterUI(modality);
                }
                
                // Log progress line
                appendLog('file-msg', `[*] Scanned: ${fileName} `, getBadgeType(modality));
            }
            
            else if (eventType === 'SCAN_FINISHED') {
                progressStatus.innerText = 'Scan Completed';
                progressBar.style.width = '100%';
                progressPercentage.innerText = '100%';
                currentFileText.innerText = 'Results exported successfully.';
                appendLog('success-msg', '[System] Scan successfully completed. CSV results generated.');
                
                closeConnection();
                // Enable download
                btnDownload.classList.remove('disabled');
                btnDownload.removeAttribute('tabindex');
            }
            
            else if (eventType === 'SCAN_ERROR') {
                const errorMsg = data.error || 'An unexpected error occurred';
                progressStatus.innerText = 'Scan Failed';
                currentFileText.innerText = 'Error details shown in live log.';
                appendLog('error-msg', `[Error] ${errorMsg}`);
                
                closeConnection();
            }
        };
        
        eventSource.onerror = (err) => {
            console.error('SSE Error:', err);
            progressStatus.innerText = 'Connection Error';
            currentFileText.innerText = 'Could not connect to analysis backend.';
            appendLog('error-msg', '[Error] Failed to establish Server-Sent Events stream.');
            closeConnection();
        };
    });

    function closeConnection() {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        btnScan.disabled = false;
        scanIndicator.classList.remove('active');
    }

    function updateCounterUI(modality) {
        if (modality === 'structured_text') {
            countText.innerText = counts.structured_text;
        } else if (modality === 'image') {
            countImage.innerText = counts.image;
        } else if (modality === 'audio') {
            countAudio.innerText = counts.audio;
        } else if (modality === 'unknown') {
            countUnknown.innerText = counts.unknown;
        }
    }

    function getBadgeType(modality) {
        if (modality === 'structured_text') return 'text';
        if (modality === 'image') return 'image';
        if (modality === 'audio') return 'audio';
        return 'unknown';
    }
});
