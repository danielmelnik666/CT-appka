/**
 * FloraGuard — DetectionResult Component
 *
 * Backend /api/predict response:
 * {
 *   is_invasive: bool,
 *   confidence: float,          // 0.0–1.0
 *   confidence_percent: float,  // 0–100
 *   message: string,
 *   recommendation: string,
 *   timestamp: string,
 *   debug: { invasive_score, negative_score, raw_scores, model_type }
 * }
 */

function renderResult(data, elapsedMs) {
    const container = document.getElementById('result-container');
    const card = document.getElementById('result-card');
    if (!card) return;

    // Čítame priamo z backend response (snake_case polia)
    const isInvasive    = data.is_invasive;
    const confPercent   = Math.round(data.confidence_percent ?? (data.confidence * 100) ?? 0);
    const message       = data.message || '';
    const recommendation = data.recommendation || '';
    const elapsed       = elapsedMs ? `${(elapsedMs / 1000).toFixed(1)}s` : '—';
    const timestamp     = data.timestamp
        ? new Date(data.timestamp).toLocaleString('sk-SK')
        : new Date().toLocaleString('sk-SK');

    // Debug info (zobrazíme diskrétne)
    const invasiveRaw = data.debug?.invasive_score ?? null;

    card.className = `result-card ${isInvasive ? 'invasive' : 'safe'}`;
    card.innerHTML = `
        <div class="result-header">
            <div class="result-status-icon">${isInvasive ? '⚠️' : '✅'}</div>
            <div class="result-title-block">
                <h2>${isInvasive ? 'INVÁZNY DRUH' : 'NIE JE INVÁZNY DRUH'}</h2>
                <div class="result-message-inline">${message}</div>
            </div>
        </div>
        <div class="result-body">
            <div class="result-row">
                <span class="result-row-label">Miera istoty</span>
                <div class="confidence-bar-wrap">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width:0%" data-target="${confPercent}"></div>
                    </div>
                    <div class="confidence-pct">${confPercent}%</div>
                </div>
            </div>
            <div class="result-row">
                <span class="result-row-label">Výsledok</span>
                <span class="result-row-value">
                    <span class="risk-badge ${isInvasive ? 'risk-high' : 'risk-none'}">
                        ${isInvasive ? 'Invázny druh' : 'Bezpečný druh'}
                    </span>
                </span>
            </div>
            <div class="result-row">
                <span class="result-row-label">Čas analýzy</span>
                <span class="result-row-value">${elapsed}</span>
            </div>
            <div class="result-recommendation">
                <strong>Odporúčanie:</strong><br>${recommendation}
            </div>
            ${invasiveRaw !== null ? `
            <div class="result-debug">
                <details>
                    <summary>Debug info</summary>
                    <span>invasive_score: ${data.debug.invasive_score} &nbsp;|&nbsp;
                    negative_score: ${data.debug.negative_score} &nbsp;|&nbsp;
                    model: ${data.debug.model_type}</span>
                </details>
            </div>` : ''}
        </div>
        <div class="result-meta">Analýza dokončená · ${timestamp}</div>
    `;

    if (container) container.style.display = 'block';

    // Animácia confidence baru
    requestAnimationFrame(() => {
        setTimeout(() => {
            const fill = card.querySelector('.confidence-fill');
            if (fill) fill.style.width = fill.dataset.target + '%';
        }, 100);
    });

    // Ulož do localStorage pre lokálnu históriu
    saveToLocalHistory(data);
}

function saveToLocalHistory(data) {
    try {
        const history = JSON.parse(localStorage.getItem('floraLocalHistory') || '[]');
        history.unshift({
            id: `local_${Date.now()}`,
            image_name: 'foto.jpg',
            is_invasive: data.is_invasive,
            confidence_percent: data.confidence_percent ?? Math.round(data.confidence * 100),
            message: data.message,
            recommendation: data.recommendation,
            timestamp: data.timestamp || new Date().toISOString(),
            client_ip: '(lokálna session)'
        });
        localStorage.setItem('floraLocalHistory', JSON.stringify(history.slice(0, 30)));
    } catch {
        // localStorage nemusí byť dostupný
    }
}
