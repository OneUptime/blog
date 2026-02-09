# How to Use TTL After Finished Controller to Auto-Clean Completed Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Resource Management

Description: Learn how to automatically clean up completed and failed Kubernetes Jobs using the TTL After Finished controller to prevent cluster clutter and resource waste.

---

Kubernetes Jobs create pods that stick around after completion by default. While this is useful for debugging, it leads to cluster clutter when running hundreds or thousands of jobs. The TTL (Time To Live) After Finished controller solves this by automatically cleaning up jobs after a specified time.

Without automatic cleanup, completed jobs accumulate in your cluster, making it harder to find active jobs and wasting API server resources. The TTL controller keeps your cluster clean while still giving you time to inspect results if needed.

## Understanding the TTL Controller

The TTL After Finished controller watches for jobs that have completed or failed. Once a job finishes, the controller starts a countdown based on the ttlSecondsAfterFinished field. When the timer expires, the controller deletes the job and all its pods.

This happens automatically without any manual intervention. You set the TTL when creating the job, and Kubernetes handles the rest.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: auto-cleanup-job
spec:
  ttlSecondsAfterFinished: 100  # Delete 100 seconds after completion
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: worker
        image: busybox
        command: ["sh", "-c", "echo Processing && sleep 30"]
```

After this job completes, it stays in the cluster for 100 seconds. You can check its status, view logs, and inspect results. After 100 seconds, the controller deletes it automatically.

## Setting Appropriate TTL Values

Choose your TTL based on how long you need to inspect job results. For automated batch processing where you collect results elsewhere, a short TTL works fine:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: quick-cleanup
spec:
  ttlSecondsAfterFinished: 60  # One minute retention
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: data-processor:latest
        command:
        - /bin/bash
        - -c
        - |
          # Process data and send results to external storage
          ./process-data.sh > /tmp/results.txt

          # Upload results to S3 or similar
          aws s3 cp /tmp/results.txt s3://results-bucket/$(date +%s).txt

          echo "Results uploaded, safe to delete this job"
```

Results go to S3, so the job itself doesn't need to stick around. One minute gives you time to verify the job completed before it disappears.

For jobs you might need to debug, use a longer TTL:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: debug-friendly
spec:
  ttlSecondsAfterFinished: 3600  # One hour retention
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: experimental-processor:latest
        command: ["./new-algorithm.sh"]
```

An hour gives you plenty of time to notice failures, check logs, and debug issues before the job vanishes.

## Different TTLs for Success vs Failure

You can't set different TTLs for successful versus failed jobs directly. However, you can work around this limitation using custom logic:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: conditional-cleanup
spec:
  ttlSecondsAfterFinished: 300  # 5 minutes default
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
          if ./process-data.sh; then
            echo "Success - job will be cleaned up in 5 minutes"
            exit 0
          else
            echo "Failure - sleeping to delay cleanup"
            # Sleep for 55 minutes, giving total of 1 hour before cleanup
            sleep 3300
            exit 1
          fi
```

This isn't perfect, but it gives you more time to investigate failures. Successful jobs clean up after 5 minutes, failed ones after about an hour.

## Immediate Cleanup for High-Volume Jobs

For very high-volume batch processing, you might want immediate cleanup:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: immediate-cleanup
spec:
  ttlSecondsAfterFinished: 0  # Delete immediately after completion
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: batch-worker:latest
        command:
        - /bin/bash
        - -c
        - |
          # Process work item
          ITEM_ID=$(cat /config/item-id)
          ./process-item.sh $ITEM_ID

          # Update external tracker
          curl -X POST https://tracker.example.com/complete \
            -d "item_id=$ITEM_ID&status=success"
```

With TTL set to 0, the job deletes as soon as it finishes. This is perfect when running thousands of jobs per hour and you track status externally.

## Monitoring Before Cleanup

If you're collecting metrics, make sure to scrape them before the job gets deleted:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: metrics-job
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
spec:
  ttlSecondsAfterFinished: 120  # 2 minutes for metric collection
  template:
    metadata:
      labels:
        app: metrics-job
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor-with-metrics:latest
        ports:
        - containerPort: 9090
          name: metrics
        command:
        - /bin/bash
        - -c
        - |
          # Start metrics endpoint in background
          ./metrics-server &

          # Do actual work
          ./process-data.sh

          # Keep metrics available for 90 seconds after completion
          echo "Work complete, keeping metrics endpoint alive"
          sleep 90
```

The job sleeps for 90 seconds after completing work, giving Prometheus time to scrape final metrics. Then the TTL controller cleans it up 30 seconds later.

## Logging Before Cleanup

