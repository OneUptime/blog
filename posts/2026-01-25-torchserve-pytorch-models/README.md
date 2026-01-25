# How to Configure TorchServe for PyTorch Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PyTorch, TorchServe, Model Serving, MLOps, Machine Learning

Description: Learn how to deploy PyTorch models with TorchServe, including model packaging, custom handlers, batching, and production monitoring.

---

PyTorch is excellent for research and experimentation, but deploying PyTorch models to production requires additional tooling. TorchServe is the official model serving solution from PyTorch, designed to handle the complexity of production deployments while staying close to the PyTorch ecosystem.

## Why TorchServe?

TorchServe provides production-ready model serving with:

- Easy model packaging with Model Archive (MAR)
- Built-in support for common model types
- Custom handlers for preprocessing and postprocessing
- Dynamic batching for improved throughput
- Model versioning and A/B testing
- Prometheus metrics and logging
- Multi-model serving on a single server

## Installation

Install TorchServe and its dependencies:

```bash
# Install Java 11 (required)
# On Ubuntu:
sudo apt-get install openjdk-11-jdk

# On macOS:
brew install openjdk@11

# Install TorchServe and model archiver
pip install torchserve torch-model-archiver torch-workflow-archiver

# Verify installation
torchserve --version
```

## Preparing Your Model

First, save your PyTorch model. TorchServe supports both eager mode and TorchScript:

```python
import torch
import torch.nn as nn

# Define a simple model
class SimpleClassifier(nn.Module):
    def __init__(self, input_size=10, hidden_size=64, num_classes=3):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, num_classes)
        )

    def forward(self, x):
        return self.layers(x)

# Create and train model (simplified)
model = SimpleClassifier()
model.eval()

# Save for eager mode loading
torch.save(model.state_dict(), "model_weights.pth")

# Or save as TorchScript (recommended for production)
scripted_model = torch.jit.script(model)
scripted_model.save("model_scripted.pt")

# Or trace the model (for models with static control flow)
example_input = torch.randn(1, 10)
traced_model = torch.jit.trace(model, example_input)
traced_model.save("model_traced.pt")
```

## Creating a Model Archive

Package your model into a MAR file:

```bash
# For a TorchScript model with default handler
torch-model-archiver \
    --model-name classifier \
    --version 1.0 \
    --serialized-file model_scripted.pt \
    --handler base_handler \
    --export-path model_store

# For an eager mode model (requires model definition file)
torch-model-archiver \
    --model-name classifier \
    --version 1.0 \
    --model-file model.py \
    --serialized-file model_weights.pth \
    --handler base_handler \
    --export-path model_store
```

## Writing Custom Handlers

Custom handlers let you control preprocessing, inference, and postprocessing:

```python
# handler.py
import torch
import json
import logging
from ts.torch_handler.base_handler import BaseHandler

logger = logging.getLogger(__name__)

class ClassifierHandler(BaseHandler):
    """Custom handler for classification models."""

    def __init__(self):
        super().__init__()
        self.initialized = False

    def initialize(self, context):
        """Load model and initialize components."""
        self.manifest = context.manifest
        properties = context.system_properties
        model_dir = properties.get("model_dir")

        # Load class labels if provided
        mapping_file = f"{model_dir}/index_to_name.json"
        try:
            with open(mapping_file) as f:
                self.mapping = json.load(f)
        except FileNotFoundError:
            self.mapping = None

        # Load the model
        serialized_file = self.manifest["model"]["serializedFile"]
        model_path = f"{model_dir}/{serialized_file}"

        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.model = torch.jit.load(model_path, map_location=self.device)
        self.model.eval()

        self.initialized = True
        logger.info(f"Model loaded on {self.device}")

    def preprocess(self, data):
        """Convert input data to tensor."""
        preprocessed = []

        for row in data:
            # Handle different input formats
            if isinstance(row, dict) and "body" in row:
                input_data = row["body"]
            else:
                input_data = row

            # Parse JSON if needed
            if isinstance(input_data, (bytes, bytearray)):
                input_data = json.loads(input_data.decode("utf-8"))

            # Convert to tensor
            tensor = torch.tensor(input_data["features"], dtype=torch.float32)
            preprocessed.append(tensor)

        # Stack into batch
        return torch.stack(preprocessed).to(self.device)

    def inference(self, data):
        """Run model inference."""
        with torch.no_grad():
            outputs = self.model(data)
            probabilities = torch.softmax(outputs, dim=1)
        return probabilities

    def postprocess(self, data):
        """Convert model output to response format."""
        results = []

        for probs in data:
            predicted_class = probs.argmax().item()
            confidence = probs[predicted_class].item()

            result = {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "probabilities": probs.tolist()
            }

            # Add class name if mapping exists
            if self.mapping:
                result["class_name"] = self.mapping.get(
                    str(predicted_class), "unknown"
                )

            results.append(result)

        return results
```

Package with the custom handler:

```bash
torch-model-archiver \
    --model-name classifier \
    --version 1.0 \
    --serialized-file model_scripted.pt \
    --handler handler.py \
    --extra-files index_to_name.json \
    --export-path model_store
```

## Starting TorchServe

Create a configuration file and start the server:

