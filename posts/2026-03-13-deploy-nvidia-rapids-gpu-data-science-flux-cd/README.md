# How to Deploy NVIDIA RAPIDS for GPU Data Science with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, NVIDIA, RAPIDS, GPU, Data Science, cuDF, cuML

Description: Deploy NVIDIA RAPIDS GPU-accelerated data science tools using Flux CD to run pandas, scikit-learn, and graph analytics workloads on GPUs.

---

## Introduction

NVIDIA RAPIDS is a suite of GPU-accelerated data science libraries including cuDF (pandas-compatible DataFrames), cuML (scikit-learn-compatible ML), cuGraph (graph analytics), and cuSpatial (geospatial analytics). RAPIDS can accelerate traditional data science workflows by 10-100x compared to CPU-only processing.

Deploying RAPIDS through Flux CD enables data science teams to access GPU-accelerated notebooks and batch processing jobs through a governed, reproducible infrastructure. Resource quotas, image versions, and environment configurations are all version-controlled, making it easy to promote environments and audit changes.

This guide covers deploying RAPIDS JupyterLab and batch processing capabilities on Kubernetes using Flux CD.

## Prerequisites

- Kubernetes cluster with NVIDIA GPU nodes (Pascal architecture or newer)
- NVIDIA GPU Operator or device plugin installed
- Flux CD v2 bootstrapped to your Git repository
- A storage class supporting ReadWriteOnce volumes for notebooks

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/rapids/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rapids
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Deploy RAPIDS JupyterLab

```yaml
# clusters/my-cluster/rapids/jupyterlab.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rapids-notebook
  namespace: rapids
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rapids-notebook
  template:
    metadata:
      labels:
        app: rapids-notebook
    spec:
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      securityContext:
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: rapids-notebook
          # RAPIDS notebooks image with JupyterLab and all RAPIDS libraries
          image: nvcr.io/nvidia/rapidsai/notebooks:24.04-cuda12.2-py3.11
          ports:
            - containerPort: 8888
              name: jupyter
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "32Gi"
              cpu: "8"
            limits:
              nvidia.com/gpu: 1
              memory: "32Gi"
              cpu: "8"
          env:
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
            - name: JUPYTER_ENABLE_LAB
              value: "yes"
            # Disable token for internal cluster use (add auth layer for production)
            - name: JUPYTER_TOKEN
              value: ""
          volumeMounts:
            - name: notebooks
              mountPath: /home/rapids/notebooks/work
          readinessProbe:
            httpGet:
              path: /api
              port: 8888
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: notebooks
          persistentVolumeClaim:
            claimName: rapids-notebooks-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: rapids-notebooks-pvc
  namespace: rapids
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
```

## Step 3: Configure a RAPIDS Batch Job Template

```yaml
# clusters/my-cluster/rapids/batch-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: rapids-etl-job
  namespace: rapids
spec:
  backoffLimit: 2
  template:
    spec:
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      restartPolicy: OnFailure
      containers:
        - name: rapids-etl
          image: nvcr.io/nvidia/rapidsai/base:24.04-cuda12.2-py3.11
          command:
            - python
            - /scripts/etl_job.py
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "32Gi"
              cpu: "8"
            limits:
              nvidia.com/gpu: 1
              memory: "32Gi"
              cpu: "8"
          env:
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
          volumeMounts:
            - name: scripts
              mountPath: /scripts
            - name: data
              mountPath: /data
      volumes:
        - name: scripts
          configMap:
            name: rapids-etl-scripts
        - name: data
          persistentVolumeClaim:
            claimName: rapids-data-pvc
```

## Step 4: Expose the JupyterLab Service

```yaml
# clusters/my-cluster/rapids/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rapids-notebook
  namespace: rapids
spec:
  selector:
    app: rapids-notebook
  ports:
    - name: jupyter
      port: 8888
      targetPort: 8888
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/rapids/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - jupyterlab.yaml
  - service.yaml
---
# clusters/my-cluster/flux-kustomization-rapids.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rapids
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/rapids
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: rapids-notebook
      namespace: rapids
```

## Step 6: Validate GPU Acceleration

```bash
# Check Flux reconciliation
flux get kustomizations rapids

# Access JupyterLab
kubectl port-forward svc/rapids-notebook 8888:8888 -n rapids

# In a notebook, test cuDF acceleration:
# import cudf
# df = cudf.read_csv('/data/large_dataset.csv')
# print(df.groupby('category').agg({'value': 'sum'}))

# Compare with pandas timing:
# import pandas as pd
# import time
# start = time.time()
# pdf = pd.read_csv('/data/large_dataset.csv')
# pdf.groupby('category').agg({'value': 'sum'})
# print(f"Pandas: {time.time() - start:.2f}s")
```

## Best Practices

- Pin RAPIDS image versions to a specific CUDA and Python combination (e.g., `24.04-cuda12.2-py3.11`) to avoid compatibility issues with your GPU driver version.
- Use ReadWriteOnce PVCs for per-user notebook storage and ReadWriteMany shared storage (NFS/EFS) for large shared datasets.
- Apply ResourceQuota to the `rapids` namespace to prevent a single notebook user from monopolizing all GPU capacity.
- For production ETL pipelines, use Argo Workflows or Kubernetes CronJobs (managed by Flux) rather than interactive notebooks.
- Enable NVIDIA MIG (Multi-Instance GPU) on A100 nodes to allow multiple RAPIDS users to share a single physical GPU.

## Conclusion

Deploying NVIDIA RAPIDS through Flux CD gives data science teams GPU-accelerated computing power managed through GitOps principles. Resource quotas, image versions, and environment configurations are all tracked in Git, enabling platform teams to provide self-service GPU data science environments with the governance and reliability that enterprise workloads require.
