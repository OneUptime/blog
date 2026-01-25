# How to Use Kubernetes Jobs for Batch Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Batch Processing, DevOps, Automation

Description: A practical guide to using Kubernetes Jobs for batch processing tasks, including parallel execution, completion tracking, error handling, and cleanup strategies.

---

Kubernetes Jobs run tasks to completion rather than keeping them running indefinitely like Deployments. They are perfect for batch processing, data migration, report generation, and any workload that should run once and finish.

## Basic Job Structure

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: process-data
spec:
  template:
    spec:
      containers:
        - name: processor
          image: myprocessor:v1
          command: ["python", "process.py"]
      restartPolicy: Never
  backoffLimit: 4
```

Key differences from Deployments:
- `restartPolicy` must be `Never` or `OnFailure`
- Job completes when pod succeeds
- `backoffLimit` controls retry attempts

## Job Completion Modes

### Single Completion (Default)

Job runs one pod to completion:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: single-task
spec:
  completions: 1    # Default
  parallelism: 1    # Default
  template:
    spec:
      containers:
        - name: task
          image: busybox
          command: ["echo", "Task complete"]
      restartPolicy: Never
```

### Multiple Completions

Job needs N successful completions:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: process-items
spec:
  completions: 10    # Need 10 successful runs
  parallelism: 3     # Run 3 at a time
  template:
    spec:
      containers:
        - name: processor
          image: myprocessor:v1
      restartPolicy: Never
```

### Parallel Work Queue

For work-queue style processing:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: work-queue
spec:
  completions: null       # Not set
  parallelism: 5         # Run 5 workers
  completionMode: Indexed # Each pod gets unique index
  template:
    spec:
      containers:
        - name: worker
          image: worker:v1
          env:
            - name: JOB_COMPLETION_INDEX
              valueFrom:
                fieldRef:
                  fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
      restartPolicy: Never
```

## Indexed Jobs

Each pod gets a unique index for partitioned work:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: indexed-job
spec:
  completions: 5
  parallelism: 5
  completionMode: Indexed
  template:
    spec:
      containers:
        - name: worker
          image: python:3.9
          command:
            - python
            - -c
            - |
              import os
              index = int(os.environ.get('JOB_COMPLETION_INDEX', 0))
              total = 5

              # Process partition based on index
              # Index 0 handles items 0-99
              # Index 1 handles items 100-199
              # etc.

              start = index * 100
              end = start + 100
              print(f"Processing items {start} to {end}")
      restartPolicy: Never
```

## Error Handling

### Backoff Limit

Control how many times to retry failed pods:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: retry-job
spec:
  backoffLimit: 6    # Retry up to 6 times
  template:
    spec:
      containers:
        - name: task
          image: myapp:v1
      restartPolicy: OnFailure
```

The backoff delay increases exponentially: 10s, 20s, 40s, up to 6 minutes.

### Active Deadline

Set maximum runtime:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: time-limited
spec:
  activeDeadlineSeconds: 600    # Max 10 minutes
  template:
    spec:
      containers:
        - name: task
          image: myapp:v1
      restartPolicy: Never
```

### Pod Failure Policy

Fine-grained control over failure handling (Kubernetes 1.25+):

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smart-retry
spec:
  backoffLimit: 6
  podFailurePolicy:
    rules:
      # Don't retry if container exits with code 42
      - action: FailJob
        onExitCodes:
          containerName: main
          operator: In
          values: [42]
      # Retry on OOM
      - action: Ignore
        onPodConditions:
          - type: DisruptionTarget
  template:
    spec:
      containers:
        - name: main
          image: myapp:v1
      restartPolicy: Never
```

## Job Patterns

