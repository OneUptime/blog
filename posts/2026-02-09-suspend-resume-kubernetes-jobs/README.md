# How to Suspend and Resume Kubernetes Jobs for Resource Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Resource Management

Description: Learn how to suspend and resume Kubernetes Jobs to control resource usage, pause processing during maintenance, and implement sophisticated job scheduling patterns.

---

Kubernetes Jobs can be suspended and resumed on demand, giving you fine-grained control over when work gets processed. This feature lets you pause jobs during high-load periods, stop processing during maintenance windows, or implement custom scheduling logic based on external factors.

Suspending a job stops Kubernetes from creating new pods and deletes any currently running pods. Resuming restarts the job from where it left off, continuing to process remaining work items. This provides a clean way to control resource consumption without losing job state.

## Understanding Job Suspension

When you suspend a job, Kubernetes immediately stops creating new pods and terminates any running pods. The job itself remains in the cluster with its progress tracked. When you resume, processing continues from the last successful completion.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processor
spec:
  suspend: false  # Job runs normally
  completions: 100
  parallelism: 10
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor:latest
        command: ["./process.sh"]
```

Set suspend to true to start the job in a suspended state, or change it later to suspend a running job.

## Suspending a Running Job

Suspend an active job using kubectl:

```bash
# Suspend the job
kubectl patch job batch-processor -p '{"spec":{"suspend":true}}'

# Verify it's suspended
kubectl get job batch-processor -o jsonpath='{.spec.suspend}'

# Check status
kubectl describe job batch-processor
```

When you suspend, running pods are terminated. You'll see this in the job events:

```bash
# Watch job events
kubectl get events --field-selector involvedObject.name=batch-processor --sort-by='.lastTimestamp'
```

You'll see events indicating pods were deleted due to job suspension.

## Resuming a Suspended Job

Resume a suspended job to continue processing:

```bash
# Resume the job
kubectl patch job batch-processor -p '{"spec":{"suspend":false}}'

# Watch it restart
kubectl get pods -l job-name=batch-processor -w
```

The job resumes from its last completion count. If 37 out of 100 completions were done before suspension, it continues from 37 when resumed.

## Resource Management Use Cases

Suspend jobs during peak hours to preserve resources for critical services:

```python
#!/usr/bin/env python3
from kubernetes import client, config
from datetime import datetime

def should_suspend_jobs():
    """Determine if jobs should be suspended based on time"""
    current_hour = datetime.now().hour

    # Suspend during business hours (9 AM - 5 PM)
    if 9 <= current_hour < 17:
        return True

    return False

def manage_job_suspension(job_name, namespace='default'):
    """Suspend or resume job based on current time"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    # Get current job
    job = batch_v1.read_namespaced_job(name=job_name, namespace=namespace)

    currently_suspended = job.spec.suspend or False
    should_suspend = should_suspend_jobs()

    if should_suspend and not currently_suspended:
        # Suspend the job
        job.spec.suspend = True
        batch_v1.patch_namespaced_job(
            name=job_name,
            namespace=namespace,
            body=job
        )
        print(f"Suspended {job_name} (business hours)")

    elif not should_suspend and currently_suspended:
        # Resume the job
        job.spec.suspend = False
        batch_v1.patch_namespaced_job(
            name=job_name,
            namespace=namespace,
            body=job
        )
        print(f"Resumed {job_name} (after hours)")

    else:
        status = "suspended" if currently_suspended else "running"
        print(f"Job {job_name} already in correct state: {status}")

if __name__ == "__main__":
    import sys
    job_name = sys.argv[1] if len(sys.argv) > 1 else "batch-processor"
    manage_job_suspension(job_name)
```

Run this as a CronJob to automatically suspend and resume based on time:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: job-scheduler
spec:
  schedule: "0 * * * *"  # Every hour
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          serviceAccountName: job-manager
          containers:
          - name: scheduler
            image: job-scheduler:latest
            command: ["python3", "/app/manage_suspension.py", "batch-processor"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: job-manager
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: job-manager-role
rules:
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get", "patch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: job-manager-binding
subjects:
- kind: ServiceAccount
  name: job-manager
roleRef:
  kind: Role
  name: job-manager-role
  apiGroup: rbac.authorization.k8s.io
```

## Maintenance Window Management

Suspend jobs automatically during scheduled maintenance:

```python
#!/usr/bin/env python3
from kubernetes import client, config
from datetime import datetime, timedelta
import pytz

def is_maintenance_window():
    """Check if we're in a maintenance window"""
    # Example: Maintenance every Sunday 2 AM - 6 AM UTC
    now = datetime.now(pytz.UTC)

    if now.weekday() == 6:  # Sunday
        if 2 <= now.hour < 6:
            return True

    return False

