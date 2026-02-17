# How to Deploy PyTorch Models on Vertex AI Using Custom Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, PyTorch, Custom Containers, Model Deployment

Description: A step-by-step guide to deploying PyTorch models on Vertex AI using custom serving containers with TorchServe and Flask-based approaches.

---

PyTorch has become the dominant framework in research and is increasingly popular in production. While Vertex AI provides pre-built PyTorch serving containers, they do not always cover every use case. You might need a specific PyTorch version, custom preprocessing, or a serving framework like TorchServe with particular handlers. Custom containers give you that control.

This guide covers two approaches to deploying PyTorch models: a lightweight Flask-based container for simpler models and a TorchServe-based container for production workloads that need batching, model versioning, and metrics out of the box.

## Approach 1: Flask-Based PyTorch Serving

For simpler deployments where you want full control and minimal overhead, a Flask server works well.

This is the complete serving application:

```python
# app.py - Flask-based PyTorch model server

import os
import json
import torch
import torch.nn as nn
import numpy as np
from flask import Flask, request, jsonify
from google.cloud import storage

app = Flask(__name__)

# Global model reference
model = None
device = None

class SentimentModel(nn.Module):
    """Example PyTorch model for sentiment classification."""

    def __init__(self, vocab_size=50000, embed_dim=128, hidden_dim=256, num_classes=3):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, _ = self.lstm(embedded)
        # Use the last hidden state
        pooled = lstm_out[:, -1, :]
        return self.classifier(pooled)

def download_model():
    """Download model weights from GCS."""
    model_uri = os.environ.get("AIP_STORAGE_URI", "")
    local_path = "/tmp/model_weights.pt"

    if model_uri.startswith("gs://"):
        # Parse GCS URI
        parts = model_uri.replace("gs://", "").split("/", 1)
        bucket_name = parts[0]
        blob_path = parts[1] + "/model_weights.pt" if len(parts) > 1 else "model_weights.pt"

        # Download from GCS
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_path)
        blob.download_to_filename(local_path)
        print(f"Downloaded model from {model_uri}")

    return local_path

def load_model():
    """Initialize the model and load weights."""
    global model, device

    # Use GPU if available
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # Create model architecture
    model = SentimentModel()

    # Load trained weights
    weights_path = download_model()
    state_dict = torch.load(weights_path, map_location=device)
    model.load_state_dict(state_dict)

    # Set to evaluation mode
    model.eval()
    model.to(device)

    # Warm up with a dummy prediction
    with torch.no_grad():
        dummy = torch.randint(0, 1000, (1, 128)).to(device)
        _ = model(dummy)

    print("Model loaded and warmed up")

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    if model is not None:
        return jsonify({"status": "healthy"}), 200
    return jsonify({"status": "loading"}), 503

@app.route("/predict", methods=["POST"])
def predict():
    """Prediction endpoint."""
    try:
        data = request.get_json()
        instances = data.get("instances", [])

        if not instances:
            return jsonify({"error": "No instances provided"}), 400

        # Convert input to tensor
        input_tensor = torch.tensor(instances, dtype=torch.long).to(device)

        # Run inference
        with torch.no_grad():
            logits = model(input_tensor)
            probabilities = torch.softmax(logits, dim=1)
            predictions = torch.argmax(probabilities, dim=1)

        # Build response
        labels = ["negative", "neutral", "positive"]
        results = []
        for pred, probs in zip(predictions, probabilities):
            results.append({
                "label": labels[pred.item()],
                "confidence": probs[pred.item()].item(),
                "probabilities": {
                    label: prob.item()
                    for label, prob in zip(labels, probs)
                }
            })

        return jsonify({"predictions": results}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    load_model()
    port = int(os.environ.get("AIP_HTTP_PORT", 8080))
    app.run(host="0.0.0.0", port=port, threaded=True)
```

The Dockerfile for this Flask-based server:

```dockerfile
FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install dependencies
RUN pip install flask gunicorn google-cloud-storage

# Copy the application
COPY app.py .

# Environment variables for Vertex AI
ENV AIP_HTTP_PORT=8080
ENV AIP_HEALTH_ROUTE=/health
ENV AIP_PREDICT_ROUTE=/predict

EXPOSE 8080

# Use gunicorn with proper worker configuration
# For GPU models, use 1 worker to avoid GPU memory issues
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "4", "--timeout", "120", "app:app"]
```

## Approach 2: TorchServe-Based Container

TorchServe provides production features like request batching, model versioning, metrics, and management APIs. It is more complex to set up but better suited for high-traffic production deployments.

First, create a custom handler for your model:

