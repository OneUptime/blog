# How to Use argocd app resources to List Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Resource Management

Description: Learn how to use argocd app resources to list, inspect, and manage all Kubernetes resources tracked by an ArgoCD application with filtering and output options.

---

The `argocd app resources` command gives you a focused view of the Kubernetes resources managed by an ArgoCD application. Unlike `argocd app get` which shows everything, this command focuses specifically on the resource inventory, making it ideal for understanding what an application actually manages in the cluster.

## Basic Usage

```bash
argocd app resources my-app
```

This lists first-level resources managed by the application:

```text
GROUP        KIND            NAMESPACE   NAME                STATUS   HEALTH   HOOK
             Service         my-app-ns   my-app-svc          Synced   Healthy
             ConfigMap       my-app-ns   app-config           Synced   Healthy
             Secret          my-app-ns   app-secrets          Synced   Healthy
apps         Deployment      my-app-ns   my-app              Synced   Healthy
autoscaling  HorizontalPodAutoscaler my-app-ns   my-app-hpa  Synced   Healthy
networking.k8s.io Ingress    my-app-ns   my-app-ingress      Synced   Healthy
```

## Output Formats

### Table (Default)

```bash
argocd app resources my-app
```

### Tree

```bash
argocd app resources my-app --output tree
```

### Detailed Tree

```bash
argocd app resources my-app --output tree=detailed
```

For JSON output and `jq` automation, use `argocd app get -o json` and read the resource list from `.status.resources`:

```bash
# Get resource names only
argocd app get my-app -o json | jq '.status.resources[].name'

# Get resources with their health status
argocd app get my-app -o json | jq '.status.resources[] | {kind: .kind, name: .name, health: .health.status}'

# Filter to unhealthy resources
argocd app get my-app -o json | jq '.status.resources[] | select(.health.status != null and .health.status != "Healthy")'

# Count resources by kind
argocd app get my-app -o json | jq '[.status.resources[].kind] | group_by(.) | map({kind: .[0], count: length})'
```

## Filtering Resources

Filter the resource list with `jq`:

### By Kind

```bash
# List only Deployments
argocd app get my-app -o json | jq '.status.resources[] | select(.kind == "Deployment")'

# List only Services
argocd app get my-app -o json | jq '.status.resources[] | select(.kind == "Service")'

# List only ConfigMaps
argocd app get my-app -o json | jq '.status.resources[] | select(.kind == "ConfigMap")'
```

### By Group

```bash
# List only resources in the apps group
argocd app get my-app -o json | jq '.status.resources[] | select(.group == "apps")'

# List core resources (empty group)
argocd app get my-app -o json | jq '.status.resources[] | select((.group // "") == "")'

# List networking resources
argocd app get my-app -o json | jq '.status.resources[] | select(.group == "networking.k8s.io")'
```

### By Namespace

```bash
# List resources in a specific namespace
argocd app get my-app -o json | jq '.status.resources[] | select(.namespace == "my-app-ns")'
```

### Combined Filters

```bash
# List Deployments in the apps group
argocd app get my-app -o json | jq '.status.resources[] | select(.kind == "Deployment" and .group == "apps")'

# List Services in a specific namespace
argocd app get my-app -o json | jq '.status.resources[] | select(.kind == "Service" and .namespace == "production")'
```

## Practical Use Cases

Resource Inventory Report

```bash
#!/bin/bash
# resource-inventory.sh - Generate resource inventory for an application

APP_NAME="${1:?Usage: resource-inventory.sh <app-name>}"

echo "=== Resource Inventory: $APP_NAME ==="
echo ""

# Total count
TOTAL=$(argocd app get "$APP_NAME" -o json | jq '.status.resources | length')
echo "Total resources: $TOTAL"
echo ""

# Breakdown by kind
echo "By Kind:"
argocd app get "$APP_NAME" -o json | jq -r '[.status.resources[].kind] | group_by(.) | .[] | "  \(.[0]): \(length)"'
echo ""

# Breakdown by health
echo "By Health Status:"
argocd app get "$APP_NAME" -o json | jq -r '[.status.resources[] | .health.status // "N/A"] | group_by(.) | .[] | "  \(.[0]): \(length)"'
echo ""

# Breakdown by sync status
echo "By Sync Status:"
argocd app get "$APP_NAME" -o json | jq -r '[.status.resources[].status] | group_by(.) | .[] | "  \(.[0]): \(length)"'
```

### Finding Problematic Resources

```bash
#!/bin/bash
# find-issues.sh - Find resources with issues

APP_NAME="${1:?Usage: find-issues.sh <app-name>}"

echo "=== Resource Issues: $APP_NAME ==="
echo ""

# OutOfSync resources
echo "OutOfSync Resources:"
argocd app get "$APP_NAME" -o json | jq -r '.status.resources[] | select(.status == "OutOfSync") | "  \(.kind)/\(.name) in \(.namespace)"'
echo ""

# Unhealthy resources
echo "Unhealthy Resources:"
argocd app get "$APP_NAME" -o json | jq -r '.status.resources[] | select(.health.status != null and .health.status != "Healthy") | "  \(.kind)/\(.name) - \(.health.status): \(.health.message // "no message")"'
echo ""

# Missing resources
echo "Missing Resources:"
argocd app get "$APP_NAME" -o json | jq -r '.status.resources[] | select(.health.status == "Missing") | "  \(.kind)/\(.name)"'
```

