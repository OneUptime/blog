# How to Create Scale Actions for Deployments in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Scaling

Description: Learn how to create custom scale up and scale down resource actions in ArgoCD for Deployments, StatefulSets, and ReplicaSets to manage replica counts directly from the ArgoCD dashboard.

---

Scaling a Deployment up or down is something you do constantly in operations. Maybe traffic spikes require more replicas, or you need to scale down during off-hours to save resources. With ArgoCD, you can add scale actions directly to the dashboard so anyone on the team can adjust replica counts without running kubectl or modifying Git manifests.

This guide covers building scale actions for Deployments, StatefulSets, and ReplicaSets, including smart actions that understand your scaling constraints.

## Basic Scale Up and Scale Down Actions

The simplest scale actions increment or decrement the replica count by one:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.actions.apps_Deployment: |
    discovery.lua: |
      actions = {}
      -- Always allow scale up
      actions["scale-up"] = {
        ["disabled"] = false
      }
      -- Only allow scale down if replicas > 1
      if obj.spec.replicas ~= nil and obj.spec.replicas > 1 then
        actions["scale-down"] = {
          ["disabled"] = false
        }
      else
        actions["scale-down"] = {
          ["disabled"] = true
        }
      end
      return actions
    definitions:
      - name: scale-up
        action.lua: |
          local current = obj.spec.replicas or 1
          obj.spec.replicas = current + 1
          return obj
      - name: scale-down
        action.lua: |
          local current = obj.spec.replicas or 1
          if current > 1 then
            obj.spec.replicas = current - 1
          end
          return obj
```

This gives you two buttons in the ArgoCD UI: "scale-up" which is always available, and "scale-down" which is grayed out when there is only one replica.

## Scale Actions with Preset Values

Sometimes you want to scale to specific values rather than incrementing one at a time. Here is a version with preset scale targets:

```yaml
  resource.customizations.actions.apps_Deployment: |
    discovery.lua: |
      actions = {}
      local current = obj.spec.replicas or 1

      -- Scale to minimum (1 replica)
      if current > 1 then
        actions["scale-to-1"] = {["disabled"] = false}
      end

      -- Scale to common values
      if current ~= 3 then
        actions["scale-to-3"] = {["disabled"] = false}
      end
      if current ~= 5 then
        actions["scale-to-5"] = {["disabled"] = false}
      end
      if current ~= 10 then
        actions["scale-to-10"] = {["disabled"] = false}
      end

      -- Increment/decrement
      actions["scale-up"] = {["disabled"] = false}
      if current > 1 then
        actions["scale-down"] = {["disabled"] = false}
      end

      -- Scale to zero for non-production
      actions["scale-to-zero"] = {["disabled"] = false}

      return actions
    definitions:
      - name: scale-to-1
        action.lua: |
          obj.spec.replicas = 1
          return obj
      - name: scale-to-3
        action.lua: |
          obj.spec.replicas = 3
          return obj
      - name: scale-to-5
        action.lua: |
          obj.spec.replicas = 5
          return obj
      - name: scale-to-10
        action.lua: |
          obj.spec.replicas = 10
          return obj
      - name: scale-up
        action.lua: |
          local current = obj.spec.replicas or 1
          obj.spec.replicas = current + 1
          return obj
      - name: scale-down
        action.lua: |
          local current = obj.spec.replicas or 1
          if current > 1 then
            obj.spec.replicas = current - 1
          end
          return obj
      - name: scale-to-zero
        action.lua: |
          obj.spec.replicas = 0
          return obj
```

## Scale Actions with Safety Limits

In production, you probably do not want someone accidentally scaling to zero or scaling to 100 replicas. Add safety limits:

```yaml
  resource.customizations.actions.apps_Deployment: |
    discovery.lua: |
      actions = {}
      local current = obj.spec.replicas or 1
      local minReplicas = 2
      local maxReplicas = 20

      -- Scale up only if under maximum
      if current < maxReplicas then
        actions["scale-up"] = {["disabled"] = false}
      else
        actions["scale-up"] = {["disabled"] = true}
      end

      -- Scale down only if above minimum
      if current > minReplicas then
        actions["scale-down"] = {["disabled"] = false}
      else
        actions["scale-down"] = {["disabled"] = true}
      end

      -- Double (for traffic spikes)
      local doubled = current * 2
      if doubled <= maxReplicas then
        actions["double-replicas"] = {["disabled"] = false}
      else
        actions["double-replicas"] = {["disabled"] = true}
      end

      -- Halve (for scaling back)
      local halved = math.floor(current / 2)
      if halved >= minReplicas then
        actions["halve-replicas"] = {["disabled"] = false}
      else
        actions["halve-replicas"] = {["disabled"] = true}
      end

      return actions
    definitions:
      - name: scale-up
        action.lua: |
          local current = obj.spec.replicas or 1
          local maxReplicas = 20
          if current < maxReplicas then
            obj.spec.replicas = current + 1
          end
          return obj
      - name: scale-down
        action.lua: |
          local current = obj.spec.replicas or 1
          local minReplicas = 2
          if current > minReplicas then
            obj.spec.replicas = current - 1
          end
          return obj
      - name: double-replicas
        action.lua: |
          local current = obj.spec.replicas or 1
          local maxReplicas = 20
          local target = current * 2
          if target > maxReplicas then
            target = maxReplicas
          end
          obj.spec.replicas = target
          return obj
      - name: halve-replicas
        action.lua: |
          local current = obj.spec.replicas or 1
          local minReplicas = 2
          local target = math.floor(current / 2)
          if target < minReplicas then
            target = minReplicas
          end
          obj.spec.replicas = target
          return obj
