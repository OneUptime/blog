# How to Configure Health Checks for Crossplane Resources in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Crossplane, Infrastructure as Code

Description: Learn how to configure custom ArgoCD health checks for Crossplane managed resources, composite resources, and claims so your GitOps dashboard reflects true infrastructure provisioning status.

---

Crossplane brings cloud infrastructure management into Kubernetes using custom resources. When you manage Crossplane resources through ArgoCD, you need ArgoCD to understand whether an AWS RDS instance is actually ready or whether a GCP bucket failed to provision. Without custom health checks, ArgoCD just sees that the CRD exists and marks it healthy, completely ignoring the actual provisioning status.

This guide covers writing Lua health check scripts for Crossplane managed resources, composite resources (XRs), and claims so your ArgoCD dashboard gives you real infrastructure status.

## How Crossplane Reports Status

Crossplane resources follow a consistent status pattern using conditions. Every managed resource (like an RDS instance, S3 bucket, or GCP network) reports status through two key conditions:

- **Ready** - Indicates if the resource is ready for use (True/False)
- **Synced** - Indicates if the resource spec matches the desired state in the cloud provider (True/False)

A resource is truly healthy only when both conditions are True. Here is what a healthy Crossplane managed resource looks like:

```yaml
status:
  conditions:
    - type: Ready
      status: "True"
      reason: Available
    - type: Synced
      status: "True"
      reason: ReconcileSuccess
```

And an unhealthy one might look like this:

```yaml
status:
  conditions:
    - type: Ready
      status: "False"
      reason: Unavailable
      message: "instance is not yet available"
    - type: Synced
      status: "False"
      reason: ReconcileError
      message: "cannot create RDS instance: InvalidParameterValue"
```

## Writing a Generic Crossplane Health Check

Since all Crossplane resources follow the same condition pattern, you can write a generic health check function that works across different resource types. The key is to look for the Ready and Synced conditions.

```yaml
# argocd-cm ConfigMap - generic Crossplane health check
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.*.crossplane.io_*: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Waiting for Crossplane to reconcile"
      return hs
    end

    ready = false
    synced = false
    readyMessage = ""
    syncedMessage = ""

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        if condition.status == "True" then
          ready = true
        end
        readyMessage = condition.message or condition.reason or ""
      end
      if condition.type == "Synced" then
        if condition.status == "True" then
          synced = true
        end
        syncedMessage = condition.message or condition.reason or ""
      end
    end

    if ready and synced then
      hs.status = "Healthy"
      hs.message = "Resource is ready and synced"
    elseif not synced then
      hs.status = "Degraded"
      hs.message = "Sync failed: " .. syncedMessage
    elseif not ready then
      hs.status = "Progressing"
      hs.message = "Waiting for resource to become ready: " .. readyMessage
    end

    return hs
```

The wildcard pattern `*.crossplane.io_*` matches any Crossplane API group and resource type, making this a catch-all health check.

## Health Checks for Specific Crossplane Providers

While the generic check works for most cases, you might want more specific health checks for particular providers. Here are examples for commonly used Crossplane providers.

### AWS Provider Resources

```yaml
  # Health check for AWS Provider resources (provider-aws)
  resource.customizations.health.aws.upbound.io_*: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Waiting for AWS resource provisioning"
      return hs
    end

    ready = false
    synced = false
    message = ""

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        ready = condition.status == "True"
        if not ready then
          message = condition.message or condition.reason or "Not ready"
        end
      end
      if condition.type == "Synced" then
        synced = condition.status == "True"
        if not synced then
          message = condition.message or condition.reason or "Not synced"
        end
      end
    end

    if ready and synced then
      hs.status = "Healthy"
      hs.message = "AWS resource is provisioned and ready"
    elseif synced and not ready then
      hs.status = "Progressing"
      hs.message = "AWS resource is provisioning: " .. message
    else
      hs.status = "Degraded"
      hs.message = message
    end

    return hs
```

### Composite Resources (XRs) and Claims

Crossplane composite resources and claims have the same condition structure but may also have `compositionRef` and `resourceRefs` that can provide additional context.

