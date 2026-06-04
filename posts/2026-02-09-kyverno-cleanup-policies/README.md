# How to Configure Kyverno Cleanup Policies for Resource Lifecycle Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kyverno, Cleanup Policies, Resource Management, Automation

Description: Learn how to use Kyverno cleanup policies to automatically delete stale resources, clean up completed jobs, remove old ConfigMaps, implement retention policies.

---

Kyverno cleanup policies automatically delete resources based on age, status, or other conditions. Unlike admission control that prevents resource creation, cleanup policies actively remove existing resources that no longer serve a purpose. This maintains cluster hygiene, reduces resource consumption, and automates operational tasks. This guide shows you how to implement effective cleanup automation.

## Understanding Cleanup Policies

Cleanup policies are DeletingPolicy or NamespacedDeletingPolicy resources that define conditions for resource deletion. They run on schedules, examining resources and deleting those matching conditions. Cleanup operates in the background, separate from admission control.

Common use cases include removing completed jobs, cleaning up temporary namespaces, deleting old ConfigMaps, and purging stale secrets.

## Cleaning Up Completed Jobs

Remove jobs after successful completion:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: cleanup-completed-jobs
spec:
  schedule: "*/15 * * * *"  # Run every 15 minutes
  matchConstraints:
    resourceRules:
      - apiGroups:
          - batch
        apiVersions:
          - v1
        resources:
          - jobs
        scope: Namespaced
    objectSelector:
      matchExpressions:
        - key: keep
          operator: NotIn
          values:
            - "true"
  conditions:
    - name: completed
      expression: "has(object.status.conditions) && object.status.conditions.exists(c, c.type == 'Complete' && c.status == 'True')"
```

This removes completed jobs every 15 minutes, except those labeled with `keep: true`.

## Time-Based Cleanup

Delete resources older than a certain age:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: cleanup-old-configmaps
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - configmaps
        scope: Namespaced
  conditions:
    - name: namespace
      expression: "object.metadata.namespace == 'default' || object.metadata.namespace.startsWith('apps-')"
    - name: older-than-30-days
      expression: "time.now() - timestamp(object.metadata.creationTimestamp) > duration('720h')"
    - name: not-kept
      expression: "!has(object.metadata.annotations) || !('kyverno.io/keep' in object.metadata.annotations) || object.metadata.annotations['kyverno.io/keep'] != 'true'"
```

This deletes ConfigMaps older than 30 days unless annotated to keep.

## Cleaning Failed Pods

Remove pods in failed state:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: cleanup-failed-pods
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - pods
        scope: Namespaced
    namespaceSelector:
      matchExpressions:
        - key: kubernetes.io/metadata.name
          operator: NotIn
          values:
            - kube-system
            - kube-public
  conditions:
    - name: failed-or-unknown
      expression: "object.status.phase in ['Failed', 'Unknown']"
```

This keeps the cluster clean by removing failed pods automatically.

## Temporary Namespace Cleanup

Delete ephemeral namespaces after expiration:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: cleanup-temporary-namespaces
spec:
  schedule: "0 * * * *"  # Hourly
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - namespaces
        scope: Cluster
    objectSelector:
      matchLabels:
        type: temporary
  conditions:
    - name: expired
      expression: "has(object.metadata.annotations) && 'expires' in object.metadata.annotations && timestamp(object.metadata.annotations['expires']) < time.now()"
```

Annotate temporary namespaces with expiration:

```bash
kubectl create namespace temp-feature-test
kubectl label namespace temp-feature-test type=temporary
kubectl annotate namespace temp-feature-test expires="2026-02-10T00:00:00Z"
```

## Cleaning Up ReplicaSets

Remove old ReplicaSets left by Deployments:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: cleanup-old-replicasets
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM
  matchConstraints:
    resourceRules:
      - apiGroups:
          - apps
        apiVersions:
          - v1
        resources:
          - replicasets
        scope: Namespaced
  conditions:
    - name: scaled-down
      expression: "(!has(object.spec.replicas) || object.spec.replicas == 0) && (!has(object.status.replicas) || object.status.replicas == 0)"
    - name: older-than-7-days
      expression: "time.now() - timestamp(object.metadata.creationTimestamp) > duration('168h')"
```

This maintains Deployment history while removing very old ReplicaSets.

## Removing Unused PVCs

Clean up unbound PersistentVolumeClaims:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: cleanup-unbound-pvcs
spec:
  schedule: "0 4 * * 0"  # Weekly on Sunday at 4 AM
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - persistentvolumeclaims
        scope: Namespaced
  conditions:
    - name: pending
      expression: "object.status.phase == 'Pending'"
    - name: older-than-48-hours
      expression: "time.now() - timestamp(object.metadata.creationTimestamp) > duration('48h')"
```

Remove PVCs that have been pending for more than 48 hours.

## Test Artifact Cleanup

Remove resources created during testing:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: cleanup-test-resources
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - pods
          - services
          - configmaps
        scope: Namespaced
    objectSelector:
      matchLabels:
        test: "true"
  conditions:
    - name: older-than-1-hour
      expression: "time.now() - timestamp(object.metadata.creationTimestamp) > duration('1h')"
