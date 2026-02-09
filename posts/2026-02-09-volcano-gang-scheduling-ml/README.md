# How to Configure Volcano Batch Scheduler for Gang Scheduling ML Training Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Volcano, Gang Scheduling, Machine Learning, Batch Scheduling

Description: Configure Volcano batch scheduler on Kubernetes for gang scheduling of distributed ML training jobs to prevent resource deadlocks and improve cluster utilization.

---

Distributed ML training requires all worker pods to start simultaneously. If only some workers start, they waste resources waiting for others that may never come due to insufficient cluster capacity. Gang scheduling solves this by ensuring all pods in a job start together or none start at all. Volcano provides production-grade gang scheduling for Kubernetes workloads.

This guide shows you how to deploy Volcano and use it for ML training jobs.

## Understanding Gang Scheduling

Traditional Kubernetes scheduling can lead to deadlocks:

1. Job A requests 4 GPUs, gets 2
2. Job B requests 4 GPUs, gets 2
3. Both jobs wait indefinitely for remaining GPUs
4. Cluster is deadlocked

Gang scheduling prevents this by:
- Scheduling all pods of a job together atomically
- Releasing resources if the full gang can't be scheduled
- Supporting preemption for higher-priority jobs

## Installing Volcano

Install using Helm:

```bash
# Add Volcano Helm repository
helm repo add volcano-sh https://volcano-sh.github.io/helm-charts
helm repo update

# Install Volcano
helm install volcano volcano-sh/volcano \
  --namespace volcano-system \
  --create-namespace \
  --version 1.8.2

# Verify installation
kubectl get pods -n volcano-system

# Check scheduler is running
kubectl get deployment -n volcano-system volcano-scheduler
```

Verify CRDs are installed:

```bash
kubectl get crd | grep volcano

# Should see:
# jobs.batch.volcano.sh
# podgroups.scheduling.volcano.sh
# queues.scheduling.volcano.sh
```

## Creating a Queue

Queues manage resource allocation between teams or workloads:

```yaml
# ml-training-queue.yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: ml-training
spec:
  # Queue weight for fair sharing
  weight: 100

  # Resource capacity
  capability:
    cpu: "200"
    memory: "800Gi"
    nvidia.com/gpu: "32"

  # Reclaim resources from lower priority jobs
  reclaimable: true

  # Resource reservation
  guarantee:
    resource:
      cpu: "50"
      memory: "200Gi"
      nvidia.com/gpu: "8"
```

Create additional queues:

```yaml
# queues.yaml
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: high-priority
spec:
  weight: 200
  capability:
    cpu: "100"
    memory: "400Gi"
    nvidia.com/gpu: "16"
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: low-priority
spec:
  weight: 50
  capability:
    cpu: "100"
    memory: "400Gi"
    nvidia.com/gpu: "16"
```

Deploy queues:

```bash
kubectl apply -f ml-training-queue.yaml
kubectl apply -f queues.yaml

# Check queue status
kubectl get queue
```

## Creating a Gang-Scheduled Training Job

Define a distributed training job with gang scheduling:

```yaml
# volcano-training-job.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: pytorch-distributed-training
  namespace: ml-training
spec:
  # Minimum number of pods that must be ready
  minAvailable: 4

  # Scheduler to use
  schedulerName: volcano

  # Queue assignment
  queue: ml-training

  # Priority for preemption
  priorityClassName: high-priority

  # Pod group for gang scheduling
  plugins:
    svc: []
    env: []
    ssh: []

  # Task definitions
  tasks:
  - name: master
    replicas: 1
    template:
      metadata:
        labels:
          app: pytorch-training
          role: master
      spec:
        restartPolicy: OnFailure
        containers:
        - name: pytorch
          image: pytorch/pytorch:2.0.1-cuda11.8-cudnn8-runtime
          command:
          - python
          - /workspace/train.py
          - --role=master
          args:
          - --world-size=4
          - --rank=0
          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
              nvidia.com/gpu: 1
            limits:
              cpu: "8"
              memory: "32Gi"
              nvidia.com/gpu: 1
          env:
          - name: MASTER_ADDR
            value: "pytorch-distributed-training-master-0"
          - name: MASTER_PORT
            value: "23456"

  - name: worker
    replicas: 3
    template:
      metadata:
        labels:
          app: pytorch-training
          role: worker
      spec:
        restartPolicy: OnFailure
        containers:
        - name: pytorch
          image: pytorch/pytorch:2.0.1-cuda11.8-cudnn8-runtime
          command:
          - python
          - /workspace/train.py
          - --role=worker
          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
              nvidia.com/gpu: 1
            limits:
              cpu: "8"
              memory: "32Gi"
              nvidia.com/gpu: 1
          env:
          - name: MASTER_ADDR
            value: "pytorch-distributed-training-master-0"
          - name: MASTER_PORT
            value: "23456"
```

Deploy and monitor:

