# Flux CD vs ArgoCD: CLI vs UI Approach

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, argocd, gitops, kubernetes, cli, ui, developer experience, comparison

Description: A detailed comparison of the CLI-first approach of Flux CD versus the UI-centric approach of ArgoCD, covering workflows, developer experience, and operational trade-offs.

---

## Introduction

One of the most visible differences between Flux CD and ArgoCD is their approach to user interaction. Flux CD takes a CLI-first approach where all operations are performed through the command line and Kubernetes-native resources. ArgoCD provides a rich web-based UI alongside its CLI, offering visual application management and sync status dashboards.

This comparison examines how each approach impacts developer experience, operational workflows, debugging, and team adoption.

## Flux CD: The CLI-First Philosophy

Flux CD operates entirely through Kubernetes custom resources and the `flux` CLI. There is no built-in graphical interface. Every action is performed either by applying YAML manifests or using the Flux CLI, which is a thin wrapper around Kubernetes API operations.

### Bootstrap and Initial Setup

```bash
# Flux CD bootstrap - everything starts from the CLI
# This command sets up Flux and connects it to your Git repository
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal

# Check the installation status
flux check

# Output shows all controller versions and their status
# source-controller: healthy
# kustomize-controller: healthy
# helm-controller: healthy
# notification-controller: healthy
```

### Day-to-Day Operations with Flux CLI

```bash
# List all sources and their sync status
flux get sources all

# Check all Kustomizations across namespaces
flux get kustomizations -A

# Check all HelmReleases
flux get helmreleases -A

# View events for a specific resource
flux events --for Kustomization/apps

# Trigger manual reconciliation
flux reconcile kustomization apps --with-source

# Suspend and resume reconciliation
flux suspend kustomization apps
flux resume kustomization apps

# Export a resource as YAML for editing
flux export source git flux-system > source.yaml

# Create resources from the CLI
flux create source git my-app \
  --url=https://github.com/org/app \
  --branch=main \
  --interval=5m

# Create a Kustomization
flux create kustomization my-app \
  --source=GitRepository/my-app \
  --path=./deploy \
  --prune=true \
  --interval=10m \
  --target-namespace=default

# View the tree of resources managed by a Kustomization
flux tree kustomization apps
```

### Debugging with Flux CLI

```bash
# Check why a Kustomization is failing
flux get kustomization apps -o yaml

# View detailed events
flux events --for HelmRelease/nginx --watch

# Trace a specific resource through Flux
flux trace deployment nginx -n default
# Output:
# Object:        Deployment/nginx
# Namespace:     default
# Status:        Managed by Flux
# Kustomization: apps
# Source:        GitRepository/flux-system
# Revision:     main@sha1:abc123
# Last Applied:  2026-03-06T10:30:00Z

# Check logs from controllers
flux logs --kind=Kustomization --name=apps

# View all Flux resources in a namespace
flux get all -n flux-system
```

### Creating Resources Declaratively

In Flux CD, the primary workflow is writing YAML and committing to Git.

```yaml
# All Flux operations are expressed as Kubernetes resources
# Developers interact by creating/modifying these files in Git

# Step 1: Define the source
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/org/webapp
  ref:
    branch: main

---
# Step 2: Define what to deploy
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: webapp
  sourceRef:
    kind: GitRepository
    name: webapp
  path: ./k8s/overlays/production
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: webapp
      namespace: webapp

---
# Step 3: Configure alerts for the deployment
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: webapp-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: webapp
    - kind: GitRepository
      name: webapp
```

## ArgoCD: The UI-Centric Approach

ArgoCD provides a comprehensive web interface alongside its CLI. The UI offers visual application management, sync status dashboards, resource trees, and log viewing.

### Bootstrap and Setup

```bash
# ArgoCD installation
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Access the UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get the initial admin password
argocd admin initial-password -n argocd

# Login via CLI
argocd login localhost:8080 --username admin --password <password>
```

### ArgoCD CLI Operations

```bash
# List all applications
argocd app list

# Get application details
argocd app get my-app

# Sync an application
argocd app sync my-app

# View application diff (what will change)
argocd app diff my-app

# View application history
argocd app history my-app

# Rollback to a previous version
argocd app rollback my-app 3

# Set application parameters
argocd app set my-app --values-literal-file values.yaml

# Create an application from CLI
argocd app create my-app \
  --repo https://github.com/org/app.git \
  --path deploy \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated \
  --auto-prune \
  --self-heal

# View application logs from the CLI
argocd app logs my-app --follow

# View resource tree
argocd app resources my-app --output tree
```

### ArgoCD UI Features

The ArgoCD UI provides capabilities that have no direct equivalent in Flux CD.

```yaml
# ArgoCD Application with UI-oriented configuration
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: webapp
  namespace: argocd
  # Finalizer ensures cleanup when app is deleted via UI
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/org/webapp.git
    targetRevision: main
    path: k8s/production
  destination:
    server: https://kubernetes.default.svc
    namespace: webapp
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
  # UI can display these sync windows
  syncWindows:
    - kind: allow
      schedule: "0 8-18 * * 1-5"
      duration: 10h
      applications:
        - "*"
  # Notifications visible in UI
  metadata:
    annotations:
      notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deployments
```

The ArgoCD web UI provides:

- Real-time application topology visualization showing pods, services, and ingresses
- Live sync status with visual indicators for healthy, degraded, and out-of-sync states
- Resource diff viewer comparing live state vs desired state
- Log streaming from any pod directly in the browser
- Terminal access to pods through the UI
- Sync history with commit details and deployment timelines
- One-click sync, rollback, and refresh operations

