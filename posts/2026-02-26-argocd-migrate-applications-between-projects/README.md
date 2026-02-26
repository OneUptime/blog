# How to Migrate Applications Between Projects in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Migration, Multi-Tenancy

Description: Learn how to safely migrate ArgoCD applications between projects without disrupting running workloads, including pre-migration checks, step-by-step procedures, and rollback strategies.

---

As your organization grows, you will inevitably need to move ArgoCD applications between projects. Maybe a team is being reorganized, a service is being transferred to a different team, or you are migrating from the default project to team-specific projects. Moving applications between projects requires care because the destination project must allow the application's source repository, destination cluster/namespace, and resource types.

This guide covers the step-by-step process for safely migrating applications between ArgoCD projects.

## Why Migrate Applications

Common scenarios that require project migration:

- **Team reorganization**: A service moves from one team to another
- **Project restructuring**: Breaking a large project into smaller, more focused projects
- **Security hardening**: Moving applications out of the `default` project into restricted projects
- **Compliance**: Applying stricter controls to applications that handle sensitive data
- **Onboarding**: Moving an experimental application to a production project

## Pre-Migration Checklist

Before migrating, verify the destination project can accept the application:

### Step 1: Check Source Repository

```bash
# Get the application's source repo
argocd app get my-app -o json | jq -r '.spec.source.repoURL'
# Output: https://github.com/my-org/my-service.git

# Check if the destination project allows this repo
argocd proj get destination-project -o json | jq '.spec.sourceRepos'
```

If the repo is not in the destination project's `sourceRepos`, add it:

```bash
argocd proj add-source destination-project "https://github.com/my-org/my-service.git"
```

### Step 2: Check Destination Cluster and Namespace

```bash
# Get the application's destination
argocd app get my-app -o json | jq '.spec.destination'
# Output: {"server": "https://kubernetes.default.svc", "namespace": "my-namespace"}

# Check destination project's allowed destinations
argocd proj get destination-project -o json | jq '.spec.destinations'
```

If the destination is not allowed, add it:

```bash
argocd proj add-destination destination-project \
  https://kubernetes.default.svc \
  my-namespace
```

### Step 3: Check Resource Whitelists

```bash
# List resource types the application creates
argocd app resources my-app -o json | jq '.[].group + "/" + .[].kind' | sort -u

# Compare with destination project's whitelists
argocd proj get destination-project -o json | jq '.spec.namespaceResourceWhitelist'
argocd proj get destination-project -o json | jq '.spec.clusterResourceWhitelist'
```

Make sure every resource type the application uses is allowed in the destination project.

### Step 4: Check Sync Windows

If the destination project has sync windows, verify that migration will not be blocked:

```bash
argocd proj windows list destination-project
```

## Method 1: In-Place Project Change (Recommended)

The simplest and safest method - update the application's project field without deleting it:

### Using CLI

```bash
# Change the project assignment
argocd app set my-app --project destination-project

# Verify the change
argocd app get my-app -o json | jq '.spec.project'
```

### Using kubectl

```bash
# Patch the application to change its project
kubectl patch application my-app -n argocd \
  --type merge \
  -p '{"spec": {"project": "destination-project"}}'
```

### Using Declarative YAML

If your application is managed declaratively, update the YAML in Git:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  # Change from old project to new project
  project: destination-project    # Was: source-project
  source:
    repoURL: "https://github.com/my-org/my-service.git"
    targetRevision: main
    path: k8s
  destination:
    server: "https://kubernetes.default.svc"
    namespace: my-namespace
```

Commit and push, then sync the application that manages applications (if using App of Apps pattern).

## Method 2: Delete and Recreate (For Complex Changes)

If you need to change multiple fields along with the project, or if the in-place change fails:

### Step 1: Export the Application

```bash
# Save the application spec
argocd app get my-app -o yaml > my-app-backup.yaml
```

### Step 2: Delete Without Cascading

This is critical - use `--cascade=false` to delete the ArgoCD application without deleting the actual Kubernetes resources:

```bash
# Delete the application but keep the workloads running
argocd app delete my-app --cascade=false

# Verify the workloads are still running
kubectl get deployments -n my-namespace
kubectl get services -n my-namespace
```

### Step 3: Modify and Recreate

```bash
# Edit the backup to change the project
# Change spec.project to the new project name

