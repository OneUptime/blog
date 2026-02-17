# How to Deploy JAX Models on Vertex AI with Custom Serving Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, JAX, Custom Containers, Model Deployment

Description: Learn how to deploy JAX models on Vertex AI using custom serving containers with practical examples covering serialization, serving, and optimization.

---

JAX has become the framework of choice for many research teams and is increasingly used in production ML systems, particularly at Google. Its functional programming model, automatic differentiation, and native XLA compilation make it excellent for high-performance inference. But unlike TensorFlow and PyTorch, Vertex AI does not provide a pre-built serving container for JAX, so you need to build your own.

This guide covers the full process: serializing your JAX model, building a custom serving container, deploying it to Vertex AI, and optimizing for production inference.

## Serializing JAX Models

JAX models are just Python functions and parameter arrays. You need to save the parameters and be able to reconstruct the model function at serving time.

This code shows different approaches to saving JAX model artifacts:

```python
# save_model.py - Save JAX model for serving

import jax
import jax.numpy as jnp
import flax.linen as nn
from flax.training import checkpoints
import pickle
import json

# Define a simple Flax model
class TextClassifier(nn.Module):
    vocab_size: int = 50000
    embed_dim: int = 256
    hidden_dim: int = 512
    num_classes: int = 5

    @nn.compact
    def __call__(self, x, training=False):
        x = nn.Embed(self.vocab_size, self.embed_dim)(x)
        x = jnp.mean(x, axis=1)  # Simple mean pooling
        x = nn.Dense(self.hidden_dim)(x)
        x = nn.relu(x)
        if training:
            x = nn.Dropout(0.3)(x, deterministic=False)
        x = nn.Dense(self.num_classes)(x)
        return x

# Initialize and save the model
model = TextClassifier()
key = jax.random.PRNGKey(42)
dummy_input = jnp.ones((1, 128), dtype=jnp.int32)
params = model.init(key, dummy_input)

# Option 1: Save with Flax checkpoints
checkpoints.save_checkpoint(
    ckpt_dir="model_artifacts/",
    target=params,
    step=0,
    overwrite=True
)

# Option 2: Save as a pickle file (simpler but less portable)
with open("model_artifacts/params.pkl", "wb") as f:
    pickle.dump(params, f)

# Save model configuration
config = {
    "vocab_size": 50000,
    "embed_dim": 256,
    "hidden_dim": 512,
    "num_classes": 5,
    "max_seq_length": 128
}
with open("model_artifacts/config.json", "w") as f:
    json.dump(config, f)

print("Model saved successfully")
```

## Building the Serving Container

The serving container needs to load the JAX model parameters, reconstruct the model, and serve predictions through an HTTP API.

This is the serving application:

```python
# server.py - JAX model serving with Flask

import os
import json
import pickle
import numpy as np
import jax
import jax.numpy as jnp
import flax.linen as nn
from flax.training import checkpoints
from flask import Flask, request, jsonify
from google.cloud import storage
import functools

app = Flask(__name__)

# Global state
model = None
params = None
predict_fn = None

class TextClassifier(nn.Module):
    """Same model definition as training - must match exactly."""
    vocab_size: int = 50000
    embed_dim: int = 256
    hidden_dim: int = 512
    num_classes: int = 5

    @nn.compact
    def __call__(self, x, training=False):
        x = nn.Embed(self.vocab_size, self.embed_dim)(x)
        x = jnp.mean(x, axis=1)
        x = nn.Dense(self.hidden_dim)(x)
        x = nn.relu(x)
        x = nn.Dense(self.num_classes)(x)
        return x

def download_artifacts(gcs_uri, local_dir="/tmp/model"):
    """Download model artifacts from GCS."""
    os.makedirs(local_dir, exist_ok=True)

    if not gcs_uri.startswith("gs://"):
        return gcs_uri

    parts = gcs_uri.replace("gs://", "").split("/", 1)
    bucket_name = parts[0]
    prefix = parts[1] if len(parts) > 1 else ""

    client = storage.Client()
    bucket = client.bucket(bucket_name)

    for blob in bucket.list_blobs(prefix=prefix):
        relative = blob.name[len(prefix):].lstrip("/")
        local_path = os.path.join(local_dir, relative)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        blob.download_to_filename(local_path)

    return local_dir

def load_model():
    """Load model and create JIT-compiled prediction function."""
    global model, params, predict_fn

    # Download artifacts from GCS
    model_dir = download_artifacts(
        os.environ.get("AIP_STORAGE_URI", "/models")
    )

    # Load configuration
    with open(os.path.join(model_dir, "config.json")) as f:
        config = json.load(f)

    # Create model instance
    model = TextClassifier(**{
        k: v for k, v in config.items()
        if k in ["vocab_size", "embed_dim", "hidden_dim", "num_classes"]
    })

    # Load parameters
    with open(os.path.join(model_dir, "params.pkl"), "rb") as f:
        params = pickle.load(f)

    # Create a JIT-compiled prediction function for fast inference
    @jax.jit
    def _predict(params, x):
        logits = model.apply(params, x, training=False)
        return jax.nn.softmax(logits, axis=-1)

    predict_fn = _predict

    # Warm up the JIT compilation
    dummy = jnp.ones((1, config["max_seq_length"]), dtype=jnp.int32)
    _ = predict_fn(params, dummy)
    print("Model loaded and JIT-compiled")

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    if predict_fn is not None:
        return jsonify({"status": "healthy"}), 200
    return jsonify({"status": "loading"}), 503

@app.route("/predict", methods=["POST"])
def predict():
    """Prediction endpoint."""
    try:
        data = request.get_json()
        instances = data.get("instances", [])

        # Convert to JAX array
        input_array = jnp.array(instances, dtype=jnp.int32)

        # Run JIT-compiled prediction
        probabilities = predict_fn(params, input_array)

        # Convert back to Python types
        probs_np = np.array(probabilities)
        predictions = np.argmax(probs_np, axis=1)

        labels = ["very_negative", "negative", "neutral", "positive", "very_positive"]

        results = []
        for pred, probs in zip(predictions, probs_np):
            results.append({
                "label": labels[pred],
                "confidence": float(probs[pred]),
                "probabilities": {
                    label: float(prob)
                    for label, prob in zip(labels, probs)
                }
            })

        return jsonify({"predictions": results}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    load_model()
    port = int(os.environ.get("AIP_HTTP_PORT", 8080))
    app.run(host="0.0.0.0", port=port)
```

## The Dockerfile

This Dockerfile builds a container with JAX and GPU support:

```dockerfile
# Use a CUDA base for GPU support
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Install Python
RUN apt-get update && apt-get install -y \
    python3.10 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install JAX with GPU support
RUN pip3 install --no-cache-dir \
    "jax[cuda12_pip]==0.4.20" \
    -f https://storage.googleapis.com/jax-releases/jax_cuda_releases.html

# Install other dependencies
RUN pip3 install --no-cache-dir \
    flax==0.7.5 \
    flask==3.0.0 \
    gunicorn==21.2.0 \
    google-cloud-storage==2.13.0 \
    numpy==1.26.0

# Copy application code
COPY server.py .

# Environment variables
ENV AIP_HTTP_PORT=8080
ENV AIP_HEALTH_ROUTE=/health
ENV AIP_PREDICT_ROUTE=/predict
ENV XLA_PYTHON_CLIENT_PREALLOCATE=false
ENV XLA_PYTHON_CLIENT_MEM_FRACTION=0.8

EXPOSE 8080

# Single worker for GPU - use threads for concurrency
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "4", "--timeout", "120", "server:app"]
```

## Deploying to Vertex AI

Build, push, and deploy the container:

```bash
# Build and push
docker build -t us-central1-docker.pkg.dev/your-project/ml-serving/jax-classifier:v1 .
docker push us-central1-docker.pkg.dev/your-project/ml-serving/jax-classifier:v1
```

