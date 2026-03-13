# How to Use argocd app create with All Options

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Deployments

Description: A comprehensive reference for the argocd app create command covering every option for Git sources, Helm, Kustomize, sync policies, and destination configuration.

---

The `argocd app create` command is how you imperatively create ArgoCD applications from the command line. While declarative YAML is the recommended approach for production, `argocd app create` is invaluable for quick prototyping, scripting, and understanding what each Application field does. This guide covers every important option.

## Basic Application Creation

The minimum required fields to create an application:

```bash
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns
```

This creates an application that:
- Tracks the `HEAD` of the default branch
- Uses plain YAML manifests from the specified path
- Deploys to the `my-app-ns` namespace on the local cluster
- Has no auto-sync (manual sync required)
- Belongs to the `default` project

## Source Configuration Options

### Git Repository Source

```bash
# Specify a specific branch
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --revision main \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns

# Track a specific tag
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --revision v1.2.3 \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns

# Pin to a specific commit SHA
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --revision a1b2c3d4e5f6 \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns
```

### Directory Options

```bash
# Enable recursive directory scanning
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/ \
  --directory-recurse \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns

# Include specific file patterns
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --directory-include '*.yaml' \
  --directory-exclude 'test-*' \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns
```

### Helm Source Options

```bash
# Deploy from a Helm chart in a Git repo
argocd app create my-app \
  --repo https://github.com/my-org/charts.git \
  --path charts/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --helm-version 3

# Deploy from a Helm repository
argocd app create my-app \
  --repo https://charts.example.com \
  --helm-chart my-chart \
  --revision 1.2.3 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns

# Override Helm values
argocd app create my-app \
  --repo https://charts.example.com \
  --helm-chart my-chart \
  --revision 1.2.3 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --helm-set replicaCount=3 \
  --helm-set image.tag=v2.0.0 \
  --helm-set-string region=us-east-1

# Use a values file from the repo
argocd app create my-app \
  --repo https://github.com/my-org/charts.git \
  --path charts/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --values values-production.yaml

# Multiple values files (applied in order, last wins)
argocd app create my-app \
  --repo https://github.com/my-org/charts.git \
  --path charts/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --values values.yaml \
  --values values-production.yaml

# Set the Helm release name
argocd app create my-app \
  --repo https://github.com/my-org/charts.git \
  --path charts/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --release-name my-release

# Skip CRD installation
argocd app create my-app \
  --repo https://github.com/my-org/charts.git \
  --path charts/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --helm-skip-crds
```

### Kustomize Source Options

```bash
# Deploy Kustomize application
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns

# Override Kustomize images
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --kustomize-image my-app=my-registry/my-app:v2.0.0

# Override name prefix
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --nameprefix prod-

# Override name suffix
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --namesuffix -v2

# Set Kustomize version
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --kustomize-version v5.0.0
```

## Destination Configuration

```bash
# Deploy to the local cluster (in-cluster)
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production

# Deploy to a named remote cluster
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-name production-cluster \
  --dest-namespace production
```

Note: Use either `--dest-server` (cluster URL) or `--dest-name` (cluster name), not both.

## Project Assignment

```bash
# Assign to a specific project
argocd app create my-app \
  --project production \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production
```

## Sync Policy Options

```bash
# Enable auto-sync
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --sync-policy automated

# Auto-sync with pruning (delete resources removed from Git)
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --sync-policy automated \
  --auto-prune

# Auto-sync with self-healing (revert manual changes)
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --sync-policy automated \
  --self-heal

# All sync options combined
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --sync-policy automated \
  --auto-prune \
  --self-heal

# Sync retry configuration
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --sync-policy automated \
  --sync-retry-limit 5 \
  --sync-retry-backoff-duration 5s \
  --sync-retry-backoff-factor 2 \
  --sync-retry-backoff-max-duration 3m
```

## Sync Options

```bash
# Add sync options
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --sync-option CreateNamespace=true \
  --sync-option PruneLast=true \
  --sync-option ApplyOutOfSyncOnly=true \
  --sync-option ServerSideApply=true \
  --sync-option PrunePropagationPolicy=foreground
```

## Labels and Annotations

```bash
# Add labels for filtering
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --label team=backend \
  --label environment=production \
  --label tier=critical
```

## Complete Production Example

Here is a comprehensive example that puts together the most commonly used options:

```bash
argocd app create payment-service \
  --project production \
  --repo https://github.com/my-org/payment-service.git \
  --revision main \
  --path k8s/overlays/production \
  --dest-name production-cluster \
  --dest-namespace payments \
  --sync-policy automated \
  --auto-prune \
  --self-heal \
  --sync-option CreateNamespace=true \
  --sync-option PruneLast=true \
  --sync-retry-limit 3 \
  --sync-retry-backoff-duration 10s \
  --label team=payments \
  --label environment=production \
  --label tier=critical
```

## The --upsert Flag

Use `--upsert` to create or update an application:

```bash
# Creates the app if it does not exist, updates it if it does
argocd app create my-app \
  --upsert \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns
```

This is particularly useful in CI/CD scripts where you want idempotent behavior.

## Dry Run

Preview what would be created without actually creating it:

```bash
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --dry-run -o yaml
```

This outputs the Application YAML that would be created, which you can redirect to a file for declarative management:

```bash
argocd app create my-app \
  --repo https://github.com/my-org/manifests.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-ns \
  --sync-policy automated \
  --auto-prune \
  --self-heal \
  --dry-run -o yaml > application.yaml
```

## Summary

The `argocd app create` command is a versatile tool for creating applications with precise control over every aspect of the configuration. Use it for quick prototyping and one-off application creation, or combine it with `--dry-run -o yaml` to generate declarative Application manifests. For production use, the declarative approach (YAML in Git) is preferred, but understanding every flag in `argocd app create` directly translates to understanding the Application CRD spec.