```bash
kubectl create namespace ml-training
kubectl apply -f volcano-training-job.yaml

# Watch job status
kubectl get vcjobs -n ml-training -w

# Check pod group status
kubectl get podgroup -n ml-training

# View job details
kubectl describe vcjob pytorch-distributed-training -n ml-training

# Check pod status
kubectl get pods -n ml-training -l app=pytorch-training
```

## Configuring Priority and Preemption

Create priority classes:

```yaml
# priority-classes.yaml
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000
globalDefault: false
description: "High priority for production training"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: medium-priority
value: 500
globalDefault: false
description: "Medium priority for development"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: true
description: "Low priority for experimental jobs"
```

Apply priority classes:

```bash
kubectl apply -f priority-classes.yaml

# Use in jobs
spec:
  priorityClassName: high-priority
```

## Fair Share Scheduling

Configure fair share scheduling across queues:

```yaml
# scheduler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
        enablePreemptable: true
      - name: conformance
    - plugins:
      - name: drf  # Dominant Resource Fairness
        enablePreemptable: false
      - name: predicates
      - name: proportion
      - name: nodeorder
```

Update Volcano scheduler:

```bash
kubectl apply -f scheduler-config.yaml

# Restart scheduler
kubectl rollout restart deployment -n volcano-system volcano-scheduler
```

## Using with TensorFlow Training

Create a TensorFlow distributed training job:

```yaml
# volcano-tensorflow-job.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-distributed
  namespace: ml-training
spec:
  minAvailable: 5  # 1 chief + 4 workers
  schedulerName: volcano
  queue: ml-training

  tasks:
  - name: chief
    replicas: 1
    template:
      spec:
        restartPolicy: OnFailure
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:2.14.0-gpu
          command:
          - python
          - /workspace/train.py
          env:
          - name: TF_CONFIG
            value: |
              {
                "cluster": {
                  "chief": ["tensorflow-distributed-chief-0:2222"],
                  "worker": ["tensorflow-distributed-worker-0:2222",
                            "tensorflow-distributed-worker-1:2222",
                            "tensorflow-distributed-worker-2:2222",
                            "tensorflow-distributed-worker-3:2222"]
                },
                "task": {"type": "chief", "index": 0}
              }
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "8"

  - name: worker
    replicas: 4
    template:
      spec:
        restartPolicy: OnFailure
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:2.14.0-gpu
          command:
          - python
          - /workspace/train.py
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "8"
```

## Resource Reservation and Quotas

Set queue resource limits:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: ml-training
spec:
  weight: 100

  # Hard limits
  capability:
    cpu: "200"
    memory: "800Gi"
    nvidia.com/gpu: "32"

  # Guaranteed minimum resources
  guarantee:
    resource:
      cpu: "50"
      memory: "200Gi"
      nvidia.com/gpu: "8"

  # Allow resource borrowing from other queues
  reclaimable: true

  # Reclaim policy when exceeding guarantee
  deserved:
    resource:
      cpu: "100"
      memory: "400Gi"
      nvidia.com/gpu: "16"
```

## Monitoring Volcano Scheduler

Query Volcano metrics:

```promql
# Pending jobs
volcano_queue_job_pending

# Running jobs
volcano_queue_job_running

# Queue allocated resources
volcano_queue_allocated{resource="nvidia.com/gpu"}

# Scheduling latency
volcano_e2e_scheduling_latency_milliseconds
```

View scheduler logs:

```bash
# Scheduler logs
kubectl logs -n volcano-system deployment/volcano-scheduler -f

# Filter for gang scheduling events
kubectl logs -n volcano-system deployment/volcano-scheduler | grep "gang"
```

## Handling Job Failures

Configure retry policies:

```yaml
spec:
  # Maximum retries
  maxRetry: 3

  # Restart policy for failed pods
  tasks:
  - name: worker
    template:
      spec:
        restartPolicy: OnFailure  # or Never

  # TTL for completed jobs
  ttlSecondsAfterFinished: 3600
```

## Best Practices

Set appropriate minAvailable:

```yaml
spec:
  # Ensure all critical pods start together
  minAvailable: 4  # Total pods needed

  tasks:
  - name: master
    replicas: 1
  - name: worker
    replicas: 3
  # minAvailable should be 1 + 3 = 4
```

Use resource requests carefully:

```yaml
resources:
  requests:
    # Request only what you need
    cpu: "4"
    memory: "16Gi"
    nvidia.com/gpu: 1
  limits:
    # Limits can be higher for bursting
    cpu: "8"
    memory: "32Gi"
    nvidia.com/gpu: 1
```

## Conclusion

Volcano brings production-grade batch scheduling to Kubernetes with gang scheduling that prevents resource deadlocks in distributed ML training. By ensuring all pods in a job start together, it eliminates wasted resources and training failures caused by partial pod allocation. The queue-based resource management and fair sharing policies make it possible to efficiently share GPU clusters across multiple teams and workloads while maintaining strong isolation and priority guarantees.
