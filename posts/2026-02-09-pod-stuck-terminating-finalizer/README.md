# How to Diagnose Kubernetes Pod Stuck in Terminating State Due to Finalizer Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Troubleshooting, Finalizers

Description: Learn how to diagnose and resolve pods stuck in Terminating state due to finalizer issues, including safe removal techniques and prevention strategies for finalizer-related problems.

---

Pods stuck in Terminating state frustrate developers and operators. You delete a pod, expecting it to disappear within seconds, but instead it lingers in Terminating status indefinitely. Finalizers are often the culprit. These metadata fields instruct Kubernetes to block deletion until specific cleanup tasks complete, but when finalizer controllers fail or are deleted, pods get stuck.

This guide explains how finalizers work, how to diagnose finalizer-related termination issues, and how to safely remove problematic finalizers without corrupting cluster state.

## Understanding Kubernetes Finalizers

Finalizers are metadata fields that prevent object deletion until external cleanup completes. When you delete an object with finalizers, Kubernetes marks it for deletion by setting a deletion timestamp but doesn't remove it from etcd. Controllers watching that object perform cleanup operations and then remove their finalizer. Only when all finalizers are removed does Kubernetes actually delete the object.

Common finalizers include protection for persistent volume claims, cleanup for custom resources managed by operators, and garbage collection for dependent objects. Pods themselves rarely have finalizers, but when they do, stuck finalizers cause termination delays.

The problem arises when the controller responsible for a finalizer no longer runs. The finalizer blocks deletion, but nothing removes it. The pod stays in Terminating state forever unless you manually intervene.

## Identifying Pods Stuck in Terminating

Check for pods stuck in Terminating state across your cluster.

```bash
# Find terminating pods
kubectl get pods --all-namespaces --field-selector=status.phase=Running | \
  grep Terminating

# Get more details with custom columns
kubectl get pods -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
STATUS:.status.phase,\
DELETION:.metadata.deletionTimestamp

# Output shows:
# NAMESPACE    NAME                    STATUS    DELETION
# default      stuck-pod-abc123        Running   2024-02-09T10:00:00Z
```

A pod showing a deletion timestamp but still running indicates it's stuck in termination.

View pod details to check for finalizers.

```bash
# Check pod finalizers
kubectl get pod stuck-pod-abc123 -n default -o yaml | grep -A 5 finalizers

# Output:
# finalizers:
# - kubernetes.io/pvc-protection
# - example.com/custom-cleanup
```

Describe the pod to understand why it won't terminate.

```bash
kubectl describe pod stuck-pod-abc123 -n default

# Look for events indicating termination attempts
# Events:
#   Warning  FailedKillPod  2m  kubelet  error killing pod: timed out waiting for container to stop
```

## Diagnosing Finalizer Controller Issues

Identify which controller should remove the finalizer and check if it's running.

```bash
# For custom finalizers like "example.com/custom-cleanup"
# Check if the operator is running
kubectl get pods -n operators | grep example-operator

# Check operator logs for errors
kubectl logs -n operators deploy/example-operator | grep -i finalizer

# Look for errors like:
# Error processing finalizer for pod stuck-pod-abc123: timeout
# Failed to cleanup resources: connection refused
```

For built-in finalizers, check the relevant controller manager.

```bash
# Check controller manager status
kubectl get pods -n kube-system | grep controller-manager

# Check controller manager logs
kubectl logs -n kube-system kube-controller-manager-master-1 | \
  grep -i finalizer
```

## Safely Removing Finalizers to Allow Deletion

When you've confirmed the finalizer controller no longer runs or can't complete cleanup, manually remove the finalizer to allow deletion. Use caution, as improper removal can leak resources.

```bash
# Method 1: Using kubectl patch (preferred)
kubectl patch pod stuck-pod-abc123 -n default \
  -p '{"metadata":{"finalizers":[]}}' \
  --type=merge

# Method 2: Edit the pod directly
kubectl edit pod stuck-pod-abc123 -n default
# Remove the finalizers section entirely or delete specific finalizers
```

For a specific finalizer, remove only that one while preserving others.

```bash
# Get current finalizers
kubectl get pod stuck-pod-abc123 -n default -o jsonpath='{.metadata.finalizers}'

# Remove specific finalizer using JSON patch
kubectl patch pod stuck-pod-abc123 -n default --type json \
  -p='[{"op": "remove", "path": "/metadata/finalizers/0"}]'
```

After removing finalizers, verify the pod terminates successfully.

```bash
# Watch pod status
kubectl get pod stuck-pod-abc123 -n default -w

# Should show deletion within seconds
# stuck-pod-abc123   Terminating   0/1     0          5m
# stuck-pod-abc123   Terminating   0/1     0          5m1s  (deleted)
```

## Handling Pods with PVC Protection Finalizer

The `kubernetes.io/pvc-protection` finalizer prevents deletion of PVCs while pods are using them. Pods referencing protected PVCs can get stuck if the PVC is deleted first.

```bash
# Check if PVC exists
PVC_NAME=$(kubectl get pod stuck-pod-abc123 -n default -o jsonpath='{.spec.volumes[0].persistentVolumeClaim.claimName}')
kubectl get pvc $PVC_NAME -n default

# If PVC is also stuck in terminating
kubectl get pvc $PVC_NAME -n default -o yaml | grep -A 5 finalizers

# Remove PVC protection finalizer from pod
kubectl patch pod stuck-pod-abc123 -n default \
  --type json \
  -p='[{"op":"remove","path":"/metadata/finalizers"}]'
```

