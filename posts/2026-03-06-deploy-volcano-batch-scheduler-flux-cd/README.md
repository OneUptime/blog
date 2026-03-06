# How to Deploy Volcano Batch Scheduler with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, volcano, batch scheduler, kubernetes, gitops, helm, hpc, machine learning

Description: A practical guide to deploying the Volcano batch scheduling system on Kubernetes using Flux CD for high-performance computing and ML workloads.

---

## Introduction

Volcano is a CNCF project that provides batch scheduling capabilities for Kubernetes. It is designed for high-performance computing (HPC), machine learning, big data, and scientific computing workloads. Volcano extends Kubernetes scheduling with features like gang scheduling, fair-share scheduling, queue management, and job lifecycle management.

Deploying Volcano with Flux CD ensures your batch scheduling infrastructure is managed through GitOps, with all configurations, queues, and policies tracked in version control.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- kubectl access to the cluster
- Sufficient cluster resources for batch workloads

## Repository Structure

```
clusters/
  production/
    volcano/
      namespace.yaml
      source.yaml
      release.yaml
      queues/
        default-queue.yaml
        gpu-queue.yaml
        batch-queue.yaml
      jobs/
        example-job.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/production/volcano/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: volcano-system
  labels:
    app.kubernetes.io/part-of: volcano
```

## Step 2: Add the Volcano Helm Repository

```yaml
# clusters/production/volcano/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: volcano
  namespace: flux-system
spec:
  # Official Volcano Helm chart repository
  url: https://volcano-sh.github.io/helm-charts
  interval: 1h
```

## Step 3: Deploy Volcano

Create the HelmRelease with production-ready configuration.

```yaml
# clusters/production/volcano/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: volcano
  namespace: volcano-system
spec:
  interval: 30m
  chart:
    spec:
      chart: volcano
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: volcano
        namespace: flux-system
      interval: 12h
  install:
    createNamespace: false
    # Install CRDs with the chart
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    # Volcano controller configuration
    controller:
      replicas: 2
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 1Gi

    # Volcano scheduler configuration
    scheduler:
      replicas: 2
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: 2000m
          memory: 2Gi
      # Scheduler plugins configuration
      config: |
        actions: "enqueue, allocate, backfill"
        tiers:
          - plugins:
              - name: priority
              - name: gang
                enablePreemptable: false
              - name: conformance
          - plugins:
              - name: overcommit
              - name: drf
                enablePreemptable: false
              - name: predicates
              - name: proportion
              - name: nodeorder
              - name: binpack
                arguments:
                  binpack.weight: 5
                  binpack.cpu: 3
                  binpack.memory: 1
                  binpack.resources: nvidia.com/gpu

    # Admission webhook configuration
    admission:
      replicas: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
```

## Step 4: Configure Scheduling Queues

Define queues to organize and prioritize batch workloads.

```yaml
# clusters/production/volcano/queues/default-queue.yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: default
spec:
  # Weight determines resource share proportion
  weight: 4
  # Maximum resources this queue can consume
  capability:
    cpu: "32"
    memory: 64Gi
  # Reclaimable allows resources to be taken back when needed
  reclaimable: true
  # Queue state: Open or Closed
  state: Open
---
# clusters/production/volcano/queues/gpu-queue.yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: gpu-workloads
spec:
  # Higher weight gives more resource share
  weight: 6
  capability:
    cpu: "64"
    memory: 128Gi
    nvidia.com/gpu: "8"
  reclaimable: true
  state: Open
---
# clusters/production/volcano/queues/batch-queue.yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: batch-processing
spec:
  weight: 2
  capability:
    cpu: "16"
    memory: 32Gi
  reclaimable: true
  state: Open
```

## Step 5: Create Example Volcano Jobs

Define batch jobs that use Volcano scheduling features.

```yaml
# clusters/production/volcano/jobs/example-job.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: distributed-training
  namespace: default
spec:
  # Minimum members required to start (gang scheduling)
  minAvailable: 3
  # Assign to a specific queue
  queue: gpu-workloads
  # Scheduling policy
  schedulerName: volcano
  # Job policies for lifecycle management
  policies:
    - event: PodEvicted
      action: RestartJob
    - event: PodFailed
      action: RestartJob
      exitCodes:
        - 137
        - 143
  # Maximum retry count
  maxRetry: 3
  # Task definitions
  tasks:
    # Master task for distributed training
    - replicas: 1
      name: master
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - name: master
              image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Start distributed training master
                  python -m torch.distributed.launch \
                    --nproc_per_node=1 \
                    --nnodes=$VC_TASK_NUM \
                    --node_rank=0 \
                    --master_addr=$VC_MASTER_HOST \
                    --master_port=23456 \
                    train.py
              resources:
                requests:
                  cpu: "2"
                  memory: 8Gi
                  nvidia.com/gpu: "1"
                limits:
                  cpu: "4"
                  memory: 16Gi
                  nvidia.com/gpu: "1"
              ports:
                - containerPort: 23456
                  name: master-port
          restartPolicy: OnFailure

    # Worker tasks for distributed training
    - replicas: 2
      name: worker
      template:
        spec:
          containers:
            - name: worker
              image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Start distributed training worker
                  python -m torch.distributed.launch \
                    --nproc_per_node=1 \
                    --nnodes=$VC_TASK_NUM \
                    --node_rank=$VC_TASK_INDEX \
                    --master_addr=$VC_MASTER_HOST \
                    --master_port=23456 \
                    train.py
              resources:
                requests:
                  cpu: "2"
                  memory: 8Gi
                  nvidia.com/gpu: "1"
                limits:
                  cpu: "4"
                  memory: 16Gi
                  nvidia.com/gpu: "1"
          restartPolicy: OnFailure
```

