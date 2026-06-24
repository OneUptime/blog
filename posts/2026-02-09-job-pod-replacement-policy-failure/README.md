# How to Handle Job Pod Replacement Policy for Faster Failure Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Job, Pod Management

Description: Configure Kubernetes Job pod replacement policy to control when failed pods are recreated, improving failure recovery time and reducing resource waste in batch processing workloads.

---

When Kubernetes Job pods are terminating, the default behavior can create replacement pods before the old pods have fully exited. This keeps work moving, but it can temporarily consume extra cluster resources for large batch jobs. The pod replacement policy gives you fine-grained control over this behavior.

Introduced as an alpha feature in Kubernetes 1.28 and stable in Kubernetes 1.34, the podReplacementPolicy field lets you specify when terminating pods should be replaced. This is particularly valuable for jobs with many parallel workers where quick recovery from deletion, eviction, or preemption matters more than strictly avoiding temporary pod overlap.

## Understanding Pod Replacement Policy

The pod replacement policy controls whether Kubernetes creates replacement pods immediately when a pod is terminating or waits until that pod reaches a terminal phase. There are two options: TerminatingOrFailed and Failed.

With the TerminatingOrFailed policy, Kubernetes creates replacement pods as soon as a pod is terminating or failed. This minimizes downtime but may temporarily exceed your parallelism setting. With the Failed policy, Kubernetes waits for the pod to fully terminate before creating a replacement. For Jobs without a podFailurePolicy, TerminatingOrFailed is the default; for Jobs with a podFailurePolicy, Failed is the default and the only allowed value.

## Configuring Pod Replacement Policy

Set the podReplacementPolicy field in your Job spec to control replacement behavior.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fast-recovery-job
spec:
  # Enable faster pod replacement
  podReplacementPolicy: TerminatingOrFailed

  completions: 100
  parallelism: 10
  backoffLimit: 20

  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: python:3.9
        command: [python]
        args:
        - -c
        - |
          import time
          import random
          import sys

          # Simulate work
          worker_id = random.randint(1000, 9999)
          print(f"Worker {worker_id} starting processing")

          # Simulate occasional failures
          if random.random() < 0.1:
              print(f"Worker {worker_id} encountered error")
              sys.exit(1)

          time.sleep(30)
          print(f"Worker {worker_id} completed successfully")
```

With TerminatingOrFailed, when a pod starts terminating, Kubernetes can create a replacement pod instead of waiting for the termination grace period to expire. This keeps your job running at full parallelism during deletions, evictions, and preemptions.

## Impact on Resource Usage

The pod replacement policy affects how many pods exist simultaneously. With TerminatingOrFailed, you might temporarily have more pods than your parallelism setting because replacement pods start while old pods are still terminating.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: resource-aware-job
spec:
  podReplacementPolicy: TerminatingOrFailed
  parallelism: 20
  completions: 200

  template:
    spec:
      restartPolicy: Never
      terminationGracePeriodSeconds: 30  # Affects overlap duration

      containers:
      - name: worker
        image: python:3.9
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

If a pod starts terminating, the replacement can start immediately. During the 30-second grace period, you might have 21 pods instead of 20. Account for this temporary resource usage when planning cluster capacity.

## Combining with Backoff Limit

The backoff limit controls retry attempts, while pod replacement policy controls when terminating pods are replaced. These settings work together to determine failure handling behavior.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: resilient-batch-job
spec:
  podReplacementPolicy: TerminatingOrFailed
  backoffLimit: 10
  completions: 50
  parallelism: 10

  template:
    spec:
      restartPolicy: Never
      containers:
      - name: processor
        image: myapp:latest
        command: ["/app/process"]
        args: ["--retries=3", "--timeout=300"]
```

With this configuration, terminating pods can be replaced immediately, and failed pods count toward the Job's backoff limit. The job continues until either all work completes or the backoff limit is reached. This balances fast recovery with failure limits.

## Handling Preemption Scenarios

Pod replacement policy is particularly useful when running batch jobs on preemptible nodes where pods can be evicted unexpectedly.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: preemptible-batch-job
spec:
  podReplacementPolicy: TerminatingOrFailed
  parallelism: 50
  completions: 500
  backoffLimit: 100  # Higher limit for preemption tolerance

  template:
    spec:
      restartPolicy: Never

      # Run on preemptible nodes
      nodeSelector:
        cloud.google.com/gke-preemptible: "true"

      # Tolerate preemption
      tolerations:
      - key: "cloud.google.com/gke-preemptible"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"

      containers:
      - name: worker
        image: batch-processor:latest
        env:
        - name: CHECKPOINT_INTERVAL
          value: "60"  # Checkpoint frequently for preemption

        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
