# How to Configure Health Checks for Knative Services in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Knative, Serverless

Description: Learn how to configure custom health checks for Knative Service, Route, Revision, and Configuration resources in ArgoCD to accurately monitor serverless workload status.

---

Knative brings serverless capabilities to Kubernetes, managing complex networking and autoscaling under the hood. When you deploy Knative services through ArgoCD, the default health assessment falls short because ArgoCD does not understand Knative's condition-based status model. A Knative Service could be stuck with a failed image pull or a misconfigured domain, and ArgoCD would still show it as healthy.

In this guide, I will show you how to write custom Lua health check scripts for Knative Serving resources so your ArgoCD dashboard correctly reflects whether your serverless workloads are actually running.

## Knative Status Conditions

Knative follows a consistent pattern where each resource reports status through conditions. The key condition for all Knative resources is `Ready`, which is `True` when the resource is fully configured and operational.

Knative Service resources have three conditions:

- **Ready** - Overall readiness of the service
- **RoutesReady** - Whether the route has been configured
- **ConfigurationsReady** - Whether the configuration and latest revision are ready

A healthy Knative Service looks like:

```yaml
status:
  conditions:
    - type: Ready
      status: "True"
    - type: RoutesReady
      status: "True"
    - type: ConfigurationsReady
      status: "True"
  url: https://my-service.default.example.com
  latestReadyRevisionName: my-service-00003
  latestCreatedRevisionName: my-service-00003
```

An unhealthy one might show:

```yaml
status:
  conditions:
    - type: Ready
      status: "False"
      reason: RevisionFailed
      message: "Revision 'my-service-00004' failed with message: Container image pull failed"
    - type: ConfigurationsReady
      status: "False"
      reason: RevisionFailed
```

## Health Check for Knative Service

The Knative Service is the main resource users interact with. It manages Routes, Configurations, and Revisions automatically.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.serving.knative.dev_Service: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Waiting for Knative Service to be reconciled"
      return hs
    end

    ready = false
    readyMessage = ""

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        if condition.status == "True" then
          ready = true
          -- Include the URL if available
          if obj.status.url ~= nil then
            readyMessage = "Service ready at " .. obj.status.url
          else
            readyMessage = "Service is ready"
          end
        elseif condition.status == "False" then
          readyMessage = condition.message or condition.reason or "Service is not ready"
        else
          readyMessage = condition.message or "Service is being configured"
        end
      end
    end

    if ready then
      hs.status = "Healthy"
      hs.message = readyMessage
    else
      -- Check if it is actively progressing or actually failed
      for i, condition in ipairs(obj.status.conditions) do
        if condition.type == "Ready" and condition.status == "False" then
          -- Certain reasons indicate permanent failure
          if condition.reason == "RevisionFailed" or
             condition.reason == "ContainerMissing" or
             condition.reason == "RevisionMissing" then
            hs.status = "Degraded"
            hs.message = readyMessage
            return hs
          end
        end
      end
      hs.status = "Progressing"
      hs.message = readyMessage
    end

    return hs
```

## Health Check for Knative Revision

Revisions represent immutable snapshots of your application code and configuration. They are created automatically by the Knative Service.

```yaml
  resource.customizations.health.serving.knative.dev_Revision: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Revision is being created"
      return hs
    end

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = "Revision is ready and serving traffic"
        elseif condition.status == "False" then
          -- Check for specific failure reasons
          if condition.reason == "ContainerMissing" then
            hs.status = "Degraded"
            hs.message = "Container image not found: " .. (condition.message or "")
          elseif condition.reason == "ExitCode1" or condition.reason == "ExitCode137" then
            hs.status = "Degraded"
            hs.message = "Container crashed: " .. (condition.message or "")
          elseif condition.reason == "ResourcesUnavailable" then
            hs.status = "Degraded"
            hs.message = "Insufficient resources: " .. (condition.message or "")
          else
            hs.status = "Degraded"
            hs.message = condition.message or "Revision failed: " .. tostring(condition.reason)
          end
        else
          hs.status = "Progressing"
          hs.message = condition.message or "Revision is being deployed"
        end
        return hs
      end
    end

    -- Check Active condition for scale-to-zero
    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Active" then
        if condition.status == "False" and condition.reason == "NoTraffic" then
          hs.status = "Healthy"
          hs.message = "Revision is scaled to zero (no traffic)"
          return hs
        end
      end
    end

    hs.status = "Progressing"
    hs.message = "Waiting for Revision status"
    return hs
