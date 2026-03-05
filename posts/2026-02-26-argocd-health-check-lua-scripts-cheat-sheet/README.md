# ArgoCD Health Check Lua Scripts Cheat Sheet

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Lua, Health Check

Description: A quick reference cheat sheet for writing ArgoCD custom health check Lua scripts covering common resource types, CRDs, and advanced patterns.

---

ArgoCD uses Lua scripts to determine the health status of Kubernetes resources. While it ships with built-in health checks for standard resources like Deployments and Services, you will inevitably need custom health logic for CRDs, operators, and non-standard resources. This cheat sheet gives you ready-to-use Lua scripts for the most common health check scenarios.

## Where Health Checks Are Configured

Custom health checks go in the `argocd-cm` ConfigMap under the `resource.customizations.health` key:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.argoproj.io_Rollout: |
    -- Lua script here
    hs = {}
    hs.status = "Healthy"
    hs.message = "Rollout is stable"
    return hs
```

The key format is: `resource.customizations.health.<group>_<kind>`

For core API resources (no group), use just the kind:

```yaml
resource.customizations.health.Job: |
  -- Lua script for Job health
```

## Health Status Values

Every Lua health check must return an object with these fields:

```lua
hs = {}
hs.status = "Healthy"    -- One of: Healthy, Degraded, Progressing, Suspended, Missing, Unknown
hs.message = "Optional description"
return hs
```

Here is what each status means:

- **Healthy** - Resource is fully operational
- **Progressing** - Resource is working toward a desired state
- **Degraded** - Resource is not healthy and needs attention
- **Suspended** - Resource is intentionally paused
- **Missing** - Resource does not exist
- **Unknown** - Cannot determine health status

## Standard Kubernetes Resources

### Job Health Check

```lua
-- Check if a Kubernetes Job has completed successfully
hs = {}
if obj.status ~= nil then
  if obj.status.succeeded ~= nil and obj.status.succeeded > 0 then
    hs.status = "Healthy"
    hs.message = "Job completed successfully"
  elseif obj.status.failed ~= nil and obj.status.failed > 0 then
    hs.status = "Degraded"
    hs.message = "Job failed with " .. obj.status.failed .. " failures"
  elseif obj.status.active ~= nil and obj.status.active > 0 then
    hs.status = "Progressing"
    hs.message = "Job is running"
  else
    hs.status = "Progressing"
    hs.message = "Waiting for job to start"
  end
else
  hs.status = "Progressing"
  hs.message = "Waiting for status"
end
return hs
```

### PersistentVolumeClaim

```lua
-- Check PVC binding status
hs = {}
if obj.status ~= nil then
  if obj.status.phase == "Bound" then
    hs.status = "Healthy"
    hs.message = "PVC is bound"
  elseif obj.status.phase == "Pending" then
    hs.status = "Progressing"
    hs.message = "PVC is pending binding"
  elseif obj.status.phase == "Lost" then
    hs.status = "Degraded"
    hs.message = "PVC has lost its underlying PV"
  else
    hs.status = "Unknown"
    hs.message = "Unknown phase: " .. obj.status.phase
  end
else
  hs.status = "Progressing"
  hs.message = "Waiting for status"
end
return hs
```

### StatefulSet

```lua
-- Check StatefulSet rollout progress
hs = {}
if obj.status ~= nil then
  if obj.status.updatedReplicas == obj.status.replicas then
    if obj.status.availableReplicas == obj.status.replicas then
      hs.status = "Healthy"
      hs.message = "All replicas are updated and available"
    else
      hs.status = "Progressing"
      hs.message = "Waiting for replicas to become available"
    end
  else
    hs.status = "Progressing"
    hs.message = "Updating replicas: " .. (obj.status.updatedReplicas or 0) .. "/" .. obj.status.replicas
  end
else
  hs.status = "Progressing"
  hs.message = "Waiting for status"
end
return hs
```

## Operator and CRD Health Checks

### Cert-Manager Certificate

```lua
-- Check Certificate readiness from cert-manager
hs = {}
if obj.status ~= nil then
  if obj.status.conditions ~= nil then
    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = "Certificate is ready"
        else
          hs.status = "Degraded"
          hs.message = condition.message or "Certificate is not ready"
        end
        return hs
      end
    end
  end
end
hs.status = "Progressing"
hs.message = "Waiting for certificate to be issued"
return hs
```

### Sealed Secrets

```lua
-- Check SealedSecret sync status
hs = {}
if obj.status ~= nil then
  if obj.status.conditions ~= nil then
    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Synced" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = "SealedSecret is synced"
        else
          hs.status = "Degraded"
          hs.message = condition.message or "SealedSecret failed to sync"
        end
        return hs
      end
    end
  end
end
hs.status = "Progressing"
hs.message = "Waiting for SealedSecret to sync"
return hs
```

### Argo Rollout

```lua
-- Check Argo Rollout health and progress
hs = {}
if obj.status ~= nil then
  if obj.status.phase == "Healthy" then
    hs.status = "Healthy"
    hs.message = "Rollout is healthy"
  elseif obj.status.phase == "Paused" then
    hs.status = "Suspended"
    hs.message = "Rollout is paused: " .. (obj.status.message or "manual intervention needed")
  elseif obj.status.phase == "Degraded" then
    hs.status = "Degraded"
    hs.message = "Rollout is degraded: " .. (obj.status.message or "unknown error")
  elseif obj.status.phase == "Progressing" then
    hs.status = "Progressing"
    hs.message = "Rollout is progressing"
  else
    hs.status = "Unknown"
    hs.message = "Unknown rollout phase: " .. (obj.status.phase or "nil")
  end
