# How to Implement Non-Preempting Priority Classes for Best-Effort Batch Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Batch Processing, PriorityClass

Description: Learn how to configure non-preempting priority classes in Kubernetes to give batch jobs higher scheduling priority without disrupting running workloads through preemption.

---

Traditional priority classes in Kubernetes can preempt lower-priority pods to make room for higher-priority workloads. While this is useful for critical services, it's not always desirable for batch jobs. You might want batch jobs to be scheduled with higher priority when resources are available, but without causing disruption to running workloads.

Non-preempting priority classes solve this problem by giving pods higher scheduling priority without allowing them to evict other pods. This is perfect for batch processing workloads that are important but not urgent enough to justify disrupting running services.

## Understanding Non-Preempting Priority

A non-preempting priority class has the field `preemptionPolicy: Never`. This means:

- Pods with this priority are scheduled ahead of lower-priority pods when both are pending
- They cannot evict running pods, even those with lower priority
- If no resources are available, they wait until resources become available naturally
- They still count as higher priority for scheduling decisions

This creates a "polite" priority system where important batch jobs get resources quickly when available but don't disrupt existing workloads.

## Creating Non-Preempting Priority Classes

Let's define a hierarchy of non-preempting priorities for different types of batch workloads:

```yaml
# non-preempting-priorities.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-critical-no-preempt
value: 80000
preemptionPolicy: Never  # Key field: prevents preemption
globalDefault: false
description: "Critical batch jobs that need quick scheduling but won't preempt"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-high-no-preempt
value: 60000
preemptionPolicy: Never
globalDefault: false
description: "High priority batch jobs without preemption"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-normal-no-preempt
value: 40000
preemptionPolicy: Never
globalDefault: false
description: "Normal batch jobs that should be scheduled opportunistically"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-low-no-preempt
value: 20000
preemptionPolicy: Never
globalDefault: false
description: "Low priority batch jobs for when cluster has spare capacity"
```

Apply these priority classes:

```bash
kubectl apply -f non-preempting-priorities.yaml

# Verify creation
kubectl get priorityclasses | grep batch
```

## Example: Data Processing Job

Here's a data processing job using non-preempting priority:

```yaml
# data-processing-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: daily-report-generation
  namespace: batch-processing
spec:
  parallelism: 5
  completions: 50
  backoffLimit: 3
  template:
    metadata:
      labels:
        app: report-generator
        batch-type: daily
    spec:
      # High priority but won't preempt running pods
      priorityClassName: batch-high-no-preempt
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: report-generator:v2.3
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        env:
        - name: REPORT_DATE
          value: "2026-02-09"
        - name: OUTPUT_PATH
          value: "/data/reports"
        - name: CHECKPOINT_ENABLED
          value: "true"
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: batch-data-pvc
```

## CronJob with Non-Preempting Priority

Scheduled batch jobs benefit from non-preempting priorities:

```yaml
# analytics-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hourly-analytics
  namespace: analytics
spec:
  schedule: "0 * * * *"  # Every hour
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: analytics
            frequency: hourly
        spec:
          priorityClassName: batch-critical-no-preempt
          restartPolicy: OnFailure
          containers:
          - name: analytics
            image: analytics-engine:v1.8
            resources:
              requests:
                cpu: 2000m
                memory: 4Gi
              limits:
                cpu: 4000m
                memory: 8Gi
            env:
            - name: DATA_SOURCE
              value: "postgresql://prod-db:5432/analytics"
            - name: TIME_WINDOW
              value: "1h"
            - name: AGGREGATION_LEVEL
              value: "minute"
```

## Machine Learning Training Job

ML training jobs are perfect candidates for non-preempting priority:

```yaml
# ml-training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: model-training-v5
  namespace: ml-platform
spec:
  parallelism: 1
  completions: 1
  template:
    metadata:
      labels:
        app: ml-training
        model: recommendation-v5
    spec:
      priorityClassName: batch-critical-no-preempt
      restartPolicy: OnFailure
      # Request GPU resources
      nodeSelector:
        node.kubernetes.io/instance-type: gpu-instance
      containers:
      - name: trainer
        image: ml-trainer:v2.1
        resources:
          requests:
            cpu: 4000m
            memory: 16Gi
            nvidia.com/gpu: 1
          limits:
            cpu: 8000m
            memory: 32Gi
            nvidia.com/gpu: 1
        env:
        - name: TRAINING_DATA
          value: "/data/training-set-2026-02"
        - name: EPOCHS
          value: "100"
        - name: BATCH_SIZE
          value: "64"
        - name: CHECKPOINT_DIR
          value: "/checkpoints"
        volumeMounts:
        - name: training-data
          mountPath: /data
        - name: checkpoints
          mountPath: /checkpoints
      volumes:
      - name: training-data
        persistentVolumeClaim:
          claimName: ml-training-data
      - name: checkpoints
        persistentVolumeClaim:
          claimName: ml-checkpoints
```

