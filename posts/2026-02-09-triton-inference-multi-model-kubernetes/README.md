# How to Implement Multi-Model Servers with Triton Inference Server on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Machine Learning, Triton

Description: Learn how to deploy and configure NVIDIA Triton Inference Server on Kubernetes to serve multiple ML models efficiently from a single server instance, reducing infrastructure costs and complexity.

---

Running dedicated inference servers for each machine learning model creates operational overhead and wastes resources. Most models don't need an entire server's worth of compute, especially when request patterns are uneven. NVIDIA Triton Inference Server solves this by allowing you to serve multiple models from a single server instance.

In this guide, you'll learn how to deploy Triton on Kubernetes and configure it to serve multiple models with dynamic loading, version management, and intelligent resource sharing.

## Why Multi-Model Serving Matters

Consider a typical ML platform with 20 different models: recommendation engines, fraud detection, image classification, and NLP sentiment analysis. Deploying each model on its own pod means 20 separate deployments, 20 sets of replicas, and significant resource waste when models are idle.

Triton changes this equation. A single Triton server can host dozens of models, loading and unloading them dynamically based on demand. Models share the same GPU memory pool, and Triton's intelligent batching means better GPU utilization overall.

For production systems, this translates to lower cloud costs, simpler operations, and better resource efficiency without sacrificing performance.

## Understanding Triton's Architecture

Triton Inference Server supports multiple ML frameworks including TensorFlow, PyTorch, ONNX, TensorRT, and even custom backends. It exposes models through HTTP and gRPC endpoints with OpenAPI documentation.

The server expects models to follow a specific directory structure called the model repository. Each model has its own subdirectory with version folders and a configuration file. Triton watches this repository and dynamically loads models as they're added or updated.

This architecture makes it perfect for Kubernetes deployments where you can mount model repositories from PersistentVolumes, ConfigMaps, or pull them from object storage.

## Setting Up the Model Repository

First, create a directory structure for your model repository. Each model needs a specific layout:

```bash
model-repository/
├── sentiment-analysis/
│   ├── config.pbtxt
│   └── 1/
│       └── model.onnx
├── image-classifier/
│   ├── config.pbtxt
│   └── 1/
│       └── model.savedmodel/
└── fraud-detector/
    ├── config.pbtxt
    └── 1/
        └── model.pt
```

The version folders (1, 2, 3, etc.) allow you to deploy multiple versions of the same model simultaneously. Triton can serve them concurrently or route traffic based on version requests.

Create a configuration file for each model. Here's an example for a PyTorch sentiment analysis model:

```protobuf
# sentiment-analysis/config.pbtxt
name: "sentiment-analysis"
platform: "pytorch_libtorch"
max_batch_size: 32
input [
  {
    name: "input_ids"
    data_type: TYPE_INT64
    dims: [ -1, 128 ]
  },
  {
    name: "attention_mask"
    data_type: TYPE_INT64
    dims: [ -1, 128 ]
  }
]
output [
  {
    name: "output"
    data_type: TYPE_FP32
    dims: [ -1, 2 ]
  }
]

# Dynamic batching configuration
dynamic_batching {
  preferred_batch_size: [ 8, 16, 32 ]
  max_queue_delay_microseconds: 5000
}

# Instance groups for parallel execution
instance_group [
  {
    count: 2
    kind: KIND_GPU
  }
]
```

This configuration tells Triton to batch up to 32 requests together, wait up to 5ms to accumulate a batch, and run 2 parallel instances on GPU.

## Creating a PersistentVolume for Models

To make models available to Triton on Kubernetes, create a PVC and populate it with your model repository:

```yaml
# triton-models-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: triton-models
  namespace: ml-inference
spec:
  accessModes:
    - ReadWriteMany  # Multiple Triton pods can read
  storageClassName: efs-sc  # Use appropriate storage class
  resources:
    requests:
      storage: 50Gi
```

Apply and populate the PVC:

```bash
kubectl create namespace ml-inference
kubectl apply -f triton-models-pvc.yaml

# Create a temporary pod to upload models
kubectl run -n ml-inference model-uploader --image=alpine:latest \
  --overrides='
{
  "spec": {
    "containers": [{
      "name": "uploader",
      "image": "alpine:latest",
      "command": ["sleep", "3600"],
      "volumeMounts": [{
        "name": "models",
        "mountPath": "/models"
      }]
    }],
    "volumes": [{
      "name": "models",
      "persistentVolumeClaim": {"claimName": "triton-models"}
    }]
  }
}'

# Copy your model repository
kubectl cp -n ml-inference ./model-repository model-uploader:/models/
```

## Deploying Triton Server on Kubernetes

Create a Deployment for Triton that mounts the model repository:

```yaml
# triton-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-inference-server
  namespace: ml-inference
spec:
  replicas: 3
  selector:
    matchLabels:
      app: triton-server
  template:
    metadata:
      labels:
        app: triton-server
    spec:
      containers:
        - name: triton
          image: nvcr.io/nvidia/tritonserver:24.01-py3
          args:
            - tritonserver
            - --model-repository=/models/model-repository
            - --strict-model-config=false  # Auto-generate config if missing
            - --log-verbose=1
          ports:
            - containerPort: 8000
              name: http
              protocol: TCP
            - containerPort: 8001
              name: grpc
              protocol: TCP
            - containerPort: 8002
              name: metrics
              protocol: TCP
          resources:
            requests:
              cpu: "4"
              memory: 8Gi
              nvidia.com/gpu: "1"
            limits:
              cpu: "8"
              memory: 16Gi
              nvidia.com/gpu: "1"
          volumeMounts:
            - name: models
              mountPath: /models
          # Health checks
          livenessProbe:
            httpGet:
              path: /v2/health/live
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /v2/health/ready
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: triton-models
      # GPU node selection
      nodeSelector:
        accelerator: nvidia-gpu
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
```

