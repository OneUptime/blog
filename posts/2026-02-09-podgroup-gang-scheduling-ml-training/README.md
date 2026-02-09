# How to Use PodGroup and Gang Scheduling for Distributed ML Training

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Machine Learning, Scheduling

Description: Master gang scheduling with PodGroup in Kubernetes to ensure all pods in distributed ML training jobs are scheduled together, preventing resource deadlocks and improving training efficiency.

---

Distributed machine learning training requires multiple pods to work together simultaneously. If only some pods are scheduled while others remain pending due to resource constraints, the entire training job stalls. This creates inefficient resource usage and can lead to deadlocks where partially scheduled jobs hold resources without making progress.

Gang scheduling solves this by treating groups of pods as an atomic unit. Either all pods in the group are scheduled together, or none are scheduled. This ensures distributed training jobs only consume resources when they can actually run.

## Understanding Gang Scheduling

Traditional Kubernetes scheduling treats each pod independently. Gang scheduling introduces the concept of a PodGroup where:

- All pods in the group must be scheduled simultaneously
- If resources aren't available for all pods, none are scheduled
- Resources are reserved atomically for the entire group
- Once scheduled, the group runs as a cohesive unit

This is critical for distributed ML training where pods must communicate and synchronize.

## Installing the Scheduler Plugins

Gang scheduling requires the Kubernetes scheduler-plugins project. Install it using Helm:

```bash
# Add the scheduler-plugins Helm repository
helm repo add scheduler-plugins https://kubernetes-sigs.github.io/scheduler-plugins
helm repo update

# Install the scheduler with gang scheduling enabled
helm install scheduler-plugins scheduler-plugins/scheduler-plugins \
  --namespace scheduler-plugins \
  --create-namespace \
  --set plugins.enabled="Coscheduling" \
  --set controller.enabled=true
```

Verify the installation:

```bash
kubectl get pods -n scheduler-plugins
kubectl get crd | grep scheduling
```

## Creating a PodGroup

Define a PodGroup for a distributed training job:

```yaml
# ml-training-podgroup.yaml
apiVersion: scheduling.sigs.k8s.io/v1alpha1
kind: PodGroup
metadata:
  name: pytorch-training-group
  namespace: ml-training
spec:
  # Minimum number of pods that must be scheduled together
  minMember: 4
  # Optional: minimum resources for the group
  minResources:
    cpu: "16"
    memory: "64Gi"
    nvidia.com/gpu: "4"
  # Scheduling timeout - if group can't be scheduled in this time, it's rejected
  scheduleTimeoutSeconds: 120
```

## Distributed PyTorch Training Job

Create a training job that uses the PodGroup:

```yaml
# pytorch-distributed-training.yaml
apiVersion: v1
kind: Service
metadata:
  name: pytorch-master
  namespace: ml-training
spec:
  clusterIP: None
  selector:
    app: pytorch-training
    role: master
  ports:
  - port: 23456
    name: pytorch
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: pytorch-worker
  namespace: ml-training
spec:
  serviceName: pytorch-master
  replicas: 4  # Must match PodGroup minMember
  selector:
    matchLabels:
      app: pytorch-training
  template:
    metadata:
      labels:
        app: pytorch-training
        pod-group.scheduling.sigs.k8s.io/name: pytorch-training-group
        pod-group.scheduling.sigs.k8s.io/min-available: "4"
    spec:
      schedulerName: scheduler-plugins-scheduler
      restartPolicy: Always
      containers:
      - name: pytorch
        image: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
        command:
        - python
        - -m
        - torch.distributed.launch
        - --nproc_per_node=1
        - --nnodes=4
        - --node_rank=$(RANK)
        - --master_addr=pytorch-master-0.pytorch-master
        - --master_port=23456
        - train.py
        env:
        - name: RANK
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['statefulset.kubernetes.io/pod-name']
        resources:
          requests:
            cpu: 4000m
            memory: 16Gi
            nvidia.com/gpu: 1
          limits:
            cpu: 8000m
            memory: 32Gi
            nvidia.com/gpu: 1
        volumeMounts:
        - name: training-code
          mountPath: /workspace
        - name: training-data
          mountPath: /data
        - name: dshm
          mountPath: /dev/shm
      volumes:
      - name: training-code
        configMap:
          name: training-code
      - name: training-data
        persistentVolumeClaim:
          claimName: training-data
      - name: dshm
        emptyDir:
          medium: Memory
          sizeLimit: 8Gi
```

## TensorFlow Distributed Training

Gang scheduling works equally well for TensorFlow:

```yaml
# tensorflow-podgroup.yaml
apiVersion: scheduling.sigs.k8s.io/v1alpha1
kind: PodGroup
metadata:
  name: tf-distributed-group
  namespace: ml-training
spec:
  minMember: 5  # 1 chief + 4 workers
  minResources:
    cpu: "20"
    memory: "80Gi"
    nvidia.com/gpu: "5"
  scheduleTimeoutSeconds: 180
---
# tensorflow-chief.yaml
apiVersion: v1
kind: Pod
metadata:
  name: tf-chief
  namespace: ml-training
  labels:
    app: tensorflow-training
    role: chief
    pod-group.scheduling.sigs.k8s.io/name: tf-distributed-group
    pod-group.scheduling.sigs.k8s.io/min-available: "5"
spec:
  schedulerName: scheduler-plugins-scheduler
  containers:
  - name: tensorflow
    image: tensorflow/tensorflow:2.12.0-gpu
    command:
    - python
    - train_distributed.py
    - --job_name=chief
    - --task_index=0
    args:
    - --worker_hosts=tf-worker-0:2222,tf-worker-1:2222,tf-worker-2:2222,tf-worker-3:2222
    - --chief_host=tf-chief:2222
    resources:
      requests:
        cpu: 4000m
        memory: 16Gi
        nvidia.com/gpu: 1
      limits:
        cpu: 8000m
        memory: 32Gi
        nvidia.com/gpu: 1
    ports:
    - containerPort: 2222
---
# tensorflow-workers.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tf-worker
  namespace: ml-training
spec:
  serviceName: tf-workers
  replicas: 4
  selector:
    matchLabels:
      app: tensorflow-training
      role: worker
  template:
    metadata:
      labels:
        app: tensorflow-training
        role: worker
        pod-group.scheduling.sigs.k8s.io/name: tf-distributed-group
        pod-group.scheduling.sigs.k8s.io/min-available: "5"
    spec:
      schedulerName: scheduler-plugins-scheduler
      containers:
      - name: tensorflow
        image: tensorflow/tensorflow:2.12.0-gpu
        command:
        - python
        - train_distributed.py
        - --job_name=worker
        args:
        - --worker_hosts=tf-worker-0:2222,tf-worker-1:2222,tf-worker-2:2222,tf-worker-3:2222
        - --chief_host=tf-chief:2222
        resources:
          requests:
            cpu: 4000m
            memory: 16Gi
            nvidia.com/gpu: 1
          limits:
            cpu: 8000m
            memory: 32Gi
            nvidia.com/gpu: 1
```

## MPI-Based Distributed Training

For MPI-based frameworks like Horovod:

```yaml
# mpi-podgroup.yaml
apiVersion: scheduling.sigs.k8s.io/v1alpha1
kind: PodGroup
metadata:
  name: horovod-training-group
  namespace: ml-training
spec:
  minMember: 8
  minResources:
    cpu: "32"
    memory: "128Gi"
    nvidia.com/gpu: "8"
  scheduleTimeoutSeconds: 300
---
# horovod-training.yaml
apiVersion: kubeflow.org/v2beta1
kind: MPIJob
metadata:
  name: horovod-training
  namespace: ml-training
spec:
  slotsPerWorker: 1
  runPolicy:
    cleanPodPolicy: Running
  mpiReplicaSpecs:
    Launcher:
      replicas: 1
      template:
        metadata:
          labels:
            pod-group.scheduling.sigs.k8s.io/name: horovod-training-group
            pod-group.scheduling.sigs.k8s.io/min-available: "8"
        spec:
          schedulerName: scheduler-plugins-scheduler
          containers:
          - name: mpi-launcher
            image: horovod/horovod:0.28.0-tf2.12.0-torch2.0.0-mxnet1.9.1-py3.9-gpu
            command:
            - mpirun
            args:
            - -np
            - "8"
            - --hostfile
            - /etc/mpi/hostfile
            - python
            - train.py
            resources:
              requests:
                cpu: 1000m
                memory: 2Gi
    Worker:
      replicas: 8
      template:
        metadata:
          labels:
            pod-group.scheduling.sigs.k8s.io/name: horovod-training-group
            pod-group.scheduling.sigs.k8s.io/min-available: "8"
        spec:
          schedulerName: scheduler-plugins-scheduler
          containers:
          - name: mpi-worker
            image: horovod/horovod:0.28.0-tf2.12.0-torch2.0.0-mxnet1.9.1-py3.9-gpu
            resources:
              requests:
                cpu: 4000m
                memory: 16Gi
                nvidia.com/gpu: 1
              limits:
                cpu: 8000m
                memory: 32Gi
                nvidia.com/gpu: 1
```

## Monitoring PodGroup Status

Check the status of your PodGroups:

```bash
# List all PodGroups
kubectl get podgroups -n ml-training

# Get detailed information
kubectl describe podgroup pytorch-training-group -n ml-training

# Check if all pods in the group are scheduled
kubectl get pods -n ml-training -l pod-group.scheduling.sigs.k8s.io/name=pytorch-training-group

# View scheduling events
kubectl get events -n ml-training --sort-by='.lastTimestamp' | grep -i podgroup
```

## Handling Scheduling Failures

If a PodGroup cannot be scheduled within the timeout:

```bash
# Check PodGroup status
kubectl get podgroup pytorch-training-group -n ml-training -o jsonpath='{.status}'

# View reasons for scheduling failure
kubectl describe podgroup pytorch-training-group -n ml-training

# Check cluster resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# List pending pods in the group
kubectl get pods -n ml-training \
  -l pod-group.scheduling.sigs.k8s.io/name=pytorch-training-group \
  --field-selector=status.phase=Pending
```

## Priority and Gang Scheduling

Combine PodGroups with priority classes:

```yaml
# high-priority-podgroup.yaml
apiVersion: scheduling.sigs.k8s.io/v1alpha1
kind: PodGroup
metadata:
  name: critical-training-group
  namespace: ml-training
spec:
  minMember: 4
  minResources:
    cpu: "16"
    memory: "64Gi"
    nvidia.com/gpu: "4"
  scheduleTimeoutSeconds: 120
  # Priority for the entire group
  priorityClassName: ml-training-high
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: ml-training-high
value: 100000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "High priority for critical ML training jobs"
```

Apply priority to the pods:

```yaml
spec:
  template:
    spec:
      schedulerName: scheduler-plugins-scheduler
      priorityClassName: ml-training-high
      containers:
      - name: trainer
        image: ml-framework:latest
```

## Queue Management for Multiple PodGroups

When multiple PodGroups compete for resources, implement queuing:

```yaml
# queue-controller.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: podgroup-queue-config
  namespace: scheduler-plugins
data:
  config.yaml: |
    profiles:
    - schedulerName: scheduler-plugins-scheduler
      plugins:
        queueSort:
          enabled:
          - name: PrioritySort
        preFilter:
          enabled:
          - name: Coscheduling
        permit:
          enabled:
          - name: Coscheduling
        reserve:
          enabled:
          - name: Coscheduling
        postBind:
          enabled:
          - name: Coscheduling
      pluginConfig:
      - name: Coscheduling
        args:
          permitWaitingTimeSeconds: 60
          deniedPGExpirationTimeSeconds: 20
```

## Auto-Scaling with Gang Scheduling

Configure cluster autoscaler to handle gang-scheduled workloads:

```yaml
# cluster-autoscaler-gang.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  cluster-autoscaler: |
    --balance-similar-node-groups=true
    --skip-nodes-with-system-pods=false
    --skip-nodes-with-local-storage=false
    --expander=priority
    --max-node-provision-time=15m
    # Important for gang scheduling
    --new-pod-scale-up-delay=0s
```

## Best Practices

1. **Set Realistic Timeouts**: Configure `scheduleTimeoutSeconds` based on your cluster's autoscaling time
2. **Match MinMember**: Ensure the PodGroup `minMember` matches your actual pod count
3. **Resource Accuracy**: Set accurate resource requests to help the scheduler make good decisions
4. **Use Priority Classes**: Assign appropriate priorities to ensure important training jobs get resources
5. **Monitor Queue Depth**: Track how many PodGroups are waiting to identify capacity issues
6. **Implement Retries**: Configure retry logic for failed PodGroups
7. **Node Affinity**: Use node affinity to ensure pods land on appropriate hardware (GPU nodes)
8. **Test at Scale**: Validate gang scheduling behavior with realistic workload sizes

## Troubleshooting

If PodGroups aren't being scheduled:

```bash
# Check scheduler plugins are running
kubectl get pods -n scheduler-plugins

# Verify CRD is installed
kubectl get crd podgroups.scheduling.sigs.k8s.io

# Check scheduler logs
kubectl logs -n scheduler-plugins -l component=scheduler

# Verify pod labels match PodGroup
kubectl get pods -n ml-training -o jsonpath='{.items[*].metadata.labels}'

# Check if timeout was exceeded
kubectl get podgroup -n ml-training -o yaml | grep -A 5 status
```

If pods are pending despite available resources:

```bash
# Verify schedulerName is correct
kubectl get pods -n ml-training -o jsonpath='{.items[*].spec.schedulerName}'

# Check if all pods in group have the same labels
kubectl get pods -n ml-training \
  -l pod-group.scheduling.sigs.k8s.io/name=pytorch-training-group \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.labels}{"\n"}{end}'

# Look for scheduling errors
kubectl describe podgroup -n ml-training
```

## Metrics and Monitoring

Track gang scheduling effectiveness:

```bash
# Count PodGroups by status
kubectl get podgroups --all-namespaces -o json | \
  jq -r '.items[] | .status.phase' | \
  sort | uniq -c

# Calculate average wait time for PodGroups
kubectl get podgroups --all-namespaces -o json | \
  jq -r '.items[] |
    {name: .metadata.name,
     created: .metadata.creationTimestamp,
     scheduled: .status.scheduled}' | \
  jq -s 'map(select(.scheduled != null))'

# Monitor resource efficiency
kubectl top nodes
kubectl top pods -n ml-training
```

Gang scheduling with PodGroups is essential for distributed ML training in Kubernetes. By ensuring all pods in a training job are scheduled together, you prevent resource deadlocks, improve cluster utilization, and make distributed training more reliable and efficient.

