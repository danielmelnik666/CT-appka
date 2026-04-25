/**
 * FloraGuard — ImageUploader Component
 * Drag & drop, validácia, volanie apiDetect(), zobrazenie výsledku.
 *
 * apiDetect(file) vracia backend response z POST /api/predict:
 *   { is_invasive, confidence, confidence_percent, message, recommendation, timestamp, debug }
 */

(function initUploader() {
    const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    let selectedFile = null;

    const uploadArea     = document.getElementById('upload-area');
    const fileInput      = document.getElementById('file-input');
    const browseBtn      = document.getElementById('browse-btn');
    const placeholder    = document.getElementById('upload-placeholder');
    const previewWrap    = document.getElementById('upload-preview-wrap');
    const preview        = document.getElementById('image-preview');
    const fileInfo       = document.getElementById('file-info');
    const previewChgBtn  = document.getElementById('preview-change-btn');

    const errorBanner    = document.getElementById('error-banner');
    const errorText      = document.getElementById('error-text');
    const errorClose     = document.getElementById('error-close');

    const loadingState   = document.getElementById('loading-state');
    const detectActions  = document.getElementById('detect-actions');
    const analyzeBtn     = document.getElementById('analyze-button');
    const resetBtn       = document.getElementById('reset-button');
    const resultContainer = document.getElementById('result-container');

    if (!uploadArea) return; // nie sme na Detect stránke

    // ── Event listenery ───────────────────────────────────────

    uploadArea.addEventListener('click', (e) => {
        if (e.target.closest('#preview-change-btn') || e.target.closest('#browse-btn')) return;
        if (!selectedFile) fileInput.click();
    });

    browseBtn?.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
    previewChgBtn?.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
        fileInput.value = '';
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    analyzeBtn?.addEventListener('click', analyze);
    resetBtn?.addEventListener('click', reset);
    errorClose?.addEventListener('click', hideError);

    // ── Výber súboru ──────────────────────────────────────────

    function handleFile(file) {
        hideError();
        hideResult();

        if (!ACCEPTED_TYPES.includes(file.type)) {
            showError('Nepodporovaný formát. Použite JPG, JPEG, PNG alebo WEBP.');
            return;
        }
        if (file.size > MAX_BYTES) {
            showError(`Súbor je príliš veľký (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum je 10 MB.`);
            return;
        }

        selectedFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            if (fileInfo) fileInfo.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
            placeholder.style.display = 'none';
            previewWrap.style.display = 'block';
            analyzeBtn.disabled = false;
            resetBtn.style.display = 'inline-flex';
        };
        reader.readAsDataURL(file);
    }

    // ── Analýza ───────────────────────────────────────────────

    async function analyze() {
        if (!selectedFile) return;

        hideError();
        hideResult();
        showLoading(true);
        analyzeBtn.disabled = true;

        const startTime = Date.now();
        animateLoadingSteps();

        try {
            // Volá POST /api/predict
            const data = await apiDetect(selectedFile);
            const elapsed = Date.now() - startTime;

            showLoading(false);
            // renderResult z components/result.js
            renderResult(data, elapsed);

            // Aktualizuj AI status v sidebare
            if (typeof updateAiStatus === 'function') updateAiStatus(true);

        } catch (err) {
            showLoading(false);
            showError(err.message || 'Nastala neočakávaná chyba. Skúste znova.');
            console.error('[FloraGuard] Chyba detekcie:', err);
            if (typeof updateAiStatus === 'function') updateAiStatus(false);
        } finally {
            analyzeBtn.disabled = false;
        }
    }

    function animateLoadingSteps() {
        ['lstep-1', 'lstep-2', 'lstep-3'].forEach((id, i) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.className = 'lstep';
            setTimeout(() => el.classList.add('active'),           i * 5000);
            setTimeout(() => { el.classList.add('done'); el.classList.remove('active'); }, i * 5000 + 4500);
        });
    }

    function reset() {
        selectedFile = null;
        preview.src = '';
        placeholder.style.display = 'flex';
        previewWrap.style.display = 'none';
        analyzeBtn.disabled = true;
        resetBtn.style.display = 'none';
        hideError();
        hideResult();
        ['lstep-1','lstep-2','lstep-3'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.className = 'lstep';
        });
    }

    // ── UI helpers ─────────────────────────────────────────────

    function showLoading(show) {
        if (loadingState)   loadingState.style.display   = show ? 'block' : 'none';
        if (detectActions)  detectActions.style.display  = show ? 'none'  : 'flex';
    }

    function showError(msg) {
        if (errorText)   errorText.textContent = msg;
        if (errorBanner) errorBanner.style.display = 'flex';
    }

    function hideError() {
        if (errorBanner) errorBanner.style.display = 'none';
    }

    function hideResult() {
        if (resultContainer) resultContainer.style.display = 'none';
    }

    window.uploaderReset = reset;
})();
