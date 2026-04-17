

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌿 Aplikácia pre detekciu inváznych rastlín — frontend beží');

    const testButton = document.getElementById('test-button');
    const resultBox = document.getElementById('result');

    testButton.addEventListener('click', () => {
        resultBox.classList.add('visible');
        resultBox.innerHTML = `
            <strong>✓ Frontend funguje!</strong><br>
            Čas: ${new Date().toLocaleString('sk-SK')}<br>
            Hostovaný na: ${window.location.hostname}<br>
            <em>Backend pripojenie bude doplnené v ďalšej fáze.</em>
        `;
    });
});
