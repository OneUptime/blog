# How to Write Lua Scripts for Custom Resource Actions in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Lua

Description: Learn how to write Lua scripts for ArgoCD custom resource actions, including the Lua API, object manipulation, conditional logic, and best practices for safe and effective action scripts.

---

Custom resource actions in ArgoCD are powered by Lua scripts. These scripts receive a Kubernetes resource object, modify it, and return the modified version. ArgoCD then applies the changes to the cluster. Writing effective Lua scripts requires understanding the Lua runtime available in ArgoCD, how Kubernetes objects are represented, and common patterns for safe object manipulation.

This guide covers the Lua scripting fundamentals specific to ArgoCD resource actions, with practical examples and patterns you can reuse.

## The ArgoCD Lua Environment

ArgoCD uses a sandboxed Lua 5.1 runtime for resource actions. The sandbox restricts which libraries are available for security reasons. You have access to:

- **Standard Lua operations**: strings, tables, math, type conversion
- **`os` library** (limited): primarily `os.time()` for timestamps
- **`tostring()` and `tonumber()`**: type conversion functions
- **Table manipulation**: `table.insert`, `table.remove`, `ipairs`, `pairs`

You do NOT have access to:
- File I/O (`io` library)
- OS commands (`os.execute`)
- Network operations
- The `require` function (except for `os`)
- `loadstring` or `dofile`

## Anatomy of a Resource Action Script

Every action has two parts: discovery and definition.

### Discovery Script

The discovery script decides which actions appear in the UI. It must return a table mapping action names to properties:

```lua
-- discovery.lua
actions = {}

-- Simple action that is always available
actions["my-action"] = {
  ["disabled"] = false
}

-- Conditional action
if obj.spec.replicas > 1 then
  actions["scale-down"] = {
    ["disabled"] = false
  }
end

return actions
```

The `obj` variable contains the full Kubernetes resource object. You can inspect any field to decide whether to show or hide an action.

### Action Script

The action script receives the resource object, modifies it, and returns it:

```lua
-- action.lua
-- obj is the Kubernetes resource object
obj.spec.replicas = 3
return obj
```

The returned object is what ArgoCD will apply to the cluster as a patch.

## Working with Kubernetes Objects in Lua

Kubernetes objects are represented as nested Lua tables. JSON fields map directly to Lua table keys:

```lua
-- Accessing fields
local name = obj.metadata.name
local namespace = obj.metadata.namespace
local replicas = obj.spec.replicas
local image = obj.spec.template.spec.containers[1].image

-- Annotations and labels are regular table fields
local myAnnotation = obj.metadata.annotations["my.annotation/key"]
```

### Handling Nil Values

The most critical skill in ArgoCD Lua scripting is handling nil values. In Lua, accessing a field on a nil table causes a runtime error that crashes the health check or action.

```lua
-- BAD: will crash if obj.metadata.annotations is nil
local val = obj.metadata.annotations["my-key"]

-- GOOD: check for nil first
local val = nil
if obj.metadata ~= nil and obj.metadata.annotations ~= nil then
  val = obj.metadata.annotations["my-key"]
end

-- GOOD: initialize the chain
if obj.metadata == nil then
  obj.metadata = {}
end
if obj.metadata.annotations == nil then
  obj.metadata.annotations = {}
end
obj.metadata.annotations["my-key"] = "my-value"
```

### Creating Nested Structures

When adding new fields, you need to ensure every parent exists:

```lua
-- Safely set a deeply nested field
if obj.spec == nil then
  obj.spec = {}
end
if obj.spec.template == nil then
  obj.spec.template = {}
end
if obj.spec.template.metadata == nil then
  obj.spec.template.metadata = {}
end
if obj.spec.template.metadata.annotations == nil then
  obj.spec.template.metadata.annotations = {}
end
obj.spec.template.metadata.annotations["my-key"] = "my-value"
```

You can write a helper pattern to reduce this boilerplate:

```lua
-- Helper to ensure nested path exists
local function ensurePath(root, ...)
  local current = root
  for _, key in ipairs({...}) do
    if current[key] == nil then
      current[key] = {}
    end
    current = current[key]
  end
  return current
end

-- Usage
local annotations = ensurePath(obj, "spec", "template", "metadata", "annotations")
annotations["my-key"] = "my-value"
```

## Common Action Patterns

### Pattern 1: Toggle a Boolean Field

```lua
-- Toggle pause/unpause
if obj.spec.paused == true then
  obj.spec.paused = false
else
  obj.spec.paused = true
end
return obj
```

### Pattern 2: Increment/Decrement a Number

```lua
-- Scale up with safety limit
local current = obj.spec.replicas or 1
local maxReplicas = 20
if current < maxReplicas then
  obj.spec.replicas = current + 1
end
return obj
```

### Pattern 3: Add a Timestamp Annotation

```lua
-- Trigger a restart by updating annotation
local os = require("os")
if obj.spec.template.metadata == nil then
  obj.spec.template.metadata = {}
end
if obj.spec.template.metadata.annotations == nil then
  obj.spec.template.metadata.annotations = {}
end
obj.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"] = tostring(os.time())
return obj
```

### Pattern 4: Modify Labels

```lua
-- Add a label to mark for special handling
if obj.metadata.labels == nil then
  obj.metadata.labels = {}
end
obj.metadata.labels["ops.example.com/maintenance"] = "true"
return obj
```

### Pattern 5: Update Container Image

