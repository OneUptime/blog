# How to Configure Priority-Based GPU Scheduling for Mixed ML Training and Inference Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Machine Learning, GPU

Description: Learn how to implement priority-based GPU scheduling in Kubernetes to efficiently manage mixed machine learning workloads, ensuring critical inference services get resources while allowing batch training jobs to utilize spare capacity.

---

GPU resources are expensive and scarce. In most ML platforms, you need to serve both latency-sensitive inference workloads and throughput-oriented training jobs. Without priority-based scheduling, a long-running training job can starve inference services, causing user-facing latency spikes or downtime.

Kubernetes provides PriorityClasses to solve this problem, but configuring them correctly for GPU workloads requires understanding several moving parts. In this guide, you'll learn how to set up a robust priority-based scheduling system that keeps inference responsive while maximizing GPU utilization for training.

## The Challenge of Mixed Workloads

Consider a typical scenario: you have 8 GPU nodes in your cluster. During business hours, you need 6 GPUs for inference services handling customer traffic. The remaining 2 GPUs should run training jobs. At night, when traffic drops, all 8 GPUs should be available for training.

Without priority scheduling, Kubernetes treats all pods equally. A training job that starts at 2 PM might grab all available GPUs, leaving inference services pending. Or worse, inference pods might claim GPUs first, and training jobs remain pending indefinitely.

Priority-based scheduling solves this by allowing higher-priority pods to preempt lower-priority ones. When an inference pod needs a GPU and none are free, Kubernetes evicts a training pod to make room.

## Understanding PriorityClasses

PriorityClasses are cluster-wide resources that define numeric priority values. Higher numbers mean higher priority. When the scheduler needs to place a pod but no resources are available, it looks for lower-priority pods to evict.

Kubernetes has built-in PriorityClasses for system components, typically with values around 2000000000. For user workloads, you'll typically use values between 0 and 10000.

Create a priority hierarchy for ML workloads:

```yaml
# ml-priorities.yaml
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: inference-critical
value: 10000
globalDefault: false
description: "Critical inference services that must always be available"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: inference-standard
value: 5000
globalDefault: false
description: "Standard inference services"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: training-high
value: 1000
globalDefault: false
description: "Important training jobs, e.g., production model retraining"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: training-standard
value: 500
globalDefault: false
description: "Standard research and development training"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: training-low
value: 100
globalDefault: false
description: "Low-priority experiments and batch processing"
```

Apply these PriorityClasses:

```bash
kubectl apply -f ml-priorities.yaml
```

This creates a five-tier system where inference always wins over training, but within each category you have gradations for finer control.

## Configuring Inference Services with High Priority

Apply the critical priority to your inference deployments:

```yaml
# inference-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bert-sentiment-inference
  namespace: ml-inference
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bert-inference
  template:
    metadata:
      labels:
        app: bert-inference
        workload-type: inference
    spec:
      priorityClassName: inference-critical  # Set high priority
      containers:
        - name: inference-server
          image: pytorch/pytorch:2.0-cuda11.8-cudnn8
          command: ["python", "serve.py"]
          resources:
            requests:
              cpu: "2"
              memory: 8Gi
              nvidia.com/gpu: "1"
            limits:
              cpu: "4"
              memory: 16Gi
              nvidia.com/gpu: "1"
      nodeSelector:
        gpu-type: nvidia-a100
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
```

The key line is `priorityClassName: inference-critical`. This tells the scheduler that if this pod can't be placed due to resource constraints, it should evict lower-priority pods to make room.

## Configuring Training Jobs with Lower Priority

Training jobs use lower priorities and should be designed to handle preemption gracefully:

