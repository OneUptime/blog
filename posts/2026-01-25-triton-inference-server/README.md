# How to Implement Triton Inference Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Triton, NVIDIA, Model Serving, MLOps, GPU

Description: Learn how to deploy ML models with NVIDIA Triton Inference Server for high-performance multi-framework serving with dynamic batching and model ensembles.

---

When you need to serve models from different frameworks on the same infrastructure, NVIDIA Triton Inference Server shines. It supports TensorFlow, PyTorch, ONNX, TensorRT, and Python backends, all with optimized GPU utilization and dynamic batching. Triton is the go-to solution for high-performance inference at scale.

## Why Triton?

Triton Inference Server provides enterprise-grade features:

- Multi-framework support (TensorFlow, PyTorch, ONNX, TensorRT, OpenVINO)
- Dynamic batching across requests
- Concurrent model execution
- Model ensembles for complex pipelines
- GPU and CPU inference
- gRPC and HTTP endpoints
- Prometheus metrics

## Setting Up Triton

The easiest way to run Triton is with Docker:

```bash
# Pull the Triton image
docker pull nvcr.io/nvidia/tritonserver:24.01-py3

# Create model repository structure
mkdir -p models/my_model/1

# Run Triton
docker run --gpus all -p 8000:8000 -p 8001:8001 -p 8002:8002 \
    -v $(pwd)/models:/models \
    nvcr.io/nvidia/tritonserver:24.01-py3 \
    tritonserver --model-repository=/models
```

Ports:
- 8000: HTTP endpoint
- 8001: gRPC endpoint
- 8002: Metrics endpoint

## Model Repository Structure

Triton requires a specific directory structure:

```
models/
  text_classifier/
    config.pbtxt            # Model configuration
    1/                      # Version 1
      model.onnx
    2/                      # Version 2
      model.onnx
  image_classifier/
    config.pbtxt
    1/
      model.savedmodel/     # TensorFlow SavedModel
  pytorch_model/
    config.pbtxt
    1/
      model.pt              # TorchScript model
```

## Preparing Models

### ONNX Model

Export a PyTorch model to ONNX:

```python
import torch
import torch.nn as nn

class TextClassifier(nn.Module):
    def __init__(self, vocab_size=10000, embed_dim=128, num_classes=3):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.fc = nn.Sequential(
            nn.Linear(embed_dim, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        x = self.embedding(x)
        x = x.mean(dim=1)  # Average pooling
        return self.fc(x)

model = TextClassifier()
model.eval()

# Create dummy input
dummy_input = torch.randint(0, 10000, (1, 128))

# Export to ONNX
torch.onnx.export(
    model,
    dummy_input,
    "models/text_classifier/1/model.onnx",
    input_names=["input_ids"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch_size", 1: "sequence_length"},
        "logits": {0: "batch_size"}
    },
    opset_version=14
)
```

### Model Configuration

Create `config.pbtxt` for each model:

```protobuf
# models/text_classifier/config.pbtxt
name: "text_classifier"
platform: "onnxruntime_onnx"
max_batch_size: 64

input [
  {
    name: "input_ids"
    data_type: TYPE_INT64
    dims: [ -1 ]  # Variable sequence length
  }
]

output [
  {
    name: "logits"
    data_type: TYPE_FP32
    dims: [ 3 ]
  }
]

# Dynamic batching configuration
dynamic_batching {
  preferred_batch_size: [ 8, 16, 32, 64 ]
  max_queue_delay_microseconds: 100
}

# Instance group (number of model instances)
instance_group [
  {
    count: 2
    kind: KIND_GPU
    gpus: [ 0 ]
  }
]

# Version policy
version_policy: { latest { num_versions: 2 } }
```

### TensorFlow SavedModel

