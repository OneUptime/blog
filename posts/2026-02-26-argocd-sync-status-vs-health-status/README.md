# How to Understand Sync Status vs Health Status in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monitoring

Description: Clear explanation of the difference between sync status and health status in ArgoCD, how they are calculated, what each state means, and how to troubleshoot common issues.

---

ArgoCD tracks two distinct statuses for every application: sync status and health status. Beginners often confuse them, but understanding the difference is critical for operating ArgoCD effectively. An application can be Synced but Degraded, or OutOfSync but Healthy. Each status answers a different question, and together they give you the full picture of your application's state.

## The Two Questions

**Sync status** answers: "Does the cluster match what is in Git?"
**Health status** answers: "Is the application actually working?"

These are independent dimensions:

```mermaid
quadrantChart
    title ArgoCD Application States
    x-axis OutOfSync --> Synced
    y-axis Degraded --> Healthy
    quadrant-1 Synced and Healthy (ideal state)
    quadrant-2 OutOfSync but Healthy (pending changes)
    quadrant-3 OutOfSync and Degraded (problem state)
    quadrant-4 Synced but Degraded (runtime issue)
```

## Sync Status Explained

Sync status compares the rendered manifests from Git (desired state) with the live resources in Kubernetes (live state).

### Synced

The live state matches the desired state. Every resource in Git exists in the cluster with the same configuration.

```text
Sync Status: Synced to main (abc1234)
```

This means ArgoCD compared every field it tracks in every resource and found no differences.

### OutOfSync

The live state differs from the desired state. At least one resource has a difference between what Git says and what the cluster has.

```text
Sync Status: OutOfSync from main (abc1234)
```

Common causes of OutOfSync:
- A new commit was pushed to Git but not yet synced
- Someone manually edited a resource in the cluster (kubectl edit, kubectl scale)
- An automated controller changed a resource (HPA, VPA, admission webhooks)
- A sync failed partway through, leaving some resources updated and others not

### Unknown

ArgoCD cannot determine the sync status, usually because it failed to render the manifests or connect to the repository.

```text
Sync Status: Unknown
```

This typically indicates a configuration error in the Application source (bad repo URL, invalid path, template rendering failure).

## Health Status Explained

Health status is determined by examining the actual state of Kubernetes resources. ArgoCD has built-in health checks for standard Kubernetes resource types.

### Healthy

All resources are in their desired operational state. Deployments have the expected number of ready replicas. Services have endpoints. Ingresses have load balancers assigned.

### Progressing

Resources are moving toward a healthy state but are not there yet. This is normal during:
- Rolling updates (old pods terminating, new pods starting)
- Initial deployment (pods being scheduled)
- Scale-up operations

ArgoCD will show Progressing for a Deployment when its observed generation does not match the desired generation, or when the number of ready replicas does not match the desired count.

### Degraded

Something is wrong. Resources are not functioning properly. Common Degraded scenarios:

- Pods in CrashLoopBackOff
- Pods stuck in ImagePullBackOff
- Deployments with zero ready replicas
- StatefulSets with failed pods
- Jobs that have exceeded their backoff limit

### Suspended

The resource is intentionally paused. Examples:
- Deployments that have been paused (`spec.paused: true`)
- CronJobs that are suspended (`spec.suspend: true`)
- Argo Rollouts that are paused at a canary step

### Missing

A resource defined in Git does not exist in the cluster at all. This can happen when:
- The initial sync has not completed
- A resource was manually deleted from the cluster
- RBAC prevents ArgoCD from creating the resource
- The target namespace does not exist

### Unknown

ArgoCD cannot determine health, usually because:
- The resource type does not have a built-in health check
- A custom health check returned an error
- The resource API is unreachable

## How Health Is Calculated for Common Resources

### Deployment Health

```text
Healthy:      All desired replicas are ready and updated
Progressing:  Rolling update in progress, or replicas not yet ready
Degraded:     Available replicas < desired AND progress deadline exceeded
```

### Pod Health