## Step 6: Configure Resource Quotas per Queue

Apply resource quotas to enforce queue limits at the namespace level.

```yaml
# clusters/production/volcano/quotas/namespace-quotas.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-team-quota
  namespace: gpu-workloads
spec:
  hard:
    # Total resources the team can use
    requests.cpu: "64"
    requests.memory: 128Gi
    requests.nvidia.com/gpu: "8"
    limits.cpu: "128"
    limits.memory: 256Gi
    limits.nvidia.com/gpu: "8"
    # Maximum number of pods
    pods: "50"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: batch-team-quota
  namespace: batch-processing
spec:
  hard:
    requests.cpu: "16"
    requests.memory: 32Gi
    limits.cpu: "32"
    limits.memory: 64Gi
    pods: "100"
```

## Step 7: Create a MPI Job Example

Volcano supports MPI workloads for high-performance computing.

```yaml
# clusters/production/volcano/jobs/mpi-job.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mpi-simulation
  namespace: default
spec:
  minAvailable: 4
  queue: batch-processing
  schedulerName: volcano
  plugins:
    # SSH plugin enables inter-pod communication for MPI
    ssh: []
    # SVC plugin creates a headless service for pod discovery
    svc: []
  tasks:
    - replicas: 1
      name: mpimaster
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - name: mpimaster
              image: mpi-simulation:latest
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Wait for all workers to be ready
                  sleep 10
                  # Run MPI job across all nodes
                  mpirun --allow-run-as-root \
                    -np 4 \
                    --host $(cat /etc/volcano/mpihost) \
                    /app/simulation
              resources:
                requests:
                  cpu: "4"
                  memory: 8Gi
              workingDir: /app
          restartPolicy: OnFailure
    - replicas: 3
      name: mpiworker
      template:
        spec:
          containers:
            - name: mpiworker
              image: mpi-simulation:latest
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Start SSH daemon for MPI communication
                  /usr/sbin/sshd -D
              resources:
                requests:
                  cpu: "4"
                  memory: 8Gi
              ports:
                - containerPort: 22
                  name: ssh
          restartPolicy: OnFailure
```

## Step 8: Create the Flux Kustomization

```yaml
# clusters/production/volcano/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: volcano
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/volcano
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: volcano-controllers
      namespace: volcano-system
    - apiVersion: apps/v1
      kind: Deployment
      name: volcano-scheduler
      namespace: volcano-system
  timeout: 10m
```

## Step 9: Verify the Deployment

```bash
# Check Flux reconciliation
flux get helmreleases -n volcano-system

# Verify Volcano components are running
kubectl get pods -n volcano-system

# List all queues and their status
kubectl get queues

# Check queue details
kubectl describe queue gpu-workloads

# Submit a test job
kubectl apply -f clusters/production/volcano/jobs/example-job.yaml

# Watch job progress
kubectl get vcjob -w

# Check job details
kubectl describe vcjob distributed-training
```

## Troubleshooting

```bash
# Check scheduler logs for scheduling decisions
kubectl logs -n volcano-system deployment/volcano-scheduler

# Check controller logs for job lifecycle events
kubectl logs -n volcano-system deployment/volcano-controllers

# If jobs are stuck in Pending, check queue capacity
kubectl get queues -o yaml

# Check if gang scheduling is blocking (minAvailable not met)
kubectl describe vcjob <job-name>

# Force Flux reconciliation
flux reconcile helmrelease volcano -n volcano-system --with-source

# Verify CRDs are installed
kubectl get crd | grep volcano
```

## Summary

You now have Volcano batch scheduler deployed via Flux CD, providing advanced scheduling capabilities for HPC, ML, and batch processing workloads on Kubernetes. The queues, resource quotas, and scheduling policies are all managed through GitOps. Gang scheduling ensures distributed jobs start only when all required pods can be scheduled simultaneously. Fair-share scheduling with weighted queues ensures teams get proportional access to cluster resources. All changes to queues, policies, and job templates flow through Git, providing auditability and reproducibility.