This deployment creates 3 replicas of Triton, each serving all models in the repository. The health probes ensure Kubernetes only routes traffic to fully-loaded instances.

Apply the deployment:

```bash
kubectl apply -f triton-deployment.yaml
```

## Exposing Triton with a Service

Create a Service to expose Triton's HTTP and gRPC endpoints:

```yaml
# triton-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: triton-inference
  namespace: ml-inference
spec:
  selector:
    app: triton-server
  ports:
    - name: http
      port: 8000
      targetPort: 8000
      protocol: TCP
    - name: grpc
      port: 8001
      targetPort: 8001
      protocol: TCP
    - name: metrics
      port: 8002
      targetPort: 8002
      protocol: TCP
  type: ClusterIP
```

Apply the service:

```bash
kubectl apply -f triton-service.yaml
```

## Testing Multi-Model Inference

Verify all models loaded successfully:

```bash
kubectl port-forward -n ml-inference svc/triton-inference 8000:8000

# Check server status
curl http://localhost:8000/v2/health/ready

# List all loaded models
curl http://localhost:8000/v2/models
```

You should see JSON output listing all your models with their versions and status.

Test inference on a specific model:

```bash
# Prepare input data
cat > sentiment-input.json << 'EOF'
{
  "inputs": [
    {
      "name": "input_ids",
      "shape": [1, 128],
      "datatype": "INT64",
      "data": [101, 2023, 2003, 1037, 2204, 3319, 102, ...]
    },
    {
      "name": "attention_mask",
      "shape": [1, 128],
      "datatype": "INT64",
      "data": [1, 1, 1, 1, 1, 1, 1, ...]
    }
  ]
}
EOF

# Send inference request
curl -X POST http://localhost:8000/v2/models/sentiment-analysis/infer \
  -H "Content-Type: application/json" \
  -d @sentiment-input.json
```

## Implementing Dynamic Model Loading

Triton can load and unload models dynamically without server restart. Enable model control in your deployment:

```yaml
# Update deployment args
args:
  - tritonserver
  - --model-repository=/models/model-repository
  - --model-control-mode=explicit  # Enable dynamic loading
  - --load-model=*  # Load all models on startup
```

Now you can control models via API:

```bash
# Load a new model
curl -X POST http://localhost:8000/v2/repository/models/new-model/load

# Unload a model to free resources
curl -X POST http://localhost:8000/v2/repository/models/old-model/unload

# Check model status
curl http://localhost:8000/v2/repository/models/sentiment-analysis
```

This is powerful for managing resource-constrained environments where you want fine-grained control over which models consume GPU memory.

## Configuring Model Versioning

Deploy multiple versions of a model simultaneously:

```bash
model-repository/
└── sentiment-analysis/
    ├── config.pbtxt
    ├── 1/
    │   └── model.onnx
    ├── 2/
    │   └── model.onnx
    └── 3/
        └── model.onnx
```

Configure version policy in `config.pbtxt`:

```protobuf
name: "sentiment-analysis"
platform: "onnxruntime_onnx"

# Version policy
version_policy: {
  specific {
    versions: [2, 3]  # Only serve versions 2 and 3
  }
}
```

Clients can specify version in their requests:

```bash
# Use version 3
curl -X POST http://localhost:8000/v2/models/sentiment-analysis/versions/3/infer \
  -d @input.json

# Use latest version
curl -X POST http://localhost:8000/v2/models/sentiment-analysis/infer \
  -d @input.json
```

## Monitoring and Metrics

Triton exposes Prometheus metrics on port 8002:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: triton-metrics
  namespace: ml-inference
spec:
  selector:
    matchLabels:
      app: triton-server
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

Key metrics to monitor:

- `nv_inference_request_success`: Successful inference requests per model
- `nv_inference_request_failure`: Failed requests
- `nv_inference_queue_duration_us`: Time spent in queue before batching
- `nv_inference_compute_infer_duration_us`: Actual inference time
- `nv_gpu_utilization`: GPU usage percentage

Set up alerts for high failure rates or queue times that indicate resource constraints.

## Resource Management Strategies

For mixed model workloads, configure instance groups carefully:

```protobuf
# CPU-intensive model
instance_group [
  {
    count: 4
    kind: KIND_CPU
  }
]

# GPU model with shared memory
instance_group [
  {
    count: 1
    kind: KIND_GPU
    gpus: [ 0 ]
  }
]
```

Use rate limiting to prevent one model from monopolizing resources:

```protobuf
# In model config
rate_limiter {
  resources [
    {
      name: "gpu_memory"
      count: 2048  # MiB
    }
  ]
}
```

## Conclusion

NVIDIA Triton Inference Server brings enterprise-grade multi-model serving to Kubernetes. By consolidating multiple models onto shared infrastructure, you reduce operational complexity and infrastructure costs while maintaining high performance.

Start with 3-5 models to validate your setup, monitor resource usage carefully, and expand your model repository as you gain confidence. The dynamic loading capabilities mean you can adapt your served models to changing business needs without downtime or complex orchestration.

For production deployments, pair Triton with a model registry like MLflow or a custom solution to automate model deployment and version management. This creates a complete MLOps pipeline from training to serving.