```text
Healthy:      All containers running and passing health checks
Progressing:  Pod is Pending or containers are starting
Degraded:     Any container in CrashLoopBackOff, OOMKilled, or Error state
```

### Service Health

```text
Healthy:      Always (Services are considered healthy once created)
              For LoadBalancer type: healthy once external IP is assigned
Progressing:  LoadBalancer type waiting for external IP
```

### StatefulSet Health

```text
Healthy:      All replicas ready and at current revision
Progressing:  Rolling update in progress
Degraded:     Replicas not becoming ready
```

### Ingress Health

```text
Healthy:      Ingress has at least one active backend
Progressing:  Waiting for load balancer
```

### Job Health

```text
Healthy:      Job completed successfully
Progressing:  Job is still running
Degraded:     Job failed (backoff limit reached)
```

## The Four Combinations

### 1. Synced + Healthy (Green/Green)

This is the ideal state. Git and cluster match, and everything is working.

```text
Sync Status:    Synced
Health Status:  Healthy
```

No action needed.

### 2. OutOfSync + Healthy (Yellow/Green)

Git has changes that have not been applied, but the current running version is fine.

```text
Sync Status:    OutOfSync
Health Status:  Healthy
```

Action: Sync when ready. The current deployment is working, so there is no urgency unless the Git changes are critical.

### 3. Synced + Degraded (Green/Red)

The cluster matches Git, but the application is not working. This is a runtime issue, not a GitOps issue.

```text
Sync Status:    Synced
Health Status:  Degraded
```

Action: Check logs and events. The manifests were applied correctly, but something else is wrong - the application itself is crashing, external dependencies are down, or resources are insufficient.

### 4. OutOfSync + Degraded (Yellow/Red)

Both the configuration and the runtime are in a bad state.

```text
Sync Status:    OutOfSync
Health Status:  Degraded
```

Action: Determine if syncing will fix the degradation. If the latest Git commit contains a fix, sync. If the degradation is unrelated to the sync difference, fix the runtime issue first.

## Troubleshooting Sync Status Issues

### Application Shows OutOfSync But Nothing Changed

Check for automatic field mutations:

```bash
# View the diff to see what is different
argocd app diff my-app

# Common culprits:
# - metadata.annotations (added by admission webhooks)
# - spec.replicas (changed by HPA)
# - metadata.resourceVersion (always different)
# - status fields (ArgoCD usually ignores these)
```

Fix with `ignoreDifferences`:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

### Application Shows OutOfSync After Sync

If syncing does not resolve the OutOfSync status:
- Check if admission webhooks are mutating resources
- Check if the manifests have templating errors
- Verify the sync actually completed successfully
- Use `argocd app diff my-app` to see what specific fields differ

## Troubleshooting Health Status Issues

### Stuck in Progressing

If health shows Progressing for more than a few minutes:

```bash
# Check which resources are not healthy
argocd app get my-app

# Check specific resource health
kubectl describe deployment my-app -n my-namespace

# Common causes:
# - Image pull taking too long
# - Insufficient node resources
# - PVC not binding
# - Init containers not completing
```

### Degraded Health

```bash
# Find the degraded resources
argocd app get my-app | grep -i degraded

# Check pod status
kubectl get pods -n my-namespace

# Check events for error details
kubectl get events -n my-namespace --sort-by='.lastTimestamp'
```

## Custom Health Checks

For custom resources that ArgoCD does not have built-in health checks for, you can define custom health checks using Lua scripts:

```yaml
# In argocd-cm ConfigMap
data:
  resource.customizations.health.mycrd.example.com_MyResource: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Running" then
        hs.status = "Healthy"
        hs.message = "Resource is running"
      elseif obj.status.phase == "Failed" then
        hs.status = "Degraded"
        hs.message = obj.status.message
      else
        hs.status = "Progressing"
        hs.message = "Waiting for resource to be ready"
      end
    end
    return hs
```

Understanding the distinction between sync status and health status is fundamental to operating ArgoCD. Sync status tells you about GitOps compliance - is your cluster doing what Git says? Health status tells you about operational reality - is your application actually working? Together, they give you complete visibility into your deployment pipeline.
