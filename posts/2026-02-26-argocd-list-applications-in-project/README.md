# How to List All Applications in a Project in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Operation, CLI

Description: Learn how to list, filter, and query ArgoCD applications by project using the CLI, API, kubectl, and UI, with practical examples for daily operations and automation scripts.

---

Listing applications by project is one of the most common operations in a multi-tenant ArgoCD environment. Whether you need to audit what is deployed, check health status across a team's applications, or script automated workflows, knowing how to query applications by project is essential.

This guide covers every method for listing project applications, from simple CLI commands to advanced API queries.

## Using the ArgoCD CLI

### Basic Listing

```bash
# List all applications in a specific project

argocd app list --project backend

# Output:
# NAME               CLUSTER                         NAMESPACE      PROJECT  STATUS  HEALTH   SYNCPOLICY  CONDITIONS
# backend-api        https://kubernetes.default.svc  backend-prod   backend  Synced  Healthy  Auto        <none>
# backend-worker     https://kubernetes.default.svc  backend-prod   backend  Synced  Healthy  Auto        <none>
# backend-api-dev    https://kubernetes.default.svc  backend-dev    backend  Synced  Healthy  Auto        <none>
```

### Output Formats

```bash
# Just application names
argocd app list --project backend -o name
# Output:
# argocd/backend-api
# argocd/backend-worker
# argocd/backend-api-dev

# JSON output for scripting
argocd app list --project backend -o json

# YAML output
argocd app list --project backend -o yaml

# Wide output with more columns
argocd app list --project backend -o wide
```

### Filtering by Status

Filter the JSON output by status:

```bash
# List only out-of-sync applications in the backend project
argocd app list --project backend -o json | \
  jq -r '.[] | select(.status.sync.status == "OutOfSync") | .metadata.name'

# List only unhealthy applications
argocd app list --project backend -o json | \
  jq -r '.[] | select(.status.health.status == "Degraded") | .metadata.name'
argocd app list --project backend -o json | \
  jq -r '.[] | select(.status.health.status == "Missing") | .metadata.name'

# List applications with sync errors
argocd app list --project backend -o json | \
  jq -r '.[] | select(.status.sync.status == "Unknown") | .metadata.name'
```

### Extracting Specific Fields with JSON

```bash
# Get names and sync status
argocd app list --project backend -o json | \
  jq '.[] | {name: .metadata.name, sync: .status.sync.status, health: .status.health.status}'

# Get names and destination namespaces
argocd app list --project backend -o json | \
  jq '.[] | {name: .metadata.name, namespace: .spec.destination.namespace}'

# Get names and source repos
argocd app list --project backend -o json | \
  jq '.[] | {name: .metadata.name, repo: .spec.source.repoURL}'

# Count by health status
argocd app list --project backend -o json | \
  jq '[.[].status.health.status] | sort | group_by(.) | map({status: .[0], count: length})'
```

## Using kubectl

### List Applications by Project

```bash
# ArgoCD applications are Kubernetes custom resources
kubectl get applications -n argocd \
  -o custom-columns=NAME:.metadata.name,PROJECT:.spec.project,SYNC:.status.sync.status,HEALTH:.status.health.status | \
  awk 'NR == 1 || $2 == "backend"'

# Or use jsonpath to filter
kubectl get applications -n argocd \
  -o jsonpath='{range .items[?(@.spec.project=="backend")]}{.metadata.name}{"\t"}{.status.sync.status}{"\t"}{.status.health.status}{"\n"}{end}'
```

### Using Field Selectors and Labels

ArgoCD does not add project labels by default, but you can add them to your applications:

```yaml
metadata:
  labels:
    argocd.argoproj.io/project: backend
```

Then filter by label:

```bash
kubectl get applications -n argocd -l argocd.argoproj.io/project=backend
```

### JSONPath Queries

```bash
# Get all app names in a project
kubectl get applications -n argocd -o json | \
  jq -r '.items[] | select(.spec.project == "backend") | .metadata.name'

# Get detailed status for a project's apps
kubectl get applications -n argocd -o json | \
  jq '.items[] | select(.spec.project == "backend") | {
    name: .metadata.name,
    sync: .status.sync.status,
    health: .status.health.status,
    revision: .status.sync.revision[0:7],
    namespace: .spec.destination.namespace
  }'
```

## Using the ArgoCD API

### REST API

```bash
# Set up authentication
TOKEN="your-argocd-token"
SERVER="https://argocd.example.com"

# List applications in a project
curl -s "$SERVER/api/v1/applications?project=backend" \
  -H "Authorization: Bearer $TOKEN" | jq '.items[].metadata.name'

# Get detailed application info
curl -s "$SERVER/api/v1/applications?project=backend" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.items[] | {name: .metadata.name, sync: .status.sync.status}'
```

### Using Query Parameters

The API supports several filtering parameters:

```bash
# Filter by project and repo
curl -s "$SERVER/api/v1/applications?project=backend&repo=https://github.com/my-org/backend-api.git" \
  -H "Authorization: Bearer $TOKEN"

# Filter by project and namespace
curl -s "$SERVER/api/v1/applications?project=backend&appNamespace=argocd" \
  -H "Authorization: Bearer $TOKEN"
```

## Using the ArgoCD UI

In the ArgoCD web interface:

1. Open the Applications page
2. Use the filter panel on the left side
3. Under "Projects", select the project name
4. The list updates to show only applications in that project