def suspend_all_batch_jobs(namespace='default'):
    """Suspend all batch jobs in namespace"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    jobs = batch_v1.list_namespaced_job(namespace=namespace)

    suspended_count = 0

    for job in jobs.items:
        # Skip jobs already suspended
        if job.spec.suspend:
            continue

        # Skip jobs with no-suspend annotation
        if job.metadata.annotations and \
           job.metadata.annotations.get('auto-suspend') == 'false':
            continue

        # Suspend the job
        job.spec.suspend = True
        batch_v1.patch_namespaced_job(
            name=job.metadata.name,
            namespace=namespace,
            body=job
        )
        suspended_count += 1
        print(f"Suspended {job.metadata.name}")

    return suspended_count

def resume_all_batch_jobs(namespace='default'):
    """Resume all suspended batch jobs"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    jobs = batch_v1.list_namespaced_job(namespace=namespace)

    resumed_count = 0

    for job in jobs.items:
        if not job.spec.suspend:
            continue

        job.spec.suspend = False
        batch_v1.patch_namespaced_job(
            name=job.metadata.name,
            namespace=namespace,
            body=job
        )
        resumed_count += 1
        print(f"Resumed {job.metadata.name}")

    return resumed_count

def main():
    if is_maintenance_window():
        count = suspend_all_batch_jobs()
        print(f"Maintenance window: Suspended {count} jobs")
    else:
        count = resume_all_batch_jobs()
        print(f"Outside maintenance window: Resumed {count} jobs")

if __name__ == "__main__":
    main()
```

## Cost Optimization with Spot Instances

Suspend jobs when spot instance availability is low:

```python
#!/usr/bin/env python3
import boto3
from kubernetes import client, config

def get_spot_price(instance_type='m5.large', region='us-east-1'):
    """Get current spot price for instance type"""
    ec2 = boto3.client('ec2', region_name=region)

    response = ec2.describe_spot_price_history(
        InstanceTypes=[instance_type],
        ProductDescriptions=['Linux/UNIX'],
        MaxResults=1
    )

    if response['SpotPriceHistory']:
        return float(response['SpotPriceHistory'][0]['SpotPrice'])

    return None

def should_run_on_spot(max_price=0.05):
    """Determine if spot price is acceptable"""
    current_price = get_spot_price()

    if current_price is None:
        return False

    return current_price <= max_price

def manage_spot_jobs(job_name, namespace='default'):
    """Suspend or resume based on spot pricing"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    job = batch_v1.read_namespaced_job(name=job_name, namespace=namespace)

    can_run = should_run_on_spot(max_price=0.05)
    currently_suspended = job.spec.suspend or False

    if can_run and currently_suspended:
        job.spec.suspend = False
        batch_v1.patch_namespaced_job(name=job_name, namespace=namespace, body=job)
        print(f"Spot price acceptable, resumed {job_name}")

    elif not can_run and not currently_suspended:
        job.spec.suspend = True
        batch_v1.patch_namespaced_job(name=job_name, namespace=namespace, body=job)
        print(f"Spot price too high, suspended {job_name}")

if __name__ == "__main__":
    manage_spot_jobs('batch-processor')
```

## Queue-Based Suspension

Suspend jobs when the work queue is empty:

```python
#!/usr/bin/env python3
import redis
from kubernetes import client, config

def get_queue_depth(redis_host='redis-queue'):
    """Get number of items in work queue"""
    r = redis.Redis(host=redis_host, port=6379)
    return r.llen('work-queue')

def manage_job_by_queue(job_name, namespace='default', min_queue_size=10):
    """Suspend job if queue is too small"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    queue_depth = get_queue_depth()
    job = batch_v1.read_namespaced_job(name=job_name, namespace=namespace)

    currently_suspended = job.spec.suspend or False

    if queue_depth < min_queue_size and not currently_suspended:
        # Queue too small, suspend to save resources
        job.spec.suspend = True
        batch_v1.patch_namespaced_job(name=job_name, namespace=namespace, body=job)
        print(f"Queue depth {queue_depth} < {min_queue_size}, suspended {job_name}")

    elif queue_depth >= min_queue_size and currently_suspended:
        # Queue has enough work, resume
        job.spec.suspend = False
        batch_v1.patch_namespaced_job(name=job_name, namespace=namespace, body=job)
        print(f"Queue depth {queue_depth}, resumed {job_name}")

    else:
        print(f"Queue depth {queue_depth}, no change needed")

