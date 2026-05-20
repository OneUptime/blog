# How to Handle ApplicationSet Dry-Run Mode in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSet, Testing

Description: Learn how to preview and validate ApplicationSet changes before they create or modify applications using dry-run techniques and safety mechanisms in ArgoCD.

---

ApplicationSets can create, modify, and delete dozens or hundreds of applications in a single reconciliation. Before applying changes to production, you need a way to preview what the ApplicationSet controller will do. ArgoCD includes ApplicationSet preview commands, and there are several additional techniques to safely validate changes before they take effect.

This guide covers practical dry-run strategies, validation approaches, and safety mechanisms for ApplicationSets.

## The Problem: Limited Dry-Run Coverage

Unlike `kubectl apply --dry-run`, ApplicationSet dry-run behavior is split across the ArgoCD CLI and controller settings. If you apply an ApplicationSet manifest directly to the cluster without using those preview paths, the controller starts reconciling - creating, updating, and potentially deleting Applications. This makes testing changes risky, especially at scale.

The strategies below give you effective dry-run behavior through different approaches.

## Strategy 1: Create-Only Policy as Safe Mode

The safest approach is to first apply your ApplicationSet with `create-only` policy. This prevents the ApplicationSet controller from modifying or deleting existing Applications. If the controller was started with a global `--policy`, that setting takes precedence over the per-ApplicationSet `applicationsSync` field unless policy override is enabled for the controller.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: test-appset
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/configs.git
        revision: HEAD
        files:
          - path: 'apps/*.json'
  template:
    metadata:
      name: '{{app_name}}'
    spec:
      project: default
      source:
        repoURL: '{{repo_url}}'
        targetRevision: HEAD
        path: '{{deploy_path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
  # Safe mode: only creates, never updates or deletes
  syncPolicy:
    applicationsSync: create-only
```

Once you verify the created Applications are correct, change to `create-update` or `sync`, or remove the policy for the controller's default behavior.

## Strategy 2: kubectl Dry-Run with Server Validation

Use kubectl's server-side dry-run to validate the ApplicationSet manifest without actually creating it.

```bash
# Server-side dry run - validates against the cluster API

kubectl apply -f applicationset.yaml --dry-run=server -n argocd

# Client-side dry run - renders the object locally but does not ask the API server to validate it
kubectl apply -f applicationset.yaml --dry-run=client -n argocd -o yaml
```

This validates the ApplicationSet schema and RBAC permissions but does NOT show you which Applications would be generated. It only confirms the ApplicationSet manifest itself is valid.

## Strategy 3: Preview in a Separate Namespace

Create a copy of your ApplicationSet in a test namespace to see what it generates without affecting production. This requires ArgoCD's ApplicationSet-in-any-namespace support to be enabled and the test namespace to be allowed by the controller configuration; otherwise, create the preview ApplicationSet in the ArgoCD namespace with prefixed Application names.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: test-appset-preview
  # Use a different namespace for testing
  namespace: argocd-test
spec:
  generators:
    - list:
        elements:
          - name: app-a
            env: dev
          - name: app-b
            env: staging
  template:
    metadata:
      # Prefix names to avoid conflicts
      name: 'preview-{{name}}-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps.git
        targetRevision: HEAD
        path: '{{name}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{name}}-preview'
      # Do NOT auto-sync preview apps
      # Just create the Application resources to see what would happen
```

After inspecting the preview applications, delete the test ApplicationSet:

```bash
# Check what was generated
argocd app list -l argocd.argoproj.io/application-set-name=test-appset-preview

# Clean up
kubectl delete applicationset test-appset-preview -n argocd-test
```

## Strategy 4: Template Rendering with the ArgoCD CLI

Use the ArgoCD CLI to render the generated Applications before applying the ApplicationSet.

```bash
# Render generated Applications as YAML
argocd appset generate my-applicationset.yaml -o yaml

# Or inspect the server-side dry-run result as JSON
argocd appset create --dry-run my-applicationset.yaml -o json | \
  jq '.status.resources'
```

