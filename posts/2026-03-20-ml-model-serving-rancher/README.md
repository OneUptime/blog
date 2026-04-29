# How to Deploy ML Model Serving on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, ML, Model-serving, KServe, Kubernetes

Description: Comprehensive guide to deploying machine learning model serving infrastructure on Rancher using KServe and Triton.

## Introduction

ML model serving is the production component of the ML lifecycle where trained models are exposed as APIs for real-time or batch inference. Rancher provides the infrastructure platform for scalable, reliable model serving.

## Model Serving Options

| Platform | Protocol | Best For |
|----------|---------|----------|
| KServe | REST/gRPC | Flexible, multi-framework |
| Triton | REST/gRPC | NVIDIA GPU, high throughput |
| TorchServe | REST | PyTorch models |
| TF Serving | REST/gRPC | TensorFlow models |
| Seldon Core | REST | A/B testing, pipelines |

## Step 1: Install KServe

```bash
# Install Knative Serving first (prerequisite)

kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.12.0/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.12.0/serving-core.yaml

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install KServe
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.11.0/kserve.yaml
kubectl apply -f https://github.com/kserve/kserve/releases/download/v0.11.0/kserve-runtimes.yaml
```

## Step 2: Deploy a Scikit-Learn Model

```yaml
# sklearn-server.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sklearn-iris
  namespace: ml-serving
spec:
  predictor:
    sklearn:
      storageUri: s3://ml-models/sklearn-iris/v1
      resources:
        limits:
          cpu: "1"
          memory: "1Gi"
        requests:
          cpu: "100m"
          memory: "256Mi"
```

## Step 3: Deploy a TensorFlow Model

```yaml
# tensorflow-server.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: tensorflow-flowers
  namespace: ml-serving
spec:
  predictor:
    tensorflow:
      storageUri: s3://ml-models/tensorflow/flowers
      runtimeVersion: "2.12.0"
      resources:
        limits:
          nvidia.com/gpu: "1"
          memory: "8Gi"
        requests:
          nvidia.com/gpu: "1"
          memory: "4Gi"
  transformer:
    containers:
    - name: custom-transformer
      image: registry.example.com/ml/image-transformer:latest
      resources:
        limits:
          cpu: "1"
          memory: "512Mi"
```

## Step 4: Deploy NVIDIA Triton

```yaml
# triton-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-inference-server
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
    spec:
      nodeSelector:
        nvidia.com/gpu.present: "true"
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: triton
        image: nvcr.io/nvidia/tritonserver:23.09-py3
        args:
        - tritonserver
        - --model-repository=s3://ml-models/triton-model-repo
        - --strict-model-config=false
        - --log-verbose=1
        resources:
          limits:
            nvidia.com/gpu: "1"
            memory: "16Gi"
            cpu: "4"
        ports:
        - containerPort: 8000   # HTTP
        - containerPort: 8001   # gRPC
        - containerPort: 8002   # Metrics
        readinessProbe:
          httpGet:
            path: /v2/health/ready
            port: 8000
          initialDelaySeconds: 30
```

## Step 5: Configure Autoscaling

```yaml
# kserve-autoscaling.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: auto-scaled-model
  namespace: ml-serving
  annotations:
    autoscaling.knative.dev/min-scale: "1"
    autoscaling.knative.dev/max-scale: "10"
    autoscaling.knative.dev/target: "100"     # requests per pod
spec:
  predictor:
    sklearn:
      storageUri: s3://ml-models/my-model
```

## Step 6: Canary Deployment

```yaml
# canary-model.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: production-model
  namespace: ml-serving
spec:
  predictor:
    canaryTrafficPercent: 20       # 20% to canary (new revision)
    sklearn:
      storageUri: s3://ml-models/v2.0
```

## Step 7: Test Model Endpoint

```bash
# Get the model endpoint
MODEL_URL=$(kubectl get inferenceservice sklearn-iris \
  -n ml-serving \
  -o jsonpath='{.status.url}')

# Make prediction request
curl -X POST "${MODEL_URL}/v1/models/sklearn-iris:predict" \
  -H "Content-Type: application/json" \
  -d '{"instances": [[5.1, 3.5, 1.4, 0.2]]}'

# Response: {"predictions": [0]}
```

## Conclusion

ML model serving on Rancher provides a scalable, production-ready inference platform. KServe offers the most flexibility with multi-framework support and Kubernetes-native autoscaling, while Triton excels for GPU-accelerated high-throughput inference. Choose based on your model framework, throughput requirements, and GPU availability.
