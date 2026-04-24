# How to Deploy PyTorch on GPU Nodes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, PyTorch, GPU, Deep-learning, Kubernetes

Description: Complete guide to running PyTorch deep learning workloads on GPU-accelerated nodes in Rancher Kubernetes clusters.

## Introduction

PyTorch is widely used in research and production deep learning. This guide covers deploying PyTorch training and inference workloads on GPU nodes managed by Rancher.

## Step 1: Build Custom PyTorch Image

```dockerfile
# Dockerfile.pytorch-training

FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

# Install additional dependencies
RUN pip install --no-cache-dir     torchvision==0.16.0     torchaudio==2.1.0     tensorboard==2.14.0     mlflow==2.7.0     boto3==1.28.0

# Copy training scripts
COPY scripts/ /app/
WORKDIR /app

CMD ["python", "train.py"]
```

```bash
# Build and push to your registry
docker build -t registry.example.com/ml/pytorch-trainer:2.1.0   -f Dockerfile.pytorch-training .
docker push registry.example.com/ml/pytorch-trainer:2.1.0
```

## Step 2: Deploy PyTorch Training Job

```yaml
# pytorch-training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pytorch-training
  namespace: ml-training
spec:
  completions: 1
  backoffLimit: 2
  template:
    spec:
      restartPolicy: Never
      nodeSelector:
        nvidia.com/gpu.present: "true"
        nvidia.com/gpu.product: "NVIDIA-A100-SXM4-80GB"
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: pytorch-trainer
        image: registry.example.com/ml/pytorch-trainer:2.1.0
        command: ["python", "train_resnet.py"]
        args:
        - "--dataset=/data/imagenet"
        - "--epochs=90"
        - "--batch-size=256"
        - "--num-workers=8"
        - "--output=/models/resnet50"
        resources:
          limits:
            nvidia.com/gpu: "4"
            memory: "128Gi"
            cpu: "32"
          requests:
            nvidia.com/gpu: "4"
            memory: "64Gi"
            cpu: "16"
        env:
        - name: NCCL_DEBUG
          value: "INFO"             # NCCL debug for multi-GPU
        - name: OMP_NUM_THREADS
          value: "8"               # OpenMP threads
        - name: CUDA_LAUNCH_BLOCKING
          value: "0"               # Async CUDA (better performance)
        volumeMounts:
        - name: dataset
          mountPath: /data
        - name: models
          mountPath: /models
        - name: shm                # Shared memory for DataLoader
          mountPath: /dev/shm
      volumes:
      - name: dataset
        persistentVolumeClaim:
          claimName: imagenet-dataset
      - name: models
        persistentVolumeClaim:
          claimName: model-storage
      - name: shm
        emptyDir:
          medium: Memory
          sizeLimit: "32Gi"        # Large shm for DataLoader workers
```

## Step 3: Distributed PyTorch with PyTorchJob

```yaml
# pytorch-distributed.yaml (requires the Kubeflow Training Operator; PyTorchJob is the legacy v1 API)
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: pytorch-distributed-training
  namespace: ml-training
spec:
  pytorchReplicaSpecs:
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: pytorch
            image: registry.example.com/ml/pytorch-trainer:2.1.0
            command:
            - python
            - train_distributed.py
            resources:
              limits:
                nvidia.com/gpu: "1"
                memory: "64Gi"
                cpu: "16"
          nodeSelector:
            nvidia.com/gpu.present: "true"
          tolerations:
          - key: nvidia.com/gpu
            operator: Exists
            effect: NoSchedule
    
    Worker:
      replicas: 4               # 4 workers + 1 master = 5 GPUs total
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: pytorch
            image: registry.example.com/ml/pytorch-trainer:2.1.0
            command:
            - python
            - train_distributed.py
            resources:
              limits:
                nvidia.com/gpu: "1"
          nodeSelector:
            nvidia.com/gpu.present: "true"
          tolerations:
          - key: nvidia.com/gpu
            operator: Exists
            effect: NoSchedule
```

## Step 4: PyTorch Inference Server (TorchServe)

```yaml
# torchserve-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: torchserve
  namespace: ml-inference
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
      nodeSelector:
        nvidia.com/gpu.present: "true"
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: torchserve
        image: pytorch/torchserve:latest-gpu
        args:
        - "torchserve"
        - "--start"
        - "--model-store=/model-store"
        - "--disable-token-auth"
        - "--models"
        - "resnet50=resnet50.mar"
        resources:
          limits:
            nvidia.com/gpu: "1"
            memory: "16Gi"
            cpu: "4"
        ports:
        - containerPort: 8080    # Inference
        - containerPort: 8081    # Management API
        - containerPort: 8082    # Metrics
        volumeMounts:
        - name: model-store
          mountPath: /model-store
      volumes:
      - name: model-store
        persistentVolumeClaim:
          claimName: model-storage
---
apiVersion: v1
kind: Service
metadata:
  name: torchserve
spec:
  selector:
    app: torchserve
  ports:
  - name: inference
    port: 8080
  - name: management
    port: 8081
  - name: metrics
    port: 8082
```

## Step 5: MLflow Integration

```yaml
# mlflow-tracking-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-server
  namespace: ml-training
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mlflow
  template:
    metadata:
      labels:
        app: mlflow
    spec:
      containers:
      - name: mlflow
        image: ghcr.io/mlflow/mlflow:v2.7.0
        command:
        - /bin/sh
        - -c
        - >
          pip install --no-cache-dir psycopg2-binary boto3 &&
          exec mlflow server
          --backend-store-uri=postgresql://mlflow:password@postgres:5432/mlflow
          --artifacts-destination=s3://ml-artifacts/mlflow
          --host=0.0.0.0
          --port=5000
        ports:
        - containerPort: 5000
```

## Conclusion

PyTorch workloads on Rancher GPU nodes leverage the full power of NVIDIA hardware. From single-GPU training jobs to large-scale distributed training across dozens of GPUs, Kubernetes and Rancher provide the orchestration layer needed to run PyTorch at scale. Combine with MLflow for experiment tracking and TorchServe for production inference.
