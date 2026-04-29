# How to Deploy ML Model Serving on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, ML Model Serving, KServe, Triton, Kubernetes, Inference

Description: Deploy production ML model serving on Rancher using KServe and NVIDIA Triton Inference Server with autoscaling, canary deployments, and monitoring.

## Introduction

ML model serving requires low-latency inference, GPU resource management, and traffic routing for A/B testing. Rancher provides the infrastructure, while KServe and Triton handle the ML-specific serving requirements.

## Option 1: Deploy with KServe

```bash
# Install KServe (requires cert-manager and Knative)

kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.12.0/kserve.yaml
```

```yaml
# kserve-model.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
  namespace: production
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "s3://my-models/sklearn/iris"    # Model in S3
      resources:
        requests:
          cpu: "100m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "1Gi"
```

## Option 2: NVIDIA Triton Inference Server

For high-performance GPU inference:

```yaml
# triton-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-server
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: triton
  template:
    spec:
      containers:
        - name: triton
          image: nvcr.io/nvidia/tritonserver:24.01-py3
          args:
            - tritonserver
            - --model-repository=s3://my-models/triton-models
            - --log-verbose=1
          ports:
            - containerPort: 8000    # HTTP
            - containerPort: 8001    # gRPC
            - containerPort: 8002    # Metrics
          resources:
            requests:
              nvidia.com/gpu: "1"
            limits:
              nvidia.com/gpu: "1"
```

## Step 3: Test Inference

```python
# client.py - Send inference request
import requests
import numpy as np

# KServe inference (V1 protocol)
response = requests.post(
    "http://sklearn-iris.production.svc.cluster.local/v1/models/sklearn-iris:predict",
    json={"instances": [[5.1, 3.5, 1.4, 0.2]]}
)
print(response.json())

# Triton inference
import tritonclient.http as httpclient

client = httpclient.InferenceServerClient("triton-server:8000")
inputs = httpclient.InferInput("input", [1, 4], "FP32")
inputs.set_data_from_numpy(np.array([[5.1, 3.5, 1.4, 0.2]], dtype=np.float32))

result = client.infer("iris_classifier", inputs=[inputs])
print(result.as_numpy("output"))
```

## Step 4: Autoscaling for Model Servers

```yaml
# HPA for Triton server
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: triton-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: triton-server
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 5: Monitor Model Performance

```promql
# Triton request throughput
rate(nv_inference_request_success[5m])

# Triton average inference latency
nv_inference_compute_infer_duration_us / nv_inference_request_success

# GPU utilization
DCGM_FI_DEV_GPU_UTIL
```

## Conclusion

ML model serving on Rancher combines Kubernetes scheduling with ML-specific inference optimizations. KServe is the recommended choice for teams using standard ML frameworks (scikit-learn, TensorFlow, PyTorch), while Triton is superior for high-throughput GPU inference. Both integrate with standard Kubernetes autoscaling.