## Workflow Comparison

### Deploying a New Application

With Flux CD (CLI/Git workflow):

```bash
# 1. Create the source and kustomization YAML files
cat > clusters/production/webapp/source.yaml << 'EOF'
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/org/webapp
  ref:
    branch: main
EOF

cat > clusters/production/webapp/kustomization.yaml << 'EOF'
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: webapp
  path: ./deploy
  prune: true
EOF

# 2. Commit and push to Git
git add clusters/production/webapp/
git commit -m "Add webapp deployment"
git push

# 3. Wait for Flux to reconcile (or trigger manually)
flux reconcile kustomization flux-system --with-source

# 4. Check status
flux get kustomization webapp
```

With ArgoCD (UI workflow):

```bash
# Option 1: Through the UI
# 1. Click "New App" in the ArgoCD dashboard
# 2. Fill in the form: repo URL, path, destination cluster/namespace
# 3. Configure sync policy (automatic/manual)
# 4. Click "Create"
# 5. Click "Sync" to deploy

# Option 2: Through CLI
argocd app create webapp \
  --repo https://github.com/org/webapp.git \
  --path deploy \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace webapp \
  --sync-policy automated

# Option 3: Declarative YAML (similar to Flux approach)
kubectl apply -f application.yaml
```

### Investigating a Failed Deployment

With Flux CD:

```bash
# Check what failed
flux get kustomizations
# NAME    REVISION    SUSPENDED   READY   MESSAGE
# webapp              False       False   kustomize build failed: ...

# Get detailed error
flux get kustomization webapp -o yaml | grep -A 5 "message"

# Check events
flux events --for Kustomization/webapp

# View controller logs for more context
flux logs --kind=Kustomization --name=webapp --level=error

# Trace resource ownership
flux trace deployment webapp -n webapp
```

With ArgoCD:

```bash
# In the UI:
# 1. Open the application - failed resources shown in red
# 2. Click on the failed resource to see events and logs
# 3. View the diff to see what changed
# 4. Check sync status and error messages

# Via CLI:
argocd app get webapp
# Shows sync status, health, and any error messages

# View detailed resource status
argocd app resources webapp

# View logs for a specific resource
argocd app logs webapp --container main
```

## Third-Party UIs for Flux CD

While Flux does not include a built-in UI, several third-party options exist.

```yaml
# Weave GitOps - the most popular UI for Flux CD
# Deploy via Helm with Flux
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: weave-gitops
  namespace: flux-system
spec:
  url: https://helm.gitops.weave.works
  interval: 1h
---
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: weave-gitops
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: weave-gitops
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: weave-gitops
  values:
    # Admin credentials for the UI
    adminUser:
      create: true
      username: admin
    # OIDC integration for SSO
    oidcConfig:
      enabled: false
```

## Automation and Scripting

### Flux CD in CI/CD Pipelines

```bash
# Flux CLI is designed for scripting and automation
# Check if a kustomization is ready (returns exit code)
flux get kustomization webapp --status-selector ready=true

# Wait for a reconciliation to complete
flux reconcile kustomization webapp --with-source --timeout=5m

# Export all resources for backup
flux export source all > sources.yaml
flux export kustomization all > kustomizations.yaml
flux export helmrelease all > helmreleases.yaml

# Programmatic health check
if flux get kustomization webapp | grep -q "True"; then
  echo "Deployment healthy"
else
  echo "Deployment failed"
  exit 1
fi
```

### ArgoCD in CI/CD Pipelines

```bash
# ArgoCD CLI also supports scripting
# Sync and wait for completion
argocd app sync webapp --timeout 300

# Wait for health
argocd app wait webapp --health --timeout 300

# Get application status as JSON for parsing
argocd app get webapp -o json | jq '.status.health.status'

# Automated rollback on failure
argocd app sync webapp || argocd app rollback webapp
```

## Impact on Team Adoption

### CLI-First (Flux CD) Considerations

- Lower barrier for teams already comfortable with kubectl and Git
- All changes go through pull requests, enforcing review processes
- No separate UI to maintain, secure, or manage access for
- Steeper learning curve for teams accustomed to visual tools
- Requires strong Git discipline and YAML fluency

### UI-Centric (ArgoCD) Considerations

- Faster onboarding for developers new to GitOps
- Visual topology helps understand application structure
- Non-technical stakeholders can view deployment status
- UI can become a crutch that bypasses GitOps workflows
- Additional component to secure, scale, and maintain

## Operational Overhead Comparison

```yaml
# Flux CD operational footprint
# Minimal components, no external dependencies
# Total: 4-6 lightweight controllers
# Memory: ~256MB total across all controllers
# No database, no cache layer, no UI server

# ArgoCD operational footprint
# Multiple services with external dependencies
# Total: 5-7 components including Redis
# Memory: ~1-2GB total across all components
# Requires Redis for caching
# API server needs TLS and auth configuration
# UI server needs ingress and security
```

## Summary

The CLI vs UI debate between Flux CD and ArgoCD reflects a deeper philosophical difference in how GitOps tools should interact with users. Flux CD's CLI-first approach aligns with the Unix philosophy of small, composable tools and treats Git as the primary interface. ArgoCD's UI-centric approach provides immediate visual feedback and lowers the barrier to entry for teams transitioning to GitOps.

Neither approach is universally superior. Flux CD works best for teams that value automation, scripting, and strict GitOps discipline. ArgoCD works best for teams that need visual feedback, cross-functional visibility, and a gentler learning curve. Many organizations even run both tools for different use cases. The key is matching the tool's interaction model to your team's workflow preferences and operational culture.
