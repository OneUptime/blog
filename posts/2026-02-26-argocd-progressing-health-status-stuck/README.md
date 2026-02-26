# How to Handle 'Progressing' Health Status That Never Completes in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting

Description: Learn how to diagnose and fix ArgoCD applications stuck in Progressing health status, including common causes like image pull failures, resource limits, pending volumes, and misconfigured health checks.

---

Few things are more frustrating than watching an ArgoCD application sit in "Progressing" status indefinitely. You deployed a change, ArgoCD picked it up, the sync completed, but the health status spinner just keeps spinning. The application never transitions to "Healthy" or "Degraded" - it just stays "Progressing" forever.

This is one of the most common issues ArgoCD users face, and it can be caused by many different things. This guide walks through a systematic approach to finding and fixing the root cause.

## Why "Progressing" Gets Stuck

ArgoCD marks a resource as "Progressing" when it detects that the resource is being created or updated but has not yet reached its desired state. For a Deployment, this means replicas are being rolled out. For a Service of type LoadBalancer, this means the external IP has not been assigned yet.

The problem occurs when the resource can never reach its desired state. ArgoCD keeps waiting, and the status stays "Progressing" because the resource never transitions to a terminal state (Healthy or Degraded).

Common causes include:

1. Container image pull failures
2. Insufficient cluster resources (CPU/memory)
3. Pending PersistentVolumeClaims
4. Misconfigured liveness or readiness probes
5. Node scheduling problems
6. Resource quota limits exceeded
7. Network policy blocking required traffic
8. Kubernetes progress deadline not configured

## Step 1: Identify Which Resource Is Stuck

First, find which specific resource in your application is preventing the health from resolving:

```bash
# List all resources in the application with health status
argocd app resources my-app

# Filter for non-healthy resources
argocd app resources my-app -o json | jq '.[] | select(.health.status != "Healthy") | {kind: .kind, name: .name, health: .health}'
```

This will show you exactly which Deployment, StatefulSet, or other resource is stuck in Progressing.

## Step 2: Check Kubernetes Events

Once you know the resource, check the Kubernetes events for clues:

```bash
# Get events for the specific resource
kubectl events -n <namespace> --for=deployment/<deployment-name>

# Get all recent events in the namespace sorted by time
kubectl events -n <namespace> --sort-by='.lastTimestamp'

# Check pod events for the stuck deployment
kubectl get pods -n <namespace> -l app=<app-name>
kubectl describe pod <pod-name> -n <namespace>
```

Events will often tell you directly what is wrong: "Failed to pull image", "Insufficient memory", "0/3 nodes are available", etc.

## Step 3: Diagnose by Resource Type

### Deployments Stuck in Progressing

The most common scenario. A Deployment stays "Progressing" when pods cannot reach a Running state.

```bash
# Check the rollout status
kubectl rollout status deployment/<name> -n <namespace>

# Check the replica set status
kubectl get replicasets -n <namespace> -l app=<app-name>

# Check why pods are not starting
kubectl get pods -n <namespace> -l app=<app-name>
kubectl describe pod <stuck-pod> -n <namespace>
```

**Image pull failures**: The most common cause.

```bash
# Check if the image exists and is accessible
kubectl get pods -n <namespace> -o jsonpath='{.items[*].status.containerStatuses[*].state}'
```

Fix: Verify the image name, tag, and registry credentials.

**Resource limits**: Pods cannot be scheduled because the node does not have enough CPU or memory.

```bash
# Check node resource availability
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check if there are pending pods
kubectl get pods -n <namespace> --field-selector=status.phase=Pending
```

Fix: Adjust resource requests/limits or add nodes.

**Readiness probe failures**: The container starts but the readiness probe never succeeds.

```bash
# Check container state
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.status.containerStatuses[0].state}'

# Check if the readiness probe is configured correctly
kubectl get deployment <name> -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}'
```

Fix: Verify the probe endpoint, port, and timing parameters.

### StatefulSets Stuck in Progressing

StatefulSets have an additional common failure: stuck PVCs.

```bash
# Check PVC status
kubectl get pvc -n <namespace> -l app=<app-name>

# If PVC is Pending, check the StorageClass
kubectl describe pvc <pvc-name> -n <namespace>
kubectl get storageclass
```

Fix: Ensure the StorageClass exists and the provisioner is running.

