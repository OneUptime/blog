# How to Configure Health Checks for Tekton Pipelines in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Tekton, CI/CD

Description: Learn how to configure custom health checks for Tekton Pipeline, PipelineRun, Task, and TaskRun resources in ArgoCD to get accurate CI/CD pipeline status in your GitOps dashboard.

---

Tekton is a Kubernetes-native CI/CD framework that creates custom resources like Pipeline, PipelineRun, Task, and TaskRun in your cluster. When you deploy Tekton pipelines through ArgoCD, the default health checks will not give you useful information. ArgoCD will show a PipelineRun as "Healthy" even when it has failed, because ArgoCD does not know how to interpret Tekton's status conditions.

This guide walks you through writing custom Lua health checks for every Tekton resource type so ArgoCD accurately reflects your pipeline execution status.

## Tekton Status Model

Tekton resources use the Knative condition model for status reporting. Each resource has a `status.conditions` array where the primary condition is `Succeeded`. The possible states are:

- **True** - The run completed successfully
- **False** - The run failed
- **Unknown** - The run is still in progress

Additionally, PipelineRun and TaskRun resources have a `status.completionTime` field that gets set when the run finishes, and a `status.startTime` field that indicates when execution began.

Here is what a successful PipelineRun looks like:

```yaml
status:
  conditions:
    - type: Succeeded
      status: "True"
      reason: Succeeded
      message: "Tasks Completed: 3 (Succeeded: 3, Failed: 0)"
  startTime: "2026-02-26T10:00:00Z"
  completionTime: "2026-02-26T10:05:30Z"
```

And a failed one:

```yaml
status:
  conditions:
    - type: Succeeded
      status: "False"
      reason: Failed
      message: "Tasks Completed: 2 (Succeeded: 1, Failed: 1, Cancelled: 0)"
```

## Health Check for PipelineRun

The PipelineRun is the most important resource to monitor since it represents actual pipeline executions.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.tekton.dev_PipelineRun: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "PipelineRun is pending"
      return hs
    end

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Succeeded" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = condition.message or "PipelineRun completed successfully"
        elseif condition.status == "False" then
          hs.status = "Degraded"
          hs.message = condition.message or "PipelineRun failed"
        else
          -- status is Unknown, meaning it is still running
          if condition.reason == "Running" then
            hs.status = "Progressing"
            hs.message = condition.message or "PipelineRun is running"
          elseif condition.reason == "PipelineRunCancelled" or condition.reason == "Cancelled" then
            hs.status = "Degraded"
            hs.message = "PipelineRun was cancelled"
          elseif condition.reason == "PipelineRunPending" then
            hs.status = "Progressing"
            hs.message = "PipelineRun is pending"
          else
            hs.status = "Progressing"
            hs.message = condition.message or "PipelineRun status: " .. tostring(condition.reason)
          end
        end
        return hs
      end
    end

    hs.status = "Progressing"
    hs.message = "Waiting for PipelineRun status"
    return hs
```

## Health Check for TaskRun

TaskRun is the unit of execution in Tekton. Each step in a pipeline becomes a TaskRun.

```yaml
  resource.customizations.health.tekton.dev_TaskRun: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "TaskRun is pending"
      return hs
    end

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Succeeded" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = condition.message or "TaskRun completed successfully"
        elseif condition.status == "False" then
          hs.status = "Degraded"
          -- Include step information if available
          if obj.status.steps ~= nil then
            for j, step in ipairs(obj.status.steps) do
              if step.terminated ~= nil and step.terminated.exitCode ~= 0 then
                hs.message = "Step '" .. step.name .. "' failed with exit code " .. tostring(step.terminated.exitCode)
                return hs
              end
            end
          end
          hs.message = condition.message or "TaskRun failed"
        else
          hs.status = "Progressing"
          hs.message = condition.message or "TaskRun is running"
        end
        return hs
      end
    end

    hs.status = "Progressing"
    hs.message = "Waiting for TaskRun status"
    return hs
```

## Health Check for Pipeline and Task Definitions

Pipeline and Task resources are definitions, not executions. They do not have a meaningful runtime status. However, you can still write health checks that verify they are valid.

```yaml
  # Pipeline definitions are always healthy if they exist and have tasks
  resource.customizations.health.tekton.dev_Pipeline: |
    hs = {}
    if obj.spec ~= nil and obj.spec.tasks ~= nil then
      hs.status = "Healthy"
      hs.message = "Pipeline defined with " .. tostring(#obj.spec.tasks) .. " tasks"
    else
      hs.status = "Degraded"
      hs.message = "Pipeline has no tasks defined"
    end
    return hs

  # Task definitions are healthy if they have steps
  resource.customizations.health.tekton.dev_Task: |
    hs = {}
    if obj.spec ~= nil and obj.spec.steps ~= nil then
      hs.status = "Healthy"
      hs.message = "Task defined with " .. tostring(#obj.spec.steps) .. " steps"
    else
      hs.status = "Degraded"
      hs.message = "Task has no steps defined"
    end
    return hs
```

## Health Check for Tekton Triggers

If you use Tekton Triggers to automatically start pipeline runs, add health checks for those too:

```yaml
  # EventListener health check
  resource.customizations.health.triggers.tekton.dev_EventListener: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "EventListener is starting up"
      return hs
    end

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = "EventListener is ready"
        elseif condition.status == "False" then
          hs.status = "Degraded"
          hs.message = condition.message or "EventListener is not ready"
        else
          hs.status = "Progressing"
          hs.message = "EventListener is starting"
        end
        return hs
      end
    end

    hs.status = "Progressing"
    hs.message = "Waiting for EventListener status"
    return hs
```

## Complete Configuration Example

Here is everything combined in a single ConfigMap patch:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.tekton.dev_PipelineRun: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "PipelineRun is pending"
      return hs
    end
    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Succeeded" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = condition.message or "PipelineRun completed"
        elseif condition.status == "False" then
          hs.status = "Degraded"
          hs.message = condition.message or "PipelineRun failed"
        else
          hs.status = "Progressing"
          hs.message = condition.message or "PipelineRun running"
        end
        return hs
      end
    end
    hs.status = "Progressing"
    hs.message = "Pending"
    return hs
  resource.customizations.health.tekton.dev_TaskRun: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "TaskRun is pending"
      return hs
    end
    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Succeeded" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = "TaskRun completed"
        elseif condition.status == "False" then
          hs.status = "Degraded"
          hs.message = condition.message or "TaskRun failed"
        else
          hs.status = "Progressing"
          hs.message = "TaskRun running"
        end
        return hs
      end
    end
    hs.status = "Progressing"
    hs.message = "Pending"
    return hs
```

## Verifying the Health Checks

After applying the configuration, test it with a sample pipeline run:

```bash
# Create a simple TaskRun
kubectl create -f - <<EOF
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  generateName: test-health-check-
  namespace: default
spec:
  taskSpec:
    steps:
      - name: hello
        image: alpine
        command: ["echo", "Hello from Tekton"]
EOF

# Refresh the ArgoCD application
argocd app get tekton-app --refresh
```

You should see the TaskRun show as "Progressing" while running, then "Healthy" when it completes. If you create a failing TaskRun (with a bad command), it should show as "Degraded".

## Considerations for Long-Running Pipelines

Tekton pipelines can take a while to complete, especially if they include build, test, and deploy stages. ArgoCD will show these as "Progressing" for the duration of the run. This is expected behavior. If you need to distinguish between a legitimately long-running pipeline and one that is stuck, consider adding timeout logic in your pipeline specs rather than in the ArgoCD health check.

For more on writing Lua health checks, see how to write custom health check scripts in Lua. To learn about Tekton pipeline deployments with Helm, check out [automating Helm deployments with Tekton pipelines](https://oneuptime.com/blog/post/2026-01-17-helm-tekton-pipelines-cicd/view).
