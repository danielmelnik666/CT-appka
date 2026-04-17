
const BACKEND_URL = 'https://invasive-plants-backend-dm.azurewebsites.net';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌿 Aplikácia pre detekciu inváznych rastlín — frontend beží');

    const testButton = document.getElementById('test-button');
    const resultBox = document.getElementById('result');
    const backendStatus = document.getElementById('backend-status');
    const aiStatus = document.getElementById('ai-status');

    // Automaticky otestuj backend pri načítaní stránky
    testBackendConnection();

    // Tlačidlo pre manuálny test
    testButton.addEventListener('click', testBackendConnection);

    async function testBackendConnection() {
        resultBox.classList.add('visible');
        resultBox.innerHTML = '<em>Testujem pripojenie...</em>';
        backendStatus.textContent = 'Testujem...';
        backendStatus.className = 'value';

        try {
            const startTime = Date.now();
            const response = await fetch(`${BACKEND_URL}/api/ping`);
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Aktualizuj backend status
            backendStatus.textContent = '✓ Online';
            backendStatus.className = 'value success';

            // AI zatiaľ nie je implementovaná, ale ukážeme to
            aiStatus.textContent = '⏳ Čaká na implementáciu';
            aiStatus.className = 'value';

            // Zobraz detaily v result boxe
            resultBox.innerHTML = `
                <strong>✓ Pripojenie úspešné!</strong><br><br>
                <strong>Backend status:</strong> ${data.status}<br>
                <strong>Správa:</strong> ${data.message}<br>
                <strong>Environment:</strong> ${data.environment}<br>
                <strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString('sk-SK')}<br>
                <strong>Čas odpovede:</strong> ${responseTime}ms<br>
                <strong>Backend URL:</strong> ${BACKEND_URL}
            `;

            console.log('Backend response:', data);

        } catch (error) {
            console.error('Chyba pri volaní backendu:', error);

            backendStatus.textContent = '✗ Offline';
            backendStatus.className = 'value error';

            resultBox.innerHTML = `
                <strong>✗ Chyba pripojenia</strong><br><br>
                <strong>Chyba:</strong> ${error.message}<br>
                <strong>Backend URL:</strong> ${BACKEND_URL}<br><br>
                <em>Možné príčiny:</em>
                <ul style="margin-top: 0.5rem;">
                    <li>Backend je spiaci (B1 tier) - počkajte pár sekúnd a skúste znova</li>
                    <li>CORS konflikt - skontrolujte backend konfiguráciu</li>
                    <li>Backend je nedostupný</li>
                </ul>
            `;
        }
    }
});
