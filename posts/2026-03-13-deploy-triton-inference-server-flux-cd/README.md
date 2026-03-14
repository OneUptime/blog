# How to Deploy Triton Inference Server with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, NVIDIA, Triton, Inference Server, GPU, MLOps

Description: Deploy NVIDIA Triton Inference Server to Kubernetes using Flux CD to serve multi-framework ML models with high-performance GPU inference.

---

## Introduction

NVIDIA Triton Inference Server is a production-ready inference serving platform that supports TensorFlow, PyTorch, ONNX, TensorRT, and custom backends simultaneously. Its dynamic batching, model ensemble, and concurrent model execution features make it one of the most capable model serving solutions available.

Running Triton on Kubernetes with Flux CD means your model repository structure, server configuration, and resource allocations are all version-controlled. Team members can propose model updates through pull requests, and the cluster automatically reconciles to the desired state.

This guide walks through deploying Triton Inference Server with GPU support using Flux CD, configuring a model repository, and validating multi-model inference.

## Prerequisites

- Kubernetes cluster with NVIDIA GPU nodes (Triton requires CUDA-capable GPUs)
- NVIDIA GPU Operator or device plugin deployed
- Flux CD v2 bootstrapped to your Git repository
- Model repository in a GCS, S3, or PVC-backed volume

## Step 1: Create Namespace and Model Repository ConfigMap

```yaml
# clusters/my-cluster/triton/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: triton
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Deploy Triton Inference Server

```yaml
# clusters/my-cluster/triton/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-inference-server
  namespace: triton
spec:
  replicas: 1
  selector:
    matchLabels:
      app: triton-inference-server
  template:
    metadata:
      labels:
        app: triton-inference-server
      annotations:
        # Prometheus scraping for Triton metrics
        prometheus.io/scrape: "true"
        prometheus.io/port: "8002"
        prometheus.io/path: "/metrics"
    spec:
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      containers:
        - name: triton
          # Use the NGC Triton image with TensorRT support
          image: nvcr.io/nvidia/tritonserver:23.10-py3
          args:
            - "tritonserver"
            - "--model-repository=/models"
            - "--strict-model-config=false"
            - "--log-verbose=1"
            # Enable dynamic batching globally
            - "--grpc-port=8001"
            - "--http-port=8000"
            - "--metrics-port=8002"
          ports:
            - containerPort: 8000
              name: http
            - containerPort: 8001
              name: grpc
            - containerPort: 8002
              name: metrics
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "8"
            limits:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "8"
          env:
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
          volumeMounts:
            - name: model-repository
              mountPath: /models
          readinessProbe:
            httpGet:
              path: /v2/health/ready
              port: 8000
            initialDelaySeconds: 60
            periodSeconds: 15
          livenessProbe:
            httpGet:
              path: /v2/health/live
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 30
      volumes:
        - name: model-repository
          persistentVolumeClaim:
            claimName: triton-model-pvc
```

## Step 3: Expose Triton Services

```yaml
# clusters/my-cluster/triton/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: triton-inference-server
  namespace: triton
spec:
  selector:
    app: triton-inference-server
  ports:
    - name: http
      port: 8000
      targetPort: 8000
    - name: grpc
      port: 8001
      targetPort: 8001
    - name: metrics
      port: 8002
      targetPort: 8002
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/triton/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
---
# clusters/my-cluster/flux-kustomization-triton.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: triton
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/triton
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: triton-inference-server
      namespace: triton
```

## Step 5: Validate Inference

```bash
# Check Flux reconciliation
flux get kustomizations triton

# List loaded models
curl http://<triton-svc-ip>:8000/v2/models

# Run inference (example with a classification model)
curl -X POST http://<triton-svc-ip>:8000/v2/models/my_model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [{
      "name": "input__0",
      "shape": [1, 3, 224, 224],
      "datatype": "FP32",
      "data": [...]
    }]
  }'

# Check Prometheus metrics
curl http://<triton-svc-ip>:8002/metrics | grep nv_inference
```

## Best Practices

- Use `--strict-model-config=false` in development to allow Triton to auto-generate model configs, then generate and commit explicit `config.pbtxt` files for production.
- Store model repository on a shared ReadWriteMany PVC or object storage (GCS/S3) so multiple Triton replicas can access models consistently.
- Enable Prometheus scraping via pod annotations and create Grafana dashboards for `nv_inference_request_success`, `nv_inference_queue_duration_us`, and `nv_gpu_utilization`.
- Use TensorRT-optimized model variants in the model repository for maximum GPU throughput.
- Implement a model version policy in each `config.pbtxt` to control which model versions are loaded simultaneously.

## Conclusion

NVIDIA Triton Inference Server managed by Flux CD provides a powerful, multi-framework inference platform with full GitOps traceability. Model repository changes, resource tuning, and server configuration updates all flow through your Git history, making your inference infrastructure as well-governed as the rest of your platform.
