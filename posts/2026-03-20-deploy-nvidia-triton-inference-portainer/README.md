# How to Deploy NVIDIA Triton Inference Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NVIDIA Triton, Inference Server, Portainer, GPU, Machine Learning, MLOps, Docker

Description: Deploy NVIDIA Triton Inference Server via Portainer to serve multiple ML models from different frameworks (TensorFlow, PyTorch, ONNX) on GPU hardware with dynamic batching.

---

NVIDIA Triton Inference Server is a high-performance inference platform that supports TensorFlow, PyTorch, ONNX, TensorRT, and custom backends in a single server instance. Deploying it via Portainer simplifies lifecycle management while giving you access to Triton's advanced features like dynamic batching and model ensembles.

## Prerequisites

- Portainer connected to a Docker Standalone environment
- NVIDIA GPU with a Triton 24.01-compatible driver (545+ generally; supported data center GPU driver branches also work)
- NVIDIA Container Toolkit installed on the host
- Model repository prepared in Triton's expected format

## Step 1: Prepare the Model Repository

Triton requires a specific directory layout:

```text
/opt/triton-models/
├── mnist-classifier/
│   ├── config.pbtxt
│   └── 1/
│       └── model.savedmodel/    # TF SavedModel
├── image-classifier/
│   ├── config.pbtxt
│   └── 1/
│       └── model.onnx           # ONNX model
└── text-encoder/
    ├── config.pbtxt
    └── 1/
        └── model.pt             # TorchScript model
```

Create a model config:

```protobuf
# /opt/triton-models/mnist-classifier/config.pbtxt

name: "mnist-classifier"
platform: "tensorflow_savedmodel"
max_batch_size: 32

# Input tensor definition
input [
  {
    name: "dense_input"
    data_type: TYPE_FP32
    dims: [ 784 ]
  }
]

# Output tensor definition
output [
  {
    name: "dense_1"
    data_type: TYPE_FP32
    dims: [ 10 ]
  }
]

# Dynamic batching - automatically groups requests for throughput
dynamic_batching {
  preferred_batch_size: [ 8, 16, 32 ]
  max_queue_delay_microseconds: 5000
}

# Run 2 model instances in parallel on the GPU
instance_group [
  {
    count: 2
    kind: KIND_GPU
  }
]
```

## Step 2: Deploy Triton via Portainer Stack

```yaml
# triton-stack.yml
version: "3.8"

services:
  triton:
    image: nvcr.io/nvidia/tritonserver:24.01-py3
    command: >
      tritonserver
      --model-repository=/models
      --log-verbose=1
    volumes:
      - /opt/triton-models:/models:ro
    ports:
      - "8000:8000"    # HTTP REST
      - "8001:8001"    # gRPC
      - "8002:8002"    # Metrics (Prometheus)
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped
    shm_size: "1gb"    # Recommended shared memory size for Triton containers
    ulimits:
      memlock: -1
      stack: 67108864
    networks:
      - triton-net

networks:
  triton-net:
    driver: bridge
```

## Step 3: Check Model Status

After deployment, verify models are loaded successfully:

```bash
# Check which models are loaded and their status
curl -X POST http://localhost:8000/v2/repository/index \
  -H "Content-Type: application/json" \
  -d '{"ready": true}'

# Expected READY entry:
# [{"name":"mnist-classifier","version":"1","state":"READY","reason":""}]

# Check a specific model's metadata
curl http://localhost:8000/v2/models/mnist-classifier

# Expected response from the metadata endpoint:
# {"name":"mnist-classifier","versions":["1"],"platform":"tensorflow_savedmodel","inputs":[...],"outputs":[...]}
```

## Step 4: Run Inference

```python
# triton_client.py - HTTP client using tritonclient
import tritonclient.http as httpclient
import numpy as np

# Connect to Triton
client = httpclient.InferenceServerClient(url="localhost:8000")

# Prepare input
input_data = np.random.rand(1, 784).astype(np.float32)
inputs = [httpclient.InferInput("dense_input", [1, 784], "FP32")]
inputs[0].set_data_from_numpy(input_data)

# Run inference
outputs = [httpclient.InferRequestedOutput("dense_1")]
response = client.infer("mnist-classifier", inputs, outputs=outputs)

# Get result
result = response.as_numpy("dense_1")
predicted_class = np.argmax(result[0])
print(f"Predicted class: {predicted_class}")
```

## Step 5: Monitor Triton Metrics

Triton exports Prometheus metrics on port 8002. Key metrics include:

- `nv_inference_request_success` - successful inference requests
- `nv_inference_queue_duration_us` - cumulative queue time in microseconds
- `nv_gpu_utilization` - GPU utilization rate (0.0-1.0)
- `nv_gpu_memory_used_bytes` - used GPU memory in bytes

Add to your Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: "triton"
    static_configs:
      - targets: ["triton:8002"]
    metrics_path: "/metrics"
```

## Summary

NVIDIA Triton Inference Server via Portainer gives ML teams a powerful, GPU-accelerated serving platform that handles multiple models and frameworks simultaneously. Dynamic batching, model versioning, and comprehensive metrics make it production-ready from day one.
