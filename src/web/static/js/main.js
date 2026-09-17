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

    const thresholdsModalitySelect = document.getElementById('thresholds-modality');
    const thresholdSummary = document.getElementById('threshold-summary');
    const thresholdList = document.getElementById('threshold-list');

    // Thresholds modal elements
    const resultsView = document.getElementById('results-view');
    const btnConfigureThresholds = document.getElementById('btn-configure-thresholds');
    const thresholdsModal = document.getElementById('thresholds-modal');
    const modalMainSlot = document.getElementById('modal-main-slot');
    const btnCloseThresholdsModal = document.getElementById('btn-close-thresholds-modal');
    const btnSaveThresholds = document.getElementById('btn-save-thresholds');
    const btnExportThresholds = document.getElementById('btn-export-thresholds');
    const btnImportThresholds = document.getElementById('btn-import-thresholds');
    const importThresholdsInput = document.getElementById('import-thresholds-input');
    const thresholdIoStatus = document.getElementById('threshold-io-status');
    const btnExportReport = document.getElementById('btn-export-report');

    let eventSource = null;
    let allResults = [];
    let histogramChart = null;
    let tableSortKey = null;
    let tableSortDir = 'asc';
    // thresholds[modality][metricKey] = { minEnabled, min, maxEnabled, max, dataMin, dataMax, step }
    let thresholds = {};

    // Short descriptions used as tooltips in the Thresholds tab
    const METRIC_DESCRIPTIONS = {
        width_pixels: 'Image width in pixels.',
        height_pixels: 'Image height in pixels.',
        aspect_ratio: 'Width-to-height ratio of the image.',
        file_size_bytes: 'File size in bytes.',
        blur_score: 'Variance of the Laplacian on the grayscale image. Low values indicate a blurry or low-detail image.',
        brightness: 'Mean grayscale intensity (0-255).',
        contrast: 'Standard deviation of grayscale intensity; higher means more global contrast.',
        entropy: 'Shannon entropy of the grayscale image; measures visual complexity/information.',
        r_mean: 'Mean intensity of the Red channel.',
        g_mean: 'Mean intensity of the Green channel.',
        b_mean: 'Mean intensity of the Blue channel.',
        noise_sigma: 'Estimated noise level of the image. Higher values indicate a noisier image.',
        colorfulness: 'Hasler-Süsstrunk colorfulness score; higher values indicate more vivid/saturated images.',
        saturation_mean: 'Mean saturation (S channel) in the HSV color space.',
        overexposed_ratio: 'Proportion of near-white pixels (>= 250); detects overexposure/clipping.',
        underexposed_ratio: 'Proportion of near-black pixels (<= 5); detects underexposure.',
        dynamic_range: 'Difference between the maximum and minimum grayscale intensity.',
        edge_density: 'Proportion of edge pixels (Canny) over total pixels; measures level of detail.',
        row_count: 'Number of rows in the file (or first sheet, for Excel).',
        column_count: 'Number of columns.',
        null_count: 'Total number of null/empty cells.',
        sheet_count: 'Number of sheets in the Excel workbook.',
        line_count: 'Number of lines in the text file.',
        word_count: 'Total number of words.',
        char_count: 'Total number of characters.',
        channels: 'Number of audio channels (1 = mono, 2 = stereo).',
        sample_rate_hz: 'Audio sample rate in Hz.',
        duration_seconds: 'Total audio duration in seconds.',
        bit_depth: 'Bits per audio sample.',
        bitrate_kbps: 'Audio bitrate in kbps.',
        rms_energy: 'RMS energy of the normalized waveform (0-1); average loudness of the audio.',
        peak_amplitude: 'Maximum absolute amplitude (0-1). Values close to 1 indicate a risk of clipping.',
        clipping_ratio: 'Proportion of samples touching the amplitude ceiling (>= 0.99); detects digital clipping distortion.',
        silence_ratio: 'Proportion of near-silent samples (< 0.01); detects truncated recordings or excessive silence.',
        dynamic_range_db: 'Difference in dB between peak and RMS amplitude; the real dynamic range used by the recording.',
        zero_crossing_rate: 'Rate of sign changes in the waveform; a cheap indicator of noise vs. tonal/percussive content.',
        spectral_centroid_hz: 'Spectral "brightness": the magnitude-weighted average frequency of the signal (via FFT).'
    };

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

        // Close the thresholds modal if it was left open from a previous scan
        if (!thresholdsModal.hidden) {
            closeThresholdsModal();
        }

        // Hide stale analysis results until the new scan finishes
        resultsSection.hidden = true;
        if (histogramChart) {
            histogramChart.destroy();
            histogramChart = null;
        }

        // Thresholds are report-specific: drop them until the new scan's results arrive
        thresholds = {};
        thresholdList.innerHTML = '';
        thresholdSummary.textContent = '';
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

    // ===== Thresholds modal: open/close =====
    // The charts/table live permanently under #results-view; opening the modal
    // simply relocates that DOM node into the modal's main area (no duplication,
    // no second Chart.js instance), and closing it moves it back in place.
    function openThresholdsModal() {
        modalMainSlot.appendChild(resultsView);
        thresholdsModal.hidden = false;
        document.body.classList.add('modal-open');

        renderThresholdsTab();
        renderThresholdSummary();

        requestAnimationFrame(() => {
            if (histogramChart) histogramChart.resize();
        });
        btnCloseThresholdsModal.focus();
    }

    function closeThresholdsModal() {
        resultsSection.insertBefore(resultsView, btnConfigureThresholds);
        thresholdsModal.hidden = true;
        document.body.classList.remove('modal-open');

        requestAnimationFrame(() => {
            if (histogramChart) histogramChart.resize();
        });
    }

    btnConfigureThresholds.addEventListener('click', openThresholdsModal);
    btnCloseThresholdsModal.addEventListener('click', closeThresholdsModal);

    thresholdsModal.addEventListener('click', (event) => {
        if (event.target === thresholdsModal) closeThresholdsModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !thresholdsModal.hidden) closeThresholdsModal();
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

            populateThresholdsModalitySelect();
            buildThresholdRanges();
            renderThresholdsTab();
            renderThresholdSummary();
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

    // Thresholds are always scoped to one modality (metric sets differ per
    // modality), so unlike the histogram/table filters there is no "All" option.
    function populateThresholdsModalitySelect() {
        const modalities = getAvailableModalities();
        const previousValue = thresholdsModalitySelect.value;

        thresholdsModalitySelect.innerHTML = '';
        modalities.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = MODALITY_LABELS[m] || m;
            thresholdsModalitySelect.appendChild(opt);
        });

        if (modalities.includes(previousValue)) {
            thresholdsModalitySelect.value = previousValue;
        }
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

        if (tableSortKey === 'quality') {
            const rank = (r) => {
                const result = evaluateThresholds(r);
                if (result === null) return 2;
                return result.pass ? 1 : 0;
            };
            rows.sort((a, b) => {
                const cmp = rank(a) - rank(b);
                return tableSortDir === 'asc' ? cmp : -cmp;
            });
        } else if (tableSortKey) {
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

    function renderQualityCell(result) {
        if (result === null) {
            const span = document.createElement('span');
            span.className = 'quality-na';
            span.textContent = '—';
            return span;
        }
        const span = document.createElement('span');
        if (result.pass) {
            span.className = 'quality-pass';
            span.textContent = '✅ Pass';
        } else {
            span.className = 'quality-fail';
            span.textContent = '❌ Fail';
            span.title = result.violations.join(', ');
        }
        return span;
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
        const dataColumns = getTableColumns(rows.length ? rows : allResults);
        const fileNameIdx = dataColumns.indexOf('file_name');
        const columns = fileNameIdx >= 0
            ? [...dataColumns.slice(0, fileNameIdx + 1), 'quality', ...dataColumns.slice(fileNameIdx + 1)]
            : ['quality', ...dataColumns];

        // Header
        const headRow = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.appendChild(document.createTextNode(col === 'quality' ? 'Quality' : col));

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
                if (col === 'quality') {
                    td.appendChild(renderQualityCell(evaluateThresholds(row)));
                } else {
                    td.appendChild(renderCellContent(col, row[col]));
                }
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

    // ===== Quality thresholds (per metric, per modality) =====
    function debounce(fn, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    }

    function formatThresholdValue(n) {
        return Number.isInteger(n) ? String(n) : n.toFixed(3);
    }

    // ===== Threshold persistence: save / export / import =====
    const THRESHOLDS_STORAGE_KEY = 'dqa_thresholds_config_v1';

    // Only the user-set parts are persisted; dataMin/dataMax/step are always
    // recomputed fresh from the current report.
    function serializeThresholds() {
        const serializable = {};
        Object.entries(thresholds).forEach(([modality, metrics]) => {
            serializable[modality] = {};
            Object.entries(metrics).forEach(([metric, cfg]) => {
                serializable[modality][metric] = {
                    minEnabled: cfg.minEnabled,
                    min: cfg.min,
                    maxEnabled: cfg.maxEnabled,
                    max: cfg.max
                };
            });
        });
        return serializable;
    }

    // Applies a previously saved/imported config onto the freshly-built
    // `thresholds`, clamping bounds into the current report's observed range
    // and skipping any modality/metric that no longer exists in this report.
    function applySerializedThresholds(saved) {
        if (!saved || typeof saved !== 'object') return;

        Object.entries(saved).forEach(([modality, metrics]) => {
            if (!thresholds[modality] || typeof metrics !== 'object' || metrics === null) return;

            Object.entries(metrics).forEach(([metric, bound]) => {
                const cfg = thresholds[modality][metric];
                if (!cfg || !bound) return;

                if (typeof bound.min === 'number') {
                    cfg.min = Math.min(Math.max(bound.min, cfg.dataMin), cfg.dataMax);
                }
                if (typeof bound.max === 'number') {
                    cfg.max = Math.min(Math.max(bound.max, cfg.dataMin), cfg.dataMax);
                }
                cfg.minEnabled = Boolean(bound.minEnabled);
                cfg.maxEnabled = Boolean(bound.maxEnabled);
            });
        });
    }

    function loadThresholdsFromStorage() {
        try {
            const raw = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            console.error('Failed to read saved thresholds:', err);
            return null;
        }
    }

    function setIoStatus(message) {
        thresholdIoStatus.textContent = message;
        clearTimeout(setIoStatus._timeoutId);
        setIoStatus._timeoutId = setTimeout(() => {
            thresholdIoStatus.textContent = '';
        }, 3000);
    }

    btnSaveThresholds.addEventListener('click', () => {
        try {
            localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(serializeThresholds()));
            setIoStatus('Thresholds saved for future scans.');
        } catch (err) {
            console.error('Failed to save thresholds:', err);
            setIoStatus('Could not save thresholds in this browser.');
        }
    });

    btnExportThresholds.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(serializeThresholds(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'thresholds-config.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIoStatus('Configuration exported.');
    });

    btnImportThresholds.addEventListener('click', () => importThresholdsInput.click());

    importThresholdsInput.addEventListener('change', () => {
        const file = importThresholdsInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                applySerializedThresholds(parsed);
                renderThresholdsTab();
                renderThresholdSummary();
                renderTable();
                setIoStatus('Configuration imported.');
            } catch (err) {
                console.error('Failed to import thresholds:', err);
                setIoStatus('Invalid configuration file.');
            }
        };
        reader.readAsText(file);
        importThresholdsInput.value = '';
    });

    // ===== Full report export (thresholds + all charts + table, as one HTML file) =====

    // Escapes untrusted text (file names, error messages, column lists that come
    // straight from scanned files) before it is concatenated into the report's HTML.
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value === null || value === undefined ? '' : String(value);
        return div.innerHTML;
    }

    function formatCellForExport(value) {
        if (value === undefined || value === null || value === '') return '—';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
        return String(value);
    }

    // Renders one histogram per numeric metric of every modality on off-screen
    // canvases (never attached to the page) and captures each as a PNG data URL,
    // so the exported report is fully self-contained and needs no Chart.js to view.
    function generateAllChartImages() {
        return new Promise((resolve) => {
            const result = {};
            const pending = [];

            getAvailableModalities().forEach(modality => {
                result[modality] = [];
                const rows = allResults.filter(r => r.modality === modality);
                const metrics = getNumericMetricKeys(rows);

                metrics.forEach(metric => {
                    const values = rows
                        .map(r => r[metric])
                        .filter(v => typeof v === 'number' && !Number.isNaN(v));
                    if (values.length === 0) return;

                    const canvas = document.createElement('canvas');
                    canvas.width = 480;
                    canvas.height = 300;

                    const { labels, counts } = computeHistogramBins(values);
                    const chart = new Chart(canvas, {
                        type: 'bar',
                        data: {
                            labels,
                            datasets: [{
                                data: counts,
                                backgroundColor: 'rgba(37, 99, 235, 0.75)',
                                borderRadius: 4,
                                maxBarThickness: 24
                            }]
                        },
                        options: {
                            responsive: false,
                            animation: false,
                            plugins: {
                                legend: { display: false },
                                title: { display: true, text: metric, color: '#111827', font: { size: 13, weight: 'bold' } }
                            },
                            scales: {
                                x: { ticks: { color: '#374151', font: { size: 9 }, maxRotation: 45 }, grid: { color: '#e5e7eb' } },
                                y: { beginAtZero: true, ticks: { color: '#374151', precision: 0 }, grid: { color: '#e5e7eb' } }
                            }
                        }
                    });

                    pending.push({ modality, metric, chart });
                });
            });

            // Chart.js schedules its first paint on an animation frame even with
            // animation disabled; wait two frames so every canvas has pixels
            // before reading them back with toBase64Image().
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    pending.forEach(({ modality, metric, chart }) => {
                        result[modality].push({ metric, dataUrl: chart.toBase64Image() });
                        chart.destroy();
                    });
                    resolve(result);
                });
            });
        });
    }

    function buildThresholdsReportHtml() {
        const sections = getAvailableModalities().map(modality => {
            const cfg = thresholds[modality] || {};
            const activeRows = Object.entries(cfg).filter(([, bound]) => bound.minEnabled || bound.maxEnabled);
            if (activeRows.length === 0) return '';

            const rowsHtml = activeRows.map(([metric, bound]) => `
                <tr>
                    <td>${escapeHtml(metric)}</td>
                    <td>${bound.minEnabled ? escapeHtml(formatThresholdValue(bound.min)) : '—'}</td>
                    <td>${bound.maxEnabled ? escapeHtml(formatThresholdValue(bound.max)) : '—'}</td>
                </tr>`).join('');

            return `<h3>${escapeHtml(MODALITY_LABELS[modality] || modality)}</h3>
                <table><thead><tr><th>Metric</th><th>Min</th><th>Max</th></tr></thead>
                <tbody>${rowsHtml}</tbody></table>`;
        }).filter(Boolean).join('');

        return `<h2>Quality Thresholds</h2>${sections || '<p>No thresholds were configured for this report.</p>'}`;
    }

    function buildChartsReportHtml(chartImages) {
        const sections = getAvailableModalities().map(modality => {
            const charts = chartImages[modality] || [];
            if (charts.length === 0) return '';

            const cards = charts.map(({ metric, dataUrl }) => `
                <figure class="chart-card">
                    <img src="${dataUrl}" alt="${escapeHtml(metric)} distribution">
                    <figcaption>${escapeHtml(metric)}</figcaption>
                </figure>`).join('');

            return `<h3>${escapeHtml(MODALITY_LABELS[modality] || modality)}</h3><div class="chart-grid">${cards}</div>`;
        }).filter(Boolean).join('');

        return `<h2>Metric Distributions</h2>${sections || '<p>No numeric metrics available to plot.</p>'}`;
    }

    // Mirrors exactly what is currently on screen in the Metrics Table tab
    // (same filters, sort and Quality column) so the export is WYSIWYG.
    function buildTableReportHtml() {
        const rows = getFilteredTableRows();
        const dataColumns = getTableColumns(rows.length ? rows : allResults);
        const fileNameIdx = dataColumns.indexOf('file_name');
        const columns = fileNameIdx >= 0
            ? [...dataColumns.slice(0, fileNameIdx + 1), 'quality', ...dataColumns.slice(fileNameIdx + 1)]
            : ['quality', ...dataColumns];

        const headerHtml = columns.map(col => `<th>${escapeHtml(col === 'quality' ? 'Quality' : col)}</th>`).join('');

        const bodyHtml = rows.map(row => {
            const cells = columns.map(col => {
                if (col === 'quality') {
                    const result = evaluateThresholds(row);
                    if (result === null) return '<td><span class="badge-na">—</span></td>';
                    return result.pass
                        ? '<td><span class="badge-pass">✅ Pass</span></td>'
                        : `<td><span class="badge-fail" title="${escapeHtml(result.violations.join(', '))}">❌ Fail</span></td>`;
                }
                return `<td>${escapeHtml(formatCellForExport(row[col]))}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        return `<h2>Metrics Table</h2>
            <p class="report-meta">${rows.length} of ${allResults.length} files (reflecting the filters active at export time).</p>
            <div class="table-wrapper"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
    }

    const REPORT_STYLES = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f7f8fa; color:#1a1a2e; margin:0; padding:2rem; }
        h1 { font-size:1.8rem; margin-bottom:0.25rem; }
        .report-meta { color:#666; font-size:0.9rem; }
        h2 { margin-top:2.5rem; border-bottom:2px solid #2563eb; padding-bottom:0.4rem; }
        h3 { margin-top:1.5rem; color:#2563eb; }
        table { border-collapse:collapse; width:100%; margin-top:1rem; font-size:0.85rem; }
        th, td { border:1px solid #ddd; padding:0.5rem 0.75rem; text-align:left; }
        th { background:#eef1f7; }
        .table-wrapper { overflow-x:auto; }
        .chart-grid { display:flex; flex-wrap:wrap; gap:1rem; margin-top:1rem; }
        .chart-card { border:1px solid #ddd; border-radius:8px; padding:0.75rem; background:#fff; margin:0; }
        .chart-card img { display:block; max-width:480px; width:100%; }
        .chart-card figcaption { font-size:0.8rem; color:#555; margin-top:0.4rem; text-align:center; }
        .badge-pass { color:#0a8a3f; font-weight:600; }
        .badge-fail { color:#c0392b; font-weight:600; cursor:help; }
        .badge-na { color:#888; }
    `;

    async function buildFullReportHtml() {
        const chartImages = await generateAllChartImages();

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Data Quality Report</title>
<style>${REPORT_STYLES}</style>
</head>
<body>
<h1>Unimodal Data Quality Report</h1>
<p class="report-meta">Generated ${escapeHtml(new Date().toLocaleString())} — ${allResults.length} files analyzed.</p>
${buildThresholdsReportHtml()}
${buildChartsReportHtml(chartImages)}
${buildTableReportHtml()}
</body>
</html>`;
    }

    btnExportReport.addEventListener('click', async () => {
        btnExportReport.disabled = true;
        const originalLabel = btnExportReport.textContent;
        btnExportReport.textContent = '⏳ Generating...';

        try {
            const html = await buildFullReportHtml();
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            link.href = url;
            link.download = `dqa-report-${timestamp}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setIoStatus('Full report exported.');
        } catch (err) {
            console.error('Failed to export full report:', err);
            setIoStatus('Failed to export the full report.');
        } finally {
            btnExportReport.disabled = false;
            btnExportReport.textContent = originalLabel;
        }
    });

    // Rebuilds the threshold config from scratch using the current report's
    // real min/max per metric, so ranges always reflect the latest scan, then
    // reapplies any previously saved configuration (clamped to the new ranges).
    function buildThresholdRanges() {
        thresholds = {};

        getAvailableModalities().forEach(modality => {
            const rows = allResults.filter(r => r.modality === modality);
            const metrics = getNumericMetricKeys(rows);
            const modalityThresholds = {};

            metrics.forEach(metric => {
                const values = rows
                    .map(r => r[metric])
                    .filter(v => typeof v === 'number' && !Number.isNaN(v));
                if (values.length === 0) return;

                const dataMin = Math.min(...values);
                const dataMax = Math.max(...values);
                const range = dataMax - dataMin;
                const isIntegerMetric = values.every(v => Number.isInteger(v));
                const step = isIntegerMetric ? 1 : Math.max(range / 100, 0.001);

                modalityThresholds[metric] = {
                    minEnabled: false,
                    maxEnabled: false,
                    min: dataMin,
                    max: dataMax,
                    dataMin,
                    dataMax,
                    step
                };
            });

            thresholds[modality] = modalityThresholds;
        });

        applySerializedThresholds(loadThresholdsFromStorage());
    }

    function evaluateThresholds(row) {
        const cfg = thresholds[row.modality];
        if (!cfg) return null;

        const active = Object.values(cfg).some(c => c.minEnabled || c.maxEnabled);
        if (!active) return null;

        const violations = [];
        Object.entries(cfg).forEach(([metric, bound]) => {
            const value = row[metric];
            if (typeof value !== 'number') return;
            if (bound.minEnabled && value < bound.min) {
                violations.push(`${metric} < ${formatThresholdValue(bound.min)}`);
            }
            if (bound.maxEnabled && value > bound.max) {
                violations.push(`${metric} > ${formatThresholdValue(bound.max)}`);
            }
        });

        return { pass: violations.length === 0, violations };
    }

    function renderThresholdSummary() {
        const modality = thresholdsModalitySelect.value;
        if (!modality) {
            thresholdSummary.textContent = '';
            return;
        }

        const rows = allResults.filter(r => r.modality === modality);
        const modalityThresholds = thresholds[modality] || {};
        const anyEnabled = Object.values(modalityThresholds).some(c => c.minEnabled || c.maxEnabled);

        if (!anyEnabled) {
            thresholdSummary.textContent = `No active thresholds for ${MODALITY_LABELS[modality] || modality} yet — enable Min/Max below to start evaluating quality.`;
            return;
        }

        const passCount = rows.filter(r => {
            const result = evaluateThresholds(r);
            return result === null || result.pass;
        }).length;

        thresholdSummary.textContent = `${passCount} of ${rows.length} ${MODALITY_LABELS[modality] || modality} files pass all configured thresholds.`;
    }

    function buildBoundControl(cfg, bound, labelText) {
        const wrapper = document.createElement('div');
        wrapper.className = 'threshold-bound';

        const label = document.createElement('label');
        label.className = 'threshold-bound-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = bound === 'min' ? cfg.minEnabled : cfg.maxEnabled;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(labelText));
        wrapper.appendChild(label);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'threshold-slider';
        slider.min = cfg.dataMin;
        slider.max = cfg.dataMax;
        slider.step = cfg.step;
        slider.value = bound === 'min' ? cfg.min : cfg.max;
        slider.disabled = !checkbox.checked;
        wrapper.appendChild(slider);

        const number = document.createElement('input');
        number.type = 'number';
        number.className = 'threshold-number';
        number.min = cfg.dataMin;
        number.max = cfg.dataMax;
        number.step = cfg.step;
        number.value = slider.value;
        number.disabled = !checkbox.checked;
        wrapper.appendChild(number);

        const applyValue = (rawValue) => {
            let value = parseFloat(rawValue);
            if (Number.isNaN(value)) value = bound === 'min' ? cfg.dataMin : cfg.dataMax;
            value = Math.min(Math.max(value, cfg.dataMin), cfg.dataMax);

            if (bound === 'min') {
                cfg.min = value;
            } else {
                cfg.max = value;
            }
            slider.value = value;
            number.value = value;
        };

        const debouncedRefresh = debounce(() => {
            renderThresholdSummary();
            renderTable();
        }, 120);

        checkbox.addEventListener('change', () => {
            if (bound === 'min') {
                cfg.minEnabled = checkbox.checked;
            } else {
                cfg.maxEnabled = checkbox.checked;
            }
            slider.disabled = !checkbox.checked;
            number.disabled = !checkbox.checked;
            renderThresholdSummary();
            renderTable();
        });

        slider.addEventListener('input', () => {
            applyValue(slider.value);
            debouncedRefresh();
        });

        number.addEventListener('change', () => {
            applyValue(number.value);
            renderThresholdSummary();
            renderTable();
        });

        return wrapper;
    }

    function buildThresholdRow(metric, cfg) {
        const row = document.createElement('div');
        row.className = 'threshold-row';

        const header = document.createElement('div');
        header.className = 'threshold-row-header';

        const name = document.createElement('span');
        name.className = 'threshold-metric-name';
        name.textContent = metric;
        header.appendChild(name);

        const info = document.createElement('span');
        info.className = 'info-icon';
        info.tabIndex = 0;
        info.textContent = 'i';
        const description = METRIC_DESCRIPTIONS[metric] || 'No description available for this metric.';
        info.setAttribute('data-tooltip', `${description} Enable Min and/or Max below to flag files outside your accepted range.`);
        header.appendChild(info);

        row.appendChild(header);
        row.appendChild(buildBoundControl(cfg, 'min', 'Min'));
        row.appendChild(buildBoundControl(cfg, 'max', 'Max'));

        const hint = document.createElement('span');
        hint.className = 'threshold-range-hint';
        hint.textContent = `Observed range: ${formatThresholdValue(cfg.dataMin)} – ${formatThresholdValue(cfg.dataMax)}`;
        row.appendChild(hint);

        return row;
    }

    function renderThresholdsTab() {
        const modality = thresholdsModalitySelect.value;
        const modalityThresholds = thresholds[modality] || {};
        const metrics = Object.keys(modalityThresholds).sort();

        thresholdList.innerHTML = '';

        if (metrics.length === 0) {
            const msg = document.createElement('p');
            msg.className = 'empty-msg';
            msg.textContent = 'No numeric metrics available for this modality.';
            thresholdList.appendChild(msg);
            return;
        }

        metrics.forEach(metric => {
            thresholdList.appendChild(buildThresholdRow(metric, modalityThresholds[metric]));
        });
    }

    thresholdsModalitySelect.addEventListener('change', () => {
        renderThresholdsTab();
        renderThresholdSummary();
    });
});
