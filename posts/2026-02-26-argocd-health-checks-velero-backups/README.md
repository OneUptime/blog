# How to Configure Health Checks for Velero Backups in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Velero, Disaster Recovery

Description: Learn how to configure custom health checks for Velero Backup and Restore resources in ArgoCD so your GitOps dashboard accurately reflects backup status and completion.

---

If you manage Velero backups through ArgoCD, you have probably noticed that ArgoCD does not know how to check the health of Velero custom resources out of the box. A Velero Backup might be stuck in "InProgress" or have failed entirely, and ArgoCD will still show it as healthy. That is not useful when you need reliable disaster recovery monitoring.

In this guide, I will walk you through writing custom health check scripts in Lua so ArgoCD can correctly report the status of your Velero Backup, Restore, and Schedule resources.

## Why Velero Health Checks Matter

Velero is the de facto standard for Kubernetes backup and disaster recovery. When you manage Velero resources through ArgoCD, you want the ArgoCD dashboard to reflect the true state of your backups. Without custom health checks, ArgoCD treats Velero CRDs as generic resources and assigns them a "Healthy" status as long as the resource exists, regardless of whether the backup actually succeeded.

This means a failed backup could sit in your cluster for days without anyone noticing it through ArgoCD. Custom health checks solve this by teaching ArgoCD how to interpret Velero status fields.

## Understanding Velero Status Fields

Before writing health checks, you need to understand what Velero puts in its status fields.

A Velero Backup resource has a `status.phase` field that can be:

- `New` - Backup request has been created
- `InProgress` - Backup is currently running
- `Uploading` - Backup data is being uploaded to object storage
- `FailedValidation` - Backup failed validation checks
- `Failed` - Backup has failed
- `Completed` - Backup finished successfully
- `PartiallyFailed` - Some items failed to back up
- `Deleting` - Backup is being deleted

A Velero Restore has similar phases: `New`, `InProgress`, `Completed`, `PartiallyFailed`, `Failed`, and `FailedValidation`.

## Configuring the Health Check in ArgoCD

ArgoCD uses a ConfigMap called `argocd-cm` to store resource customizations, including custom health checks written in Lua. Here is how to add health checks for Velero Backup resources.

### Health Check for Velero Backups

```yaml
# argocd-cm ConfigMap patch
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Health check for Velero Backup resources
  resource.customizations.health.velero.io_Backup: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Completed" then
        hs.status = "Healthy"
        hs.message = "Backup completed successfully"
      elseif obj.status.phase == "PartiallyFailed" then
        hs.status = "Degraded"
        hs.message = obj.status.failureReason or "Backup partially failed"
      elseif obj.status.phase == "Failed" then
        hs.status = "Degraded"
        hs.message = obj.status.failureReason or "Backup failed"
      elseif obj.status.phase == "FailedValidation" then
        hs.status = "Degraded"
        hs.message = "Backup failed validation"
      elseif obj.status.phase == "InProgress" or obj.status.phase == "Uploading" then
        hs.status = "Progressing"
        hs.message = "Backup is in progress"
      elseif obj.status.phase == "New" then
        hs.status = "Progressing"
        hs.message = "Backup is pending"
      elseif obj.status.phase == "Deleting" then
        hs.status = "Progressing"
        hs.message = "Backup is being deleted"
      else
        hs.status = "Unknown"
        hs.message = "Unknown backup phase: " .. tostring(obj.status.phase)
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for backup status"
    end
    return hs
```

### Health Check for Velero Restores

```yaml
  # Health check for Velero Restore resources
  resource.customizations.health.velero.io_Restore: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Completed" then
        hs.status = "Healthy"
        hs.message = "Restore completed successfully"
      elseif obj.status.phase == "PartiallyFailed" then
        hs.status = "Degraded"
        hs.message = obj.status.failureReason or "Restore partially failed"
      elseif obj.status.phase == "Failed" then
        hs.status = "Degraded"
        hs.message = obj.status.failureReason or "Restore failed"
      elseif obj.status.phase == "FailedValidation" then
        hs.status = "Degraded"
        hs.message = "Restore failed validation"
      elseif obj.status.phase == "InProgress" then
        hs.status = "Progressing"
        hs.message = "Restore is in progress"
      elseif obj.status.phase == "New" then
        hs.status = "Progressing"
        hs.message = "Restore is pending"
      else
        hs.status = "Unknown"
        hs.message = "Unknown restore phase"
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for restore status"
    end
    return hs
```

### Health Check for Velero Schedules

Velero Schedules deserve their own health check too. A Schedule can be enabled or paused, and you want to know if it has been failing.