```lua
-- Update the image tag (useful for emergency patches)
if obj.spec.template.spec.containers ~= nil then
  for i, container in ipairs(obj.spec.template.spec.containers) do
    if container.name == "my-app" then
      -- Replace the tag portion of the image
      local image = container.image
      local repo = string.match(image, "(.+):")
      if repo ~= nil then
        obj.spec.template.spec.containers[i].image = repo .. ":rollback-stable"
      end
    end
  end
end
return obj
```

### Pattern 6: Iterate Over Conditions

```lua
-- Find a specific condition
local ready = false
if obj.status ~= nil and obj.status.conditions ~= nil then
  for _, condition in ipairs(obj.status.conditions) do
    if condition.type == "Ready" and condition.status == "True" then
      ready = true
      break
    end
  end
end
```

### Pattern 7: Working with Arrays

```lua
-- Add an item to an array
if obj.spec.template.spec.containers[1].env == nil then
  obj.spec.template.spec.containers[1].env = {}
end
table.insert(obj.spec.template.spec.containers[1].env, {
  name = "MAINTENANCE_MODE",
  value = "true"
})
return obj
```

### Pattern 8: Remove an Item from an Array

```lua
-- Remove a specific environment variable
if obj.spec.template.spec.containers[1].env ~= nil then
  local newEnv = {}
  for _, env in ipairs(obj.spec.template.spec.containers[1].env) do
    if env.name ~= "MAINTENANCE_MODE" then
      table.insert(newEnv, env)
    end
  end
  obj.spec.template.spec.containers[1].env = newEnv
end
return obj
```

## Conditional Discovery Patterns

### Show Different Actions Based on Status

```lua
-- discovery.lua
actions = {}

local phase = ""
if obj.status ~= nil and obj.status.phase ~= nil then
  phase = obj.status.phase
end

if phase == "Running" then
  actions["stop"] = {["disabled"] = false}
  actions["restart"] = {["disabled"] = false}
elseif phase == "Stopped" then
  actions["start"] = {["disabled"] = false}
elseif phase == "Failed" then
  actions["retry"] = {["disabled"] = false}
  actions["delete-and-recreate"] = {["disabled"] = false}
end

-- Always available
actions["add-label"] = {["disabled"] = false}

return actions
```

### Disable Actions Based on Annotations

```lua
-- discovery.lua
actions = {}

-- Check if the resource is locked
local locked = false
if obj.metadata.annotations ~= nil and obj.metadata.annotations["ops.example.com/locked"] == "true" then
  locked = true
end

actions["restart"] = {["disabled"] = locked}
actions["scale-up"] = {["disabled"] = locked}
actions["scale-down"] = {["disabled"] = locked}

if locked then
  actions["unlock"] = {["disabled"] = false}
else
  actions["lock"] = {["disabled"] = false}
end

return actions
```

## Debugging Lua Scripts

Since ArgoCD does not provide a REPL for testing Lua scripts, debugging can be tricky. Here are some approaches:

1. **Use a local Lua interpreter**: Install Lua 5.1 locally and test your logic with mock objects.

```bash
# Install Lua
brew install lua@5.1  # macOS

# Test your script
lua5.1 test-action.lua
```

2. **Check controller logs**: Lua errors appear in the ArgoCD application controller logs.

```bash
kubectl logs -n argocd deployment/argocd-application-controller | grep -i lua
```

3. **Start simple**: Build your scripts incrementally. Start with a basic action and add complexity one step at a time.

4. **Test with `argocd app actions list`**: This command runs the discovery script and shows available actions.

```bash
argocd app actions list my-app --kind Deployment --resource-name my-deployment
```

## Complete Example: Multi-Action Deployment

Here is a complete, production-ready example combining multiple actions:

```yaml
resource.customizations.actions.apps_Deployment: |
  discovery.lua: |
    actions = {}
    local replicas = obj.spec.replicas or 1
    local locked = false
    if obj.metadata.annotations ~= nil and obj.metadata.annotations["ops/locked"] == "true" then
      locked = true
    end
    actions["restart"] = {["disabled"] = locked}
    actions["scale-up"] = {["disabled"] = locked or replicas >= 20}
    actions["scale-down"] = {["disabled"] = locked or replicas <= 1}
    if locked then
      actions["unlock"] = {["disabled"] = false}
    else
      actions["lock"] = {["disabled"] = false}
    end
    return actions
  definitions:
    - name: restart
      action.lua: |
        local os = require("os")
        if obj.spec.template.metadata == nil then obj.spec.template.metadata = {} end
        if obj.spec.template.metadata.annotations == nil then obj.spec.template.metadata.annotations = {} end
        obj.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"] = tostring(os.time())
        return obj
    - name: scale-up
      action.lua: |
        obj.spec.replicas = (obj.spec.replicas or 1) + 1
        return obj
    - name: scale-down
      action.lua: |
        local r = obj.spec.replicas or 1
        if r > 1 then obj.spec.replicas = r - 1 end
        return obj
    - name: lock
      action.lua: |
        if obj.metadata.annotations == nil then obj.metadata.annotations = {} end
        obj.metadata.annotations["ops/locked"] = "true"
        return obj
    - name: unlock
      action.lua: |
        if obj.metadata.annotations ~= nil then
          obj.metadata.annotations["ops/locked"] = nil
        end
        return obj
```

For the general actions framework, see [how to configure custom resource actions in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-resource-actions/view). For health check Lua scripts (which follow similar patterns), check out how to write custom health check scripts in Lua.