## Strategy 5: Git Branch Testing

Create your ApplicationSet changes on a feature branch and point the ApplicationSet to that branch for testing.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: config-driven-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/configs.git
        # Point to feature branch for testing
        revision: feature/new-configs
        files:
          - path: 'apps/*.json'
  template:
    metadata:
      name: '{{app_name}}'
    spec:
      project: default
      source:
        repoURL: '{{repo_url}}'
        targetRevision: HEAD
        path: '{{deploy_path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
  # Use create-only during testing
  syncPolicy:
    applicationsSync: create-only
```

After validating, merge the feature branch and switch the revision back to `HEAD` or `main`.

## Strategy 6: ApplicationSet Status Inspection

After applying an ApplicationSet, immediately check its status to understand what it plans to do.

```bash
# Apply the ApplicationSet
kubectl apply -f applicationset.yaml -n argocd

# Immediately check status
kubectl get applicationset my-appset -n argocd -o yaml | yq '.status'

# List the resources reported in status
kubectl get applicationset my-appset -n argocd -o json | \
  jq '.status.resources[]? | {name: .name, status: .status}'

# Check events for any issues
kubectl get events -n argocd \
  --field-selector involvedObject.name=my-appset \
  --sort-by='.lastTimestamp'
```

## Strategy 7: CI Pipeline Validation

Add ApplicationSet validation to your CI pipeline.

```yaml
# .github/workflows/validate-appset.yaml
name: Validate ApplicationSets
on:
  pull_request:
    paths:
      - 'applicationsets/**'
      - 'configs/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate YAML syntax
        run: |
          for f in applicationsets/*.yaml; do
            echo "Validating $f"
            yq eval '.' "$f" > /dev/null
          done

      - name: Check ApplicationSet schema
        run: |
          # Use kubeconform or kubeval for schema validation
          kubeconform -strict \
            -schema-location default \
            -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/argoproj.io/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
            applicationsets/*.yaml

      - name: Validate config files referenced by generators
        run: |
          for f in configs/apps/*.json; do
            echo "Validating $f"
            jq empty "$f"
            # Check required fields
            jq -e '.app_name and .namespace and .repo_url' "$f" > /dev/null
          done

      - name: Estimate application count
        run: |
          config_count=$(ls configs/apps/*.json | wc -l)
          echo "This ApplicationSet will generate approximately $config_count applications"
```

## Strategy 8: Application Skip-Reconcile Annotation

Add the skip-reconcile annotation to the generated Applications when you want ArgoCD to create Application resources without reconciling their workloads automatically. This is an alpha feature for Applications, not a pause annotation for the ApplicationSet controller itself.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: paused-appset
  namespace: argocd
spec:
  syncPolicy:
    applicationsSync: create-only
  generators:
    - list:
        elements:
          - name: test-app
  template:
    metadata:
      name: '{{name}}'
      annotations:
        argocd.argoproj.io/skip-reconcile: "true"
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps.git
        targetRevision: HEAD
        path: '{{name}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{name}}'
```

## Recommended Dry-Run Workflow

For production changes, follow this sequence:

1. Validate the ApplicationSet YAML in CI
2. Apply with `create-only` policy on a test branch
3. Inspect generated Applications
4. If correct, update to the desired policy
5. Monitor the rollout with progressive syncs

```bash
# Step 1: Apply with create-only
kubectl apply -f applicationset-safe.yaml -n argocd

# Step 2: Verify
argocd appset get my-appset
argocd app list -l argocd.argoproj.io/application-set-name=my-appset

# Step 3: If good, switch to full management
kubectl patch applicationset my-appset -n argocd \
  --type merge -p '{"spec":{"syncPolicy":{"applicationsSync":"sync"}}}'
```

While ApplicationSet dry-run coverage is split across CLI previews, kubectl validation, and controller safeguards, combining these strategies gives you a robust safety net. For ongoing monitoring of your ApplicationSet changes and their impact, [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-merge-generator-overrides/view) can track application creation, updates, and deletions across your fleet.