```

## Scale Actions for StatefulSets

StatefulSets scale differently from Deployments. Pods are created and destroyed in order, and each pod has a stable identity. The scale action is similar but you should be more conservative:

```yaml
  resource.customizations.actions.apps_StatefulSet: |
    discovery.lua: |
      actions = {}
      local current = obj.spec.replicas or 1

      if current < 10 then
        actions["scale-up"] = {["disabled"] = false}
      end
      if current > 1 then
        actions["scale-down"] = {["disabled"] = false}
      end

      return actions
    definitions:
      - name: scale-up
        action.lua: |
          local current = obj.spec.replicas or 1
          obj.spec.replicas = current + 1
          return obj
      - name: scale-down
        action.lua: |
          local current = obj.spec.replicas or 1
          if current > 1 then
            obj.spec.replicas = current - 1
          end
          return obj
```

## Scale Actions for ReplicaSets

Though you rarely interact with ReplicaSets directly (Deployments manage them), you might need to scale standalone ReplicaSets:

```yaml
  resource.customizations.actions.apps_ReplicaSet: |
    discovery.lua: |
      actions = {}
      local current = obj.spec.replicas or 1
      actions["scale-up"] = {["disabled"] = false}
      if current > 0 then
        actions["scale-down"] = {["disabled"] = false}
      end
      return actions
    definitions:
      - name: scale-up
        action.lua: |
          local current = obj.spec.replicas or 0
          obj.spec.replicas = current + 1
          return obj
      - name: scale-down
        action.lua: |
          local current = obj.spec.replicas or 0
          if current > 0 then
            obj.spec.replicas = current - 1
          end
          return obj
```

## Using Scale Actions

### From the ArgoCD UI

1. Open your application
2. Click on the Deployment in the resource tree
3. Look for the "Actions" dropdown in the resource detail panel
4. Select "scale-up", "scale-down", "double-replicas", etc.
5. Confirm the action

The replica count will change and you will see new pods being created or old ones being terminated in the resource tree.

### From the CLI

```bash
# Scale up
argocd app actions run my-app scale-up --kind Deployment --resource-name my-deployment

# Scale down
argocd app actions run my-app scale-down --kind Deployment --resource-name my-deployment

# Double replicas for a traffic spike
argocd app actions run my-app double-replicas --kind Deployment --resource-name my-deployment
```

## Handling OutOfSync After Scaling

Scaling changes the live state but not Git, so the application will show as OutOfSync. You have several options:

**Option 1: Ignore replica count differences**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

This is common when using HPA (Horizontal Pod Autoscaler), which also modifies replica counts.

**Option 2: Update Git after scaling**

After confirming the new scale is right, update your Git manifests to match and sync.

**Option 3: Let auto-sync revert**

If auto-sync is enabled and you do not ignore the replica difference, ArgoCD will revert the scale change on the next sync. Disable auto-sync temporarily if you need the scale change to persist.

## Combining with HPA Awareness

If you use HPA, the scale actions should respect HPA limits. You can check for HPA annotations in the discovery script, though this requires additional setup since the Lua script only has access to the Deployment object, not the HPA.

A practical approach is to document the scaling limits in Deployment annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    scaling.example.com/min-replicas: "2"
    scaling.example.com/max-replicas: "20"
```

Then read those annotations in the Lua script to enforce limits dynamically.

For the restart action companion, see [how to create a restart deployment action in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-restart-deployment-action/view). For writing Lua scripts, check out [how to write Lua scripts for custom resource actions](https://oneuptime.com/blog/post/2026-02-26-argocd-lua-scripts-resource-actions/view).
