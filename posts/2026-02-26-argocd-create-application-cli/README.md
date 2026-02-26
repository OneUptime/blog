# How to Create an ArgoCD Application Using the CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Automation

Description: Master creating and managing ArgoCD applications through the CLI with all available flags, options, and real-world examples for different source types.

---

The ArgoCD CLI is the most flexible way to create and manage applications. It supports every configuration option available in ArgoCD and is the best tool for scripting, CI/CD integration, and quick one-off operations. This guide covers every useful flag and option for the `argocd app create` command with practical examples.

## Prerequisites

Make sure the CLI is installed and connected:

```bash
# Check CLI version
argocd version --client

# Login to ArgoCD
argocd login argocd.example.com --grpc-web

# Or with port-forward
kubectl port-forward svc/argocd-server -n argocd 8080:443 &
argocd login localhost:8080 --insecure
```

## Basic Application Creation

The simplest form needs a name, repo, path, destination server, and namespace:

```bash
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path deploy/manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production
```

## Source Configuration Flags

### Git Repository Options

```bash
# Specify a branch to track
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --revision main \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default

# Track a specific tag
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --revision v1.2.0 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default

# Pin to a specific commit
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --revision abc123def456 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default
```

### Helm Chart from Repository

```bash
# Deploy a Helm chart from a Helm repo
argocd app create my-helm-app \
  --repo https://charts.bitnami.com/bitnami \
  --helm-chart nginx \
  --revision 15.0.0 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default

# With values overrides
argocd app create my-helm-app \
  --repo https://charts.bitnami.com/bitnami \
  --helm-chart nginx \
  --revision 15.0.0 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --helm-set replicaCount=3 \
  --helm-set service.type=ClusterIP
```

### Helm Chart from Git

```bash
# Deploy a Helm chart stored in a Git repo
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path charts/my-chart \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --helm-set image.tag=v1.2.3

# With a values file from the same repo
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path charts/my-chart \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --values values-production.yaml

# Multiple values files (applied in order)
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path charts/my-chart \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --values values.yaml \
  --values values-production.yaml
```

### Kustomize Options

```bash
# Deploy with Kustomize
argocd app create my-kustomize-app \
  --repo https://github.com/myorg/myrepo.git \
  --path overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default

# With Kustomize image override
argocd app create my-kustomize-app \
  --repo https://github.com/myorg/myrepo.git \
  --path overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --kustomize-image myapp=myregistry/myapp:v2.0.0

# With name prefix/suffix
argocd app create my-kustomize-app \
  --repo https://github.com/myorg/myrepo.git \
  --path overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --nameprefix prod- \
  --namesuffix -v2
```

## Sync Policy Flags

```bash
# Enable automated sync
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated

# Automated sync with prune and self-heal
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated \
  --auto-prune \
  --self-heal

# With sync options
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-option CreateNamespace=true \
  --sync-option PruneLast=true \
  --sync-option ServerSideApply=true

# With retry policy
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated \
  --sync-retry-limit 5 \
  --sync-retry-backoff-duration 5s \
  --sync-retry-backoff-max-duration 3m \
  --sync-retry-backoff-factor 2
```

## Project and Label Flags

```bash
# Assign to a specific project
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --project my-team-project

# Add labels
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --label team=backend \
  --label env=production

# Add annotations
argocd app create my-app \
  --repo https://github.com/myorg/myrepo.git \
  --path manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --annotations notifications.argoproj.io/subscribe.on-sync-succeeded.slack=my-channel
```

## Managing Applications with CLI

Once created, manage applications with these commands:

```bash
# List all applications
argocd app list

# Get detailed info about an app
argocd app get my-app

# Sync an app
argocd app sync my-app

# Sync and wait for completion
argocd app sync my-app --timeout 300

# Sync with prune
argocd app sync my-app --prune

# Sync specific resources
argocd app sync my-app --resource apps:Deployment:my-deployment

# Refresh (re-read from Git)
argocd app get my-app --refresh

# Hard refresh (clear cache and re-read)
argocd app get my-app --hard-refresh

# View application diff
argocd app diff my-app

# View application history
argocd app history my-app

# Rollback to a previous version
argocd app rollback my-app 2

# Update application settings
argocd app set my-app --revision develop
argocd app set my-app --helm-set replicas=5
argocd app set my-app --sync-policy automated

# Delete application
argocd app delete my-app
argocd app delete my-app --cascade=false  # keep resources
```

## Scripting with CLI

### Batch Create Applications

```bash
#!/bin/bash
# create-apps.sh - Create multiple applications from a list

APPS=("frontend" "backend" "worker" "scheduler")
REPO="https://github.com/myorg/platform.git"
CLUSTER="https://kubernetes.default.svc"

for app in "${APPS[@]}"; do
  echo "Creating application: $app"
  argocd app create "$app" \
    --repo "$REPO" \
    --path "services/$app/deploy" \
    --dest-server "$CLUSTER" \
    --dest-namespace "$app" \
    --project platform \
    --sync-policy automated \
    --auto-prune \
    --self-heal \
    --sync-option CreateNamespace=true \
    --label team=platform
done
```

### Wait for Sync Completion

```bash
#!/bin/bash
# sync-and-wait.sh - Sync an app and wait for it to complete

APP_NAME=$1

# Trigger sync
argocd app sync "$APP_NAME"

# Wait for sync to complete
argocd app wait "$APP_NAME" --timeout 300

# Check final status
STATUS=$(argocd app get "$APP_NAME" -o json | jq -r '.status.health.status')
if [ "$STATUS" = "Healthy" ]; then
  echo "Deployment successful"
  exit 0
else
  echo "Deployment failed. Health: $STATUS"
  exit 1
fi
```

### CI/CD Integration

```bash
#!/bin/bash
# deploy.sh - Used in CI/CD pipeline

# Variables from CI environment
IMAGE_TAG=${CI_COMMIT_SHA:0:7}
APP_NAME="my-app"

# Update the image tag
argocd app set "$APP_NAME" \
  --helm-set image.tag="$IMAGE_TAG"

# Sync with the new tag
argocd app sync "$APP_NAME" --timeout 300

# Wait and verify
argocd app wait "$APP_NAME" --health --timeout 300

echo "Deployed $APP_NAME with image tag $IMAGE_TAG"
```

## Output Formats

The CLI supports different output formats:

```bash
# JSON output (for scripting)
argocd app get my-app -o json

# Wide output (more columns)
argocd app list -o wide

# YAML output
argocd app get my-app -o yaml

# Get specific fields with jq
argocd app get my-app -o json | jq '{
  name: .metadata.name,
  health: .status.health.status,
  sync: .status.sync.status,
  revision: .status.sync.revision
}'

# List unhealthy apps
argocd app list -o json | jq '.items[] | select(.status.health.status != "Healthy") | .metadata.name'
```

For creating applications declaratively through YAML manifests, see [ArgoCD Application declarative YAML](https://oneuptime.com/blog/post/2026-02-26-argocd-application-declarative-yaml/view). For the UI approach, see [creating ArgoCD applications using the UI](https://oneuptime.com/blog/post/2026-02-26-argocd-create-application-ui/view).
