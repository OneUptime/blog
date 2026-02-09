# How to Configure Job Parallelism and Completions for Batch Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Batch Processing

Description: Master the configuration of parallelism and completions in Kubernetes Jobs to optimize batch processing performance and resource utilization.

---

Understanding how to properly configure parallelism and completions in Kubernetes Jobs is critical for efficient batch processing. These two parameters work together to define how many total work items need completing and how many should run simultaneously.

Getting this configuration right means faster processing times, better resource utilization, and more predictable job execution. Set parallelism too low and you waste available resources. Set it too high and you overwhelm your cluster or downstream systems.

## Understanding Completions

The completions field tells Kubernetes how many times a pod must successfully complete for the job to be considered done. This is your total work count.

When you set completions to 10, Kubernetes ensures exactly 10 pods successfully complete. If a pod fails, Kubernetes creates a replacement to maintain the target completion count.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: simple-batch
spec:
  completions: 10  # Need 10 successful completions
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: worker
        image: busybox
        command: ["/bin/sh", "-c", "echo Processing && sleep 10"]
```

Without setting completions, the job runs a single pod to completion by default. This is fine for one-off tasks but not for batch processing.

## Understanding Parallelism

The parallelism field controls how many pods run simultaneously. This determines your processing speed and resource consumption.

Setting parallelism to 3 means Kubernetes keeps three pods running at any given time. When one completes, Kubernetes immediately starts another until all completions are satisfied.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: parallel-batch
spec:
  completions: 10
  parallelism: 3  # Run 3 pods at a time
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: worker
        image: processor:latest
        command: ["./process.sh"]
```

With this configuration, Kubernetes starts three pods immediately. As each completes, a new one starts until all 10 completions finish. This takes roughly 4 waves of execution (3+3+3+1).

## Choosing the Right Parallelism Level

Your ideal parallelism depends on several factors. First, consider your cluster capacity. Running 100 parallel pods doesn't help if your cluster only has resources for 10.

Second, think about downstream systems. If your job hits a database, that database has a connection limit. Running too many parallel workers can overwhelm it.

Third, consider the nature of your work. CPU-intensive tasks benefit from matching parallelism to available CPU cores. IO-bound tasks can often handle higher parallelism.

Here's a practical example for processing images:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: image-processor
spec:
  completions: 1000        # 1000 images to process
  parallelism: 20          # 20 concurrent processors
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: image-processor:latest
        resources:
          requests:
            cpu: "500m"    # Each pod needs half a CPU
            memory: "1Gi"
          limits:
            cpu: "1000m"
            memory: "2Gi"
        command:
        - /bin/bash
        - -c
        - |
          # Pull work from queue and process
          ./fetch-and-process-image.sh
```

With 20 parallel pods, each using 500m CPU, this job needs 10 CPU cores available. Make sure your cluster can handle this before the job starts.

## Dynamic Parallelism Adjustment

You can adjust parallelism while a job runs. This lets you scale up when resources become available or scale down if you're overwhelming a downstream system.

```bash
# Start with low parallelism
kubectl create -f batch-job.yaml

# Monitor progress
kubectl get job image-processor

# Increase parallelism if resources are available
kubectl patch job image-processor -p '{"spec":{"parallelism":40}}'

# Decrease if needed
kubectl patch job image-processor -p '{"spec":{"parallelism":10}}'
```

This flexibility helps when you're not sure what parallelism level works best. Start conservative and increase as you monitor system behavior.

## Work Queue Pattern

For work queue patterns where pods pull tasks from a shared queue, you typically set a high completions count with parallelism controlling your worker pool size:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: queue-worker
spec:
  completions: 1000   # Expect 1000 tasks in queue
  parallelism: 50     # 50 workers pulling from queue
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: worker
        image: queue-worker:latest
        env:
        - name: REDIS_HOST
          value: "redis-service"
        command:
        - /app/worker
```

Here's what the worker might look like:

```python
#!/usr/bin/env python3
import redis
import json
import sys

def process_task(task_data):
    """Process a single task"""
    print(f"Processing task: {task_data['id']}")
    # Do the actual work
    # ...
    print(f"Completed task: {task_data['id']}")

def main():
    r = redis.Redis(host='redis-service', port=6379, decode_responses=True)

    # Pull one task from queue
    task_json = r.lpop('work-queue')

    if task_json is None:
        print("No work available")
        sys.exit(0)

    task = json.loads(task_json)
    process_task(task)

if __name__ == "__main__":
    main()
```

Each pod grabs one item, processes it, and exits. Kubernetes counts this as one completion and starts a new pod to grab the next item.

## Fixed Work Assignment Pattern

With indexed jobs or when each pod knows its work upfront, parallelism determines processing speed but doesn't affect work distribution:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: indexed-processor
spec:
  completions: 100
  parallelism: 10
  completionMode: Indexed
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor:latest
        command:
        - /bin/bash
        - -c
        - |
          INDEX=$JOB_COMPLETION_INDEX
          echo "Processing item $INDEX"
          ./process-item.sh $INDEX
```

Each pod processes its assigned index. With parallelism of 10, you process 10 items at a time. Increasing parallelism to 20 would double your throughput, assuming you have the resources.

## Handling Variable Processing Times

When work items take different amounts of time to process, higher parallelism helps balance the load. Fast items finish quickly, freeing up slots for more work.

Consider this scenario with a database export job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: table-export
spec:
  completions: 50          # 50 tables to export
  parallelism: 15          # 15 concurrent exports
  completionMode: Indexed
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: exporter
        image: db-exporter:latest
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        command:
        - /app/export-table
```

Small tables export in seconds, large ones take minutes. With 15 parallel workers, small table exports don't block large ones. The job completes when all tables finish, regardless of order.

## Monitoring and Metrics

Track your job's parallelism and completion progress to ensure optimal configuration:

```bash
# Check current status
kubectl get job image-processor -o yaml | grep -A 5 status

# Watch progress in real time
kubectl get job image-processor -w

# See active pod count
kubectl get pods -l job-name=image-processor --field-selector=status.phase=Running | wc -l

# Calculate completion percentage
TOTAL=$(kubectl get job image-processor -o jsonpath='{.spec.completions}')
SUCCEEDED=$(kubectl get job image-processor -o jsonpath='{.status.succeeded}')
echo "Progress: $((SUCCEEDED * 100 / TOTAL))%"
```

## Resource-Based Parallelism Calculation

Calculate optimal parallelism based on available resources:

```bash
# Get total cluster CPU
TOTAL_CPU=$(kubectl top nodes --no-headers | awk '{sum+=$2} END {print sum}')

# If each job pod needs 500m CPU
POD_CPU=0.5

# Calculate max parallelism (leaving 20% headroom)
MAX_PARALLEL=$(echo "$TOTAL_CPU * 0.8 / $POD_CPU" | bc)

echo "Recommended parallelism: $MAX_PARALLEL"
```

This ensures you don't overcommit your cluster resources.

## Best Practices

Start with conservative parallelism values and increase gradually while monitoring system behavior. Watch for database connection limits, API rate limits, and memory pressure.

Use resource requests and limits to ensure each pod gets what it needs. This prevents pods from starving each other and makes parallelism predictable.

For long-running jobs, implement checkpointing so failed pods don't lose all their progress. This makes higher parallelism safer since individual pod failures have less impact.

Consider using PodDisruptionBudgets to protect running jobs from cluster maintenance operations:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: batch-job-pdb
spec:
  minAvailable: 10
  selector:
    matchLabels:
      job-name: image-processor
```

This ensures at least 10 pods keep running during cluster operations, maintaining throughput.

The combination of completions and parallelism gives you fine-grained control over batch processing. Tune these values based on your workload characteristics, available resources, and downstream system constraints for optimal results.
