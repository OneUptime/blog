# How to Deploy Kubernetes Job Queue with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kubernetes, job queue, gitops, kueue, batch processing, scheduling

Description: A practical guide to deploying and managing Kubernetes job queues using Kueue and Flux CD for GitOps-driven batch workload management.

---

## Introduction

Kubernetes Kueue is a job queueing system that manages batch workloads by providing quota management, fair sharing, and priority-based scheduling. Unlike the default Kubernetes scheduler, Kueue allows you to queue jobs and release them based on available cluster capacity and configured policies.

Deploying Kueue with Flux CD gives you GitOps-managed job queues where quota policies, priority classes, and queue configurations are all version-controlled and automatically reconciled.

## Prerequisites

- A Kubernetes cluster (v1.27 or later, Kueue requires recent versions)
- Flux CD installed and bootstrapped
- kubectl access to the cluster

## Repository Structure

```
clusters/
  production/
    kueue/
      namespace.yaml
      source.yaml
      release.yaml
      config/
        cluster-queue.yaml
        local-queues.yaml
        resource-flavors.yaml
        workload-priority.yaml
      examples/
        batch-job.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/production/kueue/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kueue-system
  labels:
    app.kubernetes.io/part-of: kueue
```

## Step 2: Add the Kueue Source

Kueue can be installed from its official release manifests or via Helm.

```yaml
# clusters/production/kueue/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kueue
  namespace: flux-system
spec:
  # Kueue Helm chart repository
  url: https://kubernetes-sigs.github.io/kueue/charts
  interval: 1h
```

## Step 3: Deploy Kueue

```yaml
# clusters/production/kueue/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: kueue
  namespace: kueue-system
spec:
  interval: 30m
  chart:
    spec:
      chart: kueue
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: kueue
        namespace: flux-system
      interval: 12h
  install:
    createNamespace: false
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    # Controller manager configuration
    controllerManager:
      replicas: 2
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
      # Manager configuration
      manager:
        # Enable batch/job integration
        integrations:
          frameworks:
            - "batch/job"
            - "jobset.x-k8s.io/v1alpha2"
        # Pod visibility for better resource tracking
        podVisibilityOnDemand: true
    # Webhook configuration
    webhook:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
```

## Step 4: Define Resource Flavors

Resource flavors describe the types of resources available in your cluster.

```yaml
# clusters/production/kueue/config/resource-flavors.yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: ResourceFlavor
metadata:
  name: default-flavor
spec:
  # Node labels that identify nodes with these resources
  nodeLabels:
    node-type: general
  # Tolerations applied to workloads using this flavor
  tolerations:
    - key: "node-type"
      operator: "Equal"
      value: "general"
      effect: "NoSchedule"
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: ResourceFlavor
metadata:
  name: gpu-flavor
spec:
  nodeLabels:
    # Nodes with GPU accelerators
    node-type: gpu
    accelerator: nvidia-a100
  tolerations:
    - key: "nvidia.com/gpu"
      operator: "Exists"
      effect: "NoSchedule"
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: ResourceFlavor
metadata:
  name: spot-flavor
spec:
  nodeLabels:
    # Spot/preemptible nodes for cost savings
    node-type: spot
    kubernetes.io/lifecycle: spot
  tolerations:
    - key: "spot"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
```

## Step 5: Create Cluster Queues

Cluster queues define the total resource capacity available for batch workloads.

```yaml
# clusters/production/kueue/config/cluster-queue.yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: ClusterQueue
metadata:
  name: production-cluster-queue
spec:
  # Preemption policy
  preemption:
    reclaimWithinCohort: Any
    withinClusterQueue: LowerPriority
  # Cohort groups cluster queues that can borrow from each other
  cohort: production
  # Queueing strategy: BestEffortFIFO or StrictFIFO
  queueingStrategy: BestEffortFIFO
  # Namespace selector restricts which namespaces can use this queue
  namespaceSelector:
    matchLabels:
      kueue-enabled: "true"
  # Resource groups define available capacity
  resourceGroups:
    - coveredResources: ["cpu", "memory"]
      flavors:
        - name: default-flavor
          resources:
            - name: "cpu"
              nominalQuota: 64
              borrowingLimit: 16
            - name: "memory"
              nominalQuota: 128Gi
              borrowingLimit: 32Gi
        - name: spot-flavor
          resources:
            - name: "cpu"
              nominalQuota: 32
            - name: "memory"
              nominalQuota: 64Gi
    - coveredResources: ["nvidia.com/gpu"]
      flavors:
        - name: gpu-flavor
          resources:
            - name: "nvidia.com/gpu"
              nominalQuota: 8
              borrowingLimit: 4
---
# Separate cluster queue for low-priority batch jobs
apiVersion: kueue.x-k8s.io/v1beta1
kind: ClusterQueue
metadata:
  name: batch-cluster-queue
spec:
  preemption:
    reclaimWithinCohort: Any
    withinClusterQueue: LowerPriority
  cohort: production
  queueingStrategy: BestEffortFIFO
  namespaceSelector:
    matchLabels:
      kueue-enabled: "true"
  resourceGroups:
    - coveredResources: ["cpu", "memory"]
      flavors:
        - name: spot-flavor
          resources:
            - name: "cpu"
              nominalQuota: 16
              # Can borrow unused resources from the cohort
              borrowingLimit: 32
            - name: "memory"
              nominalQuota: 32Gi
              borrowingLimit: 64Gi
```

