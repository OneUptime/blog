# How to Manage GPU Workloads with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GPU, Machine Learning

Description: Learn how to manage GPU workloads on Kubernetes using ArgoCD for declarative, reproducible ML infrastructure deployments with proper scheduling and resource management.

---

Managing GPU workloads on Kubernetes is already complex. You need to handle device plugins, resource requests, node affinity, tolerations, and scheduling constraints. Layering ArgoCD on top brings order to this complexity by making your GPU infrastructure fully declarative and version-controlled.

In this guide, we will walk through setting up ArgoCD to manage GPU workloads end to end - from NVIDIA device plugins to actual ML workloads that consume GPUs.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with GPU nodes (EKS with `p3` or `g4dn` instances, GKE with GPU node pools, or bare metal with NVIDIA GPUs)
- ArgoCD installed and configured
- The NVIDIA GPU Operator or device plugin installed on your cluster

## Setting Up the NVIDIA GPU Operator via ArgoCD

The first step is deploying the GPU operator itself through ArgoCD. This ensures your GPU infrastructure layer is also GitOps-managed.

Create an ArgoCD Application for the GPU operator:

```yaml
# gpu-operator-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nvidia-gpu-operator
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://helm.ngc.nvidia.com/nvidia
    chart: gpu-operator
    targetRevision: v23.9.1
    helm:
      values: |
        operator:
          defaultRuntime: containerd
        driver:
          enabled: true
          version: "535.129.03"
        toolkit:
          enabled: true
        devicePlugin:
          enabled: true
        dcgmExporter:
          enabled: true
          serviceMonitor:
            enabled: true
        migManager:
          enabled: false
        nodeStatusExporter:
          enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: gpu-operator
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

The `ServerSideApply` sync option is important here because the GPU operator creates large CRDs that can exceed the annotation size limit with client-side apply.

## Structuring Your Git Repository for GPU Workloads

A clean repository structure makes managing GPU workloads much easier. Here is a recommended layout:

```text
gpu-workloads/
  base/
    kustomization.yaml
    namespace.yaml
    resource-quota.yaml
    limit-range.yaml
  overlays/
    training/
      kustomization.yaml
      node-affinity.yaml
      tolerations.yaml
    inference/
      kustomization.yaml
      node-affinity.yaml
      tolerations.yaml
  workloads/
    model-training/
      job.yaml
    model-serving/
      deployment.yaml
      service.yaml
      hpa.yaml
```

## Configuring Resource Quotas for GPU Namespaces

GPU resources are expensive. You want to make sure teams cannot accidentally consume more than their share. Define resource quotas in your base configuration:

```yaml
# base/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ml-workloads
spec:
  hard:
    requests.nvidia.com/gpu: "8"
    limits.nvidia.com/gpu: "8"
    requests.cpu: "64"
    requests.memory: "256Gi"
    pods: "20"
```

```yaml
# base/limit-range.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: gpu-limits
  namespace: ml-workloads
spec:
  limits:
    - type: Container
      max:
        nvidia.com/gpu: "4"
      default:
        nvidia.com/gpu: "1"
        cpu: "4"
        memory: "16Gi"
      defaultRequest:
        cpu: "2"
        memory: "8Gi"
```

## Handling Node Affinity and Tolerations

GPU nodes typically have taints to prevent non-GPU workloads from scheduling on them. Your overlays should handle this:

```yaml
# overlays/training/node-affinity.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: training-job
spec:
  template:
    spec:
      nodeSelector:
        nvidia.com/gpu.present: "true"
        nvidia.com/gpu.product: "NVIDIA-A100-SXM4-80GB"
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: topology.kubernetes.io/zone
                    operator: In
                    values:
                      - us-east-1a
```

## Deploying a GPU Training Job with ArgoCD

Here is a complete training job managed by ArgoCD:

```yaml
# workloads/model-training/job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: bert-fine-tuning
  labels:
    app: ml-training
    model: bert-large
