# How to Sync Only Specific Resource Kinds in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Selective Sync, Resource Management

Description: Learn how to sync only Deployments, ConfigMaps, or other specific resource kinds in ArgoCD without affecting other resource types in the application.

---

Sometimes you need to update all Deployments in an application without touching the Services, Ingresses, or ConfigMaps. Or you need to sync all ConfigMaps after a configuration change without rolling out any Deployment changes. ArgoCD does not have a built-in `--kind` flag for sync operations, but you can achieve kind-based selective sync with a combination of CLI commands and scripting.

## Listing Resources by Kind

First, understand what resource kinds exist in your application.

```bash
# List all unique resource kinds in an application
argocd app resources my-app --output json | \
  jq -r '[.[] | .kind] | unique | .[]'

# Example output:
# ConfigMap
# Deployment
# HorizontalPodAutoscaler
# Ingress
# Namespace
# Secret
# Service
# ServiceAccount
```

## Syncing All Resources of a Specific Kind

To sync all Deployments in an application, extract them from the resource list and build the sync command.

```bash
# Sync all Deployments
argocd app resources my-app --output json | \
  jq -r '.[] | select(.kind == "Deployment") | "\(.group):\(.kind):\(.name)"' | \
  xargs -I{} echo "--resource {}" | \
  xargs argocd app sync my-app

# Sync all ConfigMaps
argocd app resources my-app --output json | \
  jq -r '.[] | select(.kind == "ConfigMap") | "\(.group):\(.kind):\(.name)"' | \
  xargs -I{} echo "--resource {}" | \
  xargs argocd app sync my-app

# Sync all Services
argocd app resources my-app --output json | \
  jq -r '.[] | select(.kind == "Service") | "\(.group):\(.kind):\(.name)"' | \
  xargs -I{} echo "--resource {}" | \
  xargs argocd app sync my-app
```

## A Reusable Script for Kind-Based Sync

Here is a shell script that makes kind-based sync easy and repeatable.

```bash
#!/bin/bash
# sync-by-kind.sh - Sync all resources of a specific kind
# Usage: ./sync-by-kind.sh APP_NAME KIND [--dry-run]

set -euo pipefail

APP_NAME="${1:?Usage: $0 APP_NAME KIND [--dry-run]}"
TARGET_KIND="${2:?Usage: $0 APP_NAME KIND [--dry-run]}"
DRY_RUN="${3:-}"

echo "Finding all $TARGET_KIND resources in $APP_NAME..."

# Get resources matching the specified kind
RESOURCES=$(argocd app resources "$APP_NAME" --output json | \
  jq -r --arg kind "$TARGET_KIND" \
  '.[] | select(.kind == $kind) | "\(.group):\(.kind):\(.name)"')

if [ -z "$RESOURCES" ]; then
  echo "No $TARGET_KIND resources found in $APP_NAME"
  exit 0
fi

# Count and display
COUNT=$(echo "$RESOURCES" | wc -l | tr -d ' ')
echo "Found $COUNT $TARGET_KIND resources:"
echo "$RESOURCES" | while read -r r; do echo "  - $r"; done

# Build resource flags
RESOURCE_FLAGS=""
while IFS= read -r resource; do
  RESOURCE_FLAGS="$RESOURCE_FLAGS --resource $resource"
done <<< "$RESOURCES"

# Execute sync
if [ "$DRY_RUN" = "--dry-run" ]; then
  echo ""
  echo "Dry run mode - showing what would change:"
  eval argocd app sync "$APP_NAME" $RESOURCE_FLAGS --dry-run
else
  echo ""
  echo "Syncing $COUNT $TARGET_KIND resources..."
  eval argocd app sync "$APP_NAME" $RESOURCE_FLAGS
  echo "Sync complete."
fi
```

Usage examples:

```bash
# Sync all Deployments
./sync-by-kind.sh my-app Deployment

# Sync all ConfigMaps with dry run
./sync-by-kind.sh my-app ConfigMap --dry-run

# Sync all Ingresses
./sync-by-kind.sh my-app Ingress

# Sync all StatefulSets
./sync-by-kind.sh my-app StatefulSet

# Sync all CRDs
./sync-by-kind.sh my-app CustomResourceDefinition
```

## Syncing Multiple Kinds Together

You might want to sync ConfigMaps and Secrets together, or Deployments and Services together.

