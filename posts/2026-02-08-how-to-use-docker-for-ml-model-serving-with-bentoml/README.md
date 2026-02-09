# How to Use Docker for ML Model Serving with BentoML

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, BentoML, Machine Learning, Model Serving, MLOps, API, Python, Deployment

Description: Step-by-step guide to packaging and serving machine learning models as Docker containers using BentoML.

---

Getting a machine learning model from a Jupyter notebook into production is one of the biggest challenges in the ML lifecycle. BentoML bridges that gap by turning trained models into production-ready API services, complete with Docker images you can deploy anywhere. It handles serialization, API routing, input validation, batching, and containerization so you can focus on the model itself.

This guide walks through the full workflow: saving a model, defining a service, building a Docker image, and deploying it.

## What BentoML Brings to the Table

BentoML is not just a Flask wrapper around your model. It provides adaptive batching, which groups incoming requests and processes them in a single forward pass for better GPU utilization. It ships with built-in support for all major frameworks: PyTorch, TensorFlow, scikit-learn, XGBoost, and many more. And its containerization story is first-class, producing optimized Docker images with multi-stage builds and proper CUDA support.

## Installing BentoML

Start by installing BentoML in your development environment.

```bash
# Install BentoML with all dependencies
pip install bentoml scikit-learn pandas
```

## Training and Saving a Model

First, train a model and save it to the BentoML model store. This example uses scikit-learn, but the same pattern works with any supported framework.

```python
# train.py - Train a model and save it to BentoML's model store
import bentoml
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

# Load the Iris dataset
X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train a Random Forest classifier
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate the model
accuracy = model.score(X_test, y_test)
print(f"Model accuracy: {accuracy:.4f}")

# Save the model to BentoML's local model store
saved_model = bentoml.sklearn.save_model(
    "iris_classifier",
    model,
    signatures={"predict": {"batchable": True}},  # Enable adaptive batching
    metadata={"accuracy": accuracy}
)
print(f"Model saved: {saved_model}")
```

Run the training script.

```bash
# Train and save the model
python train.py

# List saved models
bentoml models list
```

## Defining the BentoML Service

A BentoML service defines how your model handles requests. It specifies the API endpoints, input/output types, and any pre/post-processing logic.

```python
# service.py - Define the BentoML service for the Iris classifier
import numpy as np
import bentoml
from bentoml.io import NumpyNdarray, JSON

# Load the model from the local store
iris_model_runner = bentoml.sklearn.get("iris_classifier:latest").to_runner()

# Create the service
svc = bentoml.Service("iris_classifier_service", runners=[iris_model_runner])

# Map class indices to species names
SPECIES = ["setosa", "versicolor", "virginica"]

@svc.api(input=NumpyNdarray(), output=JSON())
async def predict(input_array: np.ndarray) -> dict:
    """Predict the species of an iris flower from its measurements."""
    predictions = await iris_model_runner.predict.async_run(input_array)
    species = [SPECIES[p] for p in predictions]
    return {"predictions": species}

@svc.api(input=JSON(), output=JSON())
async def predict_json(input_data: dict) -> dict:
    """Accept JSON input with named features."""
    features = np.array([[
        input_data["sepal_length"],
        input_data["sepal_width"],
        input_data["petal_length"],
        input_data["petal_width"]
    ]])
    predictions = await iris_model_runner.predict.async_run(features)
    return {
        "species": SPECIES[predictions[0]],
        "confidence": "high"
    }
```

Test the service locally before containerizing.

```bash
# Run the service locally for testing
bentoml serve service:svc --reload

# In another terminal, test with curl
curl -X POST http://localhost:3000/predict \
  -H "Content-Type: application/json" \
  -d "[[5.1, 3.5, 1.4, 0.2]]"

# Test the JSON endpoint
curl -X POST http://localhost:3000/predict_json \
  -H "Content-Type: application/json" \
  -d '{"sepal_length": 5.1, "sepal_width": 3.5, "petal_length": 1.4, "petal_width": 0.2}'
```

