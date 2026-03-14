# How to Deploy TensorFlow Serving on GPU with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, TensorFlow, TensorFlow Serving, GPU, MLOps, Model Serving

Description: Deploy TensorFlow Serving with GPU support using Flux CD to serve machine learning models at scale with GitOps-driven configuration management.

---

## Introduction

TensorFlow Serving is a production-grade model server purpose-built for TensorFlow models. When backed by GPU hardware, it delivers significantly lower inference latency and higher throughput than CPU-only deployments. Managing a TensorFlow Serving deployment manually across environments is error-prone — model versions, resource allocations, and environment variables drift quickly.

Flux CD solves this by making TensorFlow Serving configuration declarative and version-controlled. Promoting a new model version becomes a pull request, and the cluster state is continuously reconciled against the Git source of truth.

This guide covers deploying TensorFlow Serving with GPU resources on Kubernetes using Flux CD, including model storage configuration, resource requests, and a Horizontal Pod Autoscaler for dynamic scaling.

## Prerequisites

- Kubernetes cluster with GPU nodes and NVIDIA device plugin installed
- Flux CD v2 bootstrapped to your Git repository
- A trained TensorFlow SavedModel stored in a shared volume or object storage (GCS, S3)
- A container registry accessible from the cluster

## Step 1: Prepare the Namespace

```yaml
# clusters/my-cluster/tf-serving/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tf-serving
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Create a ConfigMap for Model Configuration

```yaml
# clusters/my-cluster/tf-serving/model-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tf-serving-models
  namespace: tf-serving
data:
  # TensorFlow Serving model server config proto format
  models.config: |
    model_config_list {
      config {
        name: "my-model"
        base_path: "/models/my-model"
        model_platform: "tensorflow"
        model_version_policy {
          latest { num_versions: 2 }
        }
      }
    }
```

## Step 3: Deploy TensorFlow Serving with GPU

```yaml
# clusters/my-cluster/tf-serving/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tf-serving
  namespace: tf-serving
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tf-serving
  template:
    metadata:
      labels:
        app: tf-serving
    spec:
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      containers:
        - name: tf-serving
          # Use the GPU-enabled TensorFlow Serving image
          image: tensorflow/serving:2.14.0-gpu
          args:
            - "--model_config_file=/etc/tf-serving/models.config"
            - "--rest_api_port=8501"
            - "--grpc_port=8500"
            - "--enable_batching=true"
            - "--batching_parameters_file=/etc/tf-serving/batching.config"
          ports:
            - containerPort: 8500
              name: grpc
            - containerPort: 8501
              name: rest
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "8Gi"
              cpu: "4"
            limits:
              nvidia.com/gpu: 1
              memory: "8Gi"
              cpu: "4"
          env:
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
            - name: TF_FORCE_GPU_ALLOW_GROWTH
              value: "true"
          volumeMounts:
            - name: model-config
              mountPath: /etc/tf-serving
            - name: model-store
              mountPath: /models
      volumes:
        - name: model-config
          configMap:
            name: tf-serving-models
        - name: model-store
          persistentVolumeClaim:
            claimName: model-store-pvc
```

## Step 4: Expose the Service

```yaml
# clusters/my-cluster/tf-serving/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: tf-serving
  namespace: tf-serving
spec:
  selector:
    app: tf-serving
  ports:
    - name: grpc
      port: 8500
      targetPort: 8500
    - name: rest
      port: 8501
      targetPort: 8501
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/tf-serving/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - model-config.yaml
  - deployment.yaml
  - service.yaml
---
# clusters/my-cluster/flux-kustomization-tf-serving.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tf-serving
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/tf-serving
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: tf-serving
      namespace: tf-serving
```

## Step 6: Validate Inference

```bash
# Check deployment status
flux get kustomizations tf-serving
kubectl rollout status deployment/tf-serving -n tf-serving

# Test REST endpoint
curl -X POST http://<service-ip>:8501/v1/models/my-model:predict \
  -H "Content-Type: application/json" \
  -d '{"instances": [[1.0, 2.0, 3.0, 4.0]]}'
```

## Best Practices

- Use `TF_FORCE_GPU_ALLOW_GROWTH=true` to prevent TensorFlow from allocating all GPU memory upfront, allowing multiple models or processes to share the GPU.
- Enable batching with a `batching_parameters_file` to maximize GPU utilization by grouping concurrent requests.
- Version your model server image tags explicitly — avoid `latest` to ensure reproducible deployments.
- Store model configs in ConfigMaps managed by Flux so model version updates are tracked in Git.
- Use a PodDisruptionBudget alongside the Deployment to ensure rolling updates keep at least one replica serving.

## Conclusion

Deploying TensorFlow Serving on GPU with Flux CD gives your ML platform team a reliable, auditable path from model training to production serving. Model version promotions become code reviews, resource changes are tracked in Git history, and the cluster self-heals any configuration drift — letting your team focus on model quality rather than infrastructure operations.