spec:
  backoffLimit: 3
  ttlSecondsAfterFinished: 86400
  template:
    spec:
      restartPolicy: OnFailure
      nodeSelector:
        nvidia.com/gpu.present: "true"
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      containers:
        - name: training
          image: my-registry/bert-trainer:v1.2.0
          resources:
            requests:
              nvidia.com/gpu: "4"
              cpu: "16"
              memory: "64Gi"
            limits:
              nvidia.com/gpu: "4"
              cpu: "32"
              memory: "128Gi"
          env:
            - name: NCCL_DEBUG
              value: "INFO"
            - name: CUDA_VISIBLE_DEVICES
              value: "0,1,2,3"
          volumeMounts:
            - name: training-data
              mountPath: /data
            - name: model-output
              mountPath: /output
            - name: shm
              mountPath: /dev/shm
      volumes:
        - name: training-data
          persistentVolumeClaim:
            claimName: training-dataset
        - name: model-output
          persistentVolumeClaim:
            claimName: model-artifacts
        - name: shm
          emptyDir:
            medium: Memory
            sizeLimit: 16Gi
```

Notice the `/dev/shm` mount with memory medium. This is critical for multi-GPU training jobs that use shared memory for inter-process communication through NCCL.

## ArgoCD Application for GPU Workloads

Create the ArgoCD Application that ties everything together:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: gpu-training-workloads
  namespace: argocd
spec:
  project: ml-platform
  source:
    repoURL: https://github.com/myorg/gpu-workloads.git
    targetRevision: main
    path: overlays/training
  destination:
    server: https://kubernetes.default.svc
    namespace: ml-workloads
  syncPolicy:
    automated:
      prune: false  # Don't auto-delete completed jobs
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - RespectIgnoreDifferences=true
  ignoreDifferences:
    - group: batch
      kind: Job
      jsonPointers:
        - /spec/selector
        - /spec/template/metadata/labels
```

The `ignoreDifferences` configuration for Jobs is essential. Kubernetes adds generated selector labels to Jobs, and without ignoring these differences, ArgoCD will report them as out of sync.

## Handling GPU Time-Slicing

If you are running inference workloads that do not need a full GPU, configure time-slicing through the device plugin config:

```yaml
# gpu-time-slicing-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: time-slicing-config
  namespace: gpu-operator
data:
  any: |-
    version: v1
    flags:
      migStrategy: none
    sharing:
      timeSlicing:
        renameByDefault: false
        failRequestsGreaterThanOne: false
        resources:
          - name: nvidia.com/gpu
            replicas: 4
```

This lets four pods share a single GPU, which is useful for inference workloads that have low GPU utilization.

## Monitoring GPU Usage

Deploy DCGM exporter through ArgoCD to get GPU metrics into your monitoring stack:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dcgm-exporter
  namespace: argocd
spec:
  project: monitoring
  source:
    repoURL: https://nvidia.github.io/dcgm-exporter/helm-charts
    chart: dcgm-exporter
    targetRevision: 3.3.0
    helm:
      values: |
        serviceMonitor:
          enabled: true
          interval: 15s
        extraEnv:
          - name: DCGM_EXPORTER_COLLECTORS
            value: "/etc/dcgm-exporter/dcp-metrics-included.csv"
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
```

You can then build Grafana dashboards showing GPU utilization, memory usage, temperature, and power consumption across your cluster, all managed through GitOps.

## Best Practices

1. **Pin GPU driver versions** - GPU drivers can introduce regressions. Always pin your driver version in the GPU operator config and test upgrades in staging first.

2. **Use separate node pools** - Keep GPU nodes in dedicated node pools with appropriate taints. This prevents regular workloads from accidentally landing on expensive GPU instances.

3. **Set appropriate sync policies** - For training jobs, disable auto-prune so ArgoCD does not delete completed jobs before you can inspect results.

4. **Monitor costs** - GPU instances are expensive. Use labels on your ArgoCD Applications to track which team and project is consuming GPU resources.

5. **Use shared memory volumes** - Always mount `/dev/shm` with sufficient memory for multi-GPU training. The default 64MB is not enough for NCCL.

Managing GPU workloads with ArgoCD brings the same predictability and auditability to your ML infrastructure that you expect from regular application deployments. Every change to GPU configurations, quotas, and workloads is tracked in Git, making it easy to understand what changed and when.

For related content on deploying ML infrastructure with ArgoCD, check out our posts on [deploying MLflow with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-mlflow/view) and [deploying Ray clusters with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-ray-clusters/view).