## Building the Bento (Deployable Bundle)

A "Bento" packages your service code, model, and dependencies into a single artifact. Define the build configuration in a `bentofile.yaml`.

```yaml
# bentofile.yaml - Build configuration for the Bento
service: "service:svc"
labels:
  owner: ml-team
  project: iris-classifier

# Include these files in the Bento
include:
  - "*.py"

# Python package dependencies
python:
  packages:
    - scikit-learn==1.4.0
    - numpy
    - pandas

# Docker image configuration
docker:
  python_version: "3.11"
  system_packages:
    - curl  # Useful for health checks
```

Build the Bento.

```bash
# Build the Bento package
bentoml build

# List built Bentos
bentoml list
```

## Containerizing with Docker

BentoML generates an optimized Dockerfile and builds the Docker image for you.

```bash
# Build a Docker image from the Bento
bentoml containerize iris_classifier_service:latest

# Verify the image was created
docker images | grep iris_classifier
```

Run the containerized model service.

```bash
# Run the container on port 3000
docker run -d \
  --name iris-service \
  -p 3000:3000 \
  iris_classifier_service:latest

# Test the running container
curl -X POST http://localhost:3000/predict \
  -H "Content-Type: application/json" \
  -d "[[5.1, 3.5, 1.4, 0.2], [6.7, 3.0, 5.2, 2.3]]"
```

## GPU-Enabled Model Serving

For deep learning models that need GPU inference, BentoML supports CUDA-enabled containers.

```yaml
# bentofile-gpu.yaml - GPU-enabled build configuration
service: "service:svc"

python:
  packages:
    - torch
    - torchvision

docker:
  python_version: "3.11"
  cuda_version: "12.1"  # BentoML handles CUDA setup automatically
  distro: "debian"
```

```bash
# Build with GPU support
bentoml containerize my_pytorch_service:latest --opt platform=linux/amd64

# Run with GPU access
docker run -d \
  --gpus all \
  -p 3000:3000 \
  my_pytorch_service:latest
```

## Custom Dockerfile for Advanced Use Cases

If you need more control over the container image, BentoML lets you use a custom Dockerfile.

```yaml
# bentofile-custom.yaml - Using a custom Dockerfile
service: "service:svc"

include:
  - "*.py"

python:
  packages:
    - scikit-learn

docker:
  dockerfile_template: "Dockerfile.template"
```

```dockerfile
# Dockerfile.template - Custom Dockerfile for BentoML
{% extends bento_base_template %}

{% block SETUP_BENTO_COMPONENTS %}
{{ super() }}

# Add custom system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Add a health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3000/healthz || exit 1
{% endblock %}
```

## Docker Compose for Production Deployment

In production, you likely want to run the model service behind a reverse proxy with monitoring.

```yaml
# docker-compose.yml - Production deployment stack
version: "3.8"

services:
  iris-service:
    image: iris_classifier_service:latest
    container_name: iris-service
    ports:
      - "3000:3000"
    environment:
      - BENTOML_CONFIG=/home/bentoml/config.yaml
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - iris-service
```

## Monitoring and Metrics

BentoML exposes Prometheus metrics out of the box. You can scrape these metrics and visualize them in Grafana.

```bash
# Check the metrics endpoint
curl http://localhost:3000/metrics
```

Key metrics to monitor include request latency, batch sizes, queue depth, and error rates. These tell you whether your model service is keeping up with traffic and whether batching is working effectively.

## Wrapping Up

BentoML transforms the messy process of deploying ML models into a clean, repeatable workflow. You save a model, define a service, build a Bento, and containerize it. The resulting Docker image is production-ready with health checks, metrics, adaptive batching, and proper dependency management. Whether you are serving a simple scikit-learn classifier or a large language model, the workflow stays the same. That consistency is what makes BentoML worth adopting.