### Pattern 1: One-Time Data Migration

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate-database
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:v1
          command: ["./migrate.sh"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
      restartPolicy: OnFailure
  backoffLimit: 3
```

### Pattern 2: Parallel Data Processing

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: process-files
spec:
  completions: 100
  parallelism: 10
  completionMode: Indexed
  template:
    spec:
      containers:
        - name: processor
          image: processor:v1
          command:
            - python
            - process.py
            - --partition
            - $(JOB_COMPLETION_INDEX)
          env:
            - name: JOB_COMPLETION_INDEX
              valueFrom:
                fieldRef:
                  fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
      restartPolicy: Never
  backoffLimit: 10
```

### Pattern 3: Report Generation

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: daily-report
spec:
  template:
    spec:
      containers:
        - name: reporter
          image: reporter:v1
          command: ["python", "generate_report.py"]
          volumeMounts:
            - name: output
              mountPath: /output
      volumes:
        - name: output
          persistentVolumeClaim:
            claimName: reports-pvc
      restartPolicy: OnFailure
  backoffLimit: 3
  activeDeadlineSeconds: 3600
```

### Pattern 4: Queue Worker

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: queue-worker
spec:
  parallelism: 5    # 5 workers
  template:
    spec:
      containers:
        - name: worker
          image: worker:v1
          env:
            - name: QUEUE_URL
              value: "redis://redis:6379/0"
          # Worker exits when queue is empty
          command: ["python", "worker.py", "--until-empty"]
      restartPolicy: OnFailure
  backoffLimit: 10
```

## Monitoring Jobs

### Check Job Status

```bash
# List jobs
kubectl get jobs

# Output:
# NAME           COMPLETIONS   DURATION   AGE
# process-data   3/10          2m         5m

# Describe job
kubectl describe job process-data

# Get job pods
kubectl get pods -l job-name=process-data
```

### Watch Job Progress

```bash
# Watch completions
kubectl get jobs process-data -w

# View logs from job pods
kubectl logs -l job-name=process-data --tail=100

# Follow logs from running pod
kubectl logs -f job/process-data
```

### Check Failed Pods

```bash
# Get failed pods
kubectl get pods -l job-name=process-data --field-selector=status.phase=Failed

# Check logs from failed pod
kubectl logs process-data-xyz --previous
```

## Job Cleanup

### TTL After Finished

Automatically delete completed jobs:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: auto-cleanup
spec:
  ttlSecondsAfterFinished: 3600    # Delete 1 hour after completion
  template:
    spec:
      containers:
        - name: task
          image: myapp:v1
      restartPolicy: Never
```

### Manual Cleanup

```bash
# Delete completed jobs
kubectl delete jobs --field-selector=status.successful=1

# Delete failed jobs
kubectl delete jobs --field-selector=status.successful=0

# Delete all jobs older than 1 day
kubectl get jobs -o json | jq -r '.items[] | select(.status.completionTime < (now - 86400 | todate)) | .metadata.name' | xargs kubectl delete job
```

## Resource Management

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: resource-intensive
spec:
  template:
    spec:
      containers:
        - name: processor
          image: processor:v1
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
      # Use specific node pool for batch jobs
      nodeSelector:
        workload-type: batch
      tolerations:
        - key: "batch"
          operator: "Equal"
          value: "true"
          effect: "NoSchedule"
      restartPolicy: Never
```

## Jobs with Init Containers

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: job-with-init
spec:
  template:
    spec:
      initContainers:
        - name: download-data
          image: curlimages/curl
          command: ["curl", "-o", "/data/input.csv", "https://example.com/data.csv"]
          volumeMounts:
            - name: data
              mountPath: /data
      containers:
        - name: process
          image: processor:v1
          command: ["python", "process.py", "/data/input.csv"]
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          emptyDir: {}
      restartPolicy: Never
```

## Triggering Jobs Programmatically

### Using kubectl

```bash
# Create job from template
kubectl create job --from=cronjob/my-cronjob manual-run

# Create job with specific image
kubectl create job test-job --image=busybox -- echo "Hello"

# Create job from YAML
kubectl apply -f job.yaml
```

### Using Kubernetes API

```python
from kubernetes import client, config

config.load_incluster_config()
batch_v1 = client.BatchV1Api()

job = client.V1Job(
    api_version="batch/v1",
    kind="Job",
    metadata=client.V1ObjectMeta(name="api-triggered-job"),
    spec=client.V1JobSpec(
        template=client.V1PodTemplateSpec(
            spec=client.V1PodSpec(
                containers=[
                    client.V1Container(
                        name="task",
                        image="myapp:v1",
                        command=["python", "task.py"]
                    )
                ],
                restart_policy="Never"
            )
        ),
        backoff_limit=3
    )
)

batch_v1.create_namespaced_job(namespace="default", body=job)
```

## Best Practices

1. **Always set backoffLimit** to prevent infinite retries
2. **Use ttlSecondsAfterFinished** for automatic cleanup
3. **Set resource limits** to prevent runaway jobs
4. **Use activeDeadlineSeconds** for time-sensitive jobs
5. **Log progress** for debugging long-running jobs
6. **Make jobs idempotent** so retries are safe
7. **Use indexed jobs** for partitioned work
8. **Monitor job metrics** with Prometheus

---

Kubernetes Jobs provide a robust way to run batch workloads with built-in retry logic, parallel execution, and completion tracking. Choose the right completion mode for your use case, implement proper error handling, and always clean up completed jobs to keep your cluster tidy.
