# How to Deploy TensorFlow on GPU Nodes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, TensorFlow, GPU, Deep-learning, Kubernetes

Description: Step-by-step guide to deploying TensorFlow GPU workloads on Rancher-managed Kubernetes clusters.

## Introduction

TensorFlow is one of the most popular deep learning frameworks, and GPU acceleration dramatically reduces training times. This guide covers deploying TensorFlow workloads on GPU nodes in Rancher.

## Prerequisites

- Rancher cluster with NVIDIA GPU nodes
- NVIDIA GPU Operator installed (v23.9+)
- Persistent storage for datasets and model artifacts
- Kubeflow Training Operator v1 installed for the TFJob example
- ConfigMap named `training-scripts` in the `ml-training` namespace with `train.py` and `distributed_train.py`

## Step 1: Prepare Training Data Storage

```yaml
# training-pvc.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: ml-training
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: training-data
  namespace: ml-training
spec:
  accessModes:
  - ReadWriteMany    # Multiple pods can read concurrently
  resources:
    requests:
      storage: 100Gi
  storageClassName: nfs-storage   # Or another RWX-capable class such as Longhorn RWX or CephFS
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: model-artifacts
  namespace: ml-training
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: nfs-storage
```

## Step 2: Deploy TensorFlow Training Job

```yaml
# tensorflow-training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: tensorflow-training
  namespace: ml-training
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      
      # Ensure scheduling on GPU nodes
      nodeSelector:
        nvidia.com/gpu.present: "true"
      
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      
      containers:
      - name: tensorflow-trainer
        image: tensorflow/tensorflow:2.14.0-gpu
        command:
        - python
        - /app/train.py
        - --epochs=100
        - --batch-size=256
        - --learning-rate=0.001
        
        resources:
          limits:
            nvidia.com/gpu: "1"
            memory: "32Gi"
            cpu: "8"
          requests:
            nvidia.com/gpu: "1"
            memory: "16Gi"
            cpu: "4"
        
        env:
        - name: TF_FORCE_GPU_ALLOW_GROWTH
          value: "true"            # Don't allocate all GPU memory at once
        
        volumeMounts:
        - name: training-data
          mountPath: /data
        - name: model-artifacts
          mountPath: /models
        - name: training-scripts
          mountPath: /app
      
      volumes:
      - name: training-data
        persistentVolumeClaim:
          claimName: training-data
      - name: model-artifacts
        persistentVolumeClaim:
          claimName: model-artifacts
      - name: training-scripts
        configMap:
          name: training-scripts
```

## Step 3: Distributed TensorFlow Training

```yaml
# tf-distributed-job.yaml
apiVersion: kubeflow.org/v1
kind: TFJob
metadata:
  name: tf-distributed-training
  namespace: ml-training
spec:
  tfReplicaSpecs:
    Chief:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: tensorflow
            image: tensorflow/tensorflow:2.14.0-gpu
            command: ["python", "/app/distributed_train.py"]
            resources:
              limits:
                nvidia.com/gpu: "2"
                memory: "32Gi"
                cpu: "8"
            volumeMounts:
            - name: training-scripts
              mountPath: /app
          nodeSelector:
            nvidia.com/gpu.present: "true"
          tolerations:
          - key: nvidia.com/gpu
            operator: Exists
            effect: NoSchedule
          volumes:
          - name: training-scripts
            configMap:
              name: training-scripts
    
    Worker:
      replicas: 3         # 3 workers
      restartPolicy: OnFailure
      template:
        spec:
          containers:
          - name: tensorflow
            image: tensorflow/tensorflow:2.14.0-gpu
            command: ["python", "/app/distributed_train.py"]
            resources:
              limits:
                nvidia.com/gpu: "2"    # 2 GPUs per worker = 6 worker GPUs
            volumeMounts:
            - name: training-scripts
              mountPath: /app
          nodeSelector:
            nvidia.com/gpu.present: "true"
          tolerations:
          - key: nvidia.com/gpu
            operator: Exists
            effect: NoSchedule
          volumes:
          - name: training-scripts
            configMap:
              name: training-scripts
```

## Step 4: TensorFlow Model Serving

```yaml
# tf-serving-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tensorflow-serving
  namespace: ml-training
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tensorflow-serving
  template:
    metadata:
      labels:
        app: tensorflow-serving
    spec:
      nodeSelector:
        nvidia.com/gpu.present: "true"
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: tensorflow-serving
        image: tensorflow/serving:2.14.0-gpu
        args:
        - "--model_name=my_model"
        - "--model_base_path=/models/my_model"
        - "--rest_api_port=8501"
        - "--grpc_port=8500"
        resources:
          limits:
            nvidia.com/gpu: "1"
            memory: "8Gi"
            cpu: "4"
        ports:
        - containerPort: 8500    # gRPC
        - containerPort: 8501    # REST API
        volumeMounts:
        - name: models
          mountPath: /models
      volumes:
      - name: models
        persistentVolumeClaim:
          claimName: model-artifacts
---
apiVersion: v1
kind: Service
metadata:
  name: tensorflow-serving
  namespace: ml-training
spec:
  selector:
    app: tensorflow-serving
  ports:
  - name: grpc
    port: 8500
  - name: rest
    port: 8501
```

## Step 5: Monitor Training Progress

```bash
# Follow training logs
kubectl logs -n ml-training -l job-name=tensorflow-training --follow

# Check GPU utilization during training
kubectl exec -n gpu-operator   $(kubectl get pods -n gpu-operator -l app=nvidia-dcgm-exporter -o name | head -1)   -- nvidia-smi dmon -s u -d 5

# View TensorBoard (if configured)
kubectl port-forward svc/tensorboard -n ml-training 6006:6006
```

## Conclusion

Deploying TensorFlow on GPU nodes in Rancher is straightforward with the NVIDIA GPU Operator in place. The combination of Kubernetes Jobs for batch training, TFJob for distributed training, and Deployments for model serving provides a complete ML lifecycle platform. Monitor GPU utilization to ensure efficient use of your GPU resources.
