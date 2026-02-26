# How to Override Default Health Checks in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Health Checks

Description: Learn how to override ArgoCD's built-in default health checks for standard Kubernetes resources like Deployments, Services, and Ingresses with custom Lua scripts to match your operational requirements.

---

ArgoCD ships with built-in health checks for standard Kubernetes resources like Deployments, StatefulSets, Services, Ingresses, and more. These default checks work well for most situations, but sometimes your environment has specific requirements that the defaults do not handle. Maybe you want to consider a Deployment healthy even with a certain number of unavailable replicas during maintenance. Maybe you want to treat an Ingress as degraded when it has no backends assigned.

This guide shows you how to override ArgoCD's default health checks for any built-in resource type and write your own assessment logic.

## How Default Health Checks Work

ArgoCD's built-in health checks are compiled into the application controller binary. They cover the most common Kubernetes resources:

- **Deployment**: Healthy when all replicas are available and updated
- **StatefulSet**: Healthy when all replicas are ready and at the current revision
- **DaemonSet**: Healthy when the desired number equals the ready number
- **Service**: Always healthy (just needs to exist)
- **Ingress**: Healthy when it has at least one IP or hostname assigned
- **PersistentVolumeClaim**: Healthy when bound
- **Pod**: Healthy when running and all containers are ready
- **Job**: Healthy when succeeded, degraded when failed

These defaults are sensible, but they cannot account for every operational scenario.

## Overriding a Built-in Health Check

To override a default health check, add a custom health check entry in the `argocd-cm` ConfigMap using the same group and kind. Custom health checks always take precedence over built-in ones.

### Override Deployment Health Check

Let's say you want to tolerate a rolling update where not all replicas are immediately available. The default check marks a Deployment as "Progressing" during updates, but you might want to consider it "Healthy" as long as at least one replica is ready.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.apps_Deployment: |
    hs = {}
    if obj.status == nil then
      hs.status = "Progressing"
      hs.message = "Waiting for Deployment status"
      return hs
    end

    -- Check for available replicas
    available = obj.status.availableReplicas or 0
    desired = obj.spec.replicas or 1
    updated = obj.status.updatedReplicas or 0

    if available >= desired and updated >= desired then
      hs.status = "Healthy"
      hs.message = "All " .. tostring(desired) .. " replicas available and updated"
    elseif available > 0 then
      -- At least one replica is serving traffic
      hs.status = "Healthy"
      hs.message = tostring(available) .. "/" .. tostring(desired) .. " replicas available (rolling update)"
    else
      -- No replicas available at all
      -- Check conditions for more detail
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Available" and condition.status == "False" then
            hs.status = "Degraded"
            hs.message = condition.message or "No replicas available"
            return hs
          end
          if condition.type == "Progressing" then
            if condition.reason == "ProgressDeadlineExceeded" then
              hs.status = "Degraded"
              hs.message = "Deployment progress deadline exceeded"
              return hs
            end
          end
        end
      end
      hs.status = "Progressing"
      hs.message = "Waiting for replicas to become available"
    end

    return hs
```

### Override Service Health Check

The default Service health check considers all Services healthy. You might want to flag Services that have no endpoints:

```yaml
  resource.customizations.health.v1_Service: |
    hs = {}
    -- Services of type ExternalName do not need endpoints
    if obj.spec.type == "ExternalName" then
      hs.status = "Healthy"
      hs.message = "ExternalName service"
      return hs
    end

    -- For LoadBalancer services, check if external IP is assigned
    if obj.spec.type == "LoadBalancer" then
      if obj.status ~= nil and obj.status.loadBalancer ~= nil and obj.status.loadBalancer.ingress ~= nil then
        ingress = obj.status.loadBalancer.ingress
        if #ingress > 0 then
          hs.status = "Healthy"
          ip = ingress[1].ip or ingress[1].hostname or "assigned"
          hs.message = "LoadBalancer IP: " .. ip
        else
          hs.status = "Progressing"
          hs.message = "Waiting for LoadBalancer IP assignment"
        end
      else
        hs.status = "Progressing"
        hs.message = "Waiting for LoadBalancer provisioning"
      end
      return hs
    end

    -- ClusterIP and NodePort services are healthy if they exist
    hs.status = "Healthy"
    hs.message = obj.spec.type .. " service"
    return hs
```

### Override Ingress Health Check

Add more detail to Ingress health reporting:

```yaml
  resource.customizations.health.networking.k8s.io_Ingress: |
    hs = {}
    if obj.status ~= nil and obj.status.loadBalancer ~= nil and obj.status.loadBalancer.ingress ~= nil then
      ingress = obj.status.loadBalancer.ingress
      if #ingress > 0 then
        hs.status = "Healthy"
        -- Report the assigned address
        addr = ingress[1].ip or ingress[1].hostname or "assigned"
        hs.message = "Ingress address: " .. addr
      else
        hs.status = "Progressing"
        hs.message = "Waiting for ingress address assignment"
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for load balancer status"
    end
    return hs
