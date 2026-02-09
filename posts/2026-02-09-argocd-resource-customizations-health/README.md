# How to Configure ArgoCD Resource Customizations for Custom Health Check Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, Health Checks, Custom Resources, CRD

Description: Learn how to configure ArgoCD resource customizations to define custom health assessment logic for CRDs and resources with non-standard health indicators.

---

ArgoCD knows how to assess the health of standard Kubernetes resources like Deployments and StatefulSets. But what about custom resources from operators, third-party CRDs, or resources with complex readiness logic? Resource customizations let you teach ArgoCD how to determine if your custom resources are healthy, progressing, or degraded.

This guide shows you how to implement custom health checks for any Kubernetes resource.

## Understanding ArgoCD Health Assessment

ArgoCD uses health assessment to determine Application sync status. For standard resources:

- Deployment: Healthy when desired replicas match ready replicas
- Service: Always healthy if it exists
- Job: Healthy when completed successfully

Custom resources need explicit health assessment logic.

## Basic Resource Customization

Resource customizations are configured in the argocd-cm ConfigMap. Here's a simple example for a CRD:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations: |
    example.com/MyResource:
      health.lua: |
        hs = {}
        if obj.status ~= nil then
          if obj.status.conditions ~= nil then
            for i, condition in ipairs(obj.status.conditions) do
              if condition.type == "Ready" and condition.status == "False" then
                hs.status = "Degraded"
                hs.message = condition.message
                return hs
              end
              if condition.type == "Ready" and condition.status == "True" then
                hs.status = "Healthy"
                return hs
              end
            end
          end
        end
        hs.status = "Progressing"
        hs.message = "Waiting for resource to be ready"
        return hs
```

The Lua script examines the resource's status and returns:
- `hs.status`: "Healthy", "Progressing", "Degraded", "Suspended", or "Missing"
- `hs.message`: Human-readable explanation

## Real Example: Crossplane Managed Resources

Crossplane creates cloud resources as Kubernetes objects. Define health checks:

```yaml
data:
  resource.customizations: |
    rds.aws.upbound.io/Instance:
      health.lua: |
        hs = {}
        if obj.status ~= nil and obj.status.conditions ~= nil then
          for i, condition in ipairs(obj.status.conditions) do
            if condition.type == "Ready" then
              if condition.status == "True" then
                hs.status = "Healthy"
                hs.message = "RDS instance is available"
                return hs
              elseif condition.reason == "Creating" then
                hs.status = "Progressing"
                hs.message = "RDS instance is being created"
                return hs
              else
                hs.status = "Degraded"
                hs.message = condition.message
                return hs
              end
            end
          end
        end
        hs.status = "Progressing"
        hs.message = "Waiting for RDS instance status"
        return hs
```

This examines Crossplane's Ready condition and maps states to ArgoCD health statuses.

## Complex Health Logic: Cert-Manager Certificate

Certificates have multiple conditions. Check them all:

```yaml
data:
  resource.customizations: |
    cert-manager.io/Certificate:
      health.lua: |
        hs = {}
        if obj.status ~= nil then
          if obj.status.conditions ~= nil then
            local ready = false
            local issuing = false

            for i, condition in ipairs(obj.status.conditions) do
              if condition.type == "Ready" then
                if condition.status == "True" then
                  ready = true
                elseif condition.reason == "DoesNotExist" or condition.reason == "MissingData" then
                  hs.status = "Missing"
                  hs.message = condition.message
                  return hs
                end
              end
              if condition.type == "Issuing" and condition.status == "True" then
                issuing = true
              end
            end

            if ready then
              hs.status = "Healthy"
              hs.message = "Certificate is ready and up to date"
              return hs
            elseif issuing then
              hs.status = "Progressing"
              hs.message = "Certificate is being issued"
              return hs
            end
          end
        end

        hs.status = "Progressing"
        hs.message = "Waiting for certificate"
        return hs
```

## Using Status Fields

Many CRDs use status fields beyond conditions:

```yaml
data:
  resource.customizations: |
    postgresql.cnpg.io/Cluster:
      health.lua: |
        hs = {}
        if obj.status ~= nil then
          -- Check phase
          if obj.status.phase == "Cluster in healthy state" then
            hs.status = "Healthy"
            hs.message = "PostgreSQL cluster is healthy"
            return hs
          end

          -- Check instances
          local ready = obj.status.readyInstances or 0
          local desired = obj.spec.instances or 1

          if ready < desired then
            hs.status = "Progressing"
            hs.message = string.format("%d/%d instances ready", ready, desired)
            return hs
          elseif ready == desired then
            hs.status = "Healthy"
            return hs
          end
        end

        hs.status = "Progressing"
        hs.message = "Waiting for cluster status"
        return hs
```

## Handling Multiple Resource Versions

Support different API versions:

```yaml
data:
  resource.customizations: |
    argoproj.io/Application:
      health.lua: |
        hs = {}

        -- Helper function to check sync status
        local function isSynced()
          return obj.status.sync.status == "Synced"
        end

        -- Helper function to check health
        local function isHealthy()
          return obj.status.health ~= nil and obj.status.health.status == "Healthy"
        end

        if obj.status == nil then
          hs.status = "Progressing"
          hs.message = "Waiting for application status"
          return hs
        end

        if obj.status.operationState ~= nil then
          local state = obj.status.operationState
          if state.phase == "Running" then
            hs.status = "Progressing"
            hs.message = "Sync operation in progress"
            return hs
          elseif state.phase == "Failed" then
            hs.status = "Degraded"
            hs.message = state.message
            return hs
          end
        end

        if isSynced() and isHealthy() then
          hs.status = "Healthy"
          return hs
        elseif not isSynced() then
          hs.status = "Progressing"
          hs.message = "Application is out of sync"
          return hs
        else
          hs.status = obj.status.health.status
          hs.message = obj.status.health.message
          return hs
        end