## ETL Pipeline with Priority Stages

Create a multi-stage ETL pipeline with different priorities:

```yaml
# etl-extract.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: etl-extract
  namespace: data-pipeline
  labels:
    pipeline: etl-daily
    stage: extract
spec:
  template:
    spec:
      # Extract has highest priority - needs to start first
      priorityClassName: batch-critical-no-preempt
      restartPolicy: OnFailure
      containers:
      - name: extractor
        image: data-extractor:v1.5
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
---
# etl-transform.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: etl-transform
  namespace: data-pipeline
  labels:
    pipeline: etl-daily
    stage: transform
spec:
  template:
    spec:
      # Transform has medium priority
      priorityClassName: batch-high-no-preempt
      restartPolicy: OnFailure
      containers:
      - name: transformer
        image: data-transformer:v1.5
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
---
# etl-load.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: etl-load
  namespace: data-pipeline
  labels:
    pipeline: etl-daily
    stage: load
spec:
  template:
    spec:
      # Load has lower priority - can wait if needed
      priorityClassName: batch-normal-no-preempt
      restartPolicy: OnFailure
      containers:
      - name: loader
        image: data-loader:v1.5
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
```

## Comparing Preempting vs Non-Preempting Behavior

Let's test the difference between preempting and non-preempting priorities:

```yaml
# test-preempting.yaml
apiVersion: v1
kind: Pod
metadata:
  name: high-priority-preempting
spec:
  priorityClassName: production-high  # Regular preempting priority
  containers:
  - name: app
    image: nginx:1.21
    resources:
      requests:
        cpu: 2000m
        memory: 4Gi
---
# test-non-preempting.yaml
apiVersion: v1
kind: Pod
metadata:
  name: high-priority-non-preempting
spec:
  priorityClassName: batch-critical-no-preempt  # Non-preempting priority
  containers:
  - name: app
    image: nginx:1.21
    resources:
      requests:
        cpu: 2000m
        memory: 4Gi
```

Deploy both in a resource-constrained cluster:

```bash
# Fill cluster with low-priority pods first
kubectl apply -f low-priority-workload.yaml

# Try preempting pod - will evict low-priority pods
kubectl apply -f test-preempting.yaml

# Try non-preempting pod - will wait for resources
kubectl apply -f test-non-preempting.yaml

# Watch the behavior
kubectl get events --watch | grep -E 'Preempt|Schedule'
```

## Resource Quota for Non-Preempting Jobs

Control resource usage for batch jobs:

```yaml
# batch-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: batch-jobs-quota
  namespace: batch-processing
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    requests.nvidia.com/gpu: "4"
    persistentvolumeclaims: "20"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
        - batch-critical-no-preempt
        - batch-high-no-preempt
        - batch-normal-no-preempt
        - batch-low-no-preempt
```

## Monitoring Non-Preempting Jobs

Create a monitoring script to track batch job scheduling:

```bash
# monitor-batch-scheduling.sh
#!/bin/bash

echo "Pending batch jobs by priority:"
kubectl get pods --all-namespaces \
  --field-selector=status.phase=Pending \
  -o json | \
  jq -r '.items[] |
    select(.spec.priorityClassName | contains("batch")) |
    {namespace: .metadata.namespace,
     name: .metadata.name,
     priority: .spec.priorityClassName,
     age: .metadata.creationTimestamp}' | \
  jq -s 'group_by(.priority) |
    map({priority: .[0].priority, count: length})'

echo -e "\nRunning batch jobs:"
kubectl get pods --all-namespaces \
  --field-selector=status.phase=Running \
  -o json | \
  jq -r '.items[] |
    select(.spec.priorityClassName | contains("batch")) |
    {namespace: .metadata.namespace,
     name: .metadata.name,
     priority: .spec.priorityClassName}' | \
  jq -s 'group_by(.priority) |
    map({priority: .[0].priority, count: length})'
```