```

### Override Job Health Check

The default Job health check works for simple jobs but does not handle indexed jobs or jobs with specific completion requirements well:

```yaml
  resource.customizations.health.batch_Job: |
    hs = {}
    if obj.status == nil then
      hs.status = "Progressing"
      hs.message = "Job is pending"
      return hs
    end

    -- Check for failure conditions first
    if obj.status.conditions ~= nil then
      for i, condition in ipairs(obj.status.conditions) do
        if condition.type == "Failed" and condition.status == "True" then
          hs.status = "Degraded"
          hs.message = condition.message or "Job failed"
          return hs
        end
        if condition.type == "Complete" and condition.status == "True" then
          hs.status = "Healthy"
          hs.message = "Job completed successfully"
          return hs
        end
        if condition.type == "Suspended" and condition.status == "True" then
          hs.status = "Suspended"
          hs.message = "Job is suspended"
          return hs
        end
      end
    end

    -- Job is still running
    active = obj.status.active or 0
    succeeded = obj.status.succeeded or 0
    failed = obj.status.failed or 0
    desired = obj.spec.completions or 1

    if succeeded >= desired then
      hs.status = "Healthy"
      hs.message = "Job completed: " .. tostring(succeeded) .. "/" .. tostring(desired)
    elseif active > 0 then
      hs.status = "Progressing"
      hs.message = "Job running: " .. tostring(active) .. " active, " .. tostring(succeeded) .. "/" .. tostring(desired) .. " completed"
    elseif failed > 0 and (obj.spec.backoffLimit or 6) > 0 then
      hs.status = "Progressing"
      hs.message = "Job retrying: " .. tostring(failed) .. " failures"
    else
      hs.status = "Progressing"
      hs.message = "Job is pending"
    end

    return hs
```

### Override PersistentVolumeClaim Health Check

Add more granularity to PVC status:

```yaml
  resource.customizations.health.v1_PersistentVolumeClaim: |
    hs = {}
    if obj.status == nil then
      hs.status = "Progressing"
      hs.message = "PVC is pending"
      return hs
    end

    if obj.status.phase == "Bound" then
      hs.status = "Healthy"
      capacity = ""
      if obj.status.capacity ~= nil and obj.status.capacity.storage ~= nil then
        capacity = " (" .. obj.status.capacity.storage .. ")"
      end
      hs.message = "PVC is bound" .. capacity
    elseif obj.status.phase == "Pending" then
      -- Check if there are events indicating a problem
      hs.status = "Progressing"
      hs.message = "PVC is pending provisioning"
    elseif obj.status.phase == "Lost" then
      hs.status = "Degraded"
      hs.message = "PVC has lost its underlying PersistentVolume"
    else
      hs.status = "Unknown"
      hs.message = "PVC phase: " .. tostring(obj.status.phase)
    end

    return hs
```

## Applying Overrides with Helm

If you manage ArgoCD with the community Helm chart:

```yaml
# values.yaml
server:
  config:
    # Override Deployment health check to be more lenient during rolling updates
    resource.customizations.health.apps_Deployment: |
      hs = {}
      if obj.status == nil then
        hs.status = "Progressing"
        hs.message = "Waiting for status"
        return hs
      end
      available = obj.status.availableReplicas or 0
      desired = obj.spec.replicas or 1
      if available >= desired then
        hs.status = "Healthy"
        hs.message = "All replicas available"
      elseif available > 0 then
        hs.status = "Healthy"
        hs.message = tostring(available) .. "/" .. tostring(desired) .. " available"
      else
        hs.status = "Progressing"
        hs.message = "No replicas available yet"
      end
      return hs
```

## When to Override vs When Not To

Override health checks when:

- Your operational requirements differ from the defaults (e.g., tolerating partial availability)
- You need more detailed health messages for debugging
- The default check produces false negatives or false positives for your setup
- You are running non-standard configurations (e.g., Deployments with no replicas for batch processing)

Avoid overriding when:

- The default check is correct but you do not like the "Progressing" status during normal updates
- You want to mask genuinely unhealthy resources
- You are trying to fix an issue that is really in the underlying resource, not the health check

## Reverting to Default Health Checks

If your override causes problems, simply remove the corresponding key from `argocd-cm`:

```bash
# Remove a specific health check override
kubectl patch configmap argocd-cm -n argocd --type json \
  -p='[{"op": "remove", "path": "/data/resource.customizations.health.apps_Deployment"}]'

# Restart the controller to pick up changes
kubectl rollout restart deployment argocd-application-controller -n argocd
```

ArgoCD will fall back to its built-in health check for that resource type.

For more on writing custom health checks from scratch, see how to write custom health check scripts in Lua. For debugging health check issues, check out [how to debug health check failures in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-debug-health-check-failures/view).