```properties
# config.properties
inference_address=http://0.0.0.0:8080
management_address=http://0.0.0.0:8081
metrics_address=http://0.0.0.0:8082
model_store=/home/model-server/model-store
load_models=all
number_of_netty_threads=4
job_queue_size=100
default_workers_per_model=1

# Enable batching
enable_batch=true
batch_size=32
max_batch_delay=100

# GPU settings (if available)
number_of_gpu=1

# Logging
async_logging=true
```

Start the server:

```bash
# Start TorchServe with configuration
torchserve --start \
    --model-store model_store \
    --models classifier=classifier.mar \
    --ts-config config.properties

# Check server status
curl http://localhost:8080/ping

# Stop the server
torchserve --stop
```

## Making Predictions

```python
import requests
import json

# Prepare input data
input_data = {
    "features": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
}

# Single prediction
response = requests.post(
    "http://localhost:8080/predictions/classifier",
    json=input_data
)
print(response.json())

# Batch prediction
batch_data = [
    {"features": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]},
    {"features": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]},
]

response = requests.post(
    "http://localhost:8080/predictions/classifier",
    json=batch_data
)
print(response.json())
```

## Model Management API

Use the management API to register, unregister, and scale models:

```bash
# List registered models
curl http://localhost:8081/models

# Get model details
curl http://localhost:8081/models/classifier

# Register a new model
curl -X POST "http://localhost:8081/models?url=classifier.mar&model_name=classifier_v2"

# Scale workers
curl -X PUT "http://localhost:8081/models/classifier?min_worker=2&max_worker=4"

# Set default version
curl -X PUT "http://localhost:8081/models/classifier/1.0/set-default"

# Unregister a model
curl -X DELETE "http://localhost:8081/models/classifier"
```

## Docker Deployment

Create a Docker image for TorchServe:

```dockerfile
# Dockerfile
FROM pytorch/torchserve:latest-gpu

# Copy model archives
COPY model_store /home/model-server/model-store

# Copy configuration
COPY config.properties /home/model-server/config.properties

# Set environment variables
ENV TS_CONFIG_FILE=/home/model-server/config.properties

# Expose ports
EXPOSE 8080 8081 8082

# Start TorchServe
CMD ["torchserve", \
     "--start", \
     "--model-store", "/home/model-server/model-store", \
     "--models", "classifier=classifier.mar", \
     "--foreground"]
```

Build and run:

```bash
# Build the image
docker build -t my-torchserve:v1 .

# Run with GPU support
docker run -d --gpus all \
    -p 8080:8080 -p 8081:8081 -p 8082:8082 \
    --name torchserve \
    my-torchserve:v1
```

## Kubernetes Deployment

```yaml
# torchserve-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: torchserve
  namespace: ml-serving
spec:
  replicas: 2
  selector:
    matchLabels:
      app: torchserve
  template:
    metadata:
      labels:
        app: torchserve
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8082"
    spec:
      containers:
        - name: torchserve
          image: my-torchserve:v1
          ports:
            - containerPort: 8080
              name: inference
            - containerPort: 8081
              name: management
            - containerPort: 8082
              name: metrics
          resources:
            limits:
              nvidia.com/gpu: "1"
              memory: "8Gi"
            requests:
              memory: "4Gi"
              cpu: "2"
          readinessProbe:
            httpGet:
              path: /ping
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /ping
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
          volumeMounts:
            - name: model-store
              mountPath: /home/model-server/model-store
      volumes:
        - name: model-store
          persistentVolumeClaim:
            claimName: model-store-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: torchserve
  namespace: ml-serving
spec:
  selector:
    app: torchserve
  ports:
    - port: 8080
      targetPort: 8080
      name: inference
    - port: 8081
      targetPort: 8081
      name: management
    - port: 8082
      targetPort: 8082
      name: metrics
  type: ClusterIP
```

## Monitoring with Prometheus

TorchServe exposes metrics at `/metrics` on port 8082:

```yaml
# prometheus-scrape-config.yaml
scrape_configs:
  - job_name: 'torchserve'
    static_configs:
      - targets: ['torchserve:8082']
```

Key metrics to monitor:

```promql
# Request count by model
ts_inference_requests_total{model_name="classifier"}

# Inference latency
histogram_quantile(0.95, ts_inference_latency_ms_bucket{model_name="classifier"})

# Queue time
histogram_quantile(0.95, ts_queue_latency_ms_bucket{model_name="classifier"})

# GPU memory usage
ts_gpu_memory_used_bytes

# Worker count
ts_model_workers{model_name="classifier"}
```

## Optimizing Performance

### Enable TorchScript Optimizations

```python
import torch

# Load and optimize the model
model = torch.jit.load("model_scripted.pt")

# Freeze the model (removes unused attributes)
model = torch.jit.freeze(model)

# Optimize for inference
model = torch.jit.optimize_for_inference(model)

# Save the optimized model
model.save("model_optimized.pt")
```

### Use Mixed Precision

```python
# In your handler
def inference(self, data):
    with torch.no_grad():
        with torch.cuda.amp.autocast():
            outputs = self.model(data)
    return outputs
```

---

TorchServe brings production-grade serving to PyTorch models without requiring you to rewrite your model code. Start with the built-in handlers, then customize as your requirements grow. The management API makes it easy to update models without restarting the server, enabling true continuous deployment of ML models.