```

When preemptible nodes are reclaimed, pods receive termination signals. With TerminatingOrFailed policy, replacement pods start immediately, minimizing the impact on overall job completion time.

## Monitoring Pod Replacement

Track pod replacement metrics to understand job behavior and optimize your configuration.

```bash
# Watch pod creation and termination

kubectl get pods -w -l job-name=fast-recovery-job

# Check job status
kubectl describe job fast-recovery-job

# Count failed vs succeeded pods
kubectl get pods -l job-name=fast-recovery-job \
  --field-selector status.phase=Failed | wc -l

kubectl get pods -l job-name=fast-recovery-job \
  --field-selector status.phase=Succeeded | wc -l
```

Monitor the time between pod termination and replacement pod creation. With TerminatingOrFailed, replacement pods should appear quickly when the original pod starts terminating, although retries after failed pods are still subject to the Job controller's backoff behavior.

## Cleanup Strategies

Fast pod replacement can leave many terminated pods around. Implement cleanup strategies to manage pod history.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: self-cleaning-job
spec:
  podReplacementPolicy: TerminatingOrFailed
  completions: 100
  parallelism: 10

  # Automatically clean up after completion
  ttlSecondsAfterFinished: 3600  # Delete job 1 hour after finishing

  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: processor:latest
```

The ttlSecondsAfterFinished field automatically deletes completed jobs and their pods after the specified time, preventing pod accumulation.

For manual cleanup of failed pods while the job runs, use a cleanup script.

```bash
#!/bin/bash
# cleanup-failed-pods.sh

JOB_NAME="fast-recovery-job"
NAMESPACE="default"

while true; do
  # Delete failed pods older than 5 minutes
  kubectl get pods -n $NAMESPACE \
    -l job-name=$JOB_NAME \
    --field-selector status.phase=Failed \
    -o json | \
  jq -r '.items[] |
    select((.status.containerStatuses[0].state.terminated.finishedAt | fromdateiso8601) < (now - 300)) |
    .metadata.name' | \
  xargs -I {} kubectl delete pod {} -n $NAMESPACE

  sleep 60
done
```

This keeps only recent failed pods for debugging while cleaning up older failures.

## Performance Considerations

Pod replacement policy affects job completion time, especially for jobs with high failure rates or long termination grace periods.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: performance-optimized-job
spec:
  podReplacementPolicy: TerminatingOrFailed
  parallelism: 100
  completions: 1000

  template:
    spec:
      restartPolicy: Never

      # Reduce grace period for faster cleanup
      terminationGracePeriodSeconds: 10

      containers:
      - name: worker
        image: worker:latest

        # Implement graceful shutdown
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

A shorter termination grace period reduces the overlap window between terminating and replacement pods. Ensure your application can shut down cleanly within this time.

## Comparison with Default Behavior

Understanding the difference helps you choose the right policy for your workload.

With the Failed policy, when a pod starts terminating at 10:00:00 and takes 30 seconds to terminate, the replacement pod starts at 10:00:30. Your effective parallelism drops from 10 to 9 during termination.

With TerminatingOrFailed policy, the replacement pod starts at 10:00:00. From 10:00:00 to 10:00:30, you have 11 pods (10 running + 1 terminating). This maintains full parallelism but uses slightly more resources temporarily.

## When to Use Each Policy

Use TerminatingOrFailed when job completion time is critical and you can tolerate temporary resource spikes. This works well for time-sensitive batch processing, data pipelines with SLAs, and jobs on preemptible infrastructure.

Use the Failed policy when resource limits are strict, when you use podFailurePolicy, or when terminating pods are rare and don't impact overall completion time significantly.

## Best Practices

Set appropriate resource requests and limits that account for potential pod count spikes. Monitor actual resource usage to validate your configuration works within cluster capacity.

Combine pod replacement policy with proper backoff limits to prevent runaway retries. Implement checkpointing in your workload so replacement pods can resume from where failed pods left off.

Use resource quotas and workload queueing systems carefully with TerminatingOrFailed policy, as the temporary parallelism spike might conflict with capacity assumptions. Test your configuration under failure scenarios to ensure it behaves as expected.

## Conclusion

The pod replacement policy gives you control over Kubernetes Job pod replacement timing. By configuring TerminatingOrFailed policy, you can minimize the impact of terminating pods on batch job completion time, which is especially valuable for large-scale parallel processing workloads.

Choose the right policy based on your requirements for completion time, resource constraints, and debugging needs. Combined with appropriate backoff limits, termination grace periods, and cleanup strategies, pod replacement policy helps you build more resilient and efficient batch processing systems.