If the PVC itself is stuck, remove its finalizer after ensuring no pods reference it.

```bash
# Verify no pods use the PVC
kubectl get pods -n default -o json | \
  jq -r '.items[] | select(.spec.volumes[]?.persistentVolumeClaim.claimName=="'$PVC_NAME'") | .metadata.name'

# If empty, safe to remove PVC finalizer
kubectl patch pvc $PVC_NAME -n default \
  -p '{"metadata":{"finalizers":null}}' \
  --type=merge
```

## Dealing with Custom Resource Finalizers

Custom resources managed by operators often have finalizers for cleanup. When operators fail or are uninstalled, their finalizers block resource deletion.

```bash
# Check custom resource with stuck finalizer
kubectl get myresource example-resource -n default -o yaml | \
  grep -A 10 metadata

# Output shows:
# metadata:
#   deletionTimestamp: "2024-02-09T10:00:00Z"
#   finalizers:
#   - myoperator.example.com/cleanup

# Check if operator exists
kubectl get deployment myoperator -n operators

# If operator is gone, manually remove finalizer
kubectl patch myresource example-resource -n default \
  --type json \
  -p='[{"op":"remove","path":"/metadata/finalizers"}]'
```

## Preventing Finalizer Issues with Proper Operator Lifecycle Management

Implement finalizer handling correctly in custom operators to prevent stuck resources.

```go
// Example operator code with proper finalizer handling
func (r *MyReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    instance := &myv1.MyResource{}
    err := r.Get(ctx, req.NamespacedName, instance)
    if err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    finalizerName := "myoperator.example.com/cleanup"

    // Handle deletion
    if !instance.ObjectMeta.DeletionTimestamp.IsZero() {
        if containsString(instance.ObjectMeta.Finalizers, finalizerName) {
            // Perform cleanup with timeout
            ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
            defer cancel()

            if err := r.cleanupExternalResources(ctx, instance); err != nil {
                // Log error but remove finalizer anyway after max retries
                return ctrl.Result{RequeueAfter: 5 * time.Second}, err
            }

            // Remove finalizer
            instance.ObjectMeta.Finalizers = removeString(instance.ObjectMeta.Finalizers, finalizerName)
            if err := r.Update(ctx, instance); err != nil {
                return ctrl.Result{}, err
            }
        }
        return ctrl.Result{}, nil
    }

    // Add finalizer if not present
    if !containsString(instance.ObjectMeta.Finalizers, finalizerName) {
        instance.ObjectMeta.Finalizers = append(instance.ObjectMeta.Finalizers, finalizerName)
        if err := r.Update(ctx, instance); err != nil {
            return ctrl.Result{}, err
        }
    }

    // Normal reconciliation logic
    return ctrl.Result{}, nil
}
```

## Implementing Finalizer Timeouts

Add timeouts to finalizer cleanup to prevent indefinite blocking.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: operator-config
  namespace: operators
data:
  finalizer-timeout: "60s"
  max-cleanup-retries: "3"
```

The operator should respect these timeouts and remove finalizers even if cleanup fails after max retries, logging errors for manual investigation.

## Monitoring Stuck Finalizers

Create alerts for resources stuck with finalizers to catch issues quickly.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: finalizers
      rules:
      - alert: ResourceStuckWithFinalizer
        expr: |
          time() - kube_pod_deletion_timestamp > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} stuck terminating"
          description: "Pod has deletion timestamp but hasn't terminated in 5+ minutes"

      - alert: CustomResourceStuckDeleting
        expr: |
          kube_customresource_status_deletion_timestamp > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Custom resource stuck deleting"
```

Create a script that checks for stuck resources regularly.

```bash
#!/bin/bash
# check-stuck-finalizers.sh

echo "Checking for resources stuck with finalizers..."

# Check pods
kubectl get pods -A -o json | \
  jq -r '.items[] | select(.metadata.deletionTimestamp != null) |
  "\(.metadata.namespace)/\(.metadata.name): \(.metadata.finalizers)"'

# Check PVCs
kubectl get pvc -A -o json | \
  jq -r '.items[] | select(.metadata.deletionTimestamp != null) |
  "\(.metadata.namespace)/\(.metadata.name): \(.metadata.finalizers)"'

# Check custom resources (example)
kubectl get myresources -A -o json | \
  jq -r '.items[] | select(.metadata.deletionTimestamp != null) |
  "\(.metadata.namespace)/\(.metadata.name): \(.metadata.finalizers)"'
```

Run this as a CronJob for automated checking.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: check-stuck-finalizers
  namespace: kube-system
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: checker
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - /scripts/check-stuck-finalizers.sh
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: finalizer-check-script
              defaultMode: 0755
          serviceAccountName: finalizer-checker
          restartPolicy: OnFailure
```

## Force Deleting Pods as Last Resort

When removing finalizers doesn't work or isn't safe, force delete the pod. This bypasses finalizers and immediately removes the pod from etcd.

```bash
# Force delete with grace period 0
kubectl delete pod stuck-pod-abc123 -n default --force --grace-period=0

# Warning: This leaves cleanup incomplete
# Only use when absolutely necessary
```

Force deletion should be a last resort after attempting proper finalizer removal, as it can leave orphaned resources that require manual cleanup.

Finalizers serve important purposes in Kubernetes, but mismanaged finalizers create stuck resources that block cluster operations. By implementing proper timeout handling in operators, monitoring for stuck resources, and understanding safe finalizer removal procedures, you minimize the impact of finalizer issues. Combined with proactive monitoring and automated checks, these practices keep your cluster responsive and prevent resource deletion from becoming a manual intervention point.
