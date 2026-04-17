# Backend - Invasive Plants Detection API

Flask REST API hostované na Azure App Service.

## Endpointy

- `GET /` - Info o API
- `GET /api/ping` - Health check
- `GET /api/info` - Runtime info
- `POST /api/predict` - Predikcia druhu (TODO: integrácia s AWS Lambda)

## Lokálne spustenie

```bash
# Vytvor virtual environment
python3 -m venv venv
source venv/bin/activate

# Nainštaluj dependencies
pip install -r requirements.txt

# Spusti
python app.py
```

Server beží na http://localhost:5000

## Deploy

Automaticky cez GitHub Actions pri push do `main`.
Cieľ: Azure App Service (Python 3.11, Linux)
