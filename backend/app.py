"""
Invasive Plants Detection - Backend API
Flask application hosted on Azure App Service
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime, timezone

app = Flask(__name__)

# CORS - povolíme volania z frontendu
# V produkcii nastavíme presné domény, zatiaľ všetky pre Hello World
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route("/")
def root():
    """Root endpoint - info o API"""
    return jsonify({
        "service": "Invasive Plants Detection API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/api/ping for health check"
    })


@app.route("/api/ping")
def ping():
    """Health check endpoint - overuje, že backend žije"""
    return jsonify({
        "status": "ok",
        "message": "Backend is alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": os.environ.get("ENVIRONMENT", "development")
    })


@app.route("/api/info")
def info():
    """Info o serveri - užitočné pre debug"""
    return jsonify({
        "service": "invasive-plants-backend",
        "python_version": os.sys.version,
        "hostname": os.environ.get("WEBSITE_HOSTNAME", "localhost"),
        "environment": os.environ.get("ENVIRONMENT", "development")
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Endpoint pre predikciu druhu rastliny.
    Zatiaľ vracia dummy dáta - neskôr zavolá AWS Lambda.
    """
    # TODO: Zavolať AWS Lambda s obrázkom
    # TODO: Uložiť výsledok do databázy
    return jsonify({
        "species": "Heracleum mantegazzianum",
        "species_common": "Boľševník obrovský",
        "confidence": 0.87,
        "is_invasive": True,
        "note": "Dummy data - Lambda integration coming soon"
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    # Lokálne spustenie - produkčne sa spúšťa cez gunicorn
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
