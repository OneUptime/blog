# How to Implement Priority-Based Job Scheduling Using PriorityClasses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Priority Scheduling

Description: Implement priority-based job scheduling in Kubernetes using PriorityClasses to ensure critical batch workloads get scheduled before less important jobs during resource contention.

---

When running multiple batch jobs on a Kubernetes cluster with limited resources, not all jobs have equal importance. Some jobs process critical business data that must complete on schedule, while others can wait for available resources. Priority-based scheduling ensures high-priority jobs get resources first.

Kubernetes PriorityClasses let you assign numeric priorities to pods. The scheduler uses these priorities when making placement decisions, especially when resources are constrained. Jobs with higher priority pods can preempt lower priority ones, ensuring your most important workloads run when they need to.

## Understanding PriorityClass

A PriorityClass is a cluster-scoped resource that defines a numeric priority value and optional preemption policy. When you assign a PriorityClass to a pod, the scheduler considers that priority during scheduling decisions.

The scheduler first tries to schedule high-priority pods. If no nodes have sufficient resources, the scheduler can evict lower-priority pods to make room for higher-priority ones, depending on the preemption configuration.

## Creating PriorityClasses

Define PriorityClasses for different job importance levels in your organization.

```yaml
# High priority for critical business jobs
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical-jobs
value: 1000000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "Critical business jobs that must complete on schedule"
---
# Medium priority for important but not time-critical jobs
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: important-jobs
value: 500000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "Important jobs with flexible completion times"
---
# Low priority for background processing
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: background-jobs
value: 100000
preemptionPolicy: PreemptLowerPriority
globalDefault: false
description: "Background jobs that can be delayed or interrupted"
---
# Lowest priority for experimental or test jobs
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: experimental-jobs
value: 10000
preemptionPolicy: Never
globalDefault: false
description: "Experimental jobs that should not preempt other workloads"
```

The value field determines relative priority. Higher numbers have higher priority. The preemptionPolicy controls whether pods with this priority can evict lower-priority pods.

Apply these PriorityClasses to your cluster.

```bash
kubectl apply -f priority-classes.yaml

# List all priority classes
kubectl get priorityclasses

# Describe a specific priority class
kubectl describe priorityclass critical-jobs
```

## Assigning Priority to Jobs

Specify the PriorityClass in your Job's pod template.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: financial-report
  namespace: finance
spec:
  completions: 1
  backoffLimit: 3

  template:
    spec:
      # Assign high priority
      priorityClassName: critical-jobs

      restartPolicy: Never
      containers:
      - name: report-generator
        image: financial-reports:latest
        command: ["/app/generate-report"]
        args: ["--report-type", "end-of-day"]

        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
```

This job's pods will be scheduled before pods from jobs without a PriorityClass or with lower-priority classes.

## Implementing Job Priority Tiers

Design a priority tier system that matches your business requirements.

```yaml
# Tier 1: Revenue-impacting jobs
apiVersion: batch/v1
kind: Job
metadata:
  name: revenue-calculation
spec:
  template:
    spec:
      priorityClassName: critical-jobs
      containers:
      - name: calculator
        image: revenue:latest
---
# Tier 2: Regulatory compliance jobs
apiVersion: batch/v1
kind: Job
metadata:
  name: compliance-report
spec:
  template:
    spec:
      priorityClassName: important-jobs
      containers:
      - name: reporter
        image: compliance:latest
---
# Tier 3: Analytics and insights
apiVersion: batch/v1
kind: Job
metadata:
  name: user-analytics
spec:
  template:
    spec:
      priorityClassName: background-jobs
      containers:
      - name: analyzer
        image: analytics:latest
---
# Tier 4: Experimental data processing
apiVersion: batch/v1
kind: Job
metadata:
  name: ml-experiment
spec:
  template:
    spec:
      priorityClassName: experimental-jobs
      containers:
      - name: trainer
        image: ml-trainer:latest
```

This hierarchy ensures revenue-critical jobs always run first, followed by compliance, analytics, and experimental workloads.

## Handling Preemption Scenarios

When a high-priority job needs resources and the cluster is full, the scheduler can preempt lower-priority pods.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: urgent-processing
spec:
  template:
    spec:
      priorityClassName: critical-jobs

      # Handle potential preemption gracefully
      containers:
      - name: processor
        image: processor:latest

        # Implement checkpointing for resilience
        env:
        - name: CHECKPOINT_DIR
          value: "/data/checkpoints"
        - name: CHECKPOINT_INTERVAL
          value: "60"  # Checkpoint every 60 seconds

        volumeMounts:
        - name: checkpoint-storage
          mountPath: /data/checkpoints

      volumes:
      - name: checkpoint-storage
        persistentVolumeClaim:
          claimName: checkpoint-pvc

      # Longer grace period for checkpoint saving
      terminationGracePeriodSeconds: 60
```

When lower-priority pods are preempted to make room for this job, they receive SIGTERM and have 60 seconds to save their state before being forcefully terminated.

## Combining Priority with Resource Quotas