```

This removes test resources older than 1 hour.

## Namespace-Scoped Cleanup

Use NamespacedDeletingPolicy for namespace-specific rules:

```yaml
apiVersion: policies.kyverno.io/v1
kind: NamespacedDeletingPolicy
metadata:
  name: cleanup-dev-namespace
  namespace: development
spec:
  schedule: "0 0 * * *"  # Daily at midnight
  matchConstraints:
    resourceRules:
      - apiGroups:
          - apps
        apiVersions:
          - v1
        resources:
          - deployments
          - statefulsets
        scope: Namespaced
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - services
        scope: Namespaced
  conditions:
    - name: unused-for-7-days
      expression: "has(object.metadata.annotations) && 'last-used' in object.metadata.annotations && timestamp(object.metadata.annotations['last-used']) < time.now() - duration('168h')"
```

This removes resources in development namespace unused for 7 days when they carry a `last-used` annotation.

## Protecting Critical Resources

Prevent cleanup of important resources:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: cleanup-with-protections
spec:
  schedule: "0 1 * * *"
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - secrets
        scope: Namespaced
  conditions:
    - name: older-than-90-days
      expression: "time.now() - timestamp(object.metadata.creationTimestamp) > duration('2160h')"
    - name: not-system-namespace
      expression: "!(object.metadata.namespace in ['kube-system', 'kube-public', 'kyverno'])"
    - name: not-protected
      expression: "!has(object.metadata.labels) || !('protect' in object.metadata.labels) || object.metadata.labels['protect'] != 'true'"
    - name: not-default-token
      expression: "!object.metadata.name.startsWith('default-token-')"
```

## Policy Validation

Validate cleanup policies before installing them:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: cleanup-dry-run
spec:
  schedule: "*/10 * * * *"
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - pods
        scope: Namespaced
  conditions:
    - name: succeeded
      expression: "object.status.phase == 'Succeeded'"
```

Check that the policy is accepted by the API server without creating it:

```bash
kubectl apply --dry-run=server -f cleanup-dry-run.yaml
```

## Monitoring Cleanup Activity

Track cleanup operations:

```bash
# View cleanup policies

kubectl get deletingpolicy

# Check cleanup policy status
kubectl describe deletingpolicy cleanup-completed-jobs

# View deletion events
kubectl get events --field-selector reason=PolicyApplied -A

# Count cleaned resources
kubectl get events --field-selector reason=PolicyApplied -A --no-headers | wc -l
```

Export metrics for monitoring:

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/instance: monitoring
    release: monitoring
  name: kyverno-cleanup
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - kyverno
  selector:
    matchLabels:
      app.kubernetes.io/instance: kyverno
  endpoints:
    - targetPort: 8000
      path: /metrics
```

Query Prometheus:

```promql
# Total resources cleaned
sum(kyverno_deleting_controller_deletedobjects_total)

# Resources cleaned by policy
sum by (policy_namespace, policy_name) (increase(kyverno_deleting_controller_deletedobjects_total[24h]))

# Failed cleanups
sum(kyverno_deleting_controller_errors_total)
```

## Safety Best Practices

Implement safety measures:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: safe-cleanup
spec:
  schedule: "0 1 * * *"
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - pods
        scope: Namespaced
  conditions:
    # Multiple conditions for safety
    - name: succeeded
      expression: "object.status.phase == 'Succeeded'"
    - name: older-than-24-hours
      expression: "time.now() - timestamp(object.metadata.creationTimestamp) > duration('24h')"
    # Require explicit cleanup label
    - name: explicitly-labeled
      expression: "has(object.metadata.labels) && 'cleanup' in object.metadata.labels && object.metadata.labels['cleanup'] == 'true'"
```

## Scheduled Maintenance Windows

Run intensive cleanup during maintenance:

```yaml
apiVersion: policies.kyverno.io/v1
kind: DeletingPolicy
metadata:
  name: weekend-cleanup
spec:
  schedule: "0 2 * * 6"  # Saturday at 2 AM
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        resources:
          - pods
          - configmaps
          - secrets
        scope: Namespaced
      - apiGroups:
          - batch
        apiVersions:
          - v1
        resources:
          - jobs
        scope: Namespaced
  conditions:
    - name: older-than-60-days
      expression: "time.now() - timestamp(object.metadata.creationTimestamp) > duration('1440h')"
```

## Conclusion

Kyverno cleanup policies automate resource lifecycle management by removing completed jobs, failed pods, old ConfigMaps, and temporary resources based on age or status. Configure schedules appropriate for each resource type, protect critical resources with strict match constraints and conditions, and validate policies before applying them. Monitor cleanup activity through events and metrics, and schedule intensive cleanup during maintenance windows. Use time-based conditions to implement retention policies, and require explicit labels for high-risk cleanup operations.

Automated cleanup maintains cluster hygiene, reduces resource consumption, and prevents manual operational toil.