## Wait Time Analysis

Track how long non-preempting jobs wait for resources:

```yaml
# wait-time-metric.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: batch-metrics
  namespace: monitoring
data:
  collect-metrics.sh: |
    #!/bin/bash
    while true; do
      kubectl get pods --all-namespaces -o json | \
        jq -r '.items[] |
          select(.spec.priorityClassName | contains("batch-")) |
          select(.status.phase == "Pending") |
          {
            name: .metadata.name,
            namespace: .metadata.namespace,
            created: .metadata.creationTimestamp,
            priority: .spec.priorityClassName
          }' | \
        jq -s --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
          map({
            name: .name,
            namespace: .namespace,
            wait_seconds: ($now | fromdate) - (.created | fromdate),
            priority: .priority
          }) |
          group_by(.priority) |
          map({
            priority: .[0].priority,
            avg_wait: (map(.wait_seconds) | add / length),
            max_wait: (map(.wait_seconds) | max)
          })'

      sleep 60
    done
```

## Cluster Autoscaler Integration

Configure Cluster Autoscaler to respond to non-preempting job demands:

```yaml
# cluster-autoscaler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    10:
      - .*gpu-pool.*
    5:
      - .*memory-optimized.*
    1:
      - .*general-purpose.*
```

The autoscaler will add nodes when non-preempting jobs are pending, giving them resources without disrupting existing workloads.

## Best Practices

1. **Use for Batch Workloads**: Non-preempting priorities are ideal for jobs that can wait but should be scheduled quickly when possible
2. **Set Appropriate Timeouts**: Configure job timeouts to handle cases where resources never become available
3. **Monitor Wait Times**: Track how long jobs spend pending to identify resource constraints
4. **Combine with Autoscaling**: Use cluster autoscaler to add capacity when non-preempting jobs are waiting
5. **Resource Requests Matter**: Always set accurate resource requests so the scheduler can make good decisions
6. **Consider Time Windows**: Schedule large batch jobs during known low-usage periods
7. **Use Multiple Tiers**: Create several non-preempting priority levels to express relative importance
8. **Test Under Load**: Validate that jobs get scheduled appropriately under various load conditions

## Troubleshooting

If non-preempting jobs aren't being scheduled:

```bash
# Check if priority class exists and is configured correctly
kubectl get priorityclass batch-high-no-preempt -o yaml

# Verify preemptionPolicy is set to Never
kubectl get priorityclass batch-high-no-preempt -o jsonpath='{.preemptionPolicy}'

# Check why pods are pending
kubectl describe pod -n batch-processing <pod-name>

# View scheduler decisions
kubectl get events --all-namespaces | grep -i schedule

# Check cluster capacity
kubectl describe nodes | grep -A 5 "Allocated resources"
```

If jobs are waiting too long:

```bash
# Check if cluster autoscaler is working
kubectl logs -n kube-system -l app=cluster-autoscaler

# View pending pod resource requirements
kubectl get pods --all-namespaces \
  --field-selector=status.phase=Pending \
  -o json | \
  jq '.items[] | {name: .metadata.name, requests: .spec.containers[].resources.requests}'

# Check if quotas are being hit
kubectl describe resourcequota -n batch-processing
```

## Combining with Regular Priority

You can mix preempting and non-preempting priorities in the same cluster:

```yaml
# mixed-priorities.yaml
# Critical production service - can preempt
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
spec:
  template:
    spec:
      priorityClassName: production-high  # Preempting
      containers:
      - name: api
        image: payment-api:v1.0
---
# Important batch job - won't preempt
apiVersion: batch/v1
kind: Job
metadata:
  name: financial-report
spec:
  template:
    spec:
      priorityClassName: batch-critical-no-preempt  # Non-preempting
      containers:
      - name: reporter
        image: report-gen:v1.0
```

This gives you the flexibility to protect running services while still prioritizing important batch work.

Non-preempting priority classes provide the perfect balance for batch workloads: they get scheduled quickly when resources are available, but they never disrupt running services. This makes them ideal for data processing, analytics, ML training, and other batch operations that are important but not urgent enough to justify preempting production workloads.

