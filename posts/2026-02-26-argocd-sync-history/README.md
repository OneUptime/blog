# How to Check Application Sync History in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Deployment History

Description: Learn how to view, interpret, and use the ArgoCD sync history to audit deployments, compare revisions, debug failures, and perform rollbacks.

---

Every time ArgoCD syncs an application, it records the operation in the application's sync history. This history is your deployment audit trail - it tells you what was deployed, when, by whom, and whether it succeeded or failed. Understanding how to access and use sync history is essential for debugging, auditing, and rollback operations.

## What Gets Recorded in Sync History

Each sync history entry contains:

- **Revision** - The Git commit SHA or Helm chart version that was synced
- **Timestamp** - When the sync started and completed
- **Initiated by** - Who or what triggered the sync (user, automated policy, or API)
- **Status** - Whether the sync succeeded, failed, or is still running
- **Duration** - How long the sync operation took
- **Message** - Any error messages if the sync failed
- **Sync options** - Which options were active during the sync (prune, dry-run, etc.)

## Viewing Sync History in the UI

### History Tab

1. Open your application in the ArgoCD UI
2. Click the **History and Rollback** button (clock icon) in the application header
3. The history panel shows a chronological list of all sync operations

Each entry in the history looks like:

```text
Revision:   abc1234 (main)
Date:       2026-02-26 10:30:00
Author:     jane@example.com
Message:    Update backend to v2.1.0
Status:     Succeeded
Duration:   15s
Initiated:  automated (auto-sync)
```

### History Detail View

Click on any history entry to see more details:

- **Resources synced** - List of resources that were created, updated, or deleted
- **Sync result per resource** - Whether each resource was successfully applied
- **Parameters** - Helm values or Kustomize parameters used during the sync
- **Manifest diff** - What changed compared to the previous sync

## Viewing Sync History via CLI

The ArgoCD CLI provides several ways to inspect sync history:

```bash
# View the current sync status and last operation
argocd app get my-app

# Output includes:
# Operation:  Sync
# Phase:      Succeeded
# Duration:   15s
# Message:    successfully synced (all tasks run)
# Revision:   abc1234def5678

# View the full sync history
argocd app history my-app

# Output:
# ID  DATE                 REVISION
# 5   2026-02-26 10:30:00  abc1234 (main)
# 4   2026-02-25 15:20:00  xyz7890 (main)
# 3   2026-02-24 09:15:00  def3456 (main)
# 2   2026-02-23 14:45:00  ghi6789 (main)
# 1   2026-02-22 11:00:00  jkl0123 (main)
```

### Getting Detailed History Information

```bash
# View the operation details for the last sync
argocd app get my-app --show-operation

# View the resources that were part of the last sync
argocd app get my-app --show-params
```

## Understanding Sync Status Values

Each sync history entry has one of these statuses:

### Succeeded

The sync completed without errors. All resources were applied to the cluster and match the desired state.

### Failed

The sync encountered an error. Common failure reasons include:

```text
# Invalid manifest
ComparisonError: failed to load initial state of resource Deployment:
  error converting YAML to JSON

# RBAC permission denied
permission denied: applications, sync, default/my-app

# Resource conflict
The Deployment "web" is invalid: spec.selector:
  Invalid value: field is immutable

# Hook failure
PreSync hook Job/db-migrate failed
```

### Running

A sync is currently in progress. This is a transient state.

### Error

An unexpected error occurred during the sync operation, typically an ArgoCD internal error rather than a Kubernetes error.

## Comparing Sync Revisions

One of the most useful capabilities is comparing what changed between two syncs:

### In the UI

1. Open the sync history
2. Click on the older revision
3. Use the "Compare" option to see the diff between that revision and the current state

### Using Git

Since ArgoCD records the Git commit SHA for each sync, you can compare revisions directly in Git:

```bash
# See what changed between two synced revisions
git diff abc1234..xyz7890

# See the commit messages between two synced revisions
git log abc1234..xyz7890 --oneline

# See which files changed
git diff --name-only abc1234..xyz7890
```

This is particularly useful for post-incident analysis when you need to identify which change caused an issue.

## Using History for Rollbacks

Sync history enables rollbacks to previous known-good states:

### UI Rollback

1. Open the sync history
2. Find the revision you want to roll back to
3. Click the **Rollback** button on that entry
4. Confirm the rollback

### CLI Rollback

```bash
# Rollback to a specific history ID
argocd app rollback my-app <history-id>

# Example: rollback to history ID 3
argocd app rollback my-app 3
```

### Important Rollback Considerations

Rollbacks in ArgoCD work by syncing to a previous Git revision. If auto-sync is enabled, ArgoCD will immediately try to sync back to HEAD, undoing your rollback. To prevent this:

```bash
# Disable auto-sync before rolling back
argocd app set my-app --sync-policy none

# Perform the rollback
argocd app rollback my-app 3

# After investigation, re-enable auto-sync
argocd app set my-app --sync-policy automated
```

Or better yet, fix the issue in Git and let ArgoCD sync the fix forward instead of rolling back.

## Sync History and Audit Compliance

For regulated environments, sync history provides audit evidence:

### What the History Proves

1. **What was deployed** - The exact Git revision applied to the cluster
2. **When it was deployed** - Timestamp of the sync operation
3. **Who approved it** - The user who triggered the sync (or "automated" for auto-sync)
4. **Whether it succeeded** - The final status of the operation
5. **What changed** - The diff between the previous and current state

### Exporting History

You can export sync history data for audit purposes:

```bash
# Export all application data including history as JSON
argocd app get my-app -o json > my-app-audit.json

# Extract just the history entries
argocd app get my-app -o json | \
  jq '.status.history'
```

### Correlation with Git

Since each sync entry includes the Git commit SHA, you can correlate deployment history with Git history:

```bash
# For each sync entry, get the full Git commit details
argocd app history my-app -o json | \
  jq -r '.[].revision' | \
  while read rev; do
    echo "=== $rev ==="
    git log -1 --format="%H %an %s" "$rev"
  done
```

## History Retention

ArgoCD retains sync history as part of the Application resource's status. There are practical limits:

- **Default retention** - ArgoCD keeps the last 10 sync operations by default
- **Configuring retention** - You can adjust this in the ArgoCD ConfigMap:

```yaml
# In argocd-cm ConfigMap
data:
  # Keep the last 20 sync operations in history
  resource.status.maxHistory: "20"
```

For long-term deployment history beyond what ArgoCD retains, use:
- ArgoCD notifications to record each sync to an external system
- Git history as the authoritative deployment record
- External audit logging systems

## Troubleshooting with History

### Finding When a Problem Started

```bash
# List history with dates to find when deployments happened
argocd app history my-app

# Cross-reference with when alerts fired
# If alerts started at 10:35, check the 10:30 sync
```

### Identifying Failed Syncs

```bash
# Check for any failed operations
argocd app get my-app -o json | \
  jq '.status.operationState | select(.phase == "Failed")'
```

### Understanding Repeated Syncs

If you see many syncs happening in quick succession, it usually means:
- Auto-sync is enabled and something is causing continuous drift
- A webhook is triggering frequent refreshes
- An HPA or external controller is modifying resources that ArgoCD tracks

Check the history timestamps and revision SHAs. If the same revision is being synced repeatedly, the issue is drift rather than new Git commits.

Sync history is the foundation of deployment observability in ArgoCD. Combined with Git history, it gives you a complete picture of what was deployed to your cluster and when. For teams practicing continuous delivery, this audit trail is invaluable for both day-to-day operations and incident response.
