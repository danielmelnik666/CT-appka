
const BACKEND_URL = 'https://invasive-plants-backend-dm.azurewebsites.net';

// Globálna premenná pre uploadnutý súbor
let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌿 Aplikácia pre detekciu inváznych rastlín — frontend beží');

    // Testuj backend pri štarte (pre status panel)
    testBackendConnection();

    // Upload zóna
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const analyzeButton = document.getElementById('analyze-button');
    const resetButton = document.getElementById('reset-button');

    // Click na upload zónu otvorí file picker
    uploadArea.addEventListener('click', (e) => {
        // Ak klikli na preview obrázok, nechaj ho otvoriť picker
        if (!selectedFile || e.target.id === 'upload-placeholder' || e.target.closest('#upload-placeholder')) {
            fileInput.click();
        }
    });

    // Drag & drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileSelection(file);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelection(file);
        }
    });

    // Analyze tlačidlo
    analyzeButton.addEventListener('click', analyzeImage);

    // Reset tlačidlo
    resetButton.addEventListener('click', resetUpload);
});


function handleFileSelection(file) {
    // Validácia veľkosti (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
        alert('Súbor je príliš veľký. Maximum je 10 MB.');
        return;
    }

    // Validácia typu
    if (!file.type.startsWith('image/')) {
        alert('Súbor nie je obrázok. Vyber JPG, PNG alebo WEBP.');
        return;
    }

    selectedFile = file;

    // Zobraz preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('image-preview');
        preview.src = e.target.result;
        preview.style.display = 'block';

        document.getElementById('upload-placeholder').style.display = 'none';
        document.getElementById('analyze-button').disabled = false;
        document.getElementById('reset-button').style.display = 'inline-block';

        // Vyčisti predchádzajúci výsledok
        document.getElementById('result-card').innerHTML = '';
        document.getElementById('result-card').className = 'result-card';
    };
    reader.readAsDataURL(file);
}


async function analyzeImage() {
    if (!selectedFile) return;

    const loading = document.getElementById('loading');
    const resultCard = document.getElementById('result-card');
    const analyzeButton = document.getElementById('analyze-button');

    // Zobraz loading
    loading.classList.add('visible');
    resultCard.innerHTML = '';
    resultCard.className = 'result-card';
    analyzeButton.disabled = true;

    // Pripravenie form data
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
        const startTime = Date.now();
        const response = await fetch(`${BACKEND_URL}/api/predict`, {
            method: 'POST',
            body: formData
        });
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Prediction response:', data);
        
        // Aktualizuj AI status
        document.getElementById('ai-status').textContent = '✓ Online';
        document.getElementById('ai-status').className = 'value success';

        // Zobraz výsledok
        displayResult(data, responseTime);

    } catch (error) {
        console.error('Chyba pri analýze:', error);
        displayError(error.message);
    } finally {
        loading.classList.remove('visible');
        analyzeButton.disabled = false;
    }
}


function displayResult(data, responseTime) {
    const resultCard = document.getElementById('result-card');
    
    const confidencePercent = data.confidence_percent;
    const isInvasive = data.is_invasive;
    
    // Farebný variant podľa výsledku
    resultCard.className = 'result-card visible ' + (isInvasive ? 'result-invasive' : 'result-safe');

    resultCard.innerHTML = `
        <div class="result-icon">
            ${isInvasive ? '⚠️' : '✅'}
        </div>
        <div class="result-title">
            ${isInvasive ? 'INVÁZNY DRUH' : 'NIE JE INVÁZNY DRUH'}
        </div>
        <div class="result-confidence">
            Istota: <strong>${confidencePercent}%</strong>
        </div>
        <div class="result-message">
            ${data.message}
        </div>
        <div class="result-recommendation">
            <strong>Odporúčanie:</strong><br>
            ${data.recommendation}
        </div>
        <div class="result-meta">
            Čas analýzy: ${(responseTime / 1000).toFixed(1)}s
        </div>
    `;
}


function displayError(message) {
    const resultCard = document.getElementById('result-card');
    resultCard.className = 'result-card visible result-error';
    resultCard.innerHTML = `
        <div class="result-icon">❌</div>
        <div class="result-title">Chyba analýzy</div>
        <div class="result-message">${message}</div>
        <div class="result-recommendation">
            <em>Možné príčiny:</em>
            <ul>
                <li>AI služba sa prebúdza (skús o 30s znova)</li>
                <li>Backend je offline</li>
                <li>Obrázok nemá podporovaný formát</li>
            </ul>
        </div>
    `;
}


function resetUpload() {
    selectedFile = null;
    
    const fileInput = document.getElementById('file-input');
    const preview = document.getElementById('image-preview');
    const placeholder = document.getElementById('upload-placeholder');
    const resultCard = document.getElementById('result-card');
    const resetButton = document.getElementById('reset-button');
    const analyzeButton = document.getElementById('analyze-button');
    
    fileInput.value = '';
    preview.src = '';
    preview.style.display = 'none';
    placeholder.style.display = 'block';
    resultCard.innerHTML = '';
    resultCard.className = 'result-card';
    resetButton.style.display = 'none';
    analyzeButton.disabled = true;
}


async function testBackendConnection() {
    const backendStatus = document.getElementById('backend-status');

    try {
        const response = await fetch(`${BACKEND_URL}/api/ping`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        backendStatus.textContent = '✓ Online';
        backendStatus.className = 'value success';
    } catch (error) {
        console.error('Backend nedostupný:', error);
        backendStatus.textContent = '✗ Offline';
        backendStatus.className = 'value error';
    }
}
