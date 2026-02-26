# How to Migrate from Imperative to Declarative ArgoCD Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Migration, Declarative

Description: A step-by-step guide to migrating existing ArgoCD applications created through the UI or CLI to a fully declarative, Git-managed configuration.

---

If you started with ArgoCD by creating applications through the UI or CLI, you are not alone. Most teams begin with the imperative approach because it is faster to get started. But as your application count grows, managing everything through clicks and commands becomes unsustainable. This guide walks you through migrating to a fully declarative setup without downtime or disrupting existing deployments.

## Understanding the Current State

Before migrating, you need to understand what you have. ArgoCD stores Application and AppProject resources as Kubernetes custom resources in the argocd namespace. Whether you created them through the UI, CLI, or YAML, they all exist as the same type of resource.

```bash
# List all current applications
argocd app list

# List all projects
argocd proj list

# List all repositories
argocd repo list

# Get total counts
echo "Applications: $(kubectl get applications -n argocd --no-headers | wc -l)"
echo "Projects: $(kubectl get appprojects -n argocd --no-headers | wc -l)"
echo "Repositories: $(kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository --no-headers | wc -l)"
```

## Step 1: Export Existing Applications

Export all existing Application resources as YAML:

```bash
# Export all applications to individual files
mkdir -p migration/applications
for app in $(kubectl get applications -n argocd -o jsonpath='{.items[*].metadata.name}'); do
  kubectl get application "$app" -n argocd -o yaml > "migration/applications/${app}.yaml"
  echo "Exported: $app"
done
```

Each exported YAML includes runtime fields that you do not want in your declarative manifests. Clean them up.

## Step 2: Clean Up Exported Manifests

Remove Kubernetes-managed fields from each exported Application:

```bash
# Python script to clean exported Application YAML
#!/usr/bin/env python3
import yaml
import sys
import os

def clean_application(input_path, output_path):
    with open(input_path) as f:
        app = yaml.safe_load(f)

    # Keep only the fields we need
    cleaned = {
        'apiVersion': app['apiVersion'],
        'kind': app['kind'],
        'metadata': {
            'name': app['metadata']['name'],
            'namespace': app['metadata']['namespace'],
        },
        'spec': app['spec'],
    }

    # Preserve labels if they exist
    if 'labels' in app['metadata']:
        cleaned['metadata']['labels'] = {
            k: v for k, v in app['metadata']['labels'].items()
            if not k.startswith('kubectl.kubernetes.io/')
        }

    # Preserve annotations (like sync-wave)
    if 'annotations' in app['metadata']:
        cleaned['metadata']['annotations'] = {
            k: v for k, v in app['metadata']['annotations'].items()
            if not k.startswith('kubectl.kubernetes.io/')
        }

    # Add finalizer for resource cleanup
    cleaned['metadata']['finalizers'] = [
        'resources-finalizer.argocd.argoproj.io'
    ]

    # Remove status (runtime field)
    cleaned.pop('status', None)

    # Remove operation (runtime field)
    cleaned['spec'].pop('operation', None)

    with open(output_path, 'w') as f:
        yaml.dump(cleaned, f, default_flow_style=False, sort_keys=False)

# Process all exported files
input_dir = 'migration/applications'
output_dir = 'argocd-config/applications'
os.makedirs(output_dir, exist_ok=True)

for filename in os.listdir(input_dir):
    if filename.endswith('.yaml'):
        clean_application(
            os.path.join(input_dir, filename),
            os.path.join(output_dir, filename)
        )
        print(f"Cleaned: {filename}")
```

## Step 3: Export and Clean Projects

```bash
# Export projects
mkdir -p migration/projects
for proj in $(kubectl get appprojects -n argocd -o jsonpath='{.items[*].metadata.name}'); do
  if [ "$proj" != "default" ]; then
    kubectl get appproject "$proj" -n argocd -o yaml > "migration/projects/${proj}.yaml"
    echo "Exported project: $proj"
  fi
done
```

Clean the project manifests similarly, removing `managedFields`, `resourceVersion`, `uid`, `creationTimestamp`, and `status` fields.

A cleaned project looks like:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-backend
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  description: "Backend team applications"
  sourceRepos:
    - 'https://github.com/myorg/*'
  destinations:
    - server: https://kubernetes.default.svc
      namespace: backend
  clusterResourceWhitelist: []
  namespaceResourceWhitelist:
    - group: '*'
      kind: '*'
```

## Step 4: Set Up the Config Repository

Create the Git repository structure:

```bash
mkdir -p argocd-config/{applications,projects,repositories}

