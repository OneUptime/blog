# How to Deploy Triton Inference Server on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Triton, NVIDIA, Inference, Kubernetes, Machine Learning, GPU

Description: Deploy NVIDIA Triton Inference Server on Talos Linux for high-performance multi-framework model serving with dynamic batching and GPU support.

---

NVIDIA Triton Inference Server is a production-grade inference serving platform that supports models from virtually every major ML framework, including TensorFlow, PyTorch, ONNX Runtime, TensorRT, and more. What makes Triton stand out is its ability to serve multiple models simultaneously on the same GPU, handle dynamic batching for optimal throughput, and provide detailed performance metrics. Running Triton on Talos Linux gives you an immutable, secure platform for your inference infrastructure, which is especially important when models are serving customer-facing applications.

This guide covers deploying Triton on Talos Linux, setting up a model repository, configuring dynamic batching, and monitoring inference performance.

## Prerequisites

- A Talos Linux cluster with NVIDIA GPU nodes
- NVIDIA device plugin installed and working
- kubectl and Helm configured
- Persistent storage for the model repository
- Models exported in a supported format (SavedModel, TorchScript, ONNX, TensorRT)

## Setting Up the Model Repository

Triton uses a structured model repository. Each model lives in its own directory with a configuration file and versioned model files:

```
model_repository/
  resnet50/
    config.pbtxt
    1/
      model.onnx
  bert-base/
    config.pbtxt
    1/
      model.pt
  text-classifier/
    config.pbtxt
    1/
      model.savedmodel/
```

Create the storage and populate it with a sample model:

```yaml
# triton-model-storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: triton-model-repo
  namespace: inference
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 100Gi
```

```bash
kubectl create namespace inference
kubectl apply -f triton-model-storage.yaml
```

Use a job to prepare the model repository with a sample ONNX model:

```yaml
# prepare-models-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: prepare-models
  namespace: inference
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: prepare
          image: python:3.10-slim
          command:
            - sh
            - -c
            - |
              pip install onnx torchvision torch
              python -c "
              import torch
              import torchvision.models as models
              import os

              # Export ResNet50 to ONNX
              model = models.resnet50(pretrained=True)
              model.eval()
              dummy = torch.randn(1, 3, 224, 224)

              os.makedirs('/models/resnet50/1', exist_ok=True)
              torch.onnx.export(model, dummy, '/models/resnet50/1/model.onnx',
                                input_names=['input'], output_names=['output'],
                                dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}})

              # Create config
              with open('/models/resnet50/config.pbtxt', 'w') as f:
                  f.write('''
              name: \"resnet50\"
              platform: \"onnxruntime_onnx\"
              max_batch_size: 32
              input [
                {
                  name: \"input\"
                  data_type: TYPE_FP32
                  dims: [ 3, 224, 224 ]
                }
              ]
              output [
                {
                  name: \"output\"
                  data_type: TYPE_FP32
                  dims: [ 1000 ]
                }
              ]
              dynamic_batching {
                preferred_batch_size: [ 8, 16, 32 ]
                max_queue_delay_microseconds: 100
              }
              instance_group [
                {
                  count: 2
                  kind: KIND_GPU
                }
              ]
              ''')
              print('Model repository prepared successfully')
              "
          volumeMounts:
            - name: models
              mountPath: /models
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: triton-model-repo
```

## Deploying Triton Inference Server

Deploy Triton with the model repository:

```yaml
# triton-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-server
  namespace: inference
spec:
  replicas: 1
  selector:
    matchLabels:
      app: triton
  template:
    metadata:
      labels:
        app: triton
    spec:
      containers:
        - name: triton
          image: nvcr.io/nvidia/tritonserver:23.12-py3
          args:
            - tritonserver
            - --model-repository=/models
            - --strict-model-config=false
            - --log-verbose=1
            - --allow-metrics=true
            - --allow-gpu-metrics=true
          ports:
            - containerPort: 8000
              name: http
            - containerPort: 8001
              name: grpc
            - containerPort: 8002
              name: metrics
          resources:
            requests:
              cpu: "4"
              memory: 8Gi
              nvidia.com/gpu: 1
            limits:
              cpu: "8"
              memory: 16Gi
              nvidia.com/gpu: 1
          volumeMounts:
            - name: models
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
            periodSeconds: 15
      volumes:
        - name: models
          persistentVolumeClaim:
            claimName: triton-model-repo
---
apiVersion: v1
kind: Service
metadata:
  name: triton
  namespace: inference
  labels:
    app: triton
spec:
  ports:
    - port: 8000
      targetPort: 8000
      name: http
    - port: 8001
      targetPort: 8001
      name: grpc
    - port: 8002
      targetPort: 8002
      name: metrics
  selector:
    app: triton
```

