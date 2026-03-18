document.addEventListener('DOMContentLoaded', () => {
    
    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    const uploadPanel = document.getElementById('upload-panel');
    const filePreview = document.getElementById('file-preview');
    const previewFilename = document.getElementById('preview-filename');
    const previewFilesize = document.getElementById('preview-filesize');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    const uploadActions = document.getElementById('upload-actions');
    const btnProcessDoc = document.getElementById('btn-process-doc');
    const btnUploadNew = document.getElementById('btn-upload-new');
    
    const processingOverlay = document.getElementById('processing-overlay');
    const resultsPanel = document.getElementById('results-panel');
    
    // State
    let selectedFile = null;

    // --- Drag and Drop Logic ---
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    ['dragleave', 'dragend'].forEach(type => {
        dropZone.addEventListener(type, () => {
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // --- File Handling ---
    
    function handleFileSelect(file) {
        // Basic validation
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a PDF or Image (JPEG/PNG/WEBP) file.');
            return;
        }
        
        // Max 16MB roughly
        if (file.size > 16 * 1024 * 1024) {
            alert('File size exceeds 16MB limit.');
            return;
        }

        selectedFile = file;
        
        // Update UI
        dropZone.classList.add('hidden');
        filePreview.classList.remove('hidden');
        uploadActions.classList.remove('hidden');
        
        previewFilename.textContent = file.name;
        previewFilesize.textContent = formatBytes(file.size);
    }

    btnRemoveFile.addEventListener('click', () => {
        resetUploadState();
    });

    btnUploadNew.addEventListener('click', () => {
        resetUploadState();
        resultsPanel.classList.add('hidden');
        uploadPanel.classList.remove('hidden');
    });

    function resetUploadState() {
        selectedFile = null;
        fileInput.value = '';
        dropZone.classList.remove('hidden');
        filePreview.classList.add('hidden');
        uploadActions.classList.add('hidden');
    }

    // --- Processing Logic ---

    btnProcessDoc.addEventListener('click', async () => {
        if (!selectedFile) return;

        // Show Processing Overlay
        uploadPanel.classList.add('hidden');
        processingOverlay.classList.remove('hidden');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to process document');
            }

            const data = await response.json();
            
            // Hide Processing, Show Results
            processingOverlay.classList.add('hidden');
            resultsPanel.classList.remove('hidden');
            
            renderResults(data);

        } catch (error) {
            console.error(error);
            alert('Error processing document: ' + error.message);
            resetUploadState();
            processingOverlay.classList.add('hidden');
            uploadPanel.classList.remove('hidden');
        }
    });

    // --- Rendering Logic ---

    function renderResults(data) {
        // 1. Render Entities (Key Info)
        const entitiesContainer = document.getElementById('entities-container');
        entitiesContainer.innerHTML = '';
        
        if (data.entities && data.entities.length > 0) {
            const grid = document.createElement('div');
            grid.className = 'entity-grid';
            
            data.entities.forEach(entity => {
                const item = document.createElement('div');
                item.className = 'entity-item';
                
                // Format label: "invoice_id" -> "Invoice Id"
                const label = entity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                item.innerHTML = `
                    <span class="entity-label">${label}</span>
                    <span class="entity-value">${escapeHtml(entity.mention_text)}</span>
                `;
                grid.appendChild(item);
            });
            
            entitiesContainer.appendChild(grid);
        } else {
            entitiesContainer.innerHTML = '<p class="text-muted">No key entities extracted.</p>';
        }

        // 2. Render Summary
        const summaryEl = document.getElementById('text-summary-content');
        if (data.raw_text_summary) {
            summaryEl.textContent = data.raw_text_summary;
        } else {
            summaryEl.textContent = 'No summary available for this document.';
        }

        // 3. Render Line Items
        const tbody = document.querySelector('#line-items-table tbody');
        tbody.innerHTML = '';
        
        if (data.line_items && data.line_items.length > 0) {
            data.line_items.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(item.description || '-')}</td>
                    <td class="text-right">${escapeHtml(item.quantity || '-')}</td>
                    <td class="text-right">${escapeHtml(item.unit_price || '-')}</td>
                    <td class="text-right font-bold text-main">${escapeHtml(item.amount || '-')}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No line items extracted.</td></tr>';
        }

        // 4. Render Gemini Analysis
        const geminiScoreValue = document.getElementById('gemini-score-value');
        const geminiConfidenceBadge = document.getElementById('gemini-confidence-badge');
        const topConfidenceBadge = document.getElementById('top-confidence-badge');
        const geminiCriteriaContent = document.getElementById('gemini-criteria-content');
        const geminiExtractedContainer = document.getElementById('gemini-extracted-container');

        if (data.gemini_analysis) {
            const gemini = data.gemini_analysis;
            geminiScoreValue.textContent = gemini.confidence_score !== undefined ? gemini.confidence_score : '-';
            geminiCriteriaContent.textContent = gemini.criteria_met || 'N/A';
            
            // Update badge class based on score
            geminiConfidenceBadge.className = 'badge';
            topConfidenceBadge.className = 'badge';
            
            if (gemini.confidence_score >= 3) {
                geminiConfidenceBadge.classList.add('badge-success');
                topConfidenceBadge.classList.add('badge-success');
                geminiConfidenceBadge.textContent = topConfidenceBadge.textContent = 'Confidence: High (' + gemini.confidence_score + ')';
            } else if (gemini.confidence_score >= 2) {
                geminiConfidenceBadge.classList.add('badge-warning');
                topConfidenceBadge.classList.add('badge-warning');
                geminiConfidenceBadge.textContent = topConfidenceBadge.textContent = 'Confidence: Moderate (' + gemini.confidence_score + ')';
            } else if (gemini.confidence_score > 0) {
                geminiConfidenceBadge.classList.add('badge-danger');
                topConfidenceBadge.classList.add('badge-danger');
                geminiConfidenceBadge.textContent = topConfidenceBadge.textContent = 'Confidence: Low (' + gemini.confidence_score + ')';
            } else {
                geminiConfidenceBadge.textContent = topConfidenceBadge.textContent = 'Score: -';
            }

            // Render extracted values using entity-grid
            geminiExtractedContainer.innerHTML = '';
            if (gemini.extracted_values) {
                for (const [key, value] of Object.entries(gemini.extracted_values)) {
                    if (value !== null && value !== undefined) {
                        const item = document.createElement('div');
                        item.className = 'entity-item';
                        
                        // Format label: "Merchant" -> "Merchant"
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        
                        item.innerHTML = `
                            <span class="entity-label">${label}</span>
                            <span class="entity-value">${escapeHtml(value)}</span>
                        `;
                        geminiExtractedContainer.appendChild(item);
                    }
                }
            }
            if (geminiExtractedContainer.innerHTML === '') {
                geminiExtractedContainer.innerHTML = '<p class="text-muted">No values extracted by Gemini.</p>';
            }
        } else {
            // Reset Gemini UI if no data
            geminiScoreValue.textContent = '-';
            geminiConfidenceBadge.className = 'badge';
            geminiConfidenceBadge.textContent = 'Score: -';
            geminiCriteriaContent.textContent = 'N/A';
            geminiExtractedContainer.innerHTML = '<p class="text-muted">N/A</p>';
        }

        // 5. Render GCS Routing Outcome
        const gcsBadge = document.getElementById('gcs-routing-badge');
        const gcsText = document.getElementById('gcs-routing-text');
        const gcsBucket = document.getElementById('gcs-routing-bucket');

        if (data.gcs_routing) {
            const routing = data.gcs_routing;
            
            if (routing.status === "Success") {
                if (routing.score >= 3) {
                    gcsBadge.className = 'badge badge-success';
                    gcsBadge.textContent = 'Routed Successfully';
                    gcsText.innerHTML = '<span style="color: var(--success-color);"><i data-lucide="check-circle"></i> High Quality - System Processed</span>';
                } else {
                    gcsBadge.className = 'badge badge-warning';
                    gcsBadge.textContent = 'Manual Review Required';
                    gcsText.innerHTML = '<span style="color: var(--warning-color);"><i data-lucide="alert-triangle"></i> Low Quality - Escalate to Review</span>';
                }
                gcsBucket.textContent = `Bucket: ${routing.bucket}`;
            } else {
                gcsBadge.className = 'badge badge-danger';
                gcsBadge.textContent = 'Routing Failed';
                gcsText.textContent = routing.status;
                gcsBucket.textContent = '';
            }
        } else {
            gcsBadge.className = 'badge';
            gcsBadge.textContent = 'Status: N/A';
            gcsText.textContent = 'N/A';
            gcsBucket.textContent = '';
        }

        // 6. Update JSON Modal Hook
        const jsonViewer = document.getElementById('json-viewer-content');
        jsonViewer.textContent = JSON.stringify(data, null, 2);
    }
    
    // Toggle JSON
    document.getElementById('btn-toggle-json').addEventListener('click', function() {
        const viewer = document.getElementById('json-viewer-content');
        if (viewer.classList.contains('hidden')) {
            viewer.classList.remove('hidden');
            this.innerHTML = '<i data-lucide="code"></i> Hide Raw Response';
        } else {
            viewer.classList.add('hidden');
            this.innerHTML = '<i data-lucide="code"></i> View Raw API Response';
        }
        lucide.createIcons(); // re-init icon
    });

    // --- Utilities ---
    
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

});