```protobuf
# models/image_classifier/config.pbtxt
name: "image_classifier"
platform: "tensorflow_savedmodel"
max_batch_size: 32

input [
  {
    name: "input_image"
    data_type: TYPE_FP32
    dims: [ 224, 224, 3 ]
  }
]

output [
  {
    name: "predictions"
    data_type: TYPE_FP32
    dims: [ 1000 ]
  }
]

dynamic_batching {
  preferred_batch_size: [ 8, 16, 32 ]
  max_queue_delay_microseconds: 50
}

instance_group [
  {
    count: 1
    kind: KIND_GPU
  }
]
```

### PyTorch TorchScript

```protobuf
# models/pytorch_model/config.pbtxt
name: "pytorch_model"
platform: "pytorch_libtorch"
max_batch_size: 64

input [
  {
    name: "INPUT__0"
    data_type: TYPE_FP32
    dims: [ 10 ]
  }
]

output [
  {
    name: "OUTPUT__0"
    data_type: TYPE_FP32
    dims: [ 1 ]
  }
]

dynamic_batching { }
```

## Making Inference Requests

### Python Client

Install the Triton client library:

```bash
pip install tritonclient[all]
```

Make requests:

```python
import tritonclient.http as httpclient
import tritonclient.grpc as grpcclient
import numpy as np

# HTTP client
http_client = httpclient.InferenceServerClient(url="localhost:8000")

# Check server health
print(f"Server live: {http_client.is_server_live()}")
print(f"Server ready: {http_client.is_server_ready()}")
print(f"Model ready: {http_client.is_model_ready('text_classifier')}")

# Prepare input
input_data = np.random.randint(0, 10000, size=(4, 128)).astype(np.int64)

# Create input tensor
inputs = [
    httpclient.InferInput("input_ids", input_data.shape, "INT64")
]
inputs[0].set_data_from_numpy(input_data)

# Create output request
outputs = [
    httpclient.InferRequestedOutput("logits")
]

# Make request
response = http_client.infer(
    model_name="text_classifier",
    inputs=inputs,
    outputs=outputs
)

# Get results
logits = response.as_numpy("logits")
print(f"Predictions shape: {logits.shape}")
print(f"Predictions: {logits}")
```

### gRPC Client (Higher Performance)

```python
import tritonclient.grpc as grpcclient
import numpy as np

# gRPC client
grpc_client = grpcclient.InferenceServerClient(url="localhost:8001")

# Prepare input
input_data = np.random.randint(0, 10000, size=(4, 128)).astype(np.int64)

inputs = [
    grpcclient.InferInput("input_ids", input_data.shape, "INT64")
]
inputs[0].set_data_from_numpy(input_data)

outputs = [
    grpcclient.InferRequestedOutput("logits")
]

# Synchronous inference
response = grpc_client.infer(
    model_name="text_classifier",
    inputs=inputs,
    outputs=outputs
)

print(response.as_numpy("logits"))

# Asynchronous inference
async_responses = []

def callback(result, error):
    if error:
        print(f"Error: {error}")
    else:
        async_responses.append(result.as_numpy("logits"))

grpc_client.async_infer(
    model_name="text_classifier",
    inputs=inputs,
    outputs=outputs,
    callback=callback
)
```

## Model Ensembles

Chain multiple models together:

```protobuf
# models/ensemble/config.pbtxt
name: "nlp_pipeline"
platform: "ensemble"
max_batch_size: 32

input [
  {
    name: "raw_text"
    data_type: TYPE_STRING
    dims: [ 1 ]
  }
]

output [
  {
    name: "sentiment"
    data_type: TYPE_FP32
    dims: [ 3 ]
  }
]

ensemble_scheduling {
  step [
    {
      model_name: "tokenizer"
      model_version: -1
      input_map {
        key: "text"
        value: "raw_text"
      }
      output_map {
        key: "token_ids"
        value: "tokenized"
      }
    },
    {
      model_name: "text_classifier"
      model_version: -1
      input_map {
        key: "input_ids"
        value: "tokenized"
      }
      output_map {
        key: "logits"
        value: "sentiment"
      }
    }
  ]
}
```

## Python Backend for Custom Logic