```bash
#!/bin/bash
# sync-by-kinds.sh - Sync resources of multiple kinds
# Usage: ./sync-by-kinds.sh APP_NAME "Kind1,Kind2,Kind3"

set -euo pipefail

APP_NAME="${1:?Usage: $0 APP_NAME \"Kind1,Kind2\"}"
TARGET_KINDS="${2:?Usage: $0 APP_NAME \"Kind1,Kind2\"}"

# Convert comma-separated kinds to jq filter
JQ_FILTER=$(echo "$TARGET_KINDS" | tr ',' '\n' | \
  sed 's/.*/.kind == "&"/' | paste -sd '|' -)

RESOURCES=$(argocd app resources "$APP_NAME" --output json | \
  jq -r --argjson dummy 0 \
  ".[] | select($JQ_FILTER) | \"\(.group):\(.kind):\(.name)\"")

if [ -z "$RESOURCES" ]; then
  echo "No matching resources found"
  exit 0
fi

echo "Resources to sync:"
echo "$RESOURCES"

RESOURCE_FLAGS=""
while IFS= read -r resource; do
  RESOURCE_FLAGS="$RESOURCE_FLAGS --resource $resource"
done <<< "$RESOURCES"

eval argocd app sync "$APP_NAME" $RESOURCE_FLAGS
```

Usage:

```bash
# Sync all ConfigMaps and Secrets
./sync-by-kinds.sh my-app "ConfigMap,Secret"

# Sync all Deployments and Services
./sync-by-kinds.sh my-app "Deployment,Service"

# Sync all RBAC resources
./sync-by-kinds.sh my-app "Role,RoleBinding,ClusterRole,ClusterRoleBinding,ServiceAccount"
```

## Syncing OutOfSync Resources of a Specific Kind

Combine kind filtering with sync status filtering for even more precision.

```bash
# Sync only out-of-sync Deployments
argocd app resources my-app --output json | \
  jq -r '.[] | select(.kind == "Deployment" and .status == "OutOfSync") | "\(.group):\(.kind):\(.name)"' | \
  xargs -I{} echo "--resource {}" | \
  xargs argocd app sync my-app
```

This is useful after a batch of configuration changes where multiple Deployments are out of sync but you want to roll them out one kind at a time.

## Common Use Cases for Kind-Based Sync

### Configuration rollout

You updated several ConfigMaps and Secrets but the corresponding Deployments have not changed yet. Sync the configuration resources first, then trigger rollout restarts.

```bash
# Step 1: Sync all ConfigMaps
./sync-by-kind.sh my-app ConfigMap

# Step 2: Sync all Secrets
./sync-by-kind.sh my-app Secret

# Step 3: Restart all Deployments to pick up new config
kubectl get deployments -n production -o name | \
  xargs -I{} kubectl rollout restart {} -n production
```

### RBAC update

Security team updated roles and permissions. Sync all RBAC resources without touching workloads.

```bash
./sync-by-kinds.sh my-app "ServiceAccount,Role,RoleBinding,ClusterRole,ClusterRoleBinding"
```

### Networking changes

Updated Ingress rules and Services. Sync networking resources separately from application code.

```bash
./sync-by-kinds.sh my-app "Service,Ingress,NetworkPolicy"
```

### CRD updates

Before syncing Custom Resources, update all CRDs first.

```bash
# Step 1: Sync all CRDs
./sync-by-kind.sh my-app CustomResourceDefinition

# Step 2: Wait for CRDs to be established
sleep 10

# Step 3: Sync Custom Resources
./sync-by-kinds.sh my-app "Certificate,Issuer,ServiceMonitor"
```

## Integration with CI/CD Pipelines

Kind-based sync integrates naturally into CI/CD pipelines with staged deployment strategies.

```yaml
# GitLab CI example
stages:
  - sync-config
  - sync-workloads
  - sync-networking

sync-configmaps:
  stage: sync-config
  script:
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web
    - ./scripts/sync-by-kinds.sh production-app "ConfigMap,Secret"

sync-deployments:
  stage: sync-workloads
  script:
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web
    - ./scripts/sync-by-kind.sh production-app Deployment
    - argocd app wait production-app --health --timeout 300

sync-ingress:
  stage: sync-networking
  script:
    - argocd login $ARGOCD_SERVER --auth-token $ARGOCD_TOKEN --grpc-web
    - ./scripts/sync-by-kinds.sh production-app "Service,Ingress"
```

This pipeline syncs configuration first, then workloads, then networking, in separate stages. If any stage fails, subsequent stages do not execute, preventing partial deployments.

## Limitations

Kind-based sync does not respect sync waves. When you manually select resources to sync, ArgoCD applies them without wave ordering. If your application relies on sync waves for dependency ordering, consider whether kind-based sync might break that ordering.

Kind-based sync also does not execute hooks. PreSync and PostSync hooks only run during full application syncs. If your deployment relies on hooks for database migrations or smoke tests, use a full sync instead.

For the general selective sync approach, see the [selective sync CLI guide](https://oneuptime.com/blog/post/2026-02-26-argocd-selective-sync-cli/view). For filtering resources more broadly, check the [resource filters guide](https://oneuptime.com/blog/post/2026-02-26-argocd-resource-filters-for-sync/view).