```python
# handler.py - TorchServe custom handler

import json
import torch
import logging
from ts.torch_handler.base_handler import BaseHandler

logger = logging.getLogger(__name__)

class SentimentHandler(BaseHandler):
    """Custom TorchServe handler for sentiment analysis."""

    def __init__(self):
        super().__init__()
        self.labels = ["negative", "neutral", "positive"]

    def preprocess(self, data):
        """Convert raw input to model-ready tensors.

        TorchServe passes a list of request objects.
        Each request has a 'body' field with the input data.
        """
        inputs = []
        for row in data:
            # Parse the request body
            if isinstance(row, dict):
                body = row.get("body", row)
            else:
                body = json.loads(row.get("data", "{}").decode("utf-8"))

            instances = body.get("instances", [body.get("data", [])])
            inputs.extend(instances)

        # Convert to tensor
        tensor = torch.tensor(inputs, dtype=torch.long)
        return tensor.to(self.device)

    def inference(self, input_tensor):
        """Run model inference."""
        with torch.no_grad():
            logits = self.model(input_tensor)
            probabilities = torch.softmax(logits, dim=1)
        return probabilities

    def postprocess(self, probabilities):
        """Convert model output to response format."""
        predictions = torch.argmax(probabilities, dim=1)

        results = []
        for pred, probs in zip(predictions, probabilities):
            results.append({
                "label": self.labels[pred.item()],
                "confidence": round(probs[pred.item()].item(), 4),
                "probabilities": {
                    label: round(prob.item(), 4)
                    for label, prob in zip(self.labels, probs)
                }
            })

        return [results]
```

Package the model for TorchServe:

```bash
# Package the model into a .mar archive
torch-model-archiver \
    --model-name sentiment \
    --version 1.0 \
    --serialized-file model_weights.pt \
    --handler handler.py \
    --extra-files "model.py" \
    --export-path model_store/

# Upload to GCS
gsutil cp model_store/sentiment.mar gs://your-bucket/models/sentiment/
```

The TorchServe configuration file:

```python
# config.properties - TorchServe configuration

inference_address=http://0.0.0.0:8080
management_address=http://0.0.0.0:8081
metrics_address=http://0.0.0.0:8082
number_of_netty_threads=4
job_queue_size=100
model_store=/home/model-server/model-store

# Batching configuration
batch_size=8
max_batch_delay=100

# Model loading
load_models=all
```

The Dockerfile for TorchServe:

```dockerfile
FROM pytorch/torchserve:0.9.0-gpu

# Copy configuration
COPY config.properties /home/model-server/config.properties

# Copy the model archive
COPY model_store/ /home/model-server/model-store/

# TorchServe exposes port 8080 for inference
EXPOSE 8080 8081 8082

# Start TorchServe
CMD ["torchserve", "--start", "--ncs", "--model-store", "/home/model-server/model-store", "--ts-config", "/home/model-server/config.properties", "--foreground"]
```

## Building, Pushing, and Deploying

Build and deploy the container to Vertex AI:

```bash
# Build the Docker image
docker build -t us-central1-docker.pkg.dev/your-project/ml-serving/pytorch-sentiment:v1 .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/your-project/ml-serving/pytorch-sentiment:v1
```

Deploy using the Python SDK:

```python
from google.cloud import aiplatform

aiplatform.init(project="your-project-id", location="us-central1")

# Upload the model
model = aiplatform.Model.upload(
    display_name="pytorch-sentiment-model",
    serving_container_image_uri=(
        "us-central1-docker.pkg.dev/your-project/ml-serving/pytorch-sentiment:v1"
    ),
    serving_container_health_route="/health",  # Flask: /health, TorchServe: /ping
    serving_container_predict_route="/predict",  # Flask: /predict, TorchServe: /predictions/sentiment
    serving_container_ports=[8080]
)

# Deploy to an endpoint
endpoint = aiplatform.Endpoint.create(display_name="sentiment-endpoint")

model.deploy(
    endpoint=endpoint,
    machine_type="n1-standard-4",
    accelerator_type="NVIDIA_TESLA_T4",
    accelerator_count=1,
    min_replica_count=1,
    max_replica_count=5
)
```

## Testing the Deployed Model

Verify the deployment is working:

```python
# Test with sample data
endpoint = aiplatform.Endpoint(
    "projects/your-project-id/locations/us-central1/endpoints/ENDPOINT_ID"
)

# Token IDs representing a sentence (from your tokenizer)
test_instances = [
    [101, 2023, 3185, 2001, 6919, 102, 0, 0],  # "this movie was great"
    [101, 5765, 2326, 1998, 11771, 102, 0, 0]   # "terrible waste of time"
]

response = endpoint.predict(instances=test_instances)

for pred in response.predictions:
    print(f"Label: {pred['label']}, Confidence: {pred['confidence']:.4f}")
```

## GPU Memory Management

PyTorch models on GPU need careful memory management, especially when handling variable batch sizes.

```python
@app.route("/predict", methods=["POST"])
def predict():
    """Prediction with GPU memory management."""
    try:
        data = request.get_json()
        instances = data.get("instances", [])

        input_tensor = torch.tensor(instances, dtype=torch.long).to(device)

        with torch.no_grad():
            # Use autocast for mixed precision on GPU
            with torch.cuda.amp.autocast():
                logits = model(input_tensor)
                probabilities = torch.softmax(logits, dim=1)

        # Move results to CPU to free GPU memory
        results = probabilities.cpu().numpy()

        # Periodically clear GPU cache
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return jsonify({"predictions": format_results(results)}), 200

    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        return jsonify({"error": "Batch too large for GPU memory"}), 413
```

Choosing between Flask and TorchServe depends on your requirements. Flask gives you maximum simplicity and control for straightforward serving scenarios. TorchServe adds request batching, model management, and built-in metrics for production deployments with higher throughput demands. Either way, custom containers let you deploy any PyTorch model on Vertex AI with the exact configuration you need.
