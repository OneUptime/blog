# How to Deploy PyTorch Serve on GPU with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, PyTorch, TorchServe, GPU, MLOps, Model Serving

Description: Deploy TorchServe model serving with GPU resources using Flux CD to run PyTorch models in production with GitOps-managed configuration.

---

## Introduction

TorchServe is the official PyTorch model serving framework, providing a REST and gRPC API for deploying PyTorch models at scale. GPU acceleration dramatically reduces inference latency for deep learning models, and Kubernetes ensures high availability and horizontal scalability.

Managing TorchServe deployments through Flux CD brings GitOps discipline to your ML serving infrastructure. Model archive updates, resource configuration changes, and scaling policies all flow through pull requests, giving your team full visibility and control.

This guide covers deploying TorchServe with GPU support on Kubernetes using Flux CD, including model archive management, configuration, and autoscaling.

## Prerequisites

- Kubernetes cluster with NVIDIA GPU nodes and the device plugin installed
- Flux CD v2 bootstrapped to your Git repository
- A PyTorch model packaged as a `.mar` (Model Archive) file stored in a PVC or object storage
- Basic familiarity with TorchServe configuration

## Step 1: Create the Namespace and ConfigMap

```yaml
# clusters/my-cluster/torchserve/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: torchserve
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/torchserve/config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: torchserve-config
  namespace: torchserve
data:
  config.properties: |
    # TorchServe inference address
    inference_address=http://0.0.0.0:8080
    management_address=http://0.0.0.0:8081
    metrics_address=http://0.0.0.0:8082
    # Number of workers per model (match GPU count)
    default_workers_per_model=1
    # Max batch delay in ms for dynamic batching
    batch_size=8
    max_batch_delay=100
    # Model store path
    model_store=/home/model-server/model-store
    # Load models at startup
    load_models=my_model.mar
    # GPU number to use (0-indexed)
    number_of_gpu=1
```

## Step 2: Deploy TorchServe with GPU Resources

```yaml
# clusters/my-cluster/torchserve/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: torchserve
  namespace: torchserve
spec:
  replicas: 2
  selector:
    matchLabels:
      app: torchserve
  template:
    metadata:
      labels:
        app: torchserve
    spec:
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      initContainers:
        # Copy model archives from shared storage to local model-store
        - name: model-sync
          image: busybox:1.36
          command: ["cp", "-r", "/model-source/.", "/model-store/"]
          volumeMounts:
            - name: model-source
              mountPath: /model-source
            - name: model-store
              mountPath: /model-store
      containers:
        - name: torchserve
          image: pytorch/torchserve:0.9.0-gpu
          args:
            - "torchserve"
            - "--start"
            - "--ncs"
            - "--ts-config=/config/config.properties"
          ports:
            - containerPort: 8080
              name: inference
            - containerPort: 8081
              name: management
            - containerPort: 8082
              name: metrics
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "12Gi"
              cpu: "4"
            limits:
              nvidia.com/gpu: 1
              memory: "12Gi"
              cpu: "4"
          env:
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
          volumeMounts:
            - name: config
              mountPath: /config
            - name: model-store
              mountPath: /home/model-server/model-store
          readinessProbe:
            httpGet:
              path: /ping
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: torchserve-config
        - name: model-source
          persistentVolumeClaim:
            claimName: model-pvc
        - name: model-store
          emptyDir: {}
```

## Step 3: Expose TorchServe Services

```yaml
# clusters/my-cluster/torchserve/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: torchserve-inference
  namespace: torchserve
spec:
  selector:
    app: torchserve
  ports:
    - name: inference
      port: 8080
      targetPort: 8080
    - name: management
      port: 8081
      targetPort: 8081
    - name: metrics
      port: 8082
      targetPort: 8082
```

## Step 4: Configure Horizontal Pod Autoscaler

```yaml
# clusters/my-cluster/torchserve/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: torchserve-hpa
  namespace: torchserve
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: torchserve
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/flux-kustomization-torchserve.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: torchserve
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/torchserve
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: torchserve
      namespace: torchserve
```

## Step 6: Test the Inference Endpoint

```bash
# Verify deployment
flux get kustomizations torchserve
kubectl rollout status deployment/torchserve -n torchserve

# Check registered models
curl http://<inference-svc-ip>:8081/models

# Run inference
curl -X POST http://<inference-svc-ip>:8080/predictions/my_model \
  -H "Content-Type: application/json" \
  -d '{"data": [1.0, 2.0, 3.0]}'
```

## Best Practices

- Use an init container to copy model archives from a shared PVC to an `emptyDir` volume at startup, avoiding filesystem locking issues with multiple replicas.
- Enable dynamic batching (`batch_size` and `max_batch_delay`) to maximize GPU throughput under variable request rates.
- Expose the metrics port (8082) and scrape with Prometheus to monitor GPU utilization, request latency, and queue depth.
- Use `readinessProbe` on `/ping` to prevent traffic from reaching a pod before models finish loading.
- Tag model archive files with semantic versions and track the version in your Git configuration to enable traceability from Git commit to served model.

## Conclusion

Deploying TorchServe with GPU resources through Flux CD gives ML engineering teams a production-ready serving infrastructure managed entirely through GitOps. Model updates, scaling policies, and configuration changes all flow through version control, making your ML serving platform as reliable and auditable as your application code.
