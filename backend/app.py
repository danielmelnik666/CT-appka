"""
Invasive Plants Detection - Backend API
Flask application hosted on Azure App Service
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
from datetime import datetime, timezone

app = Flask(__name__)

# CORS - povolíme volania z frontendu
CORS(app, resources={r"/api/*": {"origins": "*"}})

# URL AI service na Hugging Face Space
HF_SPACE_URL = os.environ.get(
    "HF_SPACE_URL",
    "https://danielmelnik666-invasive-plant-api.hf.space"
)


@app.route("/")
def root():
    """Root endpoint - info o API"""
    return jsonify({
        "service": "Invasive Plants Detection API",
        "version": "1.0.0",
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
        "environment": os.environ.get("ENVIRONMENT", "development"),
        "ai_service_url": HF_SPACE_URL
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Endpoint pre predikciu, či je rastlina invázna.
    
    Workflow:
    1. Prijme obrázok z frontendu (multipart form)
    2. Pošle obrázok na Hugging Face Space (AI service)
    3. Spracuje raw scores - binárna klasifikácia
    4. Vráti jednoduchý výsledok: invázna / nie je invázna
    """
    # Validácia vstupu
    if 'image' not in request.files:
        return jsonify({
            "error": "No image provided",
            "message": "Pošli obrázok v poli 'image' (multipart form)."
        }), 400
    
    image_file = request.files['image']
    
    if image_file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    # Volanie AI service na Hugging Face
    try:
        hf_endpoint = f"{HF_SPACE_URL}/predict"
        
        # Prepošli obrázok do HF Space
        files = {
            'file': (
                image_file.filename,
                image_file.stream,
                image_file.mimetype or 'image/jpeg'
            )
        }
        
        hf_response = requests.post(
            hf_endpoint,
            files=files,
            timeout=60  # HF Space môže mať cold start
        )
        hf_response.raise_for_status()
        
        data = hf_response.json()
        scores = data.get('scores', [])
        
        if len(scores) != 9:
            return jsonify({
                "error": "Invalid AI response",
                "message": f"Expected 9 scores, got {len(scores)}"
            }), 502
        
    except requests.exceptions.Timeout:
        return jsonify({
            "error": "AI service timeout",
            "message": "AI služba nereaguje (pravdepodobne sa prebúdza). Skús to znova o chvíľu."
        }), 504
    
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "AI service unavailable",
            "message": str(e)
        }), 503
    
    # BINÁRNA KLASIFIKÁCIA
    # Indexy 0-7 = invázne druhy
    # Index 8 = Negative (nie je invázna)
    invasive_score = sum(scores[0:8])
    negative_score = scores[8]
    
    # Prah 50% - ak je súčet inváznych scores > 50%, je to invázna
    is_invasive = invasive_score > 0.5
    
    # Confidence = ako moc si je model istý svojím rozhodnutím
    confidence = invasive_score if is_invasive else negative_score
    
    # Pripravenie odpovede pre frontend
    if is_invasive:
        message = "Na fotke je pravdepodobne invázny druh rastliny."
        recommendation = "Odporúčame nahlásiť to miestnym úradom alebo zelenej linke životného prostredia."
    else:
        message = "Na fotke pravdepodobne nie je invázny druh rastliny."
        recommendation = "Žiadna akcia nie je potrebná."
    
    return jsonify({
        "is_invasive": bool(is_invasive),
        "confidence": round(float(confidence), 3),
        "confidence_percent": round(float(confidence) * 100, 1),
        "message": message,
        "recommendation": recommendation,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "debug": {
            "invasive_score": round(float(invasive_score), 3),
            "negative_score": round(float(negative_score), 3),
            "raw_scores": [round(float(s), 3) for s in scores]
        }
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)