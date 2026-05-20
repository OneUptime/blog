# How to Create a Restart Deployment Action in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Deployment

Description: Learn how to create a custom restart deployment action in ArgoCD that lets you perform rolling restarts directly from the ArgoCD UI or CLI without modifying Git or using kubectl.

---

Restarting a Kubernetes Deployment is one of the most common operational tasks. Maybe you need to pick up a new ConfigMap, clear an in-memory cache, or recover from a transient error. With kubectl, you run `kubectl rollout restart deployment/my-app`. But if you are working in ArgoCD, switching to kubectl breaks your workflow. Worse, other team members who only have ArgoCD access cannot restart deployments at all.

ArgoCD's resource actions feature lets you run a "Restart" action directly from the ArgoCD UI for any Deployment. Current ArgoCD versions include built-in restart actions for Deployments, StatefulSets, and DaemonSets, but this guide shows you how to customize the action when you want to control its behavior.

## How Deployment Restarts Work in Kubernetes

Before building the action, it helps to understand what `kubectl rollout restart` actually does. It does not delete pods or modify the container spec. Instead, it adds or updates an annotation on the pod template:

```yaml
spec:
  template:
    metadata:
      annotations:
        kubectl.kubernetes.io/restartedAt: "2026-02-26T10:30:00Z"
```

This annotation change triggers a rolling update because the pod template hash changes. Kubernetes creates new pods with the updated template and gracefully terminates the old ones, respecting your `maxSurge` and `maxUnavailable` settings.

Our ArgoCD action will do exactly the same thing.

## Creating the Restart Action for Deployments

Add this configuration to the `argocd-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.actions.apps_Deployment: |
    mergeBuiltinActions: true
    discovery.lua: |
      actions = {}
      actions["restart"] = {
        ["disabled"] = false
      }
      return actions
    definitions:
      - name: restart
        action.lua: |
          local os = require("os")
          -- Ensure the template metadata and annotations exist
          if obj.spec.template.metadata == nil then
            obj.spec.template.metadata = {}
          end
          if obj.spec.template.metadata.annotations == nil then
            obj.spec.template.metadata.annotations = {}
          end
          -- Set the restart annotation with current timestamp
          obj.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"] = os.date("!%Y-%m-%dT%XZ")
          return obj
```

### How the Lua Script Works

Let me break down what each part does:

1. `local os = require("os")` - Imports the OS library to get the current timestamp
2. The nil checks ensure we do not get a Lua error if the metadata or annotations sections do not exist yet
3. `os.date("!%Y-%m-%dT%XZ")` returns the current UTC time in the same timestamp format used by kubectl
4. ArgoCD stores that timestamp as the annotation value
5. Returning the modified `obj` tells ArgoCD to patch the Deployment with this change

The annotation key `kubectl.kubernetes.io/restartedAt` is the same one kubectl uses, so the behavior is identical.

## Restart Action for StatefulSets

StatefulSets work the same way, but with different rollout behavior (pods restart in order):

```yaml
  resource.customizations.actions.apps_StatefulSet: |
    mergeBuiltinActions: true
    discovery.lua: |
      actions = {}
      actions["restart"] = {
        ["disabled"] = false
      }
      return actions
    definitions:
      - name: restart
        action.lua: |
          local os = require("os")
          if obj.spec.template.metadata == nil then
            obj.spec.template.metadata = {}
          end
          if obj.spec.template.metadata.annotations == nil then
            obj.spec.template.metadata.annotations = {}
          end
          obj.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"] = os.date("!%Y-%m-%dT%XZ")
          return obj
```

## Restart Action for DaemonSets

DaemonSets also support the same restart mechanism:

```yaml
  resource.customizations.actions.apps_DaemonSet: |
    mergeBuiltinActions: true
    discovery.lua: |
      actions = {}
      actions["restart"] = {
        ["disabled"] = false
      }
      return actions
    definitions:
      - name: restart
        action.lua: |
          local os = require("os")
          if obj.spec.template.metadata == nil then
            obj.spec.template.metadata = {}
          end
          if obj.spec.template.metadata.annotations == nil then
            obj.spec.template.metadata.annotations = {}
          end
          obj.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"] = os.date("!%Y-%m-%dT%XZ")
          return obj
```