```

## Custom Actions

Beyond health checks, define custom actions:

```yaml
data:
  resource.customizations: |
    argoproj.io/Workflow:
      actions: |
        discovery.lua: |
          actions = {}
          if obj.status ~= nil and obj.status.phase == "Running" then
            actions["terminate"] = {["disabled"] = false}
          else
            actions["terminate"] = {["disabled"] = true}
          end
          return actions
        definitions:
          - name: terminate
            action.lua: |
              obj.spec.shutdown = "Terminate"
              return obj
```

This adds a "terminate" button in ArgoCD UI for running workflows.

## Ignoring Differences

Some fields change frequently and shouldn't trigger sync:

```yaml
data:
  resource.customizations.ignoreDifferences.all: |
    jsonPointers:
      - /status

  resource.customizations.ignoreDifferences.apps_Deployment: |
    jsonPointers:
      - /spec/replicas
    jqPathExpressions:
      - .spec.template.spec.containers[].image
```

## Testing Health Scripts Locally

Test Lua scripts before deploying:

```lua
-- test-health.lua
local obj = {
  status = {
    conditions = {
      {type = "Ready", status = "True"}
    }
  }
}

-- Your health check function
hs = {}
if obj.status ~= nil and obj.status.conditions ~= nil then
  for i, condition in ipairs(obj.status.conditions) do
    if condition.type == "Ready" and condition.status == "True" then
      hs.status = "Healthy"
      return hs
    end
  end
end

print(hs.status)
```

Run with Lua:

```bash
lua test-health.lua
```

## Applying Customizations

Update the ConfigMap:

```bash
kubectl edit configmap argocd-cm -n argocd
```

Or use Kustomize to manage it declaratively:

```yaml
# argocd-cm-patch.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations: |
    example.com/MyResource:
      health.lua: |
        # Your health check logic
```

Apply the patch:

```bash
kubectl apply -f argocd-cm-patch.yaml
```

Restart ArgoCD to pick up changes:

```bash
kubectl rollout restart deployment argocd-server -n argocd
kubectl rollout restart deployment argocd-application-controller -n argocd
```

## Debugging Health Checks

Enable detailed logging:

```bash
kubectl logs -n argocd deployment/argocd-application-controller -f
```

Look for health assessment logs showing which resources passed or failed health checks.

Check Application resource events:

```bash
kubectl describe application myapp -n argocd
```

## Common Patterns

**Check for Ready condition:**

```lua
for i, condition in ipairs(obj.status.conditions) do
  if condition.type == "Ready" and condition.status == "True" then
    hs.status = "Healthy"
    return hs
  end
end
```

**Count ready replicas:**

```lua
local ready = obj.status.readyReplicas or 0
local desired = obj.spec.replicas or 1
if ready >= desired then
  hs.status = "Healthy"
else
  hs.status = "Progressing"
end
```

**Check phase field:**

```lua
if obj.status.phase == "Running" then
  hs.status = "Healthy"
elseif obj.status.phase == "Pending" then
  hs.status = "Progressing"
else
  hs.status = "Degraded"
end
```

## Example: Argo Rollout

Complete example for Argo Rollouts:

```yaml
data:
  resource.customizations: |
    argoproj.io/Rollout:
      health.lua: |
        hs = {}
        if obj.status ~= nil then
          if obj.status.phase == "Healthy" then
            hs.status = "Healthy"
            hs.message = obj.status.message
            return hs
          end
          if obj.status.phase == "Progressing" then
            hs.status = "Progressing"
            hs.message = obj.status.message
            return hs
          end
          if obj.status.phase == "Degraded" then
            hs.status = "Degraded"
            hs.message = obj.status.message
            return hs
          end
          if obj.status.phase == "Paused" then
            hs.status = "Suspended"
            hs.message = obj.status.message
            return hs
          end
        end
        hs.status = "Progressing"
        hs.message = "Waiting for rollout to start"
        return hs
      actions: |
        discovery.lua: |
          actions = {}
          if obj.status ~= nil and obj.status.phase == "Paused" then
            actions["promote-full"] = {["disabled"] = false}
          else
            actions["promote-full"] = {["disabled"] = true}
          end
          return actions
        definitions:
          - name: promote-full
            action.lua: |
              if obj.status.currentPodHash == obj.status.stableRS then
                return obj
              end
              terminationGracePeriodSeconds = 30
              obj.spec.restartAt = os.date("!%Y-%m-%dT%TZ")
              return obj
```

## Best Practices

1. **Return early**: Once status is determined, return immediately
2. **Provide clear messages**: Help users understand resource state
3. **Handle nil values**: Resources may not have status initially
4. **Test thoroughly**: Verify all possible resource states
5. **Use helper functions**: Extract common logic for reusability
6. **Document your logic**: Add comments explaining complex checks
7. **Version control**: Manage ConfigMap in Git like other resources

## Conclusion

Resource customizations extend ArgoCD's health assessment to any Kubernetes resource. Write Lua scripts that examine custom resource status fields and map them to ArgoCD health states. This gives you accurate Application health for CRDs, operators, and resources with complex lifecycle semantics. Combined with custom actions, you can build fully integrated GitOps workflows for any Kubernetes ecosystem component.