```yaml
# training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: resnet-training-job
  namespace: ml-training
spec:
  backoffLimit: 3  # Retry if preempted
  template:
    metadata:
      labels:
        app: resnet-training
        workload-type: training
    spec:
      priorityClassName: training-standard  # Lower priority
      restartPolicy: OnFailure
      containers:
        - name: trainer
          image: pytorch/pytorch:2.0-cuda11.8-cudnn8
          command:
            - python
            - train.py
            - --checkpoint-dir=/checkpoints
            - --resume-from-checkpoint=true  # Handle preemption
          resources:
            requests:
              cpu: "4"
              memory: 16Gi
              nvidia.com/gpu: "1"
            limits:
              cpu: "8"
              memory: 32Gi
              nvidia.com/gpu: "1"
          volumeMounts:
            - name: checkpoints
              mountPath: /checkpoints
      volumes:
        - name: checkpoints
          persistentVolumeClaim:
            claimName: training-checkpoints
      nodeSelector:
        gpu-type: nvidia-a100
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
```

Critical features for training jobs:

1. **Lower priorityClassName**: Allows preemption by inference
2. **Checkpoint support**: Training can resume after preemption
3. **backoffLimit**: Retries after being evicted
4. **restartPolicy: OnFailure**: Restarts the pod if preempted

## Implementing Graceful Checkpoint Handling

Training code must checkpoint frequently to minimize lost work when preempted:

```python
# train.py
import torch
import os
import signal
import sys

class PreemptionHandler:
    def __init__(self, checkpoint_dir):
        self.checkpoint_dir = checkpoint_dir
        self.checkpoint_path = os.path.join(checkpoint_dir, 'latest.pt')
        self.preemption_requested = False

        # Handle SIGTERM sent by Kubernetes before pod termination
        signal.signal(signal.SIGTERM, self.handle_preemption)

    def handle_preemption(self, signum, frame):
        print("Preemption signal received, saving checkpoint...")
        self.preemption_requested = True

    def save_checkpoint(self, model, optimizer, epoch, loss):
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'loss': loss,
        }
        # Save to temporary file first, then rename atomically
        temp_path = self.checkpoint_path + '.tmp'
        torch.save(checkpoint, temp_path)
        os.rename(temp_path, self.checkpoint_path)
        print(f"Checkpoint saved at epoch {epoch}")

    def load_checkpoint(self, model, optimizer):
        if os.path.exists(self.checkpoint_path):
            print(f"Loading checkpoint from {self.checkpoint_path}")
            checkpoint = torch.load(self.checkpoint_path)
            model.load_state_dict(checkpoint['model_state_dict'])
            optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
            return checkpoint['epoch'], checkpoint['loss']
        return 0, None

def train():
    # Initialize model, optimizer, etc.
    model = ResNet50()
    optimizer = torch.optim.Adam(model.parameters())

    # Set up preemption handling
    handler = PreemptionHandler('/checkpoints')
    start_epoch, _ = handler.load_checkpoint(model, optimizer)

    for epoch in range(start_epoch, num_epochs):
        for batch_idx, (data, target) in enumerate(train_loader):
            # Check for preemption signal
            if handler.preemption_requested:
                handler.save_checkpoint(model, optimizer, epoch, loss.item())
                print("Checkpoint saved, exiting gracefully")
                sys.exit(0)

            # Training step
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()

            # Save checkpoint every N batches
            if batch_idx % 100 == 0:
                handler.save_checkpoint(model, optimizer, epoch, loss.item())

if __name__ == '__main__':
    train()
```

This code catches the SIGTERM signal that Kubernetes sends before terminating a pod, saves a checkpoint, and exits gracefully. On restart, it resumes from the last checkpoint.

## Configuring Preemption Policies

You can tune how aggressively the scheduler preempts pods:

```yaml
# scheduler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: scheduler-config
  namespace: kube-system
data:
  scheduler-config.yaml: |
    apiVersion: kubescheduler.config.k8s.io/v1
    kind: KubeSchedulerConfiguration
    profiles:
      - schedulerName: default-scheduler
        plugins:
          preemption:
            enabled:
              - name: DefaultPreemption
        pluginConfig:
          - name: DefaultPreemption
            args:
              minCandidateNodesPercentage: 10
              minCandidateNodesAbsolute: 100
```