```yaml
  # Health check for Composite Resources
  resource.customizations.health.*.crossplane.io_XR*: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Waiting for composite resource reconciliation"
      return hs
    end

    ready = false
    synced = false
    message = ""

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" then
        ready = condition.status == "True"
        if not ready then
          message = condition.message or condition.reason or ""
        end
      end
      if condition.type == "Synced" then
        synced = condition.status == "True"
        if not synced then
          message = condition.message or condition.reason or ""
        end
      end
    end

    -- Check how many composed resources exist
    resourceCount = 0
    if obj.status.resourceRefs ~= nil then
      resourceCount = #obj.status.resourceRefs
    end

    if ready and synced then
      hs.status = "Healthy"
      hs.message = "Composite resource is ready (" .. tostring(resourceCount) .. " composed resources)"
    elseif synced and not ready then
      hs.status = "Progressing"
      hs.message = "Composite resource provisioning: " .. message
    else
      hs.status = "Degraded"
      hs.message = "Sync issue: " .. message
    end

    return hs
```

## Health Check for Crossplane Provider Itself

Do not forget to monitor the health of the Crossplane provider packages themselves:

```yaml
  # Health check for Crossplane Provider packages
  resource.customizations.health.pkg.crossplane.io_Provider: |
    hs = {}
    if obj.status == nil or obj.status.conditions == nil then
      hs.status = "Progressing"
      hs.message = "Provider is being installed"
      return hs
    end

    installed = false
    healthy = false

    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Installed" then
        installed = condition.status == "True"
      end
      if condition.type == "Healthy" then
        healthy = condition.status == "True"
      end
    end

    if installed and healthy then
      hs.status = "Healthy"
      hs.message = "Provider is installed and healthy"
    elseif installed and not healthy then
      hs.status = "Degraded"
      hs.message = "Provider is installed but not healthy"
    else
      hs.status = "Progressing"
      hs.message = "Provider is being installed"
    end

    return hs
```

## Applying with Helm Values

If you manage ArgoCD with the community Helm chart, add these to your values file:

```yaml
server:
  config:
    # Generic Crossplane health check
    "resource.customizations.health.*.crossplane.io_*": |
      hs = {}
      if obj.status == nil or obj.status.conditions == nil then
        hs.status = "Progressing"
        hs.message = "Waiting for reconciliation"
        return hs
      end
      ready = false
      synced = false
      message = ""
      for i, condition in ipairs(obj.status.conditions) do
        if condition.type == "Ready" then
          ready = condition.status == "True"
          if not ready then message = condition.message or condition.reason or "" end
        end
        if condition.type == "Synced" then
          synced = condition.status == "True"
          if not synced then message = condition.message or condition.reason or "" end
        end
      end
      if ready and synced then
        hs.status = "Healthy"
        hs.message = "Resource is ready and synced"
      elseif synced and not ready then
        hs.status = "Progressing"
        hs.message = "Provisioning: " .. message
      else
        hs.status = "Degraded"
        hs.message = message
      end
      return hs
```

## Testing Crossplane Health Checks

To verify your health checks work, create a simple Crossplane resource and watch ArgoCD:

```bash
# Apply a simple Crossplane managed resource through ArgoCD
# Then check the health status
argocd app get my-infrastructure-app --refresh

# You should see individual resources with correct health status:
# NAME                          KIND        HEALTH     STATUS
# my-rds-instance               Instance    Progressing OutOfSync
# my-s3-bucket                  Bucket      Healthy     Synced
```

## Common Pitfalls

**API group mismatches**: Crossplane providers use different API groups. The classic Crossplane provider uses `aws.crossplane.io` while the Upbound provider uses `aws.upbound.io`. Make sure your wildcard patterns cover both, or add separate health checks for each.

**Slow provisioning**: Some cloud resources (like RDS instances or EKS clusters) can take 15 to 30 minutes to provision. During that time, ArgoCD will show "Progressing" which is correct. Make sure your sync timeouts accommodate this.

**Provider not installed**: If the Crossplane provider is not installed, the CRDs will not exist and ArgoCD will show resources as "Missing". This is a different issue from health checks - see [how to handle missing health status in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-missing-health-status/view).

With these health checks in place, your ArgoCD dashboard becomes a single pane of glass for both your application deployments and your cloud infrastructure provisioned through Crossplane.
