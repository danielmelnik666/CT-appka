"""
Invasive Plants Detection - AI Service
Flask API hostované na AWS App Runner.
"""
import os
import json
import base64
import io
import numpy as np
from PIL import Image
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Globálne načítanie modelu (raz pri štarte servera)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.tflite')
LABELS_PATH = os.path.join(os.path.dirname(__file__), 'labels.json')
IMG_SIZE = 224

print("Loading TFLite model...")
interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()
print(f"Model loaded. Input shape: {input_details[0]['shape']}")

with open(LABELS_PATH, 'r', encoding='utf-8') as f:
    LABELS = json.load(f)
print(f"Labels loaded: {len(LABELS)} classes")


def preprocess_image(image_bytes):
    """Priprav obrázok pre MobileNetV2"""
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((IMG_SIZE, IMG_SIZE))
    img_array = np.array(img, dtype=np.float32)
    # MobileNetV2 preprocessing: [-1, 1]
    img_array = (img_array / 127.5) - 1.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array


def predict_species(image_array):
    """Spusti inferenciu"""
    interpreter.set_tensor(input_details[0]['index'], image_array)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]['index'])[0]
    
    top_3_idx = np.argsort(output)[-3:][::-1]
    top_3 = [{
        'class_id': int(idx),
        'species': LABELS[str(idx)]['name'],
        'is_invasive': LABELS[str(idx)]['invasive'],
        'confidence': float(output[idx])
    } for idx in top_3_idx]
    
    best_idx = int(np.argmax(output))
    return {
        'prediction': {
            'class_id': best_idx,
            'species': LABELS[str(best_idx)]['name'],
            'is_invasive': LABELS[str(best_idx)]['invasive'],
            'confidence': float(output[best_idx])
        },
        'top_3': top_3,
        'model_version': '1.0.0'
    }


@app.route("/")
def root():
    return jsonify({
        "service": "Invasive Plants AI Service",
        "status": "running",
        "endpoints": {
            "GET /": "This info",
            "GET /health": "Health check",
            "POST /predict": "Image classification (multipart or JSON with base64)"
        }
    })


@app.route("/health")
def health():
    return jsonify({"status": "ok", "model_loaded": True})


@app.route("/predict", methods=["POST"])
def predict():
    try:
        image_bytes = None
        
        # Option 1: multipart form upload (file)
        if 'image' in request.files:
            image_bytes = request.files['image'].read()
        
        # Option 2: JSON s base64
        elif request.is_json:
            data = request.get_json()
            if 'image' in data:
                image_bytes = base64.b64decode(data['image'])
        
        if not image_bytes:
            return jsonify({"error": "No image provided"}), 400
        
        # Preprocess + predict
        image_array = preprocess_image(image_bytes)
        result = predict_species(image_array)
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # App Runner očakáva port 8080
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
