# How to Deploy Distributed Training Jobs with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Distributed Training, MLOps, PyTorch, GPU, Kubeflow

Description: Set up distributed ML training jobs on Kubernetes using Flux CD for reproducible, version-controlled GPU training pipelines.

---

## Introduction

Distributed ML training across multiple GPUs and nodes is essential for training large models within reasonable timeframes. Kubernetes provides the orchestration layer, but coordinating distributed training workers, managing job lifecycle, and ensuring reproducibility requires a structured approach.

Flux CD brings GitOps discipline to distributed training: every training job configuration — worker count, GPU allocation, hyperparameters via ConfigMaps, and training image versions — is version-controlled. Teams can reproduce any historical training run by checking out the corresponding Git commit.

This guide covers setting up distributed PyTorch and TensorFlow training jobs on Kubernetes using Flux CD, with patterns for job templates, hyperparameter management, and monitoring.

## Prerequisites

- Kubernetes cluster with multiple GPU nodes
- Kubeflow Training Operator deployed (see the companion post)
- Flux CD v2 bootstrapped to your Git repository
- Container registry with your training images

## Step 1: Organize the Training Job Repository Structure

```
clusters/my-cluster/training-jobs/
├── kustomization.yaml
├── namespaces.yaml
├── resource-quotas.yaml
├── pytorch-resnet/
│   ├── configmap.yaml       # Hyperparameters
│   ├── pytorchjob.yaml      # Job spec
│   └── kustomization.yaml
└── tensorflow-bert/
    ├── configmap.yaml
    ├── tfjob.yaml
    └── kustomization.yaml
```

## Step 2: Define Hyperparameters in a ConfigMap

```yaml
# clusters/my-cluster/training-jobs/pytorch-resnet/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resnet-hyperparams
  namespace: ml-training
data:
  # Hyperparameters tracked in Git as code
  learning_rate: "0.001"
  epochs: "200"
  batch_size: "128"
  optimizer: "adam"
  weight_decay: "0.0001"
  scheduler: "cosine"
  # Data configuration
  dataset_path: "/data/imagenet"
  num_workers: "8"
```

## Step 3: Create the Distributed PyTorchJob

```yaml
# clusters/my-cluster/training-jobs/pytorch-resnet/pytorchjob.yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: resnet50-imagenet-v2
  namespace: ml-training
  labels:
    training.run/id: "v2"
    training.run/model: "resnet50"
spec:
  pytorchReplicaSpecs:
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        metadata:
          labels:
            training.run/id: "v2"
            training.run/role: "master"
        spec:
          tolerations:
            - key: "nvidia.com/gpu"
              operator: "Exists"
              effect: "NoSchedule"
          containers:
            - name: pytorch
              image: myregistry/resnet-trainer:v1.2.0
              command: ["python", "train.py"]
              envFrom:
                - configMapRef:
                    name: resnet-hyperparams
              env:
                - name: MASTER_PORT
                  value: "23456"
                - name: NCCL_DEBUG
                  value: "INFO"
              resources:
                requests:
                  nvidia.com/gpu: 2
                  memory: "32Gi"
                  cpu: "16"
                limits:
                  nvidia.com/gpu: 2
                  memory: "32Gi"
                  cpu: "16"
              volumeMounts:
                - name: data
                  mountPath: /data
                - name: checkpoints
                  mountPath: /checkpoints
          volumes:
            - name: data
              persistentVolumeClaim:
                claimName: imagenet-pvc
            - name: checkpoints
              persistentVolumeClaim:
                claimName: checkpoint-pvc
    Worker:
      replicas: 3
      restartPolicy: OnFailure
      template:
        metadata:
          labels:
            training.run/id: "v2"
            training.run/role: "worker"
        spec:
          tolerations:
            - key: "nvidia.com/gpu"
              operator: "Exists"
              effect: "NoSchedule"
          containers:
            - name: pytorch
              image: myregistry/resnet-trainer:v1.2.0
              command: ["python", "train.py"]
              envFrom:
                - configMapRef:
                    name: resnet-hyperparams
              env:
                - name: NCCL_DEBUG
                  value: "INFO"
              resources:
                requests:
                  nvidia.com/gpu: 2
                  memory: "32Gi"
                  cpu: "16"
                limits:
                  nvidia.com/gpu: 2
                  memory: "32Gi"
                  cpu: "16"
              volumeMounts:
                - name: data
                  mountPath: /data
                - name: checkpoints
                  mountPath: /checkpoints
          volumes:
            - name: data
              persistentVolumeClaim:
                claimName: imagenet-pvc
            - name: checkpoints
              persistentVolumeClaim:
                claimName: checkpoint-pvc
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/training-jobs/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespaces.yaml
  - resource-quotas.yaml
  - pytorch-resnet/
---
# clusters/my-cluster/flux-kustomization-training-jobs.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: training-jobs
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/training-jobs
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 5: Monitor Distributed Training

```bash
# Check job status
kubectl get pytorchjob -n ml-training -w

# View master logs for loss curves
kubectl logs -l training.run/id=v2,training.run/role=master \
  -n ml-training -f

# Check GPU utilization on workers
kubectl exec -n ml-training <worker-pod> -- nvidia-smi dmon -s u

# Inspect job events
kubectl describe pytorchjob resnet50-imagenet-v2 -n ml-training
```

## Best Practices

- Store all hyperparameters in ConfigMaps managed by Flux so every experiment configuration is in Git history, enabling full reproducibility.
- Label training jobs with a run ID and model name to make it easy to filter logs and correlate resource usage across runs.
- Use ReadWriteMany PVCs or object storage for training data and ReadWriteOnce PVCs for per-job checkpoints to avoid data access conflicts.
- Set `NCCL_DEBUG=INFO` during initial setup to diagnose inter-node communication issues in distributed training.
- Configure Flux to only apply changes to completed or non-existent jobs by using the `dependsOn` field to sequence infrastructure before job submission.

## Conclusion

Managing distributed training jobs through Flux CD transforms ad-hoc GPU training runs into a reproducible, auditable engineering practice. Every training configuration is a Git commit, every experiment is tracked, and the cluster state is continuously reconciled — bringing the same reliability to ML training infrastructure that GitOps delivers for application deployments.