if __name__ == "__main__":
    manage_job_by_queue('queue-workers')
```

## Cluster Load-Based Suspension

Suspend low-priority jobs when cluster resources are constrained:

```python
#!/usr/bin/env python3
from kubernetes import client, config

def get_cluster_cpu_usage():
    """Get overall cluster CPU usage percentage"""
    config.load_kube_config()
    api = client.CustomObjectsApi()

    # Get node metrics
    metrics = api.list_cluster_custom_object(
        group="metrics.k8s.io",
        version="v1beta1",
        plural="nodes"
    )

    total_cpu = 0
    used_cpu = 0

    for node_metric in metrics['items']:
        # Parse CPU usage
        usage = node_metric['usage']['cpu']
        # Convert to millicores
        if usage.endswith('n'):
            used_cpu += int(usage[:-1]) / 1000000
        elif usage.endswith('m'):
            used_cpu += int(usage[:-1])

    # This is simplified - you'd also need node capacity
    # For demo purposes, assume 80% threshold
    return used_cpu

def manage_low_priority_jobs(cpu_threshold=80):
    """Suspend low-priority jobs if CPU usage is high"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    cpu_usage = get_cluster_cpu_usage()
    high_load = cpu_usage > cpu_threshold

    # Get jobs labeled as low-priority
    jobs = batch_v1.list_namespaced_job(
        namespace='default',
        label_selector='priority=low'
    )

    for job in jobs.items:
        currently_suspended = job.spec.suspend or False

        if high_load and not currently_suspended:
            job.spec.suspend = True
            batch_v1.patch_namespaced_job(
                name=job.metadata.name,
                namespace='default',
                body=job
            )
            print(f"High load, suspended low-priority job {job.metadata.name}")

        elif not high_load and currently_suspended:
            job.spec.suspend = False
            batch_v1.patch_namespaced_job(
                name=job.metadata.name,
                namespace='default',
                body=job
            )
            print(f"Load normal, resumed low-priority job {job.metadata.name}")

if __name__ == "__main__":
    manage_low_priority_jobs()
```

## Starting Jobs in Suspended State

Create jobs that wait for explicit resume:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: manual-start-job
  annotations:
    description: "This job must be manually resumed to start"
spec:
  suspend: true  # Start suspended
  completions: 50
  parallelism: 5
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor:latest
        command: ["./process.sh"]
```

This job won't start any pods until you explicitly resume it:

```bash
# Job exists but doesn't run
kubectl get job manual-start-job

# Start it when ready
kubectl patch job manual-start-job -p '{"spec":{"suspend":false}}'
```

## Monitoring Suspended Jobs

Track which jobs are suspended and why:

```bash
#!/bin/bash
# list-suspended-jobs.sh

echo "Suspended Jobs:"
echo "==============="

kubectl get jobs -A -o json | jq -r '
  .items[] |
  select(.spec.suspend == true) |
  "\(.metadata.namespace)/\(.metadata.name) - Suspended: \(.spec.suspend)"
'

# Get job details
echo ""
echo "Job Details:"
echo "============"

kubectl get jobs -A -o json | jq -r '
  .items[] |
  select(.spec.suspend == true) |
  "Job: \(.metadata.name)",
  "  Namespace: \(.metadata.namespace)",
  "  Completions: \(.status.succeeded // 0)/\(.spec.completions)",
  "  Suspended: \(.spec.suspend)",
  "  Created: \(.metadata.creationTimestamp)",
  ""
'
```

## Best Practices

Always annotate jobs with suspension reasons to help debugging:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: scheduled-job
  annotations:
    suspend-reason: "Waiting for maintenance window to complete"
spec:
  suspend: true
```

Use labels to group jobs by suspension policy:

```yaml
metadata:
  labels:
    priority: low
    auto-suspend: enabled
```

Monitor suspension events through Kubernetes events and metrics. Set up alerts for jobs that have been suspended longer than expected, which might indicate forgotten manual suspensions.

Job suspension provides powerful control over resource utilization and job scheduling. Use it to implement sophisticated scheduling policies, manage costs, and ensure critical services always have the resources they need.
