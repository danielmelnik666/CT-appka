"""
Invasive Plants Detection - Backend API
Flask application hosted on Azure App Service
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import uuid
import requests
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient

app = Flask(__name__)

# CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# URL AI service na Hugging Face Space
HF_SPACE_URL = os.environ.get(
    "HF_SPACE_URL",
    "https://danielmelnik666-invasive-plant-api.hf.space"
)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
AZURE_STORAGE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "")
AZURE_STORAGE_CONTAINER = os.environ.get("AZURE_STORAGE_CONTAINER", "detections")


def get_db_connection():
    if not DATABASE_URL:
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except psycopg2.OperationalError:
        return None


def upload_image_to_blob(image_file):
    """Uploadne obrázok do Azure Blob Storage a vráti jeho verejnú URL."""
    if not AZURE_STORAGE_CONNECTION_STRING:
        return None
    try:
        ext = image_file.filename.rsplit('.', 1)[-1].lower() if '.' in image_file.filename else 'jpg'
        blob_name = f"{uuid.uuid4()}.{ext}"

        blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        blob_client = blob_service.get_blob_client(container=AZURE_STORAGE_CONTAINER, blob=blob_name)

        image_file.stream.seek(0)
        blob_client.upload_blob(image_file.stream, overwrite=True)

        return blob_client.url
    except Exception:
        return None


def save_detection(image_name, image_url, is_invasive, confidence, confidence_percent, message, recommendation, client_ip):
    """Uloží výsledok detekcie do databázy."""
    conn = get_db_connection()
    if conn is None:
        return

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO detections
                    (image_name, image_url, is_invasive, confidence, confidence_percent, message, recommendation, client_ip)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (image_name, image_url, is_invasive, confidence, confidence_percent, message, recommendation, client_ip)
            )
        conn.commit()
    finally:
        conn.close()


@app.route("/")
def root():
    return jsonify({
        "service": "Invasive Plants Detection API",
        "version": "2.0.0",
        "model": "binary classifier (MobileNetV2)",
        "status": "running"
    })


@app.route("/api/ping")
def ping():
    return jsonify({
        "status": "ok",
        "message": "Backend is alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": os.environ.get("ENVIRONMENT", "development")
    })


@app.route("/api/info")
def info():
    db_connected = get_db_connection() is not None
    storage_connected = bool(AZURE_STORAGE_CONNECTION_STRING)
    return jsonify({
        "service": "invasive-plants-backend",
        "python_version": os.sys.version,
        "hostname": os.environ.get("WEBSITE_HOSTNAME", "localhost"),
        "environment": os.environ.get("ENVIRONMENT", "development"),
        "ai_service_url": HF_SPACE_URL,
        "model_type": "binary_classifier_v2",
        "database_connected": db_connected,
        "storage_connected": storage_connected
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    if 'image' not in request.files:
        return jsonify({
            "error": "No image provided",
            "message": "Pošli obrázok v poli 'image' (multipart form)."
        }), 400

    image_file = request.files['image']

    if image_file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    # Upload obrázka do Azure Blob Storage
    image_url = upload_image_to_blob(image_file)

    # Volanie AI service na Hugging Face
    try:
        hf_endpoint = f"{HF_SPACE_URL}/predict"

        image_file.stream.seek(0)
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
            timeout=60
        )
        hf_response.raise_for_status()

        data = hf_response.json()
        scores = data.get('scores', [])

        if len(scores) != 1:
            return jsonify({
                "error": "Invalid AI response",
                "message": f"Expected 1 score (binary classifier), got {len(scores)}"
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

    invasive_score = scores[0]
    negative_score = 1 - invasive_score

    is_invasive = invasive_score > 0.5
    confidence = invasive_score if is_invasive else negative_score

    if is_invasive:
        message = "Na fotke je pravdepodobne invázny druh rastliny."
        recommendation = "Odporúčame nahlásiť to miestnym úradom alebo zelenej linke životného prostredia."
    else:
        message = "Na fotke pravdepodobne nie je invázny druh rastliny."
        recommendation = "Žiadna akcia nie je potrebná."

    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    save_detection(
        image_name=image_file.filename,
        image_url=image_url,
        is_invasive=bool(is_invasive),
        confidence=round(float(confidence), 3),
        confidence_percent=round(float(confidence) * 100, 1),
        message=message,
        recommendation=recommendation,
        client_ip=client_ip
    )

    return jsonify({
        "is_invasive": bool(is_invasive),
        "confidence": round(float(confidence), 3),
        "confidence_percent": round(float(confidence) * 100, 1),
        "message": message,
        "recommendation": recommendation,
        "image_url": image_url,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "debug": {
            "invasive_score": round(float(invasive_score), 3),
            "negative_score": round(float(negative_score), 3),
            "raw_scores": [round(float(s), 3) for s in scores],
            "model_type": "binary_v2"
        }
    })


@app.route("/api/history")
def history():
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database not available"}), 503

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, image_name, image_url, is_invasive, confidence_percent, message, timestamp, client_ip
                FROM detections
                ORDER BY timestamp DESC
                LIMIT 50
                """
            )
            rows = cur.fetchall()
        return jsonify({
            "count": len(rows),
            "detections": [dict(row) for row in rows]
        })
    finally:
        conn.close()


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
