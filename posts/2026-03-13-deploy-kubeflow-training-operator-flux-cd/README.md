# How to Deploy Kubeflow Training Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kubeflow, Training Operator, MLOps, Distributed Training

Description: Deploy the Kubeflow Training Operator to Kubernetes using Flux CD to enable distributed ML training jobs with PyTorchJob, TFJob, and MPIJob CRDs.

---

## Introduction

The Kubeflow Training Operator provides Kubernetes-native custom resources for distributed machine learning training: PyTorchJob for PyTorch distributed training, TFJob for TensorFlow, MPIJob for MPI-based frameworks, and XGBoostJob for gradient boosting. It abstracts away the complexity of coordinating distributed training workers and parameter servers.

Managing the Training Operator through Flux CD ensures your ML infrastructure is consistently deployed and configured. The operator version, RBAC configuration, and namespace setup are all version-controlled, making it easy to upgrade and audit your training infrastructure.

This guide covers deploying the Kubeflow Training Operator using Flux CD and running your first PyTorchJob.

## Prerequisites

- Kubernetes cluster with GPU nodes
- Flux CD v2 bootstrapped to your Git repository
- kubectl access to the cluster
- Basic familiarity with distributed ML training concepts

## Step 1: Create the Namespace and HelmRepository

```yaml
# clusters/my-cluster/training-operator/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kubeflow
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/training-operator/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kubeflow
  namespace: kubeflow
spec:
  interval: 12h
  url: https://kubeflow.github.io/training-operator
```

## Step 2: Deploy the Training Operator via HelmRelease

```yaml
# clusters/my-cluster/training-operator/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: training-operator
  namespace: kubeflow
spec:
  interval: 1h
  chart:
    spec:
      chart: training-operator
      version: "1.7.*"
      sourceRef:
        kind: HelmRepository
        name: kubeflow
        namespace: kubeflow
      interval: 12h
  values:
    # Enable all job types
    replicaCount: 1
    image:
      repository: kubeflow/training-operator
      tag: "v1.7.0"
    # Enable PyTorchJob, TFJob, MPIJob, XGBoostJob
    gang-scheduler-name: ""
    # Enable monitoring
    monitoring:
      prometheus:
        enabled: true
```

## Step 3: Create the Flux Kustomization

```yaml
# clusters/my-cluster/training-operator/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
---
# clusters/my-cluster/flux-kustomization-training-operator.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: training-operator
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/training-operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: training-operator
      namespace: kubeflow
```

## Step 4: Submit a PyTorchJob via Flux

Manage your training jobs declaratively by committing them to Git:

```yaml
# clusters/my-cluster/training-jobs/pytorch-job.yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: resnet-training
  namespace: ml-workloads
spec:
  pytorchReplicaSpecs:
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          tolerations:
            - key: "nvidia.com/gpu"
              operator: "Exists"
              effect: "NoSchedule"
          containers:
            - name: pytorch
              image: myregistry/pytorch-trainer:v1.0.0
              command:
                - "python"
                - "-m"
                - "torch.distributed.run"
                - "--nproc_per_node=1"
                - "train.py"
                - "--epochs=100"
                - "--batch-size=64"
              resources:
                requests:
                  nvidia.com/gpu: 1
                  memory: "16Gi"
                  cpu: "8"
                limits:
                  nvidia.com/gpu: 1
                  memory: "16Gi"
                  cpu: "8"
    Worker:
      replicas: 3
      restartPolicy: OnFailure
      template:
        spec:
          tolerations:
            - key: "nvidia.com/gpu"
              operator: "Exists"
              effect: "NoSchedule"
          containers:
            - name: pytorch
              image: myregistry/pytorch-trainer:v1.0.0
              command:
                - "python"
                - "-m"
                - "torch.distributed.run"
                - "--nproc_per_node=1"
                - "train.py"
                - "--epochs=100"
                - "--batch-size=64"
              resources:
                requests:
                  nvidia.com/gpu: 1
                  memory: "16Gi"
                  cpu: "8"
                limits:
                  nvidia.com/gpu: 1
                  memory: "16Gi"
                  cpu: "8"
```

## Step 5: Monitor Training Jobs

```bash
# Verify operator is deployed
flux get kustomizations training-operator
kubectl get deployment training-operator -n kubeflow

# Check CRDs are registered
kubectl get crds | grep kubeflow

# Monitor PyTorchJob status
kubectl get pytorchjob resnet-training -n ml-workloads -w

# View worker logs
kubectl logs -l training.kubeflow.org/job-name=resnet-training \
  -n ml-workloads --all-containers
```

## Best Practices

- Use Flux-managed PyTorchJob manifests for production training runs so every job configuration is version-controlled and reproducible.
- Set `restartPolicy: OnFailure` for workers so the Training Operator restarts failed workers automatically without losing the master state.
- Apply ResourceQuota to training namespaces to prevent runaway training jobs from consuming all GPU resources.
- Use the `--gang-scheduler-name` flag with Volcano or Koordinator gang schedulers to prevent deadlocks in distributed training where partial worker sets cannot make progress.
- Store training checkpoints in a shared PVC or object storage so jobs can resume from the latest checkpoint after a pod failure.

## Conclusion

The Kubeflow Training Operator deployed through Flux CD provides a robust, GitOps-managed foundation for distributed ML training on Kubernetes. Operator upgrades, training job configurations, and resource quotas all flow through Git, giving platform teams and data scientists a shared, auditable workflow for managing GPU training infrastructure.