### Cross-Application Resource Check

Find which application owns a specific resource:

```bash
#!/bin/bash
# find-resource-owner.sh - Find which app owns a resource

RESOURCE_NAME="${1:?Usage: find-resource-owner.sh <resource-name>}"

echo "Looking for resource: $RESOURCE_NAME"
echo ""

for app in $(argocd app list -o name); do
  FOUND=$(argocd app get "$app" -o json 2>/dev/null | jq -r ".status.resources[] | select(.name == \"$RESOURCE_NAME\") | .name")
  if [ -n "$FOUND" ]; then
    echo "Found in application: $app"
    argocd app get "$app" -o json | jq ".status.resources[] | select(.name == \"$RESOURCE_NAME\")"
  fi
done
```

### Comparing Resources Across Environments

```bash
#!/bin/bash
# compare-resources.sh - Compare resources between two environments

APP_STAGING="${1:?Usage: compare-resources.sh <staging-app> <production-app>}"
APP_PROD="${2:?Usage: compare-resources.sh <staging-app> <production-app>}"

echo "=== Resource Comparison ==="
echo "Staging:    $APP_STAGING"
echo "Production: $APP_PROD"
echo ""

STAGING_RESOURCES=$(argocd app get "$APP_STAGING" -o json | jq -r '.status.resources[] | "\(.group // "")/\(.kind)/\(.namespace // "")/\(.name)"' | sort)
PROD_RESOURCES=$(argocd app get "$APP_PROD" -o json | jq -r '.status.resources[] | "\(.group // "")/\(.kind)/\(.namespace // "")/\(.name)"' | sort)

echo "In staging but not in production:"
diff <(echo "$STAGING_RESOURCES") <(echo "$PROD_RESOURCES") | grep "^<" | sed 's/^< /  /'

echo ""
echo "In production but not in staging:"
diff <(echo "$STAGING_RESOURCES") <(echo "$PROD_RESOURCES") | grep "^>" | sed 's/^> /  /'
```

Resource Actions from Resources List

After identifying resources with `argocd app resources`, you can take action on specific ones:

```bash
# List resources to identify the target
argocd app resources my-app

# Sync a specific resource
argocd app sync my-app --resource 'apps:Deployment:my-app'

# Delete a specific managed resource
argocd app delete-resource my-app --group apps --kind Deployment --resource-name my-app

# Execute an action on a specific resource
argocd app actions run my-app restart --group apps --kind Deployment --resource-name my-app
```

## Monitoring Resource Health

Build a monitoring check using resource information:

```bash
#!/bin/bash
# check-resources.sh - Resource health monitoring check

EXIT_CODE=0

for app in $(argocd app list -l environment=production -o name); do
  UNHEALTHY=$(argocd app get "$app" -o json 2>/dev/null | \
    jq '[.status.resources[] | select(.health.status != null and .health.status != "Healthy")] | length')

  if [ "$UNHEALTHY" -gt 0 ]; then
    echo "ALERT: $app has $UNHEALTHY unhealthy resources"
    argocd app get "$app" -o json | \
      jq -r '.status.resources[] | select(.health.status != null and .health.status != "Healthy") | "  \(.kind)/\(.name): \(.health.status)"'
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "All production resources are healthy"
fi

exit $EXIT_CODE
```

## Understanding Resource Groups

Resources are organized by API group, which maps to the Kubernetes API:

| Group | Kinds |
|---|---|
| (empty) | Service, ConfigMap, Secret, Namespace, Pod, PersistentVolumeClaim |
| apps | Deployment, StatefulSet, DaemonSet, ReplicaSet |
| batch | Job, CronJob |
| networking.k8s.io | Ingress, NetworkPolicy |
| autoscaling | HorizontalPodAutoscaler |
| rbac.authorization.k8s.io | Role, RoleBinding, ClusterRole |
| policy | PodDisruptionBudget |

Use these group values when filtering JSON data or when running commands that accept `--group`, such as `argocd app get-resource`, `argocd app delete-resource`, and `argocd app actions run`.

## Exporting Resource Information

```bash
# Export full resource inventory to CSV
argocd app get my-app -o json | jq -r '
  ["Group","Kind","Namespace","Name","Status","Health"] as $headers |
  ($headers | @csv),
  (.status.resources[] | [.group, .kind, .namespace, .name, .status, (.health.status // "N/A")] | @csv)
' > resources.csv
```

## Summary

The `argocd app resources` command provides a clean, focused view of resources managed by an ArgoCD application. Use it for quick inventory checks and tree views, and use `argocd app get -o json` with `jq` for health monitoring, resource ownership discovery, and environment comparisons. For day-to-day operations, it answers the fundamental question: "What is this ArgoCD application actually managing in my cluster?"