### Services Stuck in Progressing (LoadBalancer)

LoadBalancer Services stay "Progressing" when the cloud provider cannot assign an external IP.

```bash
# Check the service status
kubectl get svc <name> -n <namespace>
kubectl describe svc <name> -n <namespace>
```

Fix: Check cloud provider quotas, ensure the load balancer controller is running.

### Ingresses Stuck in Progressing

```bash
# Check ingress status
kubectl get ingress <name> -n <namespace>
kubectl describe ingress <name> -n <namespace>

# Check the ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

Fix: Verify the Ingress class, check that the backend service exists.

## Step 4: Check the Kubernetes Progress Deadline

For Deployments, Kubernetes has a `spec.progressDeadlineSeconds` field (default: 600 seconds / 10 minutes). If a rollout does not make progress within this time, the Deployment condition changes to `ProgressDeadlineExceeded`, which ArgoCD maps to "Degraded".

If you do not see the status change from "Progressing" to "Degraded" after 10 minutes, something unusual is happening:

```bash
# Check the progress deadline
kubectl get deployment <name> -n <namespace> -o jsonpath='{.spec.progressDeadlineSeconds}'

# Check the deployment conditions
kubectl get deployment <name> -n <namespace> -o jsonpath='{.status.conditions[*]}'
```

If the progress deadline is set very high (or if the rollout is technically making progress but never completing), the status will stay "Progressing" for a long time.

You can set a shorter deadline:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  progressDeadlineSeconds: 300  # 5 minutes
  # ... rest of spec
```

## Step 5: Check Custom Health Checks

If you have custom Lua health checks for the stuck resource type, the Lua script might have a bug that never returns "Healthy" or "Degraded".

```bash
# Check if a custom health check exists for this resource type
kubectl get configmap argocd-cm -n argocd -o yaml | grep "resource.customizations.health"
```

Common Lua bugs that cause permanent "Progressing":

```lua
-- Bug: condition not found in the loop, falls through to "Progressing"
for i, condition in ipairs(obj.status.conditions) do
  if condition.type == "Ready" then
    if condition.status == "True" then
      hs.status = "Healthy"
      return hs
    end
    -- Missing: what if condition.status is "False"?
  end
end
-- Always returns Progressing if Ready condition is False
hs.status = "Progressing"
return hs
```

Fix the Lua script to handle all possible condition states:

```lua
for i, condition in ipairs(obj.status.conditions) do
  if condition.type == "Ready" then
    if condition.status == "True" then
      hs.status = "Healthy"
      hs.message = "Resource is ready"
    elseif condition.status == "False" then
      hs.status = "Degraded"
      hs.message = condition.message or "Resource is not ready"
    else
      hs.status = "Progressing"
      hs.message = "Resource is being configured"
    end
    return hs
  end
end
```

## Step 6: Force a Hard Refresh

Sometimes ArgoCD's cache gets stale and does not pick up status changes. Force a hard refresh:

```bash
# Hard refresh forces ArgoCD to re-read the resource state from the cluster
argocd app get my-app --hard-refresh

# Or from the UI: click the three dots menu on the application and select "Hard Refresh"
```

## Step 7: Check ArgoCD Controller Health

If the ArgoCD application controller itself is overloaded, it might not process health checks promptly:

```bash
# Check controller logs for errors
kubectl logs -n argocd deployment/argocd-application-controller --tail=100

# Check controller resource usage
kubectl top pod -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Check reconciliation queue depth
kubectl exec -n argocd deployment/argocd-application-controller -- curl -s localhost:8082/metrics | grep argocd_app_reconcile
```

## Quick Troubleshooting Checklist

1. Which specific resource is stuck? Check `argocd app resources`.
2. What do the Kubernetes events say? Check `kubectl events`.
3. Are pods starting? Check `kubectl get pods`.
4. Are PVCs bound? Check `kubectl get pvc`.
5. Is there a custom health check? Check `argocd-cm`.
6. Has the progress deadline passed? Check deployment conditions.
7. Is ArgoCD's cache stale? Try `--hard-refresh`.
8. Is the controller overloaded? Check controller logs and metrics.

For writing better health checks, see [how to write custom health check scripts in Lua](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-health-check-lua-scripts/view). For general health check debugging, check out [how to debug health check failures in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-debug-health-check-failures/view).