Apply and verify:

```bash
kubectl apply -f triton-deployment.yaml

# Wait for Triton to be ready
kubectl wait --for=condition=ready pod -l app=triton -n inference --timeout=300s

# Check loaded models
kubectl port-forward -n inference svc/triton 8000:8000
curl http://localhost:8000/v2/models
```

## Sending Inference Requests

Test with HTTP:

```bash
# Send an inference request to ResNet50
curl -X POST http://localhost:8000/v2/models/resnet50/infer \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [{
      "name": "input",
      "shape": [1, 3, 224, 224],
      "datatype": "FP32",
      "data": [0.0]
    }]
  }'
```

For production, use the gRPC endpoint for lower latency:

```python
# triton_client.py
import tritonclient.grpc as grpcclient
import numpy as np

# Connect to Triton
client = grpcclient.InferenceServerClient(url="triton.inference.svc:8001")

# Check server health
print("Server live:", client.is_server_live())
print("Server ready:", client.is_server_ready())

# Create input tensor
input_data = np.random.randn(1, 3, 224, 224).astype(np.float32)
inputs = [grpcclient.InferInput("input", [1, 3, 224, 224], "FP32")]
inputs[0].set_data_from_numpy(input_data)

# Run inference
outputs = [grpcclient.InferRequestedOutput("output")]
result = client.infer(model_name="resnet50", inputs=inputs, outputs=outputs)

# Get results
output_data = result.as_numpy("output")
print("Prediction shape:", output_data.shape)
print("Top-5 classes:", np.argsort(output_data[0])[-5:][::-1])
```

## Configuring Dynamic Batching

Dynamic batching is one of Triton's most powerful features. It collects incoming requests into batches for more efficient GPU utilization. Configure it in the model's config.pbtxt:

```protobuf
# config.pbtxt for a model with dynamic batching
name: "resnet50"
platform: "onnxruntime_onnx"
max_batch_size: 64

dynamic_batching {
  # Preferred batch sizes for optimal GPU throughput
  preferred_batch_size: [ 8, 16, 32, 64 ]
  # Maximum time to wait for a full batch (microseconds)
  max_queue_delay_microseconds: 200
  # Priority levels for different request types
  priority_levels: 3
  default_priority_level: 2
}

# Run 2 model instances on the GPU
instance_group [
  {
    count: 2
    kind: KIND_GPU
    gpus: [ 0 ]
  }
]
```

## Model Ensembles

Triton supports model ensembles, where the output of one model feeds into another. This is useful for pipelines like preprocessing, inference, and postprocessing:

```protobuf
# ensemble_config.pbtxt
name: "image_pipeline"
platform: "ensemble"
max_batch_size: 32

input [
  {
    name: "raw_image"
    data_type: TYPE_UINT8
    dims: [ -1, -1, 3 ]
  }
]
output [
  {
    name: "classification"
    data_type: TYPE_FP32
    dims: [ 1000 ]
  }
]

ensemble_scheduling {
  step [
    {
      model_name: "image_preprocessor"
      model_version: -1
      input_map {
        key: "raw_image"
        value: "raw_image"
      }
      output_map {
        key: "processed_image"
        value: "preprocessed"
      }
    },
    {
      model_name: "resnet50"
      model_version: -1
      input_map {
        key: "input"
        value: "preprocessed"
      }
      output_map {
        key: "output"
        value: "classification"
      }
    }
  ]
}
```

## Autoscaling Triton

Scale Triton based on GPU utilization or request metrics:

```yaml
# triton-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: triton-hpa
  namespace: inference
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: triton-server
  minReplicas: 1
  maxReplicas: 4
  metrics:
    - type: Pods
      pods:
        metric:
          name: nv_inference_request_success
        target:
          type: AverageValue
          averageValue: "100"
```

## Monitoring Triton

Triton exposes rich metrics on port 8002. Create a ServiceMonitor:

```yaml
# triton-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: triton
  namespace: inference
spec:
  selector:
    matchLabels:
      app: triton
  endpoints:
    - port: metrics
      path: /metrics
      interval: 15s
```

Key metrics include `nv_inference_request_success`, `nv_inference_request_duration_us`, `nv_inference_queue_duration_us`, and `nv_gpu_utilization`.

## Conclusion

NVIDIA Triton Inference Server on Talos Linux provides a high-performance, multi-framework inference platform on secure, immutable infrastructure. With dynamic batching, model ensembles, and comprehensive metrics, Triton handles the complexity of production inference while Talos Linux ensures the infrastructure underneath is minimal, reproducible, and well-protected. This combination is ideal for organizations that need reliable, high-throughput model serving at scale.
