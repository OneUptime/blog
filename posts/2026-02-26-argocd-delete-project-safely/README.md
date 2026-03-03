# How to Delete a Project Without Breaking Applications in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Operations, Multi-Tenancy

Description: Learn how to safely delete an ArgoCD project without disrupting running applications, including pre-deletion checks, application migration strategies, and handling the project finalizer.

---

Deleting an ArgoCD project might sound simple, but if you just run `argocd proj delete my-project`, you could orphan applications or even trigger cascading deletions. ArgoCD projects have a finalizer that prevents deletion while applications still reference them, but understanding the full deletion workflow helps you avoid surprises.

This guide covers the safe process for decommissioning an ArgoCD project.

## What Happens When You Delete a Project

When you attempt to delete an ArgoCD project:

1. ArgoCD checks if any applications reference the project
2. If applications exist, the deletion is blocked (if the finalizer is present)
3. If no applications reference it, the project is deleted

The project finalizer `resources-finalizer.argocd.argoproj.io` is what provides this safety net:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: old-project
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
```

With the finalizer, attempting to delete a project that has applications will leave the project in a `Terminating` state until all applications are removed or migrated.

## Pre-Deletion Checklist

### Step 1: Inventory Applications

Find all applications that belong to the project:

```bash
# List all applications in the project
argocd app list --project old-project

# Get a count
argocd app list --project old-project -o name | wc -l

# Get detailed information
argocd app list --project old-project -o json | \
  jq '.items[] | {name: .metadata.name, sync: .status.sync.status, health: .status.health.status}'
```

### Step 2: Check for ApplicationSets

ApplicationSets can generate applications in a project:

```bash
# Find ApplicationSets that target this project
kubectl get applicationsets -n argocd -o json | \
  jq '.items[] | select(.spec.template.spec.project == "old-project") | .metadata.name'
```

### Step 3: Identify Dependencies

Check if any other projects or configurations reference this project:

```bash
# Check RBAC policies
kubectl get configmap argocd-rbac-cm -n argocd -o yaml | grep "old-project"

# Check notifications
kubectl get configmap argocd-notifications-cm -n argocd -o yaml | grep "old-project"
```

## Strategy 1: Migrate All Applications to Another Project

The safest approach - move applications to a different project before deletion:

```bash
# Create the destination project if it does not exist
argocd proj create new-project \
  --description "Replacement for old-project" \
  --src "https://github.com/my-org/*" \
  --dest "https://kubernetes.default.svc,*"

# Migrate each application
for APP in $(argocd app list --project old-project -o name); do
  echo "Migrating $APP to new-project..."
  argocd app set $APP --project new-project
done

# Verify all applications moved
argocd app list --project old-project
# Should return empty

# Now safely delete the project
argocd proj delete old-project
```

### Batch Migration with Verification

```bash
#!/bin/bash
# safe-project-delete.sh

OLD_PROJECT="old-project"
NEW_PROJECT="new-project"

echo "=== Phase 1: Pre-flight checks ==="

# Count applications
APP_COUNT=$(argocd app list --project $OLD_PROJECT -o name | wc -l | tr -d ' ')
echo "Applications in $OLD_PROJECT: $APP_COUNT"

if [ "$APP_COUNT" -eq "0" ]; then
  echo "No applications found. Safe to delete."
  argocd proj delete $OLD_PROJECT
  exit 0
fi

echo ""
echo "=== Phase 2: Verify destination project ==="
argocd proj get $NEW_PROJECT > /dev/null 2>&1 || {
  echo "ERROR: Destination project $NEW_PROJECT does not exist"
  exit 1
}

echo ""
echo "=== Phase 3: Migrate applications ==="
FAILED=0
for APP in $(argocd app list --project $OLD_PROJECT -o name); do
  if argocd app set $APP --project $NEW_PROJECT 2>&1; then
    echo "  OK: $APP"
  else
    echo "  FAIL: $APP"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=== Phase 4: Verify migration ==="
REMAINING=$(argocd app list --project $OLD_PROJECT -o name | wc -l | tr -d ' ')
echo "Applications remaining in $OLD_PROJECT: $REMAINING"
echo "Applications that failed: $FAILED"

if [ "$REMAINING" -eq "0" ]; then
  echo ""
  echo "=== Phase 5: Delete project ==="
  argocd proj delete $OLD_PROJECT
  echo "Project $OLD_PROJECT deleted successfully"
else
  echo ""
  echo "WARNING: $REMAINING applications still in $OLD_PROJECT"
  echo "Fix the failed migrations before deleting the project"
fi
```

## Strategy 2: Delete Applications First

If the applications are no longer needed:

### Delete Applications Without Deleting Workloads

Use `--cascade=false` to remove the ArgoCD application but leave the actual Kubernetes resources running:

```bash
# Delete each application without cascading
for APP in $(argocd app list --project old-project -o name); do
  echo "Deleting ArgoCD application $APP (keeping workloads)..."
  argocd app delete $APP --cascade=false --yes
done

# Delete the project
argocd proj delete old-project
```

### Delete Applications and Their Workloads

If you want to clean up everything including the deployed resources:

```bash
# Delete each application with cascade (this deletes the workloads!)
for APP in $(argocd app list --project old-project -o name); do
  echo "Deleting $APP and all its resources..."
  argocd app delete $APP --yes
  # Wait for deletion to complete
  argocd app wait $APP --deleted --timeout 120 2>/dev/null
done

# Delete the project
argocd proj delete old-project
```

Be very careful with cascading deletes. This will remove all Kubernetes resources managed by the application.

## Strategy 3: Lock and Abandon

If you cannot delete the project immediately but want to prevent new applications:

```bash
# Remove all source repos (no new applications can be created)
argocd proj set old-project --src ""

# Remove all destinations
# This will prevent existing applications from syncing
argocd proj remove-destination old-project https://kubernetes.default.svc "*"

# Add a description warning
argocd proj set old-project --description "DEPRECATED - do not use. Migrate to new-project."
```

## Handling the Finalizer

### When Deletion is Stuck

If a project gets stuck in `Terminating` state because of the finalizer:

```bash
# Check if there are still applications referencing it
argocd app list --project old-project

# If there are applications, migrate or delete them first
# Then the finalizer will be satisfied and the project will be deleted
```

### Force Removal (Emergency Only)

In emergencies, you can remove the finalizer to force deletion. This is not recommended because it bypasses safety checks:

```bash
# Remove the finalizer (DANGEROUS - bypasses safety checks)
kubectl patch appproject old-project -n argocd \
  --type json \
  -p '[{"op": "remove", "path": "/metadata/finalizers"}]'
```

After removing the finalizer, the project will be deleted immediately even if applications still reference it. Those applications will show errors because their project no longer exists.

### Fixing Applications After Forced Deletion

If you force-deleted a project, fix orphaned applications:

```bash
# Find applications with the deleted project
kubectl get applications -n argocd -o json | \
  jq -r '.items[] | select(.spec.project == "deleted-project") | .metadata.name'

# Move each to the default project or another valid project
kubectl patch application my-app -n argocd \
  --type merge \
  -p '{"spec": {"project": "default"}}'
```

## Cleaning Up Related Resources

After deleting a project, clean up associated resources:

### Project-Scoped Repository Credentials

```bash
# Find and delete project-scoped repository secrets
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository -o json | \
  jq -r '.items[] | select(.data.project != null) |
    select((.data.project | @base64d) == "old-project") | .metadata.name' | \
  while read SECRET; do
    echo "Deleting project-scoped repo secret: $SECRET"
    kubectl delete secret $SECRET -n argocd
  done
```

### RBAC Policies

Remove references from the RBAC ConfigMap:

```bash
# Check for policies referencing the deleted project
kubectl get configmap argocd-rbac-cm -n argocd -o yaml | grep "old-project"

# Edit and remove the relevant lines
kubectl edit configmap argocd-rbac-cm -n argocd
```

### Notification Configurations

```bash
# Remove project-specific notification triggers
kubectl get configmap argocd-notifications-cm -n argocd -o yaml | grep "old-project"
```

## Verifying Complete Cleanup

After deletion, verify nothing references the old project:

```bash
# Check no applications reference it
kubectl get applications -n argocd -o json | \
  jq '.items[] | select(.spec.project == "old-project") | .metadata.name'

# Check no applicationsets reference it
kubectl get applicationsets -n argocd -o json | \
  jq '.items[] | select(.spec.template.spec.project == "old-project") | .metadata.name'

# Check the project is gone
argocd proj get old-project 2>&1
# Expected: project 'old-project' does not exist

# Check RBAC
kubectl get configmap argocd-rbac-cm -n argocd -o yaml | grep "old-project"
# Should return nothing
```

## Preventing Accidental Deletion

To protect important projects from accidental deletion:

### Use the Finalizer

Always include the finalizer:

```yaml
metadata:
  finalizers:
    - resources-finalizer.argocd.argoproj.io
```

### Restrict Delete Permissions

Use RBAC to prevent non-admins from deleting projects:

```text
# Only admins can delete projects
p, role:admin, projects, delete, *, allow
p, role:team-lead, projects, delete, *, deny
```

### Add Annotations

Mark important projects clearly:

```yaml
metadata:
  annotations:
    managed-by: "platform-team"
    criticality: "high"
    contact: "platform@example.com"
```

## Summary

Deleting an ArgoCD project safely requires migrating or deleting all applications first. Use `argocd app set --project` to migrate applications to another project, or `argocd app delete --cascade=false` to remove the ArgoCD application while keeping workloads running. The project finalizer prevents deletion while applications still reference the project, so never remove the finalizer unless you understand the consequences. After deletion, clean up project-scoped repository credentials, RBAC policies, and notification configurations.
