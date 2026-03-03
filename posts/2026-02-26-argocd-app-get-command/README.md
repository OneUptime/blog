# How to Use argocd app get for Detailed App Info

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Troubleshooting

Description: Master the argocd app get command to inspect application details, health status, sync state, resource trees, and conditions for effective troubleshooting.

---

While `argocd app list` gives you the 30,000-foot view, `argocd app get` is your zoom lens. It provides deep detail about a single application, from its sync status and health to the individual resources it manages. This command is the first thing you reach for when troubleshooting a deployment issue.

## Basic Usage

```bash
argocd app get my-app
```

This produces a comprehensive output showing the application's configuration and current state:

```text
Name:               argocd/my-app
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          my-app-ns
URL:                https://argocd.example.com/applications/my-app
Repo:               https://github.com/my-org/manifests.git
Target:             HEAD
Path:               apps/my-app
SyncWindow:         Sync Allowed
Sync Policy:        Automated (Prune)
Sync Status:        Synced to HEAD (a1b2c3d)
Health Status:      Healthy

GROUP  KIND        NAMESPACE   NAME           STATUS  HEALTH   HOOK  MESSAGE
       Service     my-app-ns   my-app-svc     Synced  Healthy        service/my-app-svc configured
apps   Deployment  my-app-ns   my-app         Synced  Healthy        deployment.apps/my-app configured
       ConfigMap   my-app-ns   my-app-config  Synced  Healthy        configmap/my-app-config configured
```

## The Refresh Flag

By default, `argocd app get` returns the cached state. To force a fresh comparison against the Git repository:

```bash
# Normal refresh - compare against cached Git state
argocd app get my-app --refresh

# Hard refresh - re-fetch from Git, re-render manifests, then compare
argocd app get my-app --hard-refresh
```

The difference matters:

- **--refresh**: Uses the locally cached Git checkout but re-runs the diff against live state
- **--hard-refresh**: Pulls the latest from the Git repository, regenerates all manifests (Helm template, Kustomize build, etc.), and then compares

Use `--hard-refresh` when you suspect the cache is stale, or after pushing changes to Git and not wanting to wait for the polling interval.

## Output Formats

### Table (Default)

```bash
argocd app get my-app
```

Human-readable format showing all sections.

### JSON

```bash
argocd app get my-app -o json
```

Full application spec and status as JSON. This is essential for scripting:

```bash
# Get just the sync status
argocd app get my-app -o json | jq '.status.sync.status'

# Get the current deployed revision
argocd app get my-app -o json | jq '.status.sync.revision'

# Get health status with message
argocd app get my-app -o json | jq '{health: .status.health.status, message: .status.health.message}'

# Get all resource statuses
argocd app get my-app -o json | jq '.status.resources[] | {kind: .kind, name: .name, health: .health.status, sync: .status}'
```

### YAML

```bash
argocd app get my-app -o yaml
```

Same as JSON but in YAML format.

### Tree (Resource Hierarchy)

```bash
argocd app get my-app -o tree
```

Shows the resource hierarchy, including owner references:

```text
my-app
├── Service/my-app-ns/my-app-svc
├── Deployment/my-app-ns/my-app
│   └── ReplicaSet/my-app-ns/my-app-7f8b9c6d5
│       ├── Pod/my-app-ns/my-app-7f8b9c6d5-abc12
│       └── Pod/my-app-ns/my-app-7f8b9c6d5-def34
└── ConfigMap/my-app-ns/my-app-config
```

### Wide Tree

```bash
argocd app get my-app -o tree --show-operation
```

The tree view with additional columns for sync and health information.

## Understanding the Output Sections

### Application Header

The top section shows the application's configuration:

```text
Name:           argocd/my-app          # namespace/name
Project:        default                 # ArgoCD project
Server:         https://kubernetes...   # Destination cluster
Namespace:      my-app-ns              # Destination namespace
URL:            https://argocd...       # UI link
Repo:           https://github.com/...  # Git repository
Target:         HEAD                    # Target revision
Path:           apps/my-app            # Path in repo
```

### Sync Information

```text
Sync Policy:    Automated (Prune)       # Auto-sync with pruning
Sync Status:    Synced to HEAD (a1b2c3d) # Current sync state and revision
```

Possible sync statuses:
- **Synced** - Live state matches desired state
- **OutOfSync** - Live state differs from desired state
- **Unknown** - Cannot determine sync status

### Health Information

```text
Health Status:  Healthy
```

Possible health statuses:
- **Healthy** - All resources are healthy
- **Progressing** - Resources are being updated
- **Degraded** - One or more resources are in a degraded state
- **Suspended** - Application is suspended (paused rollout)
- **Missing** - Resources are missing
- **Unknown** - Health cannot be determined

### Resource Table

The bottom section lists every managed resource:

```text
GROUP  KIND        NAMESPACE   NAME           STATUS  HEALTH   HOOK  MESSAGE
apps   Deployment  my-app-ns   my-app         Synced  Healthy        deployment configured
       Service     my-app-ns   my-app-svc     Synced  Healthy        service configured
```

