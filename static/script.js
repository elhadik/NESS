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
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a PDF or Image (JPEG/PNG) file.');
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

        // 4. Update JSON Modal Hook
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