Create a custom Python model:

```python
# models/tokenizer/1/model.py
import triton_python_backend_utils as pb_utils
import numpy as np
import json

class TritonPythonModel:
    def initialize(self, args):
        """Load tokenizer and configuration."""
        self.model_config = json.loads(args['model_config'])

        # Simple word-to-id mapping (use real tokenizer in production)
        self.vocab = {"hello": 1, "world": 2, "unknown": 0}
        self.max_length = 128

    def execute(self, requests):
        """Process inference requests."""
        responses = []

        for request in requests:
            # Get input tensor
            input_tensor = pb_utils.get_input_tensor_by_name(request, "text")
            texts = input_tensor.as_numpy()

            # Tokenize each text
            batch_tokens = []
            for text in texts:
                text_str = text[0].decode('utf-8')
                tokens = [self.vocab.get(w, 0) for w in text_str.lower().split()]
                # Pad or truncate
                tokens = tokens[:self.max_length]
                tokens += [0] * (self.max_length - len(tokens))
                batch_tokens.append(tokens)

            # Create output tensor
            output_array = np.array(batch_tokens, dtype=np.int64)
            output_tensor = pb_utils.Tensor("token_ids", output_array)

            responses.append(pb_utils.InferenceResponse([output_tensor]))

        return responses

    def finalize(self):
        """Clean up resources."""
        pass
```

Configuration for Python backend:

```protobuf
# models/tokenizer/config.pbtxt
name: "tokenizer"
backend: "python"
max_batch_size: 64

input [
  {
    name: "text"
    data_type: TYPE_STRING
    dims: [ 1 ]
  }
]

output [
  {
    name: "token_ids"
    data_type: TYPE_INT64
    dims: [ 128 ]
  }
]

instance_group [
  {
    count: 1
    kind: KIND_CPU
  }
]
```

## Kubernetes Deployment

```yaml
# triton-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-inference
  namespace: ml-serving
spec:
  replicas: 2
  selector:
    matchLabels:
      app: triton
  template:
    metadata:
      labels:
        app: triton
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8002"
    spec:
      containers:
        - name: triton
          image: nvcr.io/nvidia/tritonserver:24.01-py3
          args:
            - tritonserver
            - --model-repository=/models
            - --strict-model-config=false
            - --log-verbose=1
          ports:
            - containerPort: 8000
              name: http
            - containerPort: 8001
              name: grpc
            - containerPort: 8002
              name: metrics
          resources:
            limits:
              nvidia.com/gpu: "1"
              memory: "16Gi"
            requests:
              memory: "8Gi"
              cpu: "4"
          volumeMounts:
            - name: model-repository
              mountPath: /models
          readinessProbe:
            httpGet:
              path: /v2/health/ready
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /v2/health/live
              port: 8000
            initialDelaySeconds: 60
            periodSeconds: 30
      volumes:
        - name: model-repository
          persistentVolumeClaim:
            claimName: triton-models
---
apiVersion: v1
kind: Service
metadata:
  name: triton
  namespace: ml-serving
spec:
  selector:
    app: triton
  ports:
    - port: 8000
      name: http
    - port: 8001
      name: grpc
    - port: 8002
      name: metrics
  type: ClusterIP
```

## Monitoring

Triton exposes Prometheus metrics at `/metrics`:

```promql
# Inference count by model
nv_inference_count{model="text_classifier"}

# Inference latency
histogram_quantile(0.95, nv_inference_compute_infer_duration_us_bucket{model="text_classifier"})

# Queue time
histogram_quantile(0.95, nv_inference_queue_duration_us_bucket{model="text_classifier"})

# GPU utilization
nv_gpu_utilization

# GPU memory
nv_gpu_memory_used_bytes
```

---

Triton Inference Server handles the complexity of production ML serving across frameworks. Its dynamic batching and concurrent execution maximize GPU utilization, while ensembles enable complex inference pipelines. Start with a single model, then add more as your serving needs grow.
