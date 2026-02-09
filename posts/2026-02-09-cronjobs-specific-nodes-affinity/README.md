# How to Set Up CronJobs That Run Only on Specific Nodes Using Affinity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CronJobs, Scheduling, Node Affinity

Description: Learn how to use node affinity, node selectors, and taints/tolerations to control which nodes run CronJob pods for resource isolation and specialized hardware access.

---

CronJobs sometimes need to run on specific nodes with particular hardware, in specific availability zones, or away from production workloads. Node affinity, node selectors, and taints/tolerations give you precise control over pod placement for scheduled jobs.

This control lets you isolate batch workloads on dedicated nodes, ensure jobs run in the same region as their data, or leverage specialized hardware like GPUs for specific processing tasks.

## Using Node Selectors

The simplest approach uses node selectors:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: gpu-processing
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          nodeSelector:
            hardware: gpu
            zone: us-east-1a
          containers:
          - name: processor
            image: gpu-processor:latest
            resources:
              limits:
                nvidia.com/gpu: 1
```

This job only schedules on nodes labeled with hardware=gpu and zone=us-east-1a. Label your nodes accordingly:

```bash
# Label nodes
kubectl label nodes node-gpu-1 hardware=gpu
kubectl label nodes node-gpu-1 zone=us-east-1a
```

## Using Node Affinity

Node affinity provides more sophisticated scheduling rules:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: batch-processor
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                - matchExpressions:
                  - key: node-role
                    operator: In
                    values:
                    - batch-processing
                  - key: cpu-type
                    operator: In
                    values:
                    - high-performance
              preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                preference:
                  matchExpressions:
                  - key: zone
                    operator: In
                    values:
                    - us-east-1a
          containers:
          - name: processor
            image: batch-processor:latest
```

Required rules must be satisfied for scheduling. Preferred rules influence placement but aren't mandatory.

## Isolating Batch Workloads

Keep batch jobs away from production services:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-export
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                - matchExpressions:
                  - key: workload-type
                    operator: In
                    values:
                    - batch
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                podAffinityTerm:
                  labelSelector:
                    matchLabels:
                      type: production-api
                  topologyKey: kubernetes.io/hostname
          containers:
          - name: exporter
            image: data-exporter:latest
```

This prefers nodes labeled for batch workloads and avoids nodes running production API pods.

## Using Taints and Tolerations

Reserve nodes exclusively for batch workloads:

```bash
# Taint batch nodes
kubectl taint nodes batch-node-1 workload=batch:NoSchedule
kubectl taint nodes batch-node-2 workload=batch:NoSchedule
```

CronJobs must tolerate the taint:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: batch-job
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          tolerations:
          - key: workload
            operator: Equal
            value: batch
            effect: NoSchedule
          nodeSelector:
            workload: batch
          containers:
          - name: worker
            image: batch-worker:latest
```

Now only pods with the matching toleration can schedule on batch nodes.

## Spot Instance Workloads

Run cost-sensitive jobs on spot instances:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: spot-job
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 5
      template:
        spec:
          restartPolicy: OnFailure
          affinity:
            nodeAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                preference:
                  matchExpressions:
                  - key: node-lifecycle
                    operator: In
                    values:
                    - spot
          tolerations:
          - key: node-lifecycle
            operator: Equal
            value: spot
            effect: NoSchedule
          containers:
          - name: processor
            image: processor:latest
```

This prefers spot nodes and tolerates their taint. Higher backoffLimit accommodates spot instance interruptions.

## Regional Data Processing

Keep jobs close to their data:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: regional-backup
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                - matchExpressions:
                  - key: topology.kubernetes.io/region
                    operator: In
                    values:
                    - us-west-2
                  - key: topology.kubernetes.io/zone
                    operator: In
                    values:
                    - us-west-2a
          containers:
          - name: backup
            image: backup:latest
            volumeMounts:
            - name: data
              mountPath: /data
          volumes:
          - name: data
            persistentVolumeClaim:
              claimName: regional-data-pvc
```

This ensures the backup job runs in the same zone as the persistent volume.

## Verifying Node Placement

Check where CronJob pods are scheduled:

```bash
# Get recent job pods with node info
kubectl get pods -l cronjob-name=batch-processor -o wide

# See node labels
kubectl get nodes --show-labels

# Verify pod placement
POD=$(kubectl get pod -l job-name=batch-processor-12345 -o name)
kubectl get $POD -o jsonpath='{.spec.nodeName}'

# Check if affinity was satisfied
kubectl describe $POD | grep -A 10 "Node-Selectors\|Affinity"
```

Node affinity, selectors, and taints provide flexible control over CronJob pod placement. Use them to optimize resource utilization, access specialized hardware, and ensure jobs run in appropriate locations.
