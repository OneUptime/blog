# How to Use Selective Sync from the ArgoCD CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Selective Sync

Description: A complete reference for using the ArgoCD CLI to selectively sync specific resources, with practical examples for deployments, rollbacks, and CI/CD integration.

---

The ArgoCD CLI is the most flexible way to perform selective syncs. It gives you precise control over which resources to sync, what sync options to apply, and how to handle the operation. This guide is a practical reference for all the selective sync capabilities available through the CLI.

## The --resource Flag Syntax

The core of selective sync in the CLI is the `--resource` flag. It accepts a resource identifier in the format `GROUP:KIND:NAME`.

```bash
# Basic syntax
argocd app sync APP_NAME --resource GROUP:KIND:NAME
```

The group field corresponds to the Kubernetes API group. Core resources like ConfigMaps, Services, and Pods have an empty group. Other resources use their API group.

```bash
# Core resources (empty group)
argocd app sync my-app --resource :ConfigMap:app-config
argocd app sync my-app --resource :Secret:db-credentials
argocd app sync my-app --resource :Service:api-service
argocd app sync my-app --resource :Namespace:production
argocd app sync my-app --resource :ServiceAccount:app-sa
argocd app sync my-app --resource :PersistentVolumeClaim:data-pvc

# Apps group
argocd app sync my-app --resource apps:Deployment:web-server
argocd app sync my-app --resource apps:StatefulSet:postgres
argocd app sync my-app --resource apps:DaemonSet:fluentd
argocd app sync my-app --resource apps:ReplicaSet:web-server-7d4b8c6f

# Batch group
argocd app sync my-app --resource batch:Job:db-migration
argocd app sync my-app --resource batch:CronJob:cleanup-task

# Networking group
argocd app sync my-app --resource networking.k8s.io:Ingress:api-ingress
argocd app sync my-app --resource networking.k8s.io:NetworkPolicy:deny-all

# RBAC group
argocd app sync my-app --resource rbac.authorization.k8s.io:Role:app-role
argocd app sync my-app --resource rbac.authorization.k8s.io:ClusterRole:reader
argocd app sync my-app --resource rbac.authorization.k8s.io:RoleBinding:app-binding

# Autoscaling group
argocd app sync my-app --resource autoscaling:HorizontalPodAutoscaler:web-hpa

# Policy group
argocd app sync my-app --resource policy:PodDisruptionBudget:web-pdb
```

## Syncing Multiple Resources

Repeat the `--resource` flag to sync multiple resources in one operation.

```bash
# Sync a ConfigMap and its associated Deployment
argocd app sync my-app \
  --resource :ConfigMap:app-config \
  --resource apps:Deployment:web-server

# Sync all networking resources together
argocd app sync my-app \
  --resource :Service:api-service \
  --resource networking.k8s.io:Ingress:api-ingress \
  --resource networking.k8s.io:NetworkPolicy:allow-ingress
```

All specified resources are synced in a single operation. ArgoCD applies them together, respecting the default resource ordering within the operation.

## Combining Selective Sync with Options

The `--resource` flag works alongside other sync flags.

```bash
# Selective sync with prune enabled
argocd app sync my-app \
  --resource apps:Deployment:old-service \
  --prune

# Selective sync with force (delete and recreate)
argocd app sync my-app \
  --resource apps:Deployment:web-server \
  --force

# Selective sync with replace strategy
argocd app sync my-app \
  --resource :ConfigMap:app-config \
  --replace

# Preview changes without applying
argocd app sync my-app \
  --resource apps:Deployment:web-server \
  --dry-run

# Selective sync targeting a specific revision
argocd app sync my-app \
  --resource apps:Deployment:web-server \
  --revision main
```

## Discovering Resource Identifiers

Before you can selectively sync a resource, you need to know its exact identifier. Use these commands to find resources.

```bash
# List all resources in an application
argocd app resources my-app

# Output shows: GROUP KIND NAMESPACE NAME STATUS HEALTH HOOK MESSAGE
# Example output:
#   apps  Deployment  production  web-server  Synced  Healthy
#        ConfigMap   production  app-config  Synced  Healthy
#        Service     production  api-svc     Synced  Healthy
```

The output shows the group, kind, namespace, and name for each resource. Use these values to construct the `--resource` flag.

```bash
# Get resources in JSON format for scripting
argocd app resources my-app --output json

# Filter to only out-of-sync resources
argocd app resources my-app --output json | \
  jq '.[] | select(.status == "OutOfSync") | "\(.group):\(.kind):\(.name)"'
```

