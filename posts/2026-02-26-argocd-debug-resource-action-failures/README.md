# How to Debug Custom Resource Action Failures in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting

Description: Learn how to diagnose and fix custom resource action failures in ArgoCD, including Lua script errors, RBAC issues, ConfigMap formatting problems, and runtime exceptions.

---

Custom resource actions in ArgoCD can fail for many reasons - Lua syntax errors, nil reference exceptions, RBAC permission denials, malformed ConfigMap entries, or the action producing an invalid Kubernetes resource patch. When an action fails, the error messages are not always clear about what went wrong. This guide provides a systematic debugging approach for every type of action failure.

## Types of Action Failures

Action failures fall into several categories:

1. **Actions do not appear in the UI/CLI** - Discovery script issues
2. **Action appears but cannot be clicked** - RBAC or disabled state
3. **Action executes but fails with an error** - Lua runtime errors or Kubernetes API errors
4. **Action executes but does nothing** - Lua script returns unchanged object
5. **Action executes but causes unexpected behavior** - Logic errors in the script

Let me walk through debugging each of these.

## Debugging Missing Actions

If no actions appear for a resource type, the issue is either in the ConfigMap configuration or the discovery script.

### Check the ConfigMap

First, verify the action is defined in `argocd-cm`:

```bash
# View all action configurations
kubectl get configmap argocd-cm -n argocd -o yaml | grep "resource.customizations.actions"

# View the specific action configuration
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.resource\.customizations\.actions\.apps_Deployment}'
```

### Verify the ConfigMap Key Format

The key must exactly match this pattern:

```text
resource.customizations.actions.<group>_<kind>
```

Common mistakes:

```yaml
# Wrong: using slash instead of underscore
resource.customizations.actions.apps/Deployment: |

# Wrong: lowercase kind
resource.customizations.actions.apps_deployment: |

# Wrong: including API version
resource.customizations.actions.apps/v1_Deployment: |

# Wrong: missing group for core resources
resource.customizations.actions.Service: |

# Correct: core API group uses v1
resource.customizations.actions.v1_Service: |

# Correct: apps group
resource.customizations.actions.apps_Deployment: |

# Correct: CRD with full group
resource.customizations.actions.argoproj.io_Rollout: |
```

### Check the Discovery Script

The discovery script might return an empty table or have a syntax error. Test it by listing actions:

```bash
# This runs the discovery script
argocd app actions list my-app --kind Deployment --resource-name my-deployment
```

If this command returns nothing or errors, the discovery script has a problem. Check the controller logs:

```bash
kubectl logs -n argocd deployment/argocd-application-controller | grep -i "action\|lua\|error"
```

### Common Discovery Script Errors

```lua
-- Error: returning nil instead of empty table
return nil  -- Should be: return {}

-- Error: wrong table structure
actions["restart"] = true  -- Should be: actions["restart"] = {["disabled"] = false}

-- Error: syntax error
actions["restart"] = {["disabled"]] = false}  -- Extra bracket
```

## Debugging RBAC Issues

If actions appear but are not executable, check RBAC:

```bash
# Test RBAC for a specific role
argocd admin settings rbac can <role> action/apps/Deployment/restart '*/*' \
  --policy-file <(kubectl get configmap argocd-rbac-cm -n argocd -o jsonpath='{.data.policy\.csv}')

# Check what role the current user has
argocd account get-user-info
```

If RBAC is blocking the action, update the policy:

```yaml
# argocd-rbac-cm
data:
  policy.csv: |
    p, role:developer, applications, action/apps/Deployment/restart, *, allow
```

## Debugging Lua Runtime Errors

When an action executes but fails, the error is usually a Lua runtime exception. The most common causes:

### Nil Reference Errors

```lua
-- This crashes if obj.metadata.annotations is nil
obj.metadata.annotations["my-key"] = "value"
```

Fix:

```lua
if obj.metadata.annotations == nil then
  obj.metadata.annotations = {}
end
obj.metadata.annotations["my-key"] = "value"
```

### Type Errors

```lua
-- This crashes if obj.spec.replicas is nil
obj.spec.replicas = obj.spec.replicas + 1
```

Fix:

```lua
local current = obj.spec.replicas or 1
obj.spec.replicas = current + 1
```

### Missing Return Statement

```lua
-- If this path is taken, nothing is returned
if obj.status ~= nil then
  obj.spec.replicas = 3
  return obj
end
-- Missing return here!
```

Fix:

```lua
if obj.status ~= nil then
  obj.spec.replicas = 3
end
return obj  -- Always return
```

### Finding Lua Errors in Logs