## Conditional Restart Based on Deployment State

You might not want to allow restarts on Deployments that are already in the middle of a rollout. Here is an enhanced version that disables the restart action during active rollouts:

```yaml
  resource.customizations.actions.apps_Deployment: |
    mergeBuiltinActions: true
    discovery.lua: |
      actions = {}
      -- Disable restart if the deployment is currently updating
      isUpdating = false
      if obj.status ~= nil and obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Progressing" and condition.reason == "ReplicaSetUpdated" then
            isUpdating = true
          end
        end
      end
      -- Also check if replicas are mismatched (rollout in progress)
      if obj.status ~= nil then
        desired = obj.spec.replicas or 1
        updated = obj.status.updatedReplicas or 0
        available = obj.status.availableReplicas or 0
        if updated < desired or available < desired then
          isUpdating = true
        end
      end
      actions["restart"] = {
        ["disabled"] = isUpdating
      }
      return actions
    definitions:
      - name: restart
        action.lua: |
          local os = require("os")
          if obj.spec.template.metadata == nil then
            obj.spec.template.metadata = {}
          end
          if obj.spec.template.metadata.annotations == nil then
            obj.spec.template.metadata.annotations = {}
          end
          obj.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"] = os.date("!%Y-%m-%dT%XZ")
          return obj
```

When the deployment is updating, the "restart" action will appear grayed out in the UI.

## Using the Restart Action

### From the ArgoCD UI

1. Open your application in ArgoCD
2. Click on the Deployment resource in the resource tree
3. In the top bar, click the "Actions" dropdown
4. Select "restart"
5. Confirm the action

### From the ArgoCD CLI

```bash
# List available actions

argocd app actions list my-app --kind Deployment

# Execute the restart action
argocd app actions run my-app restart --kind Deployment --resource-name my-deployment

# For a specific namespace
argocd app actions run my-app restart --kind Deployment --resource-name my-deployment --namespace production
```

### From the ArgoCD API

```bash
# Using curl against the ArgoCD API
curl -X POST "https://argocd.example.com/api/v1/applications/my-app/resource/actions/v2" \
  -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app",
    "group": "apps",
    "kind": "Deployment",
    "resourceName": "my-deployment",
    "namespace": "production",
    "action": "restart"
  }'
```

## Understanding the OutOfSync Side Effect

After triggering a restart, your application will briefly show as "OutOfSync" in ArgoCD. This is because the live Deployment now has the restart annotation, but your Git manifests do not. This is expected behavior.

If you have automated sync with self-healing enabled, ArgoCD can sync the application back to Git and the annotation difference will resolve. If you use `ignoreDifferences`, you can tell ArgoCD to ignore this specific annotation:

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
        - /spec/template/metadata/annotations/kubectl.kubernetes.io~1restartedAt
```

This way, the restart annotation will not cause the application to show as OutOfSync.

## RBAC Configuration for Restart Actions

Control who can trigger restarts using ArgoCD RBAC:

```csv
# Allow developers to restart deployments
p, role:developer, applications, action/apps/Deployment/restart, *, allow

# Allow ops team to restart any resource type
p, role:ops, applications, action/*, *, allow

# Deny restart for readonly users
p, role:viewer, applications, action/*, *, deny
```

## Applying the Configuration

Apply the ConfigMap and restart the ArgoCD server:

```bash
# Apply the ConfigMap
kubectl apply -f argocd-cm.yaml

# Restart ArgoCD components to pick up changes
kubectl rollout restart deployment argocd-server -n argocd
kubectl rollout restart deployment argocd-repo-server -n argocd
```

The restart action is one of the most useful actions you can expose or customize in ArgoCD. It turns a common operational task into a one-click operation accessible to anyone with the right action permission. For more complex actions, see [how to write Lua scripts for custom resource actions](https://oneuptime.com/blog/post/2026-02-26-argocd-lua-scripts-resource-actions/view). For scaling actions, check out [how to create scale actions for deployments](https://oneuptime.com/blog/post/2026-02-26-argocd-scale-actions-deployments/view).