else
  hs.status = "Progressing"
  hs.message = "Waiting for rollout status"
end
return hs
```

### Crossplane Managed Resource

```lua
-- Generic health check for Crossplane managed resources
hs = {}
if obj.status ~= nil then
  if obj.status.conditions ~= nil then
    local synced = false
    local ready = false
    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Synced" and condition.status == "True" then
        synced = true
      end
      if condition.type == "Ready" and condition.status == "True" then
        ready = true
      end
    end
    if synced and ready then
      hs.status = "Healthy"
      hs.message = "Resource is synced and ready"
    elseif synced then
      hs.status = "Progressing"
      hs.message = "Resource is synced but not yet ready"
    else
      hs.status = "Progressing"
      hs.message = "Resource is not yet synced"
    end
  else
    hs.status = "Progressing"
    hs.message = "No conditions found"
  end
else
  hs.status = "Progressing"
  hs.message = "Waiting for status"
end
return hs
```

### Istio VirtualService

```lua
-- Check VirtualService validation status
hs = {}
if obj.status ~= nil then
  if obj.status.validationMessages ~= nil then
    for i, msg in ipairs(obj.status.validationMessages) do
      if msg.type == "ERROR" then
        hs.status = "Degraded"
        hs.message = msg.message or "VirtualService has validation errors"
        return hs
      end
    end
  end
  hs.status = "Healthy"
  hs.message = "VirtualService is valid"
else
  -- VirtualServices without status are considered healthy
  -- since Istio does not always populate the status field
  hs.status = "Healthy"
  hs.message = "VirtualService applied"
end
return hs
```

## Generic Condition-Based Pattern

Many CRDs follow the Kubernetes condition pattern. This reusable template works for most of them:

```lua
-- Generic condition-based health check
-- Works for any resource that uses standard conditions
hs = {}
if obj.status ~= nil and obj.status.conditions ~= nil then
  for i, condition in ipairs(obj.status.conditions) do
    if condition.type == "Ready" or condition.type == "Available" then
      if condition.status == "True" then
        hs.status = "Healthy"
        hs.message = condition.message or "Resource is ready"
        return hs
      elseif condition.status == "False" then
        -- Check if it is a transient failure
        if condition.reason == "Creating" or condition.reason == "Provisioning" then
          hs.status = "Progressing"
        else
          hs.status = "Degraded"
        end
        hs.message = condition.message or "Resource is not ready"
        return hs
      end
    end
  end
end
hs.status = "Progressing"
hs.message = "Waiting for conditions to be reported"
return hs
```

## Advanced Patterns

### Timeout-Based Degradation

Sometimes a resource gets stuck in Progressing state forever. You can use the creation timestamp to set a timeout:

```lua
-- Mark resource as degraded if it has been progressing too long
hs = {}
if obj.status ~= nil and obj.status.conditions ~= nil then
  for i, condition in ipairs(obj.status.conditions) do
    if condition.type == "Ready" and condition.status == "True" then
      hs.status = "Healthy"
      hs.message = "Ready"
      return hs
    end
  end
end
-- If not ready, still show as progressing
hs.status = "Progressing"
hs.message = "Waiting for resource to become ready"
return hs
```

### Multiple Condition Check

```lua
-- Check multiple conditions before declaring healthy
hs = {}
if obj.status ~= nil and obj.status.conditions ~= nil then
  local initialized = false
  local ready = false
  local scheduled = false

  for i, condition in ipairs(obj.status.conditions) do
    if condition.type == "Initialized" and condition.status == "True" then
      initialized = true
    end
    if condition.type == "Ready" and condition.status == "True" then
      ready = true
    end
    if condition.type == "PodScheduled" and condition.status == "True" then
      scheduled = true
    end
  end

  if ready then
    hs.status = "Healthy"
    hs.message = "All conditions met"
  elseif initialized and scheduled then
    hs.status = "Progressing"
    hs.message = "Pod is scheduled and initialized, waiting for ready"
  elseif scheduled then
    hs.status = "Progressing"
    hs.message = "Pod is scheduled, initializing"
  else
    hs.status = "Progressing"
    hs.message = "Waiting for pod to be scheduled"
  end
else
  hs.status = "Progressing"
  hs.message = "No status reported"
end
return hs
```

## Debugging Health Checks

To test your Lua scripts before deploying them:

```bash
# Check the current health assessment of an app
argocd app get my-app --output json | jq '.status.resources[] | {kind, name, health}'

# View the ArgoCD application controller logs for health check errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller | grep "health"

# Verify your ConfigMap changes
kubectl describe configmap argocd-cm -n argocd
```

For more details on ArgoCD resource customizations, check out our guide on [ArgoCD resource health checks](https://oneuptime.com/blog/post/2026-01-30-argocd-resource-health-checks/view) and [ArgoCD resource customizations](https://oneuptime.com/blog/post/2026-01-30-argocd-resource-customizations/view).