These settings control how many nodes the scheduler evaluates when looking for preemption candidates. Lower values make scheduling faster but potentially less optimal.

## Setting Pod Disruption Budgets

For inference services, use PodDisruptionBudgets to limit how many pods can be down simultaneously:

```yaml
# inference-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: bert-inference-pdb
  namespace: ml-inference
spec:
  minAvailable: 2  # Always keep at least 2 pods running
  selector:
    matchLabels:
      app: bert-inference
```

This ensures that even during maintenance or cluster autoscaling, you maintain minimum inference capacity.

## Implementing Time-Based Priority Adjustments

Use CronJobs to adjust priorities based on time of day:

```yaml
# priority-adjuster-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: lower-training-priority-daytime
  namespace: ml-training
spec:
  schedule: "0 8 * * 1-5"  # 8 AM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: priority-adjuster
          containers:
            - name: adjuster
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  # Scale down or reprioritize training workloads
                  kubectl patch deployment low-priority-training \
                    -n ml-training \
                    --type='json' \
                    -p='[{"op": "replace", "path": "/spec/replicas", "value": 1}]'
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: increase-training-priority-night
  namespace: ml-training
spec:
  schedule: "0 18 * * 1-5"  # 6 PM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: priority-adjuster
          containers:
            - name: adjuster
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  # Scale up training workloads
                  kubectl patch deployment low-priority-training \
                    -n ml-training \
                    --type='json' \
                    -p='[{"op": "replace", "path": "/spec/replicas", "value": 5}]'
          restartPolicy: OnFailure
```

Create the service account with appropriate RBAC:

```yaml
# priority-adjuster-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: priority-adjuster
  namespace: ml-training
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: ml-training
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: priority-adjuster-binding
  namespace: ml-training
subjects:
  - kind: ServiceAccount
    name: priority-adjuster
    namespace: ml-training
roleRef:
  kind: Role
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

## Monitoring Priority-Based Scheduling

Track metrics to ensure your priority system works effectively:

```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ml-scheduling-alerts
  namespace: monitoring
spec:
  groups:
    - name: ml-scheduling
      interval: 30s
      rules:
        - alert: InferencePodsPending
          expr: |
            sum(kube_pod_status_phase{namespace="ml-inference", phase="Pending"}) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Inference pods stuck in pending state"
            description: "{{ $value }} inference pods cannot be scheduled"

        - alert: HighPreemptionRate
          expr: |
            rate(kube_pod_container_status_restarts_total{namespace="ml-training"}[5m]) > 0.5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Training pods being preempted frequently"
            description: "Training workload restart rate is {{ $value }}/sec"
```

## Testing the Priority System

Verify priorities work by intentionally overcommitting GPU resources:

```bash
# Deploy high-priority inference (should always get scheduled)
kubectl apply -f inference-deployment.yaml

# Fill remaining GPUs with low-priority training
kubectl apply -f training-job-low-priority.yaml

# Wait for training to consume all GPUs
kubectl wait --for=condition=Running pod -l workload-type=training --timeout=60s

# Scale up inference (should preempt training)
kubectl scale deployment bert-sentiment-inference --replicas=6

# Check that training pods get evicted
kubectl get pods -n ml-training -w
```

You should see training pods transitioning to Terminating state as inference pods need resources.

## Conclusion

Priority-based GPU scheduling transforms Kubernetes into a smart resource manager that balances critical inference workloads with opportunistic training. By implementing PriorityClasses, graceful preemption handling, and appropriate monitoring, you create a system that maximizes GPU utilization without compromising service reliability.

Start with three priority levels for simplicity, monitor preemption rates and resource utilization, then adjust as needed. The goal is high GPU utilization with minimal user-facing impact from resource contention.