Use ResourceQuotas with priority classes to ensure fairness across teams while maintaining priority scheduling.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: finance-team-quota
  namespace: finance
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 500Gi

  # Scope quota to specific priority classes
  scopeSelector:
    matchExpressions:
    - scopeName: PriorityClass
      operator: In
      values:
      - critical-jobs
      - important-jobs
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: analytics-team-quota
  namespace: analytics
spec:
  hard:
    requests.cpu: "50"
    requests.memory: 200Gi

  scopeSelector:
    matchExpressions:
    - scopeName: PriorityClass
      operator: In
      values:
      - background-jobs
      - experimental-jobs
```

This configuration lets the finance team run more critical jobs while limiting analytics team to background processing, preventing any single team from monopolizing cluster resources.

## Priority-Based CronJob Scheduling

Apply priorities to CronJobs to control scheduled batch processing.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-reports
  namespace: reporting
spec:
  schedule: "0 2 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1

  jobTemplate:
    spec:
      template:
        spec:
          # High priority for time-sensitive reports
          priorityClassName: critical-jobs

          restartPolicy: OnFailure
          containers:
          - name: report
            image: reports:latest
            resources:
              requests:
                memory: "8Gi"
                cpu: "4"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-cleanup
  namespace: maintenance
spec:
  schedule: "0 3 * * 0"

  jobTemplate:
    spec:
      template:
        spec:
          # Low priority for maintenance tasks
          priorityClassName: background-jobs

          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: cleanup:latest
```

If both jobs run simultaneously and resources are limited, the nightly reports get scheduled first and can preempt the cleanup job if necessary.

## Monitoring Priority-Based Scheduling

Track how priorities affect job scheduling and completion times.

```bash
# See pod priorities
kubectl get pods -o custom-columns=\
NAME:.metadata.name,\
PRIORITY:.spec.priority,\
PRIORITY_CLASS:.spec.priorityClassName,\
STATUS:.status.phase

# Check for preemption events
kubectl get events --field-selector reason=Preempted

# View detailed preemption info
kubectl describe pod <pod-name> | grep -A5 Preempted

# Find jobs waiting for scheduling
kubectl get jobs -A -o json | \
  jq '.items[] | select(.status.active == null and .status.succeeded == null) |
      {name: .metadata.name, namespace: .metadata.namespace}'
```

Monitor these metrics to ensure your priority configuration provides the desired scheduling behavior.

## Preventing Priority Inversion

Priority inversion occurs when high-priority jobs depend on resources locked by low-priority jobs. Avoid this by ensuring jobs don't hold exclusive locks on shared resources.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
spec:
  template:
    spec:
      priorityClassName: critical-jobs

      containers:
      - name: processor
        image: processor:latest

        # Use optimistic locking instead of exclusive locks
        env:
        - name: LOCK_STRATEGY
          value: "optimistic"
        - name: RETRY_CONFLICTS
          value: "true"
```

Implement retry logic and optimistic concurrency control in your job code to handle conflicts without blocking high-priority work.

## Setting Default Priority

Designate a default PriorityClass for jobs that don't explicitly specify one.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: default-job-priority
value: 100000
preemptionPolicy: PreemptLowerPriority
globalDefault: true  # This becomes the default
description: "Default priority for jobs without explicit priority class"
```

Only one PriorityClass can have globalDefault set to true. Jobs without a priorityClassName automatically use this class.

## Best Practices

Define clear priority tiers that align with business impact. Document the criteria for assigning jobs to each tier so teams understand which priority class to use.

Avoid creating too many priority classes. Three to five tiers usually suffice for most organizations. Too many classes make it difficult to reason about relative priorities.

Set preemptionPolicy to Never for experimental or test jobs to prevent them from disrupting stable workloads, even if you accidentally assign them high priority values.

Monitor preemption rates and adjust priorities if you see excessive preemption. Frequent preemption indicates resource constraints or misconfigured priorities.

Implement checkpointing in job code so preempted pods can resume from their last checkpoint instead of starting over. This is especially important for long-running batch jobs.

## Resource Planning with Priorities

When planning cluster capacity, account for priority-based scheduling patterns.

```bash
# Calculate resource requirements by priority
kubectl get jobs -A -o json | \
  jq -r '.items[] |
    {
      priority: .spec.template.spec.priorityClassName,
      cpu: .spec.template.spec.containers[0].resources.requests.cpu,
      memory: .spec.template.spec.containers[0].resources.requests.memory
    }'
```

Ensure your cluster has enough capacity to run all critical-priority jobs simultaneously during peak periods, even if it means delaying lower-priority work.

## Conclusion

Priority-based job scheduling using PriorityClasses gives you fine-grained control over which batch workloads run when resources are constrained. By assigning appropriate priorities to jobs based on business impact, you ensure critical processing completes on time while making efficient use of cluster resources.

The combination of PriorityClasses, resource quotas, and preemption policies creates a flexible scheduling framework that balances multiple competing workloads. With proper monitoring and adjustment, priority-based scheduling helps you meet SLAs for important jobs while maximizing overall cluster utilization.
