# How to Use argocd app actions to Execute Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Resource Actions

Description: Learn how to use argocd app actions to execute resource-level actions like restart deployments, resume rollouts, and run custom Lua-based actions from the CLI.

---

ArgoCD resource actions let you perform operational tasks on managed resources directly through the ArgoCD interface - no kubectl required. The `argocd app actions` command brings this capability to the CLI, letting you restart deployments, scale resources, resume paused rollouts, and execute custom actions defined in Lua scripts.

## Understanding Resource Actions

Resource actions are operations you can perform on specific Kubernetes resources managed by an ArgoCD application. ArgoCD comes with built-in actions for common resource types and supports custom Lua-based actions for any resource kind.

Built-in actions include:
- **Restart** for Deployments, StatefulSets, DaemonSets
- **Resume/Pause/Abort** for Argo Rollouts
- **Retry** for Jobs

## Listing Available Actions

Before running an action, check what actions are available for a resource:

```bash
# List available actions for a Deployment
argocd app actions list my-app --kind Deployment --resource-name my-app

# List available actions for a StatefulSet
argocd app actions list my-app --kind StatefulSet --resource-name my-database

# List available actions for an Argo Rollout
argocd app actions list my-app --kind Rollout --group argoproj.io --resource-name my-rollout
```

The output shows available actions:

```
ACTION    DISABLED
restart   false
```

## Running Actions

### Restart a Deployment

The most common action - restart all pods in a Deployment by updating the pod template annotation:

```bash
argocd app actions run my-app \
  --kind Deployment \
  --resource-name my-app \
  --action restart
```

This is equivalent to `kubectl rollout restart deployment/my-app` but works through ArgoCD, respecting RBAC policies and providing audit logging.

### Restart a StatefulSet

```bash
argocd app actions run my-app \
  --kind StatefulSet \
  --resource-name my-database \
  --action restart
```

### Restart a DaemonSet

```bash
argocd app actions run my-app \
  --kind DaemonSet \
  --resource-name my-agent \
  --action restart
```

### Resume an Argo Rollout

```bash
argocd app actions run my-app \
  --kind Rollout \
  --group argoproj.io \
  --resource-name my-rollout \
  --action resume
```

### Abort an Argo Rollout

```bash
argocd app actions run my-app \
  --kind Rollout \
  --group argoproj.io \
  --resource-name my-rollout \
  --action abort
```

### Retry a Failed Job

```bash
argocd app actions run my-app \
  --kind Job \
  --resource-name migration-job \
  --action retry
```

## Specifying the Resource Namespace

When the resource is in a specific namespace:

```bash
argocd app actions run my-app \
  --kind Deployment \
  --resource-name my-app \
  --namespace production \
  --action restart
```

## Custom Resource Actions

ArgoCD lets you define custom actions using Lua scripts. These are configured in the `argocd-cm` ConfigMap.

### Example: Scale Deployment to Zero

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.actions.apps_Deployment: |
    discovery.lua: |
      actions = {}
      actions["scale-to-zero"] = {["disabled"] = false}
      actions["scale-to-three"] = {["disabled"] = false}
      return actions
    definitions:
      - name: scale-to-zero
        action.lua: |
          obj.spec.replicas = 0
          return obj
      - name: scale-to-three
        action.lua: |
          obj.spec.replicas = 3
          return obj
```

After adding this configuration, you can run:

```bash
argocd app actions run my-app \
  --kind Deployment \
  --resource-name my-app \
  --action scale-to-zero
```

### Example: Toggle Maintenance Mode

```yaml
data:
  resource.customizations.actions.apps_Deployment: |
    discovery.lua: |
      actions = {}
      actions["enable-maintenance"] = {["disabled"] = false}
      actions["disable-maintenance"] = {["disabled"] = false}
      return actions
    definitions:
      - name: enable-maintenance
        action.lua: |
          -- Set an environment variable to enable maintenance mode
          local containers = obj.spec.template.spec.containers
          for i, container in ipairs(containers) do
            if container.name == "app" then
              if container.env == nil then
                container.env = {}
              end
              local found = false
              for j, env in ipairs(container.env) do
                if env.name == "MAINTENANCE_MODE" then
                  env.value = "true"
                  found = true
                end
              end
              if not found then
                table.insert(container.env, {name = "MAINTENANCE_MODE", value = "true"})
              end
            end
          end
          return obj
      - name: disable-maintenance
        action.lua: |
          local containers = obj.spec.template.spec.containers
          for i, container in ipairs(containers) do
            if container.name == "app" then
              if container.env ~= nil then
                for j, env in ipairs(container.env) do
                  if env.name == "MAINTENANCE_MODE" then
                    env.value = "false"
                  end
                end
              end
            end
          end
          return obj