```

Note the special handling for scale-to-zero: when a Knative revision has no traffic, it scales down to zero pods. This is normal behavior, not a failure, so we mark it as "Healthy".

## Health Check for Knative Route

Routes manage the traffic routing between different revisions.

```yaml
  resource.customizations.health.serving.knative.dev_Route: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Route is being configured"
      return hs
    end

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        if condition.status == "True" then
          hs.status = "Healthy"
          if obj.status.url ~= nil then
            hs.message = "Route ready at " .. obj.status.url
          else
            hs.message = "Route is ready"
          end
        elseif condition.status == "False" then
          hs.status = "Degraded"
          hs.message = condition.message or "Route configuration failed"
        else
          hs.status = "Progressing"
          hs.message = condition.message or "Route is being configured"
        end
        return hs
      end
    end

    hs.status = "Progressing"
    hs.message = "Waiting for Route status"
    return hs
```

## Health Check for Knative Configuration

Configurations manage the desired state of your application and create Revisions.

```yaml
  resource.customizations.health.serving.knative.dev_Configuration: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Configuration is being reconciled"
      return hs
    end

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        if condition.status == "True" then
          hs.status = "Healthy"
          if obj.status.latestReadyRevisionName ~= nil then
            hs.message = "Latest ready revision: " .. obj.status.latestReadyRevisionName
          else
            hs.message = "Configuration is ready"
          end
        elseif condition.status == "False" then
          hs.status = "Degraded"
          hs.message = condition.message or "Configuration failed"
        else
          hs.status = "Progressing"
          hs.message = "Configuration is being updated"
        end
        return hs
      end
    end

    hs.status = "Progressing"
    hs.message = "Waiting for Configuration status"
    return hs
```

## Health Checks for Knative Eventing

If you also use Knative Eventing, add health checks for Broker, Trigger, and other eventing resources:

```yaml
  # Knative Broker health check
  resource.customizations.health.eventing.knative.dev_Broker: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Broker is being created"
      return hs
    end
    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = "Broker is ready"
        elseif condition.status == "False" then
          hs.status = "Degraded"
          hs.message = condition.message or "Broker is not ready"
        else
          hs.status = "Progressing"
          hs.message = "Broker is being configured"
        end
        return hs
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for Broker status"
    return hs

  # Knative Trigger health check
  resource.customizations.health.eventing.knative.dev_Trigger: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Trigger is being created"
      return hs
    end
    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        if condition.status == "True" then
          hs.status = "Healthy"
          hs.message = "Trigger is ready"
        elseif condition.status == "False" then
          hs.status = "Degraded"
          hs.message = condition.message or "Trigger is not ready"
        else
          hs.status = "Progressing"
          hs.message = "Trigger is being configured"
        end
        return hs
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for Trigger status"
    return hs
```

## Testing Knative Health Checks

Deploy a test Knative service and verify the health reporting:

```bash
# Create a Knative Service through ArgoCD
kubectl apply -f - <<EOF
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: health-check-test
  namespace: default
spec:
  template:
    spec:
      containers:
        - image: gcr.io/knative-samples/helloworld-go
          ports:
            - containerPort: 8080
EOF

# Refresh ArgoCD and check health
argocd app get my-knative-app --refresh
```

You should see the service progress through "Progressing" while pods start up, then settle at "Healthy" once the revision is ready and the route is configured. If you change the image to something invalid, you will see it go to "Degraded".

These health checks give you full visibility into your serverless workloads directly from the ArgoCD dashboard, saving you from having to run `kn service list` separately. For deploying Knative with Helm, see [deploying Knative serverless platform with Helm](https://oneuptime.com/blog/post/2026-01-17-helm-knative-serverless-deployment/view).