## Step 6: Create Local Queues

Local queues are namespace-scoped and point to a cluster queue.

```yaml
# clusters/production/kueue/config/local-queues.yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: LocalQueue
metadata:
  name: team-a-queue
  namespace: team-a
spec:
  # Reference the cluster queue this local queue belongs to
  clusterQueue: production-cluster-queue
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: LocalQueue
metadata:
  name: team-b-queue
  namespace: team-b
spec:
  clusterQueue: production-cluster-queue
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: LocalQueue
metadata:
  name: batch-queue
  namespace: batch-jobs
spec:
  # Low-priority jobs use the batch cluster queue
  clusterQueue: batch-cluster-queue
```

## Step 7: Configure Workload Priority Classes

Define priority classes to control job scheduling order.

```yaml
# clusters/production/kueue/config/workload-priority.yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: WorkloadPriorityClass
metadata:
  name: high-priority
spec:
  # Higher value means higher priority
  value: 1000
  description: "High priority jobs that should be scheduled first"
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: WorkloadPriorityClass
metadata:
  name: normal-priority
spec:
  value: 500
  description: "Normal priority for standard batch jobs"
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: WorkloadPriorityClass
metadata:
  name: low-priority
spec:
  value: 100
  description: "Low priority jobs that run when resources are available"
```

## Step 8: Create Example Batch Jobs

Define batch jobs that use Kueue for queue management.

```yaml
# clusters/production/kueue/examples/batch-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing-job
  namespace: team-a
  labels:
    # Kueue uses this label to manage the job
    kueue.x-k8s.io/queue-name: team-a-queue
    kueue.x-k8s.io/priority-class: normal-priority
spec:
  parallelism: 4
  completions: 10
  completionMode: Indexed
  template:
    spec:
      containers:
        - name: processor
          image: python:3.11-slim
          command: ["python", "-c"]
          args:
            - |
              import os
              import time
              # Get the job index for partitioned processing
              job_index = int(os.environ.get('JOB_COMPLETION_INDEX', 0))
              total_completions = 10
              print(f"Processing partition {job_index} of {total_completions}")
              # Simulate data processing work
              time.sleep(60)
              print(f"Partition {job_index} completed")
          resources:
            requests:
              cpu: "2"
              memory: 4Gi
            limits:
              cpu: "4"
              memory: 8Gi
      restartPolicy: OnFailure
---
# GPU training job with high priority
apiVersion: batch/v1
kind: Job
metadata:
  name: model-training
  namespace: team-a
  labels:
    kueue.x-k8s.io/queue-name: team-a-queue
    kueue.x-k8s.io/priority-class: high-priority
spec:
  parallelism: 1
  completions: 1
  template:
    spec:
      containers:
        - name: trainer
          image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
          command: ["python", "train.py"]
          resources:
            requests:
              cpu: "4"
              memory: 16Gi
              nvidia.com/gpu: "1"
            limits:
              cpu: "8"
              memory: 32Gi
              nvidia.com/gpu: "1"
      restartPolicy: Never
  backoffLimit: 3
```

## Step 9: Configure Team Namespaces

Set up namespaces with the required labels for Kueue.

```yaml
# clusters/production/kueue/config/team-namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    # Required label for Kueue cluster queue namespace selector
    kueue-enabled: "true"
    team: team-a
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-b
  labels:
    kueue-enabled: "true"
    team: team-b
---
apiVersion: v1
kind: Namespace
metadata:
  name: batch-jobs
  labels:
    kueue-enabled: "true"
    purpose: batch
```

## Step 10: Create the Flux Kustomization

```yaml
# clusters/production/kueue/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kueue
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/kueue
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kueue-controller-manager
      namespace: kueue-system
  timeout: 10m
```

## Step 11: Verify the Deployment

```bash
# Check Flux reconciliation
flux get helmreleases -n kueue-system

# Verify Kueue controller is running
kubectl get pods -n kueue-system

# Check cluster queues and their status
kubectl get clusterqueues

# Check local queues
kubectl get localqueues -A

# View resource flavors
kubectl get resourceflavors

# Check workload priority classes
kubectl get workloadpriorityclasses

# Submit a test job and watch it queue
kubectl apply -f clusters/production/kueue/examples/batch-job.yaml

# Check workload status (Kueue's view of the job)
kubectl get workloads -n team-a

# View detailed workload admission status
kubectl describe workload -n team-a
```

## Troubleshooting

```bash
# Check Kueue controller logs
kubectl logs -n kueue-system deployment/kueue-controller-manager

# If jobs are stuck in suspended state, check queue capacity
kubectl get clusterqueues -o yaml

# Check if namespace has the required label
kubectl get namespace team-a --show-labels

# Verify workload admission
kubectl get workloads -n team-a -o jsonpath='{.items[*].status.conditions}'

# Force Flux reconciliation
flux reconcile helmrelease kueue -n kueue-system --with-source

# Check Kueue CRDs are installed
kubectl get crd | grep kueue
```

## Summary

You now have Kubernetes Kueue deployed via Flux CD, providing a robust job queueing system for batch workloads. Resource flavors define the types of compute available, cluster queues set capacity limits, and local queues give teams self-service access to submit jobs. Priority classes ensure critical jobs are scheduled first, while the borrowing mechanism allows efficient use of idle resources across teams. All queue configurations, resource limits, and policies are managed through GitOps, making changes auditable and reproducible across environments.