```

### Example: Add/Remove Debug Annotation

```yaml
data:
  resource.customizations.actions._Pod: |
    discovery.lua: |
      actions = {}
      actions["enable-debug"] = {["disabled"] = false}
      actions["disable-debug"] = {["disabled"] = false}
      return actions
    definitions:
      - name: enable-debug
        action.lua: |
          if obj.metadata.annotations == nil then
            obj.metadata.annotations = {}
          end
          obj.metadata.annotations["debug.mycompany.com/enabled"] = "true"
          return obj
      - name: disable-debug
        action.lua: |
          if obj.metadata.annotations ~= nil then
            obj.metadata.annotations["debug.mycompany.com/enabled"] = nil
          end
          return obj
```

## Conditional Action Availability

You can make actions available only when certain conditions are met:

```yaml
data:
  resource.customizations.actions.apps_Deployment: |
    discovery.lua: |
      actions = {}
      -- Only allow scale-down if current replicas > 1
      local dominated = obj.spec.replicas ~= nil and obj.spec.replicas > 1
      actions["scale-down"] = {["disabled"] = not dominated}
      -- Only allow scale-up if current replicas < 10
      local canScaleUp = obj.spec.replicas ~= nil and obj.spec.replicas < 10
      actions["scale-up"] = {["disabled"] = not canScaleUp}
      return actions
    definitions:
      - name: scale-down
        action.lua: |
          if obj.spec.replicas > 1 then
            obj.spec.replicas = obj.spec.replicas - 1
          end
          return obj
      - name: scale-up
        action.lua: |
          if obj.spec.replicas < 10 then
            obj.spec.replicas = obj.spec.replicas + 1
          end
          return obj
```

## Actions in Automation Scripts

Combine actions with other CLI commands for operational scripts:

```bash
#!/bin/bash
# rolling-restart.sh - Rolling restart of all deployments in an application

APP_NAME="${1:?Usage: rolling-restart.sh <app-name>}"

echo "=== Rolling Restart: $APP_NAME ==="

# Get all Deployments managed by this application
DEPLOYMENTS=$(argocd app resources "$APP_NAME" --kind Deployment -o json | jq -r '.[].name')

for deploy in $DEPLOYMENTS; do
  echo "Restarting Deployment: $deploy"
  argocd app actions run "$APP_NAME" \
    --kind Deployment \
    --resource-name "$deploy" \
    --action restart
  echo "  Done."
done

echo ""
echo "All deployments restarted. Waiting for healthy state..."
argocd app wait "$APP_NAME" --health --timeout 300
echo "Application is healthy."
```

### Rollout Management Script

```bash
#!/bin/bash
# manage-rollout.sh - Manage Argo Rollout actions

APP_NAME="${1:?Usage: manage-rollout.sh <app> <rollout-name> <action>}"
ROLLOUT_NAME="${2:?Provide rollout name}"
ACTION="${3:?Provide action: resume, abort, retry}"

echo "Running $ACTION on Rollout $ROLLOUT_NAME in $APP_NAME"

# List available actions first
echo "Available actions:"
argocd app actions list "$APP_NAME" \
  --kind Rollout \
  --group argoproj.io \
  --resource-name "$ROLLOUT_NAME"

# Run the action
argocd app actions run "$APP_NAME" \
  --kind Rollout \
  --group argoproj.io \
  --resource-name "$ROLLOUT_NAME" \
  --action "$ACTION"

echo "Action $ACTION executed successfully."
```

## RBAC for Actions

Control who can execute actions via ArgoCD RBAC:

```csv
# argocd-rbac-cm
# Allow developers to restart deployments but not scale
p, role:developer, applications, action/apps/Deployment/restart, default/*, allow

# Allow SREs to execute all actions
p, role:sre, applications, action/*, default/*, allow

# Deny specific actions
p, role:developer, applications, action/apps/Deployment/scale-to-zero, production/*, deny
```

## Troubleshooting Actions

### Action Not Found

```bash
# Verify the resource exists in the application
argocd app resources my-app --kind Deployment --resource-name my-app

# List available actions for the resource
argocd app actions list my-app --kind Deployment --resource-name my-app
```

### Action Disabled

If an action shows as disabled, the Lua discovery script determined it should not be available in the current state. Check the discovery script logic.

### Custom Action Not Working

```bash
# Check the argocd-cm ConfigMap for syntax errors
kubectl get configmap argocd-cm -n argocd -o yaml | grep -A 50 "resource.customizations.actions"

# Check ArgoCD server logs for Lua errors
kubectl logs deployment/argocd-server -n argocd | grep "action" | tail -20
```

## Summary

The `argocd app actions` command gives you operational control over managed resources through ArgoCD. Built-in actions cover the most common needs (restart, resume, abort), while custom Lua actions extend the system to support any operation you need. Actions respect ArgoCD RBAC, provide audit logging, and work without direct cluster access, making them ideal for teams that want to empower developers while maintaining security guardrails.