Deploy using the SDK:

```python
from google.cloud import aiplatform

aiplatform.init(project="your-project-id", location="us-central1")

model = aiplatform.Model.upload(
    display_name="jax-text-classifier",
    artifact_uri="gs://your-bucket/models/jax-classifier/",
    serving_container_image_uri=(
        "us-central1-docker.pkg.dev/your-project/ml-serving/jax-classifier:v1"
    ),
    serving_container_health_route="/health",
    serving_container_predict_route="/predict",
    serving_container_ports=[8080],
    serving_container_environment_variables={
        "XLA_PYTHON_CLIENT_PREALLOCATE": "false",
        "XLA_PYTHON_CLIENT_MEM_FRACTION": "0.8"
    }
)

endpoint = aiplatform.Endpoint.create(display_name="jax-classifier-endpoint")

model.deploy(
    endpoint=endpoint,
    machine_type="n1-standard-4",
    accelerator_type="NVIDIA_TESLA_T4",
    accelerator_count=1,
    min_replica_count=1,
    max_replica_count=3
)
```

## Optimizing JAX Inference

JAX's JIT compilation is the biggest performance lever. But there are subtleties to getting it right.

This code shows optimized inference with batch padding:

```python
# Optimized inference with static shapes for JAX JIT

import jax
import jax.numpy as jnp

# Pre-compile for common batch sizes to avoid recompilation
BATCH_SIZES = [1, 4, 8, 16, 32]

@functools.partial(jax.jit, static_argnums=(2,))
def predict_padded(params, x, batch_size):
    """JIT-compiled prediction with static batch size.

    Using static_argnums for batch_size means JAX compiles
    a separate optimized version for each batch size.
    """
    logits = model.apply(params, x, training=False)
    return jax.nn.softmax(logits, axis=-1)

def predict_with_padding(instances):
    """Predict with batch padding for optimal JIT performance."""
    actual_batch = len(instances)

    # Find the next pre-compiled batch size
    target_batch = actual_batch
    for bs in BATCH_SIZES:
        if bs >= actual_batch:
            target_batch = bs
            break

    # Pad the input to match the target batch size
    input_array = jnp.array(instances, dtype=jnp.int32)
    if actual_batch < target_batch:
        padding = jnp.zeros((target_batch - actual_batch, input_array.shape[1]), dtype=jnp.int32)
        input_array = jnp.concatenate([input_array, padding], axis=0)

    # Run prediction
    probs = predict_padded(params, input_array, target_batch)

    # Return only the actual predictions (discard padding)
    return probs[:actual_batch]

# Pre-warm all batch sizes during startup
def warmup():
    for bs in BATCH_SIZES:
        dummy = jnp.ones((bs, 128), dtype=jnp.int32)
        _ = predict_padded(params, dummy, bs)
    print(f"JIT-compiled for batch sizes: {BATCH_SIZES}")
```

## CPU-Only Deployment

Not all JAX models need a GPU. For smaller models, CPU deployment is more cost-effective.

```dockerfile
# CPU-only JAX Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install JAX CPU-only version
RUN pip install --no-cache-dir \
    jax==0.4.20 \
    jaxlib==0.4.20 \
    flax==0.7.5 \
    flask==3.0.0 \
    gunicorn==21.2.0 \
    google-cloud-storage==2.13.0

COPY server.py .

ENV AIP_HTTP_PORT=8080

# More workers on CPU since there is no GPU contention
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "4", "--threads", "2", "--timeout", "120", "server:app"]
```

For CPU deployment, use more gunicorn workers since there is no shared GPU resource to contend over. Four workers with two threads each handles moderate traffic well on an n1-standard-4 machine.

JAX models on Vertex AI require more setup than TensorFlow or PyTorch due to the lack of pre-built containers, but the performance benefits of XLA compilation and JAX's efficient memory management make it worthwhile for inference-heavy production workloads.
