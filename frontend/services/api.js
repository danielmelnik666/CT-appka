const BACKEND_URL = window.FLORA_API_URL
    || 'https://invasive-plants-backend-dm.azurewebsites.net';

// ── Mock dáta pre prípad offline backendu ─────────────────────
const MOCK_DETECTIONS = [
    {
        id: 1,
        image_name: 'pohankovec.jpg',
        is_invasive: true,
        confidence_percent: 91.0,
        message: 'Na fotke je pravdepodobne invázny druh rastliny.',
        recommendation: 'Odporúčame nahlásiť to miestnym úradom alebo zelenej linke životného prostredia.',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        client_ip: '—'
    },
    {
        id: 2,
        image_name: 'neznama_rastlina.png',
        is_invasive: false,
        confidence_percent: 76.3,
        message: 'Na fotke pravdepodobne nie je invázny druh rastliny.',
        recommendation: 'Žiadna akcia nie je potrebná.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        client_ip: '—'
    },
    {
        id: 3,
        image_name: 'zlatobyl.webp',
        is_invasive: true,
        confidence_percent: 84.5,
        message: 'Na fotke je pravdepodobne invázny druh rastliny.',
        recommendation: 'Odporúčame nahlásiť to miestnym úradom alebo zelenej linke životného prostredia.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        client_ip: '—'
    }
];

/**
 * POST /api/predict
 * Pošle obrázok na backend a vráti výsledok detekcie.
 * Backend response: { is_invasive, confidence, confidence_percent, message, recommendation, timestamp, debug }
 */
async function apiDetect(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${BACKEND_URL}/api/predict`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Chyba servera: HTTP ${response.status}`);
    }

    // Vracia surový backend objekt — displayResult ho vie spracovať
    return await response.json();
}

/**
 * GET /api/history
 * Backend vracia: { count: N, detections: [...] }
 * Fallback na mock dáta ak DB nie je dostupná (503) alebo backend offline.
 */
async function apiHistory() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/history`, {
            signal: AbortSignal.timeout(7000)
        });

        if (response.status === 503) {
            // Databáza nie je dostupná — použi mock
            console.warn('[FloraGuard] DB nedostupná, zobrazujem demo dáta');
            return MOCK_DETECTIONS;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        // Backend vracia { count, detections } — vyberieme pole
        return data.detections || [];

    } catch (err) {
        console.warn('[FloraGuard] /api/history nedostupná:', err.message);
        return MOCK_DETECTIONS;
    }
}

/**
 * GET /api/ping
 * Overí dostupnosť backendu.
 */
async function apiPing() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/ping`, {
            signal: AbortSignal.timeout(8000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * GET /api/info
 * Vráti info o backende vrátane stavu DB.
 */
async function apiInfo() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/info`, {
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}