```bash
# Search for Lua errors in the application controller logs
kubectl logs -n argocd deployment/argocd-application-controller --tail=200 | grep -i "lua"

# Search for action-specific errors
kubectl logs -n argocd deployment/argocd-application-controller --tail=200 | grep -i "action"

# Get the most recent errors
kubectl logs -n argocd deployment/argocd-application-controller --tail=500 | grep -i "error" | tail -20
```

## Debugging Actions That Do Nothing

If the action executes without error but the resource does not change, the Lua script is returning the object without modifications.

### Verify the Script Logic

Common scenarios where the script does nothing:

```lua
-- Bug: conditional never matches
if obj.spec.replicas == nil then  -- replicas is always set, so this never runs
  obj.spec.replicas = 3
end
return obj

-- Bug: modifying a local variable instead of the object
local replicas = obj.spec.replicas
replicas = replicas + 1  -- This modifies the local, not obj
return obj
```

Fix:

```lua
obj.spec.replicas = (obj.spec.replicas or 1) + 1
return obj
```

### Check the Patch Result

After running an action, immediately check the resource:

```bash
# Run the action
argocd app actions run my-app restart --kind Deployment --resource-name my-deployment

# Immediately check if the change was applied
kubectl get deployment my-deployment -n default -o yaml | grep restartedAt
```

## Debugging Kubernetes API Errors

Sometimes the Lua script works correctly but the resulting patch is rejected by the Kubernetes API.

### Common API Rejection Reasons

**Immutable field modification**: Some fields cannot be changed after creation.

```lua
-- This will fail: selector is immutable
obj.spec.selector.matchLabels["new-label"] = "value"
```

**Invalid field values**: The script sets a field to an invalid value.

```lua
-- This will fail: replicas must be non-negative
obj.spec.replicas = -1
```

**Schema validation failure**: The patch produces a resource that does not match the CRD schema.

```lua
-- This will fail if the CRD requires an integer
obj.spec.maxRetries = "three"  -- Should be a number
```

### Check API Server Logs

```bash
# Check the kube-apiserver audit logs for rejected patches
kubectl logs -n kube-system kube-apiserver-<node> | grep "my-deployment" | tail -10
```

## Debugging YAML Formatting Issues

ConfigMap YAML formatting is a frequent source of problems. The Lua scripts are embedded in YAML, so indentation matters.

### Common Formatting Issues

```yaml
# Wrong: Lua script not properly indented as YAML block
resource.customizations.actions.apps_Deployment: |
discovery.lua: |  # This line should be indented
  actions = {}
  return actions

# Correct:
resource.customizations.actions.apps_Deployment: |
  discovery.lua: |
    actions = {}
    return actions
```

### Validate the ConfigMap

```bash
# Get the raw ConfigMap content
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data}' | python3 -m json.tool

# Check for YAML parsing issues
kubectl get configmap argocd-cm -n argocd -o yaml > /tmp/argocd-cm.yaml
yamllint /tmp/argocd-cm.yaml
```

## Step-by-Step Debugging Process

When an action fails, follow this checklist:

1. **Is the action listed?**
   ```bash
   argocd app actions list my-app --kind Deployment --resource-name my-dep
   ```

2. **Is the action enabled?** Check the `disabled` field in the output.

3. **Does the user have permission?** Test RBAC policies.

4. **Are there Lua errors?** Check controller logs.

5. **Is the ConfigMap key correct?** Verify the group and kind naming.

6. **Is the YAML formatting correct?** Check indentation of the embedded Lua.

7. **Does the script return the modified object?** Verify every code path returns `obj`.

8. **Is the resulting resource valid?** Check that modified fields have valid values.

9. **Is the ArgoCD server running the latest config?** Restart the server if needed.

```bash
kubectl rollout restart deployment argocd-server -n argocd
kubectl rollout restart deployment argocd-application-controller -n argocd
```

## Testing Lua Scripts Locally

You can test Lua scripts outside ArgoCD using a local Lua interpreter:

```bash
# Install Lua 5.1
brew install lua@5.1

# Create a test file
cat > test-action.lua << 'EOF'
-- Mock the Kubernetes object
local obj = {
  metadata = {
    name = "my-deployment",
    namespace = "default",
    annotations = {}
  },
  spec = {
    replicas = 3,
    template = {
      metadata = {
        annotations = {}
      }
    }
  }
}

-- Your action script here
local os = require("os")
obj.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"] = tostring(os.time())

-- Verify the result
print("Restart annotation: " .. obj.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"])
print("Replicas: " .. tostring(obj.spec.replicas))
EOF

lua5.1 test-action.lua
```

This catches syntax errors and basic logic issues before deploying to ArgoCD.

For writing better action scripts, see [how to write Lua scripts for custom resource actions](https://oneuptime.com/blog/post/2026-02-26-argocd-lua-scripts-resource-actions/view). For the general actions framework, check out [how to configure custom resource actions in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-resource-actions/view).