Export logs to a centralized system before jobs get deleted:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: logged-job
spec:
  ttlSecondsAfterFinished: 300
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
          # Redirect all output to both stdout and a file
          exec 1> >(tee /logs/output.log)
          exec 2>&1

          echo "Starting processing at $(date)"
          ./process-data.sh
          echo "Completed at $(date)"

          # Upload logs
          aws s3 cp /logs/output.log \
            s3://job-logs/${HOSTNAME}-$(date +%s).log

          echo "Logs uploaded, cleanup can proceed"
        volumeMounts:
        - name: logs
          mountPath: /logs
      volumes:
      - name: logs
        emptyDir: {}
```

Logs go to S3 before the job completes, so the 5-minute TTL is just buffer time. The actual logs persist long-term in S3.

## Bulk Job Management with TTL

When creating many jobs programmatically, set consistent TTLs to keep things manageable:

```python
#!/usr/bin/env python3
from kubernetes import client, config
from datetime import datetime

def create_batch_jobs(work_items, ttl_seconds=600):
    """Create multiple jobs with automatic cleanup"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    for item in work_items:
        job = client.V1Job(
            metadata=client.V1ObjectMeta(
                name=f"process-{item['id']}-{int(datetime.now().timestamp())}",
                labels={"batch": "data-processing"}
            ),
            spec=client.V1JobSpec(
                ttl_seconds_after_finished=ttl_seconds,  # Auto-cleanup
                template=client.V1PodTemplateSpec(
                    spec=client.V1PodSpec(
                        restart_policy="OnFailure",
                        containers=[
                            client.V1Container(
                                name="processor",
                                image="processor:latest",
                                env=[
                                    client.V1EnvVar(
                                        name="WORK_ITEM_ID",
                                        value=str(item['id'])
                                    )
                                ]
                            )
                        ]
                    )
                )
            )
        )

        batch_v1.create_namespaced_job(namespace="default", body=job)
        print(f"Created job for item {item['id']}, will cleanup after {ttl_seconds}s")

# Process 100 items, each job auto-cleans after 10 minutes
work_items = [{"id": i} for i in range(100)]
create_batch_jobs(work_items, ttl_seconds=600)
```

This creates 100 jobs that all clean themselves up automatically. Without TTL, you'd have 100 completed jobs cluttering your cluster.

## Checking Jobs Before Cleanup

Monitor jobs that are about to be cleaned up:

```bash
# Find jobs with TTL set
kubectl get jobs -o json | \
  jq -r '.items[] | select(.spec.ttlSecondsAfterFinished != null) |
    "\(.metadata.name): TTL=\(.spec.ttlSecondsAfterFinished)s"'

# Find completed jobs
kubectl get jobs --field-selector=status.successful=1

# Get completion time to estimate cleanup time
kubectl get job auto-cleanup-job -o json | \
  jq -r '.status.completionTime'

# List jobs by age
kubectl get jobs --sort-by=.status.completionTime
```

## Disabling Automatic Cleanup

If you need to preserve a specific job, remove its TTL:

```bash
# Remove TTL from a job to prevent cleanup
kubectl patch job important-job --type=json \
  -p='[{"op": "remove", "path": "/spec/ttlSecondsAfterFinished"}]'
```

Now the job persists indefinitely, even after completion. Use this sparingly for jobs you need to keep for audit or compliance reasons.

## CronJob Integration

CronJobs can set TTL for all the jobs they create:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-cleanup-jobs
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      ttlSecondsAfterFinished: 7200  # Clean up after 2 hours
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: cleanup:latest
            command: ["./nightly-cleanup.sh"]
```

Each job created by this CronJob automatically cleans itself up 2 hours after completion. Combined with CronJob's successfulJobsHistoryLimit, this keeps things very tidy.

## Manual Cleanup Script

For jobs created before you started using TTL, clean them up manually:

```bash
#!/bin/bash
# cleanup-old-jobs.sh

# Delete completed jobs older than 1 hour
CUTOFF=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)

kubectl get jobs -o json | \
  jq -r --arg cutoff "$CUTOFF" '
    .items[] |
    select(.status.completionTime != null) |
    select(.status.completionTime < $cutoff) |
    select(.spec.ttlSecondsAfterFinished == null) |
    .metadata.name
  ' | \
  xargs -I {} kubectl delete job {}

echo "Cleanup complete"
```

Run this periodically as a CronJob itself to handle old jobs without TTL.

## Resource Management

TTL cleanup helps with resource management in several ways. First, it reduces API server load by removing unused objects. Second, it frees up etcd storage. Third, it keeps kubectl output readable.

For high-volume job environments, TTL is essential:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: high-volume-processor
spec:
  ttlSecondsAfterFinished: 30  # Quick cleanup for high volume
  completions: 10000
  parallelism: 100
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: worker
        image: worker:latest
```

This job creates 10,000 pods. Without TTL, you'd have 10,000 completed pods sitting around. With a 30-second TTL, cleanup happens almost immediately, keeping your cluster clean even with massive batch workloads.

The TTL After Finished controller is a simple but powerful feature for managing job lifecycle. Set appropriate TTLs based on your debugging needs and cleanup requirements, and let Kubernetes handle the rest automatically.