## Troubleshooting with argocd app get

### Finding Why an Application Is OutOfSync

```bash
# Get the app status and look for sync details
argocd app get my-app -o json | jq '.status.sync'

# Check individual resource sync statuses
argocd app get my-app -o json | jq '.status.resources[] | select(.status == "OutOfSync") | {kind, name, namespace}'
```

### Finding Why an Application Is Degraded

```bash
# Check health details for each resource
argocd app get my-app -o json | jq '.status.resources[] | select(.health.status != "Healthy") | {kind, name, health: .health}'

# Check for conditions (errors, warnings)
argocd app get my-app -o json | jq '.status.conditions'
```

### Checking Operation State

After a sync operation, check its result:

```bash
# Get the last operation result
argocd app get my-app -o json | jq '.status.operationState'

# Get just the phase and message
argocd app get my-app -o json | jq '{phase: .status.operationState.phase, message: .status.operationState.message}'

# Check sync result details
argocd app get my-app -o json | jq '.status.operationState.syncResult.resources[] | select(.status != "Synced")'
```

### Checking Sync Windows

```bash
# Check if sync is currently allowed
argocd app get my-app -o json | jq '.status.summary'
```

## Practical Diagnostic Script

Here is a script that performs a comprehensive diagnostic check on an application:

```bash
#!/bin/bash
# app-diagnostic.sh - Run diagnostic checks on an ArgoCD application

APP="${1:?Usage: app-diagnostic.sh <app-name>}"

echo "=== Diagnostic Report for: $APP ==="
echo ""

# Fetch application data once
DATA=$(argocd app get "$APP" -o json --hard-refresh 2>&1)

if [ $? -ne 0 ]; then
  echo "ERROR: Could not fetch application: $DATA"
  exit 1
fi

# Basic status
SYNC=$(echo "$DATA" | jq -r '.status.sync.status')
HEALTH=$(echo "$DATA" | jq -r '.status.health.status')
REVISION=$(echo "$DATA" | jq -r '.status.sync.revision')

echo "Sync Status:   $SYNC"
echo "Health Status:  $HEALTH"
echo "Revision:       $REVISION"
echo ""

# Check for conditions (errors, warnings)
CONDITIONS=$(echo "$DATA" | jq '.status.conditions // []')
COND_COUNT=$(echo "$CONDITIONS" | jq 'length')

if [ "$COND_COUNT" -gt 0 ]; then
  echo "=== Conditions ($COND_COUNT) ==="
  echo "$CONDITIONS" | jq -r '.[] | "  [\(.type)] \(.message)"'
  echo ""
fi

# OutOfSync resources
OUTOFSYNC=$(echo "$DATA" | jq '[.status.resources[] | select(.status == "OutOfSync")]')
OOS_COUNT=$(echo "$OUTOFSYNC" | jq 'length')

if [ "$OOS_COUNT" -gt 0 ]; then
  echo "=== OutOfSync Resources ($OOS_COUNT) ==="
  echo "$OUTOFSYNC" | jq -r '.[] | "  \(.kind)/\(.name) in \(.namespace)"'
  echo ""
fi

# Unhealthy resources
UNHEALTHY=$(echo "$DATA" | jq '[.status.resources[] | select(.health.status != "Healthy" and .health.status != null)]')
UH_COUNT=$(echo "$UNHEALTHY" | jq 'length')

if [ "$UH_COUNT" -gt 0 ]; then
  echo "=== Unhealthy Resources ($UH_COUNT) ==="
  echo "$UNHEALTHY" | jq -r '.[] | "  \(.kind)/\(.name) - \(.health.status): \(.health.message // "no message")"'
  echo ""
fi

# Last operation
OP_PHASE=$(echo "$DATA" | jq -r '.status.operationState.phase // "N/A"')
OP_MSG=$(echo "$DATA" | jq -r '.status.operationState.message // "N/A"')
echo "=== Last Operation ==="
echo "Phase:   $OP_PHASE"
echo "Message: $OP_MSG"
```

## Watching Application State Changes

The `--watch` flag (available on some ArgoCD versions) lets you watch for real-time changes, but the more reliable approach is a polling loop:

```bash
# Poll for state changes every 5 seconds
while true; do
  clear
  argocd app get my-app
  sleep 5
done
```

## Comparing Application Revisions

Use `argocd app get` to check what revision is deployed versus what is expected:

```bash
# Current deployed revision
DEPLOYED=$(argocd app get my-app -o json | jq -r '.status.sync.revision')

# Target revision from spec
TARGET=$(argocd app get my-app -o json | jq -r '.spec.source.targetRevision')

echo "Deployed: $DEPLOYED"
echo "Target:   $TARGET"
```

## Summary

The `argocd app get` command is your primary diagnostic tool for individual applications. Use the default table output for quick visual checks, the `-o json` format for scripting and automation, and the `--hard-refresh` flag when you need the most current state. Combined with `jq`, it gives you the ability to extract any piece of information about an application's configuration, sync state, health, and operation history.