# Recreate the application
kubectl apply -f my-app-backup.yaml
```

### Step 4: Verify

```bash
# Check the application is in the new project
argocd app get my-app -o json | jq '.spec.project'

# Check sync status - should show "Synced" if nothing changed
argocd app get my-app
```

## Batch Migration

When migrating many applications at once, such as moving everything out of the `default` project:

### Script for Batch Migration

```bash
#!/bin/bash
# migrate-project.sh
# Usage: ./migrate-project.sh <source-project> <destination-project>

SOURCE_PROJECT=$1
DEST_PROJECT=$2

# Get all applications in the source project
APPS=$(argocd app list --project $SOURCE_PROJECT -o name)

echo "Applications to migrate:"
echo "$APPS"
echo ""
echo "Migrating from '$SOURCE_PROJECT' to '$DEST_PROJECT'"
echo "Press Enter to continue or Ctrl+C to cancel..."
read

for APP in $APPS; do
  echo "Migrating $APP..."

  # Check if source repo is allowed
  REPO=$(argocd app get $APP -o json | jq -r '.spec.source.repoURL // .spec.sources[0].repoURL')
  echo "  Source repo: $REPO"

  # Attempt migration
  if argocd app set $APP --project $DEST_PROJECT 2>&1; then
    echo "  SUCCESS: $APP migrated to $DEST_PROJECT"
  else
    echo "  FAILED: $APP could not be migrated. Check project restrictions."
  fi

  echo ""
done

echo "Migration complete. Verify with:"
echo "  argocd app list --project $DEST_PROJECT"
```

### Using kubectl for Batch Migration

```bash
# Patch all applications in the default project
kubectl get applications -n argocd -o json | \
  jq -r '.items[] | select(.spec.project == "default") | .metadata.name' | \
  while read APP; do
    echo "Migrating $APP..."
    kubectl patch application $APP -n argocd \
      --type merge \
      -p '{"spec": {"project": "new-project"}}' || \
      echo "FAILED: $APP"
  done
```

## Handling Migration Failures

### Application Rejected by Destination Project

If the migration fails because the destination project's restrictions do not match:

```bash
# Error: application repo is not permitted in project 'destination-project'
# Fix: add the source repo
argocd proj add-source destination-project "https://github.com/my-org/my-service.git"

# Error: application destination is not permitted in project
# Fix: add the destination
argocd proj add-destination destination-project \
  https://kubernetes.default.svc my-namespace

# Retry
argocd app set my-app --project destination-project
```

### Rollback

If you need to move the application back:

```bash
# Simply change the project back
argocd app set my-app --project source-project
```

If you used the delete-and-recreate method:

```bash
# Delete the new application (without cascading)
argocd app delete my-app --cascade=false

# Recreate from the backup
kubectl apply -f my-app-backup.yaml
```

## Migrating ApplicationSets

ApplicationSets that generate applications in a project need special handling:

```yaml
# Update the ApplicationSet template to reference the new project
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app-set
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
          - env: staging
  template:
    spec:
      # Change the project here
      project: destination-project    # Was: source-project
```

When you update the ApplicationSet, it will update all generated applications to the new project.

## Post-Migration Verification

After migration, verify everything is working:

```bash
# Check all apps are in the new project
argocd app list --project destination-project

# Verify sync status of all migrated apps
argocd app list --project destination-project -o json | \
  jq '.items[] | {name: .metadata.name, sync: .status.sync.status, health: .status.health.status}'

# Check for any sync errors
argocd app list --project destination-project -o json | \
  jq '.items[] | select(.status.sync.status != "Synced") | .metadata.name'

# Verify no apps remain in the source project (if migrating all)
argocd app list --project source-project
```

## Cleaning Up the Source Project

After migrating all applications, if you want to lock or delete the source project:

```bash
# Verify the source project is empty
argocd app list --project source-project

# Lock the project by removing all sources and destinations
argocd proj set source-project --src ""
argocd proj remove-destination source-project https://kubernetes.default.svc "*"

# Or delete the project entirely (only if no apps reference it)
argocd proj delete source-project
```

## Summary

Migrating applications between ArgoCD projects is straightforward when you prepare properly. Check that the destination project allows the application's source repos, destinations, and resource types before making the change. Use `argocd app set --project` for simple migrations and the delete-and-recreate approach for complex changes. Always use `--cascade=false` when deleting to avoid disrupting running workloads. For batch migrations, script the process and verify each application after migration.
