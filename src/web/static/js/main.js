document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputPath = document.getElementById('dataset-path');
    const btnScan = document.getElementById('btn-scan');
    const btnDownload = document.getElementById('btn-download');
    const btnBrowse = document.getElementById('btn-browse');
    
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

    // Results Analysis elements (histogram & table tabs)
    const resultsSection = document.getElementById('results-section');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const histogramModalitySelect = document.getElementById('histogram-modality');
    const histogramMetricSelect = document.getElementById('histogram-metric');
    const histogramCanvas = document.getElementById('histogram-chart');
    const histogramEmptyMsg = document.getElementById('histogram-empty-msg');

    const tableSearchInput = document.getElementById('table-search');
    const tableModalitySelect = document.getElementById('table-modality');
    const resultsTable = document.getElementById('results-table');
    const resultsTableHead = resultsTable.querySelector('thead');
    const resultsTableBody = resultsTable.querySelector('tbody');
    const tableEmptyMsg = document.getElementById('table-empty-msg');
    const tableRowCount = document.getElementById('table-row-count');

    let eventSource = null;
    let allResults = [];
    let histogramChart = null;
    let tableSortKey = null;
    let tableSortDir = 'asc';

    const MODALITY_LABELS = {
        all: 'All modalities',
        structured_text: 'Structured Text',
        image: 'Image',
        audio: 'Audio',
        unknown: 'Unknown'
    };

    // Columns that are metadata, not analyzable metrics
    const NON_METRIC_COLUMNS = new Set(['file_path', 'file_name', 'extension', 'modality', 'status', 'processed_at']);
    const TABLE_EXCLUDED_COLUMNS = new Set(['file_path', 'processed_at']);
    const TABLE_PRIORITY_COLUMNS = ['file_name', 'modality', 'extension', 'status'];

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

        // Hide stale analysis results until the new scan finishes
        resultsSection.hidden = true;
        if (histogramChart) {
            histogramChart.destroy();
            histogramChart = null;
        }
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

    // Browse for a directory using the native OS file explorer
    btnBrowse.addEventListener('click', async () => {
        btnBrowse.disabled = true;
        try {
            const response = await fetch('/api/browse-directory');
            const data = await response.json();

            if (data.error) {
                alert(data.error);
            } else if (data.path) {
                inputPath.value = data.path;
            }
        } catch (err) {
            console.error('Browse error:', err);
            alert('Failed to open the folder picker.');
        } finally {
            btnBrowse.disabled = false;
        }
    });

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

                loadResults();
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

    // ===== Tab switching =====
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            tabContents.forEach(tc => {
                tc.hidden = tc.id !== btn.dataset.tab;
            });

            if (btn.dataset.tab === 'tab-histogram' && histogramChart) {
                histogramChart.resize();
            }
        });
    });

    // ===== Results Analysis: fetch & populate =====
    async function loadResults() {
        try {
            const response = await fetch('/api/results');
            const data = await response.json();
            allResults = Array.isArray(data) ? data : [];

            if (allResults.length === 0) {
                resultsSection.hidden = true;
                return;
            }

            resultsSection.hidden = false;
            populateModalitySelects();
            populateMetricSelect();
            renderHistogram();
            renderTable();
        } catch (err) {
            console.error('Failed to load scan results:', err);
        }
    }

    function getAvailableModalities() {
        return Array.from(new Set(allResults.map(r => r.modality))).sort();
    }

    function getNumericMetricKeys(rows) {
        const keys = new Set();
        rows.forEach(row => {
            Object.keys(row).forEach(key => {
                if (NON_METRIC_COLUMNS.has(key)) return;
                if (typeof row[key] === 'number' && !Number.isNaN(row[key])) {
                    keys.add(key);
                }
            });
        });
        return Array.from(keys).sort();
    }

    function getTableColumns(rows) {
        const keys = new Set();
        rows.forEach(row => {
            Object.keys(row).forEach(key => {
                if (!TABLE_EXCLUDED_COLUMNS.has(key)) keys.add(key);
            });
        });
        const rest = Array.from(keys).filter(k => !TABLE_PRIORITY_COLUMNS.includes(k)).sort();
        return [...TABLE_PRIORITY_COLUMNS.filter(k => keys.has(k)), ...rest];
    }

    function populateModalitySelects() {
        const modalities = getAvailableModalities();

        [histogramModalitySelect, tableModalitySelect].forEach(select => {
            const previousValue = select.value;
            select.innerHTML = '';

            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = MODALITY_LABELS.all;
            select.appendChild(allOption);

            modalities.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = MODALITY_LABELS[m] || m;
                select.appendChild(opt);
            });

            if (Array.from(select.options).some(o => o.value === previousValue)) {
                select.value = previousValue;
            }
        });
    }

    function populateMetricSelect() {
        const modality = histogramModalitySelect.value;
        const rows = modality === 'all' ? allResults : allResults.filter(r => r.modality === modality);
        const metrics = getNumericMetricKeys(rows);
        const previousValue = histogramMetricSelect.value;

        histogramMetricSelect.innerHTML = '';
        metrics.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            histogramMetricSelect.appendChild(opt);
        });

        if (metrics.includes(previousValue)) {
            histogramMetricSelect.value = previousValue;
        }
    }

    histogramModalitySelect.addEventListener('change', () => {
        populateMetricSelect();
        renderHistogram();
    });
    histogramMetricSelect.addEventListener('change', renderHistogram);

    // ===== Histogram (Chart.js bar chart binning numeric values) =====
    function formatBinEdge(n) {
        if (Math.abs(n) >= 100) return n.toFixed(0);
        if (Math.abs(n) >= 1) return n.toFixed(1);
        return n.toFixed(3);
    }

    function computeHistogramBins(values) {
        const min = Math.min(...values);
        const max = Math.max(...values);

        if (min === max) {
            return { labels: [formatBinEdge(min)], counts: [values.length] };
        }

        const binCount = Math.max(5, Math.min(20, Math.ceil(Math.sqrt(values.length))));
        const binWidth = (max - min) / binCount;
        const bins = new Array(binCount).fill(0);

        values.forEach(v => {
            let idx = Math.floor((v - min) / binWidth);
            if (idx >= binCount) idx = binCount - 1;
            if (idx < 0) idx = 0;
            bins[idx]++;
        });

        const labels = bins.map((_, i) => {
            const start = min + i * binWidth;
            const end = start + binWidth;
            return `${formatBinEdge(start)}–${formatBinEdge(end)}`;
        });

        return { labels, counts: bins };
    }

    function renderHistogram() {
        const modality = histogramModalitySelect.value;
        const metric = histogramMetricSelect.value;
        const rows = modality === 'all' ? allResults : allResults.filter(r => r.modality === modality);
        const values = rows
            .map(r => r[metric])
            .filter(v => typeof v === 'number' && !Number.isNaN(v));

        if (histogramChart) {
            histogramChart.destroy();
            histogramChart = null;
        }

        if (!metric || values.length === 0) {
            histogramEmptyMsg.hidden = false;
            histogramCanvas.hidden = true;
            return;
        }

        histogramEmptyMsg.hidden = true;
        histogramCanvas.hidden = false;

        const { labels, counts } = computeHistogramBins(values);
        const modalityLabel = modality === 'all' ? '' : ` (${MODALITY_LABELS[modality] || modality})`;

        histogramChart = new Chart(histogramCanvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: metric,
                    data: counts,
                    backgroundColor: 'rgba(59, 130, 246, 0.65)',
                    hoverBackgroundColor: 'rgba(96, 165, 250, 0.9)',
                    borderRadius: 4,
                    maxBarThickness: 24,
                    categoryPercentage: 0.9,
                    barPercentage: 0.9
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `Distribution of ${metric}${modalityLabel}`,
                        color: '#f3f4f6',
                        font: { family: "'Outfit', sans-serif", size: 14, weight: '600' },
                        padding: { bottom: 16 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(13, 15, 26, 0.95)',
                        titleColor: '#f3f4f6',
                        bodyColor: '#f3f4f6',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            title: (items) => `Range: ${items[0].label}`,
                            label: (item) => `Count: ${item.raw}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#9ca3af', maxRotation: 45, minRotation: 0 },
                        title: { display: true, text: metric, color: '#9ca3af' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#9ca3af', precision: 0 },
                        title: { display: true, text: 'Frequency', color: '#9ca3af' }
                    }
                }
            }
        });
    }

    // ===== Interactive metrics table (filter, search, sort) =====
    function getFilteredTableRows() {
        const modality = tableModalitySelect.value;
        const search = tableSearchInput.value.trim().toLowerCase();

        let rows = modality === 'all' ? allResults.slice() : allResults.filter(r => r.modality === modality);

        if (search) {
            rows = rows.filter(r => (r.file_name || '').toLowerCase().includes(search));
        }

        if (tableSortKey) {
            rows.sort((a, b) => {
                const va = a[tableSortKey];
                const vb = b[tableSortKey];
                let cmp;
                if (typeof va === 'number' && typeof vb === 'number') {
                    cmp = va - vb;
                } else {
                    cmp = String(va ?? '').localeCompare(String(vb ?? ''));
                }
                return tableSortDir === 'asc' ? cmp : -cmp;
            });
        }

        return rows;
    }

    function renderCellContent(column, value) {
        if (column === 'modality' && value) {
            const span = document.createElement('span');
            span.className = `badge-${getBadgeType(value)}`;
            span.textContent = value;
            return span;
        }
        if (value === undefined || value === null || value === '') {
            return document.createTextNode('—');
        }
        if (Array.isArray(value)) {
            return document.createTextNode(value.join(', '));
        }
        if (typeof value === 'boolean') {
            return document.createTextNode(value ? 'Yes' : 'No');
        }
        if (typeof value === 'number') {
            return document.createTextNode(Number.isInteger(value) ? String(value) : value.toFixed(3));
        }
        return document.createTextNode(String(value));
    }

    function renderTable() {
        const rows = getFilteredTableRows();
        const columns = getTableColumns(rows.length ? rows : allResults);

        // Header
        const headRow = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.appendChild(document.createTextNode(col));

            if (col === tableSortKey) {
                const arrow = document.createElement('span');
                arrow.className = 'sort-arrow';
                arrow.textContent = tableSortDir === 'asc' ? '▲' : '▼';
                th.appendChild(arrow);
            }

            th.addEventListener('click', () => {
                if (tableSortKey === col) {
                    tableSortDir = tableSortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    tableSortKey = col;
                    tableSortDir = 'asc';
                }
                renderTable();
            });
            headRow.appendChild(th);
        });
        resultsTableHead.innerHTML = '';
        resultsTableHead.appendChild(headRow);

        // Body
        resultsTableBody.innerHTML = '';
        rows.forEach(row => {
            const tr = document.createElement('tr');
            columns.forEach(col => {
                const td = document.createElement('td');
                td.appendChild(renderCellContent(col, row[col]));
                tr.appendChild(td);
            });
            resultsTableBody.appendChild(tr);
        });

        tableEmptyMsg.hidden = rows.length > 0;
        resultsTable.hidden = rows.length === 0;
        tableRowCount.textContent = `${rows.length} of ${allResults.length} files`;
    }

    tableSearchInput.addEventListener('input', renderTable);
    tableModalitySelect.addEventListener('change', renderTable);
});