# Move cleaned files
mv migration/cleaned-apps/* argocd-config/applications/
mv migration/cleaned-projects/* argocd-config/projects/

# Initialize Git repo
cd argocd-config
git init
git add .
git commit -m "Initial declarative ArgoCD configuration"
git remote add origin https://github.com/myorg/argocd-config.git
git push -u origin main
```

## Step 5: Organize by Environment

If your applications target multiple environments, reorganize:

```bash
# Create environment directories
mkdir -p argocd-config/applications/{production,staging}

# Move applications to appropriate directories
mv argocd-config/applications/backend-api-production.yaml \
   argocd-config/applications/production/backend-api.yaml
mv argocd-config/applications/backend-api-staging.yaml \
   argocd-config/applications/staging/backend-api.yaml
```

## Step 6: Apply Declarative Manifests (Non-Destructive)

The key insight is that `kubectl apply` on an existing resource updates it in place. Your running applications will not be affected:

```bash
# Apply the declarative manifests over the existing resources
kubectl apply -f argocd-config/projects/
kubectl apply -f argocd-config/applications/production/
kubectl apply -f argocd-config/applications/staging/
```

This works because the Application resources already exist. `kubectl apply` adds the `kubectl.kubernetes.io/last-applied-configuration` annotation, which makes future declarative management work correctly.

Verify nothing changed:

```bash
# Check that all applications are still healthy
argocd app list
# All should show Synced/Healthy - same as before
```

## Step 7: Create the Root Application

Now set up the App-of-Apps pattern to have ArgoCD manage these manifests:

```yaml
# root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd-config
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/argocd-config.git
    targetRevision: main
    path: .
    directory:
      recurse: true
      exclude: 'root-app.yaml'
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: false   # Start with prune disabled for safety
      selfHeal: true
```

Apply the root application:

```bash
kubectl apply -f root-app.yaml
```

Check that ArgoCD sees all the applications as "Synced":

```bash
argocd app get argocd-config
```

If some applications show as OutOfSync, it means there are differences between the Git manifests and the live state. Review and fix these differences:

```bash
# See what is different
argocd app diff argocd-config

# Common issue: missing annotations or labels in the Git version
# Fix by updating the YAML file and committing to Git
```

## Step 8: Validate the Migration

Run a comprehensive check:

```bash
# Verify all applications exist and are healthy
echo "=== Application Status ==="
argocd app list --output json | jq -r '.[] | "\(.metadata.name): \(.status.sync.status)/\(.status.health.status)"'

# Verify the root app manages all expected resources
echo "=== Root App Resources ==="
argocd app resources argocd-config

# Count managed applications
echo "=== Counts ==="
echo "Applications in Git: $(find argocd-config/applications -name '*.yaml' | wc -l)"
echo "Applications in ArgoCD: $(kubectl get applications -n argocd --no-headers | wc -l)"
```

## Step 9: Enable Pruning (Optional)

Once you are confident the migration is complete, enable pruning on the root application so that removing a YAML file from Git automatically deletes the Application:

```yaml
syncPolicy:
  automated:
    prune: true    # Now safe to enable
    selfHeal: true
```

Be careful with this step. With prune enabled, any YAML file you accidentally delete from Git will remove the corresponding Application (and potentially its resources if finalizers are set).

## Step 10: Establish the New Workflow

Communicate the new workflow to your team:

**Before (imperative):**
```bash
argocd app create my-app --repo https://... --path k8s/ --dest-server https://...
```

**After (declarative):**
1. Create a YAML file in the config repo
2. Open a pull request
3. Get approval
4. Merge to main
5. ArgoCD automatically creates the application

```mermaid
flowchart LR
    Dev["Developer"] --> PR["Pull Request"]
    PR --> Review["Code Review"]
    Review --> Merge["Merge to Main"]
    Merge --> ArgoCD["ArgoCD Syncs"]
    ArgoCD --> App["Application Created/Updated"]
```

## Rollback Plan

If something goes wrong during migration, you can always revert:

```bash
# Delete the root application (without deleting child resources)
kubectl delete application argocd-config -n argocd

# Your existing applications continue to run unaffected
argocd app list  # Still shows all apps
```

The migration is non-destructive at every step. The worst case is that you need to clean up the root application and go back to managing things imperatively while you fix the declarative configuration.

## Common Migration Issues

**OutOfSync after migration** - Usually caused by fields in the live resource that are not in the Git manifest (like automatically added annotations). Fix by adding those fields to the YAML.

**Duplicate applications** - If the Git manifest name does not match the existing Application name, ArgoCD creates a new one. Ensure names match exactly.

**Permission errors** - The root application needs permission to create Application resources in the argocd namespace. Use the default project or ensure your project allows it.

Migrating from imperative to declarative is the most important step in maturing your ArgoCD setup. Take it one step at a time, validate at each stage, and your team will benefit from proper GitOps workflows for all ArgoCD configuration. For more on structuring your declarative setup, see our guide on [repository structure for ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-structure-git-repo-declarative-setup/view).