```yaml
  # Health check for Velero Schedule resources
  resource.customizations.health.velero.io_Schedule: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Enabled" then
        -- Check if the last backup was successful
        if obj.status.lastBackup ~= nil then
          hs.status = "Healthy"
          hs.message = "Schedule is enabled, last backup: " .. tostring(obj.status.lastBackup)
        else
          hs.status = "Healthy"
          hs.message = "Schedule is enabled, no backups yet"
        end
      elseif obj.status.phase == "FailedValidation" then
        hs.status = "Degraded"
        hs.message = "Schedule failed validation"
      else
        hs.status = "Progressing"
        hs.message = "Schedule phase: " .. tostring(obj.status.phase)
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for schedule status"
    end
    return hs
```

## Applying the Configuration

You can apply these health checks in several ways depending on your setup.

### Option 1: Patch the ConfigMap Directly

```bash
# Apply the ConfigMap patch
kubectl apply -f argocd-cm-patch.yaml -n argocd
```

### Option 2: Use Kustomize

If you manage ArgoCD itself through GitOps (which you should), add a Kustomize patch:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

patches:
  - target:
      kind: ConfigMap
      name: argocd-cm
    patch: |
      - op: add
        path: /data/resource.customizations.health.velero.io_Backup
        value: |
          hs = {}
          if obj.status ~= nil then
            if obj.status.phase == "Completed" then
              hs.status = "Healthy"
              hs.message = "Backup completed successfully"
            elseif obj.status.phase == "Failed" or obj.status.phase == "PartiallyFailed" then
              hs.status = "Degraded"
              hs.message = obj.status.failureReason or "Backup failed"
            elseif obj.status.phase == "InProgress" or obj.status.phase == "Uploading" then
              hs.status = "Progressing"
              hs.message = "Backup is in progress"
            else
              hs.status = "Progressing"
              hs.message = "Backup pending"
            end
          else
            hs.status = "Progressing"
            hs.message = "Waiting for status"
          end
          return hs
```

### Option 3: Helm Values

If you installed ArgoCD with the community Helm chart, add the customization in your values file:

```yaml
# values.yaml for argo-cd Helm chart
server:
  config:
    resource.customizations.health.velero.io_Backup: |
      hs = {}
      if obj.status ~= nil then
        if obj.status.phase == "Completed" then
          hs.status = "Healthy"
          hs.message = "Backup completed successfully"
        elseif obj.status.phase == "Failed" or obj.status.phase == "PartiallyFailed" then
          hs.status = "Degraded"
          hs.message = obj.status.failureReason or "Backup failed"
        elseif obj.status.phase == "InProgress" or obj.status.phase == "Uploading" then
          hs.status = "Progressing"
          hs.message = "Backup is in progress"
        else
          hs.status = "Progressing"
          hs.message = "Backup pending"
        end
      else
        hs.status = "Progressing"
        hs.message = "Waiting for status"
      end
      return hs
```

## Testing Your Health Checks

After applying the configuration, create a test backup and watch how ArgoCD reports its health:

```bash
# Create a test backup
velero backup create test-backup --include-namespaces default

# Watch the backup status
velero backup describe test-backup

# In ArgoCD, refresh the application
argocd app get your-velero-app --refresh
```

You should see the ArgoCD UI show "Progressing" while the backup runs and then switch to "Healthy" when it completes, or "Degraded" if it fails.

## Handling Edge Cases

There are a few edge cases worth considering.

**Stale backups**: A backup that has been "InProgress" for too long might indicate a stuck process. You can add a time-based check in your Lua script by comparing `obj.status.startTimestamp` with the current time, though Lua in ArgoCD has limited time functions.

**Partially failed backups**: Depending on your tolerance, you might want to treat `PartiallyFailed` as "Healthy" with a warning rather than "Degraded". Adjust the Lua script to match your operational requirements.

**BackupStorageLocation health**: Consider also adding a health check for `BackupStorageLocation` resources, which indicate whether Velero can reach your storage backend:

```yaml
  resource.customizations.health.velero.io_BackupStorageLocation: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Available" then
        hs.status = "Healthy"
        hs.message = "Storage location is available"
      elseif obj.status.phase == "Unavailable" then
        hs.status = "Degraded"
        hs.message = obj.status.message or "Storage location is unavailable"
      else
        hs.status = "Unknown"
        hs.message = "Unknown storage location phase"
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for storage location status"
    end
    return hs
```

## Putting It All Together

A complete Velero health check configuration covers Backup, Restore, Schedule, and BackupStorageLocation resources. With these in place, your ArgoCD dashboard becomes a reliable source of truth for the state of your disaster recovery setup. No more checking Velero CLI separately to see if backups are actually succeeding.

For more on writing Lua health checks in ArgoCD, see our guide on how to write custom health check scripts in Lua. For general Velero backup strategies, check out [how to back up and restore Kubernetes with Velero](https://oneuptime.com/blog/post/2026-01-06-kubernetes-backup-restore-velero/view).
