# How to List Applications via ArgoCD API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, REST API, Application

Description: Learn how to list and filter ArgoCD applications using the REST API with practical examples for querying, filtering, and processing application data.

---

Listing applications is one of the most common ArgoCD API operations. Whether you are building a custom dashboard, generating reports, or scripting bulk operations, the applications list endpoint is your starting point. The ArgoCD API provides rich filtering capabilities that go far beyond a simple list, letting you query applications by project, label, name pattern, and more.

## Basic Application Listing

The simplest call returns all applications your token has access to:

```bash
# List all applications
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  https://argocd.example.com/api/v1/applications | jq .
```

The response is a JSON object with an `items` array containing full application specs and status:

```json
{
  "metadata": {},
  "items": [
    {
      "metadata": {
        "name": "my-app",
        "namespace": "argocd",
        "labels": {
          "team": "backend",
          "env": "production"
        }
      },
      "spec": {
        "project": "default",
        "source": {
          "repoURL": "https://github.com/org/repo.git",
          "path": "manifests",
          "targetRevision": "main"
        },
        "destination": {
          "server": "https://kubernetes.default.svc",
          "namespace": "my-namespace"
        }
      },
      "status": {
        "sync": { "status": "Synced" },
        "health": { "status": "Healthy" }
      }
    }
  ]
}
```

## Filtering Applications

### Filter by Project

Narrow down to applications in a specific project:

```bash
# List applications in the "production" project
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?project=production" | jq '.items[].metadata.name'
```

You can specify multiple projects:

```bash
# List applications in production or staging projects
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?project=production&project=staging"
```

### Filter by Label Selector

Label selectors work just like Kubernetes label selectors:

```bash
# Find all applications with team=backend label
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?selector=team%3Dbackend"

# Find applications matching multiple labels
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?selector=team%3Dbackend,env%3Dproduction"

# Find applications NOT in staging
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?selector=env%21%3Dstaging"
```

### Filter by Name Pattern

Search for applications by name:

```bash
# Search by name (substring match)
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?search=frontend"
```

### Filter by Repository

Find applications sourced from a specific repository:

```bash
# Filter by repo URL
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?repo=https://github.com/org/repo.git"
```

## Controlling Response Fields

The full application response can be quite large. Use the `fields` parameter to limit what is returned:

```bash
# Get only metadata and sync status (much smaller response)
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?fields=items.metadata.name,items.status.sync.status,items.status.health.status"
```

This is particularly important when you have hundreds of applications - a full response with all resources can be several megabytes.

## Practical Examples

### Get a Quick Status Overview

```bash
#!/bin/bash
# status-overview.sh - Quick status overview of all applications

ARGOCD_SERVER="https://argocd.example.com"

# Fetch all applications with minimal fields
APPS=$(curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "$ARGOCD_SERVER/api/v1/applications")

# Count applications by sync status
echo "=== Sync Status ==="
echo "$APPS" | jq -r '.items[].status.sync.status' | sort | uniq -c | sort -rn

# Count applications by health status
echo ""
echo "=== Health Status ==="
echo "$APPS" | jq -r '.items[].status.health.status' | sort | uniq -c | sort -rn

# List unhealthy applications
echo ""
echo "=== Unhealthy Applications ==="
echo "$APPS" | jq -r '.items[] | select(.status.health.status != "Healthy") | "\(.metadata.name): \(.status.health.status)"'
```

Sample output:

```
=== Sync Status ===
  45 Synced
   3 OutOfSync
   1 Unknown

=== Health Status ===
  42 Healthy
   5 Progressing
   2 Degraded

=== Unhealthy Applications ===
payment-service: Degraded
analytics-worker: Progressing
```

### Find OutOfSync Applications

```bash
# List all applications that are OutOfSync
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications" | \
  jq -r '.items[] | select(.status.sync.status == "OutOfSync") | {
    name: .metadata.name,
    project: .spec.project,
    revision: .status.sync.revision,
    targetRevision: .spec.source.targetRevision
  }'
```

### Generate a CSV Report

```bash
#!/bin/bash
# generate-report.sh - Generate a CSV report of all applications

echo "Name,Project,Sync Status,Health Status,Repo,Target Revision"

curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications" | \
  jq -r '.items[] | [
    .metadata.name,
    .spec.project,
    .status.sync.status,
    .status.health.status,
    .spec.source.repoURL,
    .spec.source.targetRevision
  ] | @csv'
```

### Python Client for Listing

For more complex queries, use Python:

```python
import requests
from collections import Counter

def list_apps(server, token, project=None, selector=None):
    """List applications with optional filtering."""
    params = {}
    if project:
        params["project"] = project
    if selector:
        params["selector"] = selector

    resp = requests.get(
        f"{server}/api/v1/applications",
        headers={"Authorization": f"Bearer {token}"},
        params=params,
        verify=False
    )
    resp.raise_for_status()
    return resp.json().get("items", [])

# Get all production apps
apps = list_apps("https://argocd.example.com", token, project="production")

# Summarize health status
health_counts = Counter(app["status"]["health"]["status"] for app in apps)
for status, count in health_counts.most_common():
    print(f"  {status}: {count}")

# Find apps targeting a specific branch
staging_apps = [
    app for app in apps
    if app["spec"]["source"].get("targetRevision") == "staging"
]
print(f"\nApps tracking staging branch: {len(staging_apps)}")
```

## Handling Large Application Lists

When you have hundreds or thousands of applications, performance matters:

```bash
# Use the appNamespace parameter to scope queries
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?appNamespace=argocd"

# Combine filters to reduce response size
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications?project=production&selector=tier%3Dfrontend"
```

## Watching for Application Changes

For real-time monitoring, use the watch endpoint:

```bash
# Watch for application changes (server-sent events)
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/stream/applications?name=my-app"
```

This returns a stream of events whenever the application state changes, which is much more efficient than polling. For more on this approach, see our guide on [ArgoCD Server-Sent Events](https://oneuptime.com/blog/post/2026-02-26-argocd-server-sent-events-api/view).

## Error Handling

Always handle common error scenarios:

```bash
# Robust listing with error handling
RESPONSE=$(curl -s -k -w "\n%{http_code}" \
  -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

case $HTTP_CODE in
  200) echo "$BODY" | jq '.items | length' ;;
  401) echo "ERROR: Authentication failed - check your token" ;;
  403) echo "ERROR: Permission denied - check RBAC" ;;
  *) echo "ERROR: Unexpected status $HTTP_CODE" ;;
esac
```

The applications list endpoint is foundational to ArgoCD automation. Combined with filtering and field selection, it provides efficient access to your application inventory. Use it to build dashboards, generate reports, trigger bulk operations, or monitor your GitOps fleet.
