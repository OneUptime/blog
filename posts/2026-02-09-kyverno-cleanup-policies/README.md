# How to Configure Kyverno Cleanup Policies for Resource Lifecycle Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kyverno, Cleanup Policies, Resource Management, Automation

Description: Learn how to use Kyverno cleanup policies to automatically delete stale resources, clean up completed jobs, remove old ConfigMaps, implement retention policies, and maintain cluster hygiene through automated lifecycle management.

---

Kyverno cleanup policies automatically delete resources based on age, status, or other conditions. Unlike admission control that prevents resource creation, cleanup policies actively remove existing resources that no longer serve a purpose. This maintains cluster hygiene, reduces resource consumption, and automates operational tasks. This guide shows you how to implement effective cleanup automation.

## Understanding Cleanup Policies

Cleanup policies are ClusterCleanupPolicy or CleanupPolicy resources that define conditions for resource deletion. They run on schedules, examining resources and deleting those matching conditions. Cleanup operates in the background, separate from admission control.

Common use cases include removing completed jobs, cleaning up temporary namespaces, deleting old ConfigMaps, and purging stale secrets.

## Cleaning Up Completed Jobs

Remove jobs after successful completion:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-completed-jobs
spec:
  schedule: "*/15 * * * *"  # Run every 15 minutes
  match:
    any:
      - resources:
          kinds:
            - Job
          namespaces:
            - "*"
  conditions:
    any:
      - key: "{{ target.status.succeeded || `0` }}"
        operator: GreaterThan
        value: 0
      - key: "{{ target.status.completionTime }}"
        operator: NotEquals
        value: ""
  exclude:
    any:
      - resources:
          selector:
            matchLabels:
              keep: "true"
```

This removes completed jobs every 15 minutes, except those labeled with `keep: true`.

## Time-Based Cleanup

Delete resources older than a certain age:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-old-configmaps
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  match:
    any:
      - resources:
          kinds:
            - ConfigMap
          namespaces:
            - default
            - apps-*
  conditions:
    all:
      - key: "{{ time_since('', '{{ target.metadata.creationTimestamp }}', '') }}"
        operator: GreaterThan
        value: 30d  # Older than 30 days
      - key: "{{ target.metadata.annotations.\"kyverno.io/keep\" || 'false' }}"
        operator: NotEquals
        value: "true"
```

This deletes ConfigMaps older than 30 days unless annotated to keep.

## Cleaning Failed Pods

Remove pods in failed state:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-failed-pods
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  match:
    any:
      - resources:
          kinds:
            - Pod
  conditions:
    any:
      - key: "{{ target.status.phase }}"
        operator: Equals
        value: "Failed"
      - key: "{{ target.status.phase }}"
        operator: Equals
        value: "Unknown"
  exclude:
    any:
      - resources:
          namespaces:
            - kube-system
            - kube-public
```

This keeps the cluster clean by removing failed pods automatically.

## Temporary Namespace Cleanup

Delete ephemeral namespaces after expiration:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-temporary-namespaces
spec:
  schedule: "0 * * * *"  # Hourly
  match:
    any:
      - resources:
          kinds:
            - Namespace
          selector:
            matchLabels:
              type: temporary
  conditions:
    any:
      - key: "{{ target.metadata.annotations.\"expires\" }}"
        operator: LessThan
        value: "{{ time_now() }}"
```

Annotate temporary namespaces with expiration:

```bash
kubectl create namespace temp-feature-test
kubectl annotate namespace temp-feature-test type=temporary expires="2026-02-10T00:00:00Z"
```

## Cleaning Up ReplicaSets

Remove old ReplicaSets left by Deployments:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-old-replicasets
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM
  match:
    any:
      - resources:
          kinds:
            - ReplicaSet
  conditions:
    all:
      - key: "{{ target.spec.replicas || `0` }}"
        operator: Equals
        value: 0
      - key: "{{ target.status.replicas || `0` }}"
        operator: Equals
        value: 0
      - key: "{{ time_since('', '{{ target.metadata.creationTimestamp }}', '') }}"
        operator: GreaterThan
        value: 7d  # Keep 7 days of history
```

This maintains Deployment history while removing very old ReplicaSets.

## Removing Unused PVCs

Clean up unbound PersistentVolumeClaims:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-unbound-pvcs
spec:
  schedule: "0 4 * * 0"  # Weekly on Sunday at 4 AM
  match:
    any:
      - resources:
          kinds:
            - PersistentVolumeClaim
  conditions:
    all:
      - key: "{{ target.status.phase }}"
        operator: Equals
        value: "Pending"
      - key: "{{ time_since('', '{{ target.metadata.creationTimestamp }}', '') }}"
        operator: GreaterThan
        value: 48h
```

Remove PVCs that have been pending for more than 48 hours.

## Test Artifact Cleanup