## Practical Example: Hotfix Deployment

During an incident, you need to push a hotfix to a single service. The application has 30 resources but you only changed the Deployment image tag.

```bash
# Step 1: Check what's out of sync
argocd app diff my-app

# Step 2: Verify only the Deployment changed
argocd app resources my-app --output json | \
  jq '.[] | select(.status == "OutOfSync")'

# Step 3: Sync only the changed Deployment
argocd app sync my-app --resource apps:Deployment:payment-service

# Step 4: Wait for the sync to complete and check health
argocd app wait my-app --resource apps:Deployment:payment-service --health
```

The `argocd app wait` command with `--resource` flag waits for specific resources to reach a healthy state after sync.

## Practical Example: Configuration Update

You updated a ConfigMap and need to sync it, then restart the Deployment that uses it.

```bash
# Step 1: Sync the ConfigMap
argocd app sync my-app --resource :ConfigMap:app-config

# Step 2: Restart the Deployment to pick up the new config
# (ArgoCD does not auto-restart pods on ConfigMap changes)
kubectl rollout restart deployment/web-server -n production

# Alternative: if you changed the Deployment spec too, sync both
argocd app sync my-app \
  --resource :ConfigMap:app-config \
  --resource apps:Deployment:web-server
```

## Practical Example: RBAC Update

You need to update RBAC resources without touching any workloads.

```bash
# Sync all RBAC resources for the application
argocd app sync my-app \
  --resource :ServiceAccount:app-sa \
  --resource rbac.authorization.k8s.io:Role:app-role \
  --resource rbac.authorization.k8s.io:RoleBinding:app-binding
```

## Scripting Selective Sync

For CI/CD pipelines, you can script selective sync based on what changed in Git.

```bash
#!/bin/bash
# sync-changed.sh - Sync only resources that are out of sync

APP_NAME="my-app"

# Get list of out-of-sync resources
RESOURCES=$(argocd app resources "$APP_NAME" --output json | \
  jq -r '.[] | select(.status == "OutOfSync") | "\(.group):\(.kind):\(.name)"')

if [ -z "$RESOURCES" ]; then
  echo "No resources out of sync"
  exit 0
fi

# Build the resource flags
RESOURCE_FLAGS=""
while IFS= read -r resource; do
  RESOURCE_FLAGS="$RESOURCE_FLAGS --resource $resource"
done <<< "$RESOURCES"

# Execute selective sync
echo "Syncing resources: $RESOURCES"
eval argocd app sync "$APP_NAME" $RESOURCE_FLAGS

# Wait for health
argocd app wait "$APP_NAME" --health --timeout 300
```

## Selective Sync with Retry

If a selective sync fails, you can retry with the `--retry-limit` flag.

```bash
# Selective sync with automatic retry
argocd app sync my-app \
  --resource apps:Deployment:web-server \
  --retry-limit 3 \
  --retry-backoff-duration 5s \
  --retry-backoff-max-duration 60s \
  --retry-backoff-factor 2
```

This retries the sync up to 3 times with exponential backoff, which is useful for transient failures like rate limiting or temporary API server issues.

## Checking Selective Sync Results

After a selective sync, verify the result.

```bash
# Check the sync status of the specific resource
argocd app resources my-app --output json | \
  jq '.[] | select(.kind == "Deployment" and .name == "web-server") | {status, health: .health.status}'

# Check the overall application status
argocd app get my-app

# View the last sync operation details
argocd app get my-app --show-operation
```

The application might still show as "OutOfSync" overall even after a selective sync, because other resources that were not included in the sync might still be out of sync. This is expected behavior.

## Limitations to Keep in Mind

Selective sync bypasses sync waves and hooks. PreSync and PostSync hooks do not execute during selective sync operations. If your deployment relies on hooks for database migrations or smoke tests, use a full sync instead.

Selective sync does not enforce resource dependencies. If you sync a Deployment without syncing the ConfigMap it references, and the ConfigMap changed, the Deployment will roll out with a mix of old and new configuration until you sync the ConfigMap too.

For more on the UI-based approach to selective sync, see the [selective sync from UI guide](https://oneuptime.com/blog/post/2026-02-26-argocd-selective-sync-ui/view). For the fundamentals of sync operations, check the [ArgoCD sync waves guide](https://oneuptime.com/blog/post/2026-02-09-argocd-sync-waves-ordered-deployments/view).