You can also combine filters:

- Project + Health Status
- Project + Sync Status
- Project + Cluster
- Project + Namespace

## Practical Automation Scripts

### Daily Health Check

```bash
#!/bin/bash
# project-health-check.sh <project-name>

PROJECT=$1
echo "=== Health Check: $PROJECT ==="
echo "Time: $(date)"
echo ""

# Summary
APPS_JSON=$(argocd app list --project "$PROJECT" -o json)
TOTAL=$(echo "$APPS_JSON" | jq 'length')
SYNCED=$(echo "$APPS_JSON" | jq '[.[] | select(.status.sync.status == "Synced")] | length')
OUT_OF_SYNC=$(echo "$APPS_JSON" | jq '[.[] | select(.status.sync.status == "OutOfSync")] | length')
HEALTHY=$(echo "$APPS_JSON" | jq '[.[] | select(.status.health.status == "Healthy")] | length')
DEGRADED=$(echo "$APPS_JSON" | jq '[.[] | select(.status.health.status == "Degraded")] | length')

echo "Total applications: $TOTAL"
echo "Synced: $SYNCED"
echo "Out of sync: $OUT_OF_SYNC"
echo "Healthy: $HEALTHY"
echo "Degraded: $DEGRADED"

# List problems
if [ "$OUT_OF_SYNC" -gt 0 ]; then
  echo ""
  echo "=== Out of Sync Applications ==="
  echo "$APPS_JSON" | jq -r '.[] | select(.status.sync.status == "OutOfSync") | .metadata.name'
fi

if [ "$DEGRADED" -gt 0 ]; then
  echo ""
  echo "=== Degraded Applications ==="
  echo "$APPS_JSON" | jq -r '.[] | select(.status.health.status == "Degraded") | .metadata.name'
fi
```

### Cross-Project Summary

```bash
#!/bin/bash
# all-projects-summary.sh

echo "=== ArgoCD Project Summary ==="
echo "Time: $(date)"
echo ""

printf "%-20s %-8s %-8s %-10s %-10s\n" "PROJECT" "TOTAL" "SYNCED" "HEALTHY" "DEGRADED"
printf "%-20s %-8s %-8s %-10s %-10s\n" "-------" "-----" "------" "-------" "--------"

for PROJECT in $(argocd proj list -o json | jq -r '.[].metadata.name'); do
  APPS_JSON=$(argocd app list --project "$PROJECT" -o json 2>/dev/null)
  TOTAL=$(echo "$APPS_JSON" | jq 'length')
  SYNCED=$(echo "$APPS_JSON" | jq '[.[] | select(.status.sync.status == "Synced")] | length')
  HEALTHY=$(echo "$APPS_JSON" | jq '[.[] | select(.status.health.status == "Healthy")] | length')
  DEGRADED=$(echo "$APPS_JSON" | jq '[.[] | select(.status.health.status == "Degraded")] | length')

  printf "%-20s %-8s %-8s %-10s %-10s\n" "$PROJECT" "$TOTAL" "$SYNCED" "$HEALTHY" "$DEGRADED"
done
```

### Sync All Applications in a Project

```bash
#!/bin/bash
# sync-project.sh <project-name>

PROJECT=$1
echo "Syncing all applications in project: $PROJECT"

for APP in $(argocd app list --project "$PROJECT" -o name); do
  echo "Syncing $APP..."
  argocd app sync "$APP" --async
done

echo ""
echo "All syncs triggered. Waiting for completion..."

for APP in $(argocd app list --project "$PROJECT" -o name); do
  argocd app wait "$APP" --timeout 300 2>/dev/null
  STATUS=$?
  if [ $STATUS -eq 0 ]; then
    echo "  $APP: OK"
  else
    echo "  $APP: FAILED"
  fi
done
```

## Monitoring with Prometheus

If you use Prometheus to monitor ArgoCD, query application metrics by project:

```promql
# Count applications by project
count by (project) (argocd_app_info)

# Count unhealthy apps by project
count by (project) (argocd_app_info{health_status!="Healthy"})

# Count out-of-sync apps by project
count by (project) (argocd_app_info{sync_status="OutOfSync"})
```

### Grafana Dashboard Query

```promql
# Application health distribution for a specific project
count by (health_status) (argocd_app_info{project="backend"})
```

## Tips for Large-Scale Environments

**Performance**: With thousands of applications, `argocd app list --project X` might be slow. Use the API with server-side filters such as project, repo, label selector, or application namespace:

```bash
# API supports list filters
curl -s "$SERVER/api/v1/applications?project=backend&selector=team%3Dbackend" \
  -H "Authorization: Bearer $TOKEN"
```

**Caching**: For dashboards that query frequently, cache the results:

```bash
# Cache results for 5 minutes
CACHE_FILE="/tmp/argocd-${PROJECT}-apps.json"
if [ ! -f "$CACHE_FILE" ] || [ $(find "$CACHE_FILE" -mmin +5 2>/dev/null) ]; then
  argocd app list --project "$PROJECT" -o json > "$CACHE_FILE"
fi
cat "$CACHE_FILE"
```

## Summary

Listing applications by project is essential for day-to-day ArgoCD operations. Use `argocd app list --project` for quick checks, `kubectl get applications` with jq for detailed queries, and the REST API for automation. Build scripts for common operations like health checks, project summaries, and batch syncs. In monitoring environments, use Prometheus queries filtered by the project label to track application health across teams.