Remove resources created during testing:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-test-resources
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  match:
    any:
      - resources:
          kinds:
            - Pod
            - Service
            - ConfigMap
          selector:
            matchLabels:
              test: "true"
  conditions:
    all:
      - key: "{{ time_since('', '{{ target.metadata.creationTimestamp }}', '') }}"
        operator: GreaterThan
        value: 1h
```

This removes test resources older than 1 hour.

## Namespace-Scoped Cleanup

Use CleanupPolicy for namespace-specific rules:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: CleanupPolicy
metadata:
  name: cleanup-dev-namespace
  namespace: development
spec:
  schedule: "0 0 * * *"  # Daily at midnight
  match:
    any:
      - resources:
          kinds:
            - Deployment
            - StatefulSet
            - Service
  conditions:
    all:
      - key: "{{ target.metadata.labels.\"last-used\" }}"
        operator: LessThan
        value: "{{ time_add('-7d') }}"
```

This removes resources in development namespace unused for 7 days.

## Protecting Critical Resources

Prevent cleanup of important resources:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-with-protections
spec:
  schedule: "0 1 * * *"
  match:
    any:
      - resources:
          kinds:
            - Secret
  conditions:
    all:
      - key: "{{ time_since('', '{{ target.metadata.creationTimestamp }}', '') }}"
        operator: GreaterThan
        value: 90d
  exclude:
    any:
      # Exclude secrets in system namespaces
      - resources:
          namespaces:
            - kube-system
            - kube-public
            - kyverno
      # Exclude secrets with protection label
      - resources:
          selector:
            matchLabels:
              protect: "true"
      # Exclude secrets currently in use
      - resources:
          names:
            - "default-token-*"
```

## Dry Run Mode

Test cleanup policies without deletion:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-dry-run
  annotations:
    kyverno.io/cleanup-mode: "dryrun"
spec:
  schedule: "*/10 * * * *"
  match:
    any:
      - resources:
          kinds:
            - Pod
  conditions:
    any:
      - key: "{{ target.status.phase }}"
        operator: Equals
        value: "Succeeded"
```

Check cleanup logs to see what would be deleted:

```bash
kubectl logs -n kyverno -l app.kubernetes.io/component=cleanup-controller | grep "would delete"
```

## Monitoring Cleanup Activity

Track cleanup operations:

```bash
# View cleanup policies
kubectl get clustercleanuppolicy

# Check cleanup policy status
kubectl describe clustercleanuppolicy cleanup-completed-jobs

# View cleanup logs
kubectl logs -n kyverno -l app.kubernetes.io/component=cleanup-controller -f

# Count cleaned resources
kubectl logs -n kyverno -l app.kubernetes.io/component=cleanup-controller | \
  grep "deleted resource" | wc -l
```

Export metrics for monitoring:

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kyverno-cleanup
  namespace: kyverno
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: cleanup-controller
  endpoints:
    - port: metrics
```

Query Prometheus:

```promql
# Total resources cleaned
sum(kyverno_cleanup_controller_resources_deleted_total)

# Cleanup policy execution time
histogram_quantile(0.95, kyverno_cleanup_controller_scan_duration_seconds_bucket)

# Failed cleanups
sum(kyverno_cleanup_controller_errors_total)
```

## Safety Best Practices

Implement safety measures:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: safe-cleanup
spec:
  schedule: "0 1 * * *"
  match:
    any:
      - resources:
          kinds:
            - Pod
  conditions:
    all:
      # Multiple conditions for safety
      - key: "{{ target.status.phase }}"
        operator: Equals
        value: "Succeeded"
      - key: "{{ time_since('', '{{ target.metadata.creationTimestamp }}', '') }}"
        operator: GreaterThan
        value: 24h
      # Require explicit cleanup label
      - key: "{{ target.metadata.labels.\"cleanup\" || 'false' }}"
        operator: Equals
        value: "true"
```

## Scheduled Maintenance Windows

Run intensive cleanup during maintenance:

```yaml
apiVersion: kyverno.io/v2alpha1
kind: ClusterCleanupPolicy
metadata:
  name: weekend-cleanup
spec:
  schedule: "0 2 * * 6"  # Saturday at 2 AM
  match:
    any:
      - resources:
          kinds:
            - Pod
            - Job
            - ConfigMap
            - Secret
  conditions:
    all:
      - key: "{{ time_since('', '{{ target.metadata.creationTimestamp }}', '') }}"
        operator: GreaterThan
        value: 60d
```

## Conclusion

Kyverno cleanup policies automate resource lifecycle management by removing completed jobs, failed pods, old ConfigMaps, and temporary resources based on age or status. Configure schedules appropriate for each resource type, protect critical resources with exclude rules, and implement safety measures like dry run mode. Monitor cleanup activity through logs and metrics, and schedule intensive cleanup during maintenance windows. Use time-based conditions to implement retention policies, and require explicit labels for high-risk cleanup operations.

Automated cleanup maintains cluster hygiene, reduces resource consumption, and prevents manual operational toil.
