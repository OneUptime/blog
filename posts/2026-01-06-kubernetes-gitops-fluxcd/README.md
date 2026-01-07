# How to Automate Kubernetes Deployments with FluxCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GitOps, FluxCD, CI/CD, DevOps, Automation

Description: A comprehensive guide to implementing GitOps with FluxCD, including installation, image automation, Helm releases, multi-tenancy, and production best practices.

---

FluxCD is the CNCF-graduated GitOps toolkit. It continuously reconciles your Kubernetes cluster with Git repositories, automatically deploying changes when you push commits.

## Why FluxCD?

- **CNCF Graduated** - Production-ready, wide adoption
- **Modular** - Use only what you need
- **Native Kubernetes** - Uses CRDs, no external dependencies
- **Multi-tenancy** - Built-in isolation for teams
- **Image Automation** - Auto-update images when new versions are pushed

## Installing FluxCD

### Prerequisites

The following commands install the Flux CLI on your local machine and verify that your cluster meets the prerequisites for running FluxCD. The CLI is essential for bootstrapping and managing Flux installations.

```bash
# Install flux CLI
# macOS - using Homebrew package manager
brew install fluxcd/tap/flux

# Linux - using the official install script
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify CLI installation and check cluster prerequisites
flux --version
flux check --pre  # Checks if cluster meets Flux requirements
```

### Bootstrap FluxCD

Bootstrapping connects FluxCD to your Git repository and installs the controllers in your cluster. This creates a self-managing system where Flux keeps itself up-to-date by watching its own manifests in Git.

```bash
# Bootstrap with GitHub
# Set your GitHub Personal Access Token with repo permissions
export GITHUB_TOKEN=<your-token>
export GITHUB_USER=<your-username>

# Bootstrap creates the repo (if needed), installs Flux, and configures self-management
flux bootstrap github \
  --owner=$GITHUB_USER \           # GitHub username or organization
  --repository=fleet-infra \       # Repository name for Flux configs
  --branch=main \                  # Branch to use for GitOps
  --path=./clusters/production \   # Path within repo for this cluster
  --personal                       # Use personal account (not org)

# Bootstrap with GitLab (alternative)
export GITLAB_TOKEN=<your-token>

flux bootstrap gitlab \
  --owner=myorg \                  # GitLab group or username
  --repository=fleet-infra \       # Repository name
  --branch=main \                  # Target branch
  --path=./clusters/production     # Cluster-specific path
```

This creates:
1. A Git repository (if it doesn't exist)
2. FluxCD components in your cluster
3. A `GitRepository` and `Kustomization` for self-management

### Verify Installation

After bootstrapping, verify that all Flux components are running correctly and can reconcile resources. These commands help you monitor the health of your GitOps setup.

```bash
# Check Flux components are healthy
flux check

# See all Flux resources across namespaces
flux get all -A

# Watch reconciliation logs in real-time for debugging
flux logs --all-namespaces --follow
```

## Repository Structure

### Recommended Layout

This directory structure separates concerns between clusters, infrastructure, and applications. It enables independent reconciliation cycles and makes it easy to promote changes between environments.

```
fleet-infra/
├── clusters/
│   ├── production/
│   │   ├── flux-system/           # Flux components (auto-generated)
│   │   ├── infrastructure.yaml    # Infrastructure Kustomization
│   │   └── apps.yaml              # Apps Kustomization
│   └── staging/
│       ├── flux-system/
│       ├── infrastructure.yaml
│       └── apps.yaml
├── infrastructure/
│   ├── sources/                   # Helm repos, Git repos
│   │   ├── bitnami.yaml
│   │   └── ingress-nginx.yaml
│   ├── controllers/               # Infrastructure controllers
│   │   ├── ingress-nginx/
│   │   └── cert-manager/
│   └── configs/                   # Cluster configs
│       ├── cluster-issuers/
│       └── network-policies/
└── apps/
    ├── base/
    │   └── myapp/
    │       ├── kustomization.yaml
    │       ├── deployment.yaml
    │       └── service.yaml
    └── production/
        └── myapp/
            ├── kustomization.yaml
            └── patch-replicas.yaml
```

## Core Concepts

### GitRepository

The GitRepository resource tells Flux where to find your Kubernetes manifests. It periodically fetches the repository and makes its contents available for Kustomizations to apply.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 1m              # How often to check for new commits
  url: https://github.com/myorg/myapp.git
  ref:
    branch: main            # Branch to track
  secretRef:
    name: github-creds      # For private repos - contains auth credentials
```

### Kustomization

The Kustomization resource tells Flux which path from a source to apply and how to apply it. It handles health checking, pruning orphaned resources, and applying kustomize overlays.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 10m                    # Reconciliation interval
  targetNamespace: production      # Deploy resources to this namespace
  sourceRef:
    kind: GitRepository
    name: myapp                    # Reference to the GitRepository
  path: ./k8s/overlays/production  # Path within the repo to apply
  prune: true                      # Remove resources deleted from Git
  healthChecks:                    # Wait for these resources to be ready
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: production
  timeout: 3m                      # Max time to wait for health checks
```

### HelmRepository

HelmRepository defines where Flux can find Helm charts. This enables deploying third-party applications using Helm while still managing everything through GitOps.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h                                    # How often to refresh chart index
  url: https://charts.bitnami.com/bitnami         # Helm repository URL
```

### HelmRelease

HelmRelease deploys and manages Helm charts declaratively. Flux handles installation, upgrades, rollbacks, and drift detection for your Helm releases.

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: ingress-nginx
spec:
  interval: 1h                     # How often to reconcile the release
  chart:
    spec:
      chart: ingress-nginx         # Chart name
      version: "4.x"               # Semantic version constraint
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx        # Reference to HelmRepository
        namespace: flux-system
  values:                          # Helm values to apply
    controller:
      replicaCount: 3              # Run 3 replicas for HA
      service:
        type: LoadBalancer         # Expose via cloud load balancer
```

## Deploying Applications

### Simple Application

This Kustomization deploys all applications from the apps/production path. The dependsOn field ensures infrastructure is deployed first, preventing issues with missing CRDs or services.

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m                    # Check for updates every 10 minutes
  sourceRef:
    kind: GitRepository
    name: flux-system              # Use the main Flux repository
  path: ./apps/production          # Path containing app manifests
  prune: true                      # Clean up deleted resources
  dependsOn:
    - name: infrastructure         # Wait for infrastructure to be ready
```

### Application with Dependencies

Kustomize overlays allow environment-specific customizations. This pattern uses a base configuration with production-specific patches for replicas, resources, and image tags.

```yaml
# apps/production/myapp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base/myapp               # Include base manifests
patches:
  - path: patch-replicas.yaml      # Apply production-specific patches
images:
  - name: myorg/myapp
    newTag: v1.2.3                 # Pin to specific version in production
```

## Image Automation

Automatically update images when new versions are pushed.

### Install Image Automation Controllers

The image automation controllers scan container registries and automatically update image tags in your Git repository. This enables true continuous deployment where pushing a new image triggers automatic deployment.

```bash
# Re-bootstrap with image automation components enabled
flux bootstrap github \
  --components-extra=image-reflector-controller,image-automation-controller \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production
```

### Create ImageRepository

ImageRepository tells Flux which container registry and image to monitor for new tags. It periodically scans the registry and caches the available tags.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: ghcr.io/myorg/myapp       # Container image to scan
  interval: 1m                      # How often to scan for new tags
  secretRef:
    name: ghcr-creds               # Registry credentials if private
```

### Create ImagePolicy

ImagePolicy defines which image tags should be selected for deployment. It filters and orders tags based on semantic versioning, alphabetical order, or timestamp patterns.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp                    # Reference to ImageRepository
  policy:
    semver:
      range: 1.x.x                 # Accept any 1.x.x version (SemVer)
```

Or for latest tag based on timestamp extraction:

```yaml
spec:
  policy:
    alphabetical:
      order: asc                   # Sort alphabetically ascending
    filterTags:
      pattern: '^main-[a-f0-9]+-(?P<ts>[0-9]+)'  # Match main branch builds
      extract: '$ts'               # Extract timestamp for ordering
```

### Create ImageUpdateAutomation

ImageUpdateAutomation commits image tag updates back to Git when new images match the policy. This closes the GitOps loop by ensuring Git always reflects the deployed state.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 1m                     # How often to check for updates
  sourceRef:
    kind: GitRepository
    name: fleet-infra              # Repository to commit changes to
  git:
    checkout:
      ref:
        branch: main               # Branch to checkout
    commit:
      author:
        email: flux@example.com    # Git commit author email
        name: Flux                 # Git commit author name
      messageTemplate: 'Update {{.AutomationObject.Name}}'  # Commit message
    push:
      branch: main                 # Branch to push to
  update:
    path: ./apps/production        # Path to scan for image markers
    strategy: Setters              # Use setter comments to find images
```

### Mark Images for Update

Add special comments to your manifests so Flux knows which images to update. The comment references the ImagePolicy that controls the tag selection.

```yaml
# In your deployment
spec:
  containers:
    - name: myapp
      # The comment tells Flux to update this image tag using the specified policy
      image: ghcr.io/myorg/myapp:1.0.0 # {"$imagepolicy": "flux-system:myapp"}
```

Flux will update the image tag and commit to Git.

## Helm with Values from ConfigMaps/Secrets

### Values from ConfigMap

HelmRelease can pull values from ConfigMaps and Secrets, enabling separation of concerns between chart configuration and sensitive data like credentials.

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
spec:
  chart:
    spec:
      chart: myapp
      sourceRef:
        kind: HelmRepository
        name: myorg
  valuesFrom:                      # Load values from external sources
    - kind: ConfigMap
      name: myapp-values           # Non-sensitive configuration
      valuesKey: values.yaml       # Key containing YAML values
    - kind: Secret
      name: myapp-secrets          # Sensitive values like passwords
      valuesKey: secrets.yaml      # Key containing secret YAML values
```

### Inline Values with Substitution

Variable substitution allows reusing the same manifests across environments by replacing placeholders at reconciliation time with values from ConfigMaps or Secrets.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
spec:
  postBuild:
    substitute:                    # Inline variable definitions
      CLUSTER_NAME: production
      DOMAIN: example.com
    substituteFrom:                # Load additional variables from resources
      - kind: ConfigMap
        name: cluster-vars         # Cluster-specific variables
      - kind: Secret
        name: cluster-secrets      # Sensitive cluster variables
```

In your manifests, reference variables with the ${VAR_NAME} syntax:

```yaml
spec:
  rules:
    - host: myapp.${DOMAIN}        # Will be replaced with myapp.example.com
```

## Multi-Tenancy

### Create Tenant Namespace

Multi-tenancy in FluxCD isolates teams by namespace. Each team gets their own namespace with labeled resources for organization and RBAC enforcement.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    toolkit.fluxcd.io/tenant: team-a  # Label for tenant identification
```

### Tenant GitRepository

Each tenant can have their own Git repository, allowing independent development workflows while centralizing deployment through Flux.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-a-apps
  namespace: team-a                # Tenant's namespace
spec:
  interval: 1m
  url: https://github.com/myorg/team-a-apps.git  # Team's own repo
  ref:
    branch: main
```

### Tenant Kustomization with Service Account

Using a dedicated service account for tenant Kustomizations enables fine-grained RBAC control. The tenant can only deploy resources they have permission to create.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a-apps
  namespace: team-a
spec:
  serviceAccountName: team-a-reconciler  # Service account for RBAC
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-a-apps
  path: ./                         # Root of tenant repo
  prune: true                      # Auto-cleanup deleted resources
  targetNamespace: team-a          # Restrict deployments to tenant namespace
```

### RBAC for Tenant

This RBAC configuration creates a service account with limited permissions. In production, replace cluster-admin with a custom role that grants only necessary permissions.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-a-reconciler
  namespace: team-a
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-reconciler
  namespace: team-a                # Scope permissions to tenant namespace
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin              # Or custom role with limited permissions
subjects:
  - kind: ServiceAccount
    name: team-a-reconciler
    namespace: team-a
```

## Notifications

### Slack Notifications

Notifications keep your team informed about deployment events. The Alert resource filters events by severity and source, sending them to configured providers like Slack.

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack                      # Notification provider type
  channel: deployments             # Slack channel to post to
  secretRef:
    name: slack-webhook            # Secret containing webhook URL
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: on-call-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack                    # Reference to Provider
  eventSeverity: error             # Only alert on errors
  eventSources:                    # Watch all Kustomizations and HelmReleases
    - kind: Kustomization
      name: '*'                    # Wildcard matches all
    - kind: HelmRelease
      name: '*'
```

### GitHub Commit Status

GitHub commit status integration shows deployment status directly on commits and pull requests. This provides visibility into whether changes have been successfully deployed.

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github
  namespace: flux-system
spec:
  type: github                     # GitHub commit status provider
  address: https://github.com/myorg/myapp  # Repository URL
  secretRef:
    name: github-token             # Secret with GitHub token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: github-status
  namespace: flux-system
spec:
  providerRef:
    name: github                   # Reference to GitHub provider
  eventSources:
    - kind: Kustomization
      name: myapp                  # Only report status for this app
```

## Monitoring Flux

### Prometheus Metrics

The ServiceMonitor configures Prometheus to scrape Flux controller metrics. This enables monitoring reconciliation performance and alerting on failures.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: flux-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux  # Select all Flux components
  endpoints:
    - port: http-prom              # Metrics endpoint port
```

### Grafana Dashboard

Import dashboard ID: `16714` (Flux Cluster Stats)

### Key Metrics

These PromQL queries help monitor Flux health. Track reconciliation errors, duration, and source fetch failures to identify issues before they impact deployments.

```promql
# Reconciliation errors - shows resources failing to reconcile
gotk_reconcile_condition{type="Ready",status="False"}

# Reconciliation duration - P99 latency by resource kind
histogram_quantile(0.99, sum(rate(gotk_reconcile_duration_seconds_bucket[5m])) by (le, kind))

# Source fetch failures - Git/Helm repos failing to sync
gotk_source_condition{type="Ready",status="False"}
```

## Troubleshooting

### Check Status

These commands help diagnose issues with Flux resources. Start with get all to see overall status, then drill down into specific resources and their events.

```bash
# All resources across namespaces
flux get all -A

# Specific resource status
flux get kustomization myapp -n flux-system

# Events for a specific resource
flux events --for Kustomization/myapp

# Logs for a specific Kustomization
flux logs --kind=Kustomization --name=myapp
```

### Force Reconciliation

When you need changes applied immediately without waiting for the interval, trigger manual reconciliation. Use source reconciliation when you've pushed new commits.

```bash
# Trigger immediate reconciliation of a Kustomization
flux reconcile kustomization myapp -n flux-system

# Reconcile source first (fetches latest commits), then kustomization
flux reconcile source git fleet-infra -n flux-system
```

### Suspend/Resume

Suspending stops Flux from making changes, useful during maintenance or debugging. Resume when you're ready for normal GitOps operations to continue.

```bash
# Stop reconciliation temporarily
flux suspend kustomization myapp

# Resume normal reconciliation
flux resume kustomization myapp
```

### Common Issues

**Source not ready:**

When a GitRepository shows not ready, check its status and events. Common causes include incorrect URLs, missing credentials, or network issues.

```bash
# List all Git sources and their status
flux get sources git -A
# Get detailed information about the source
kubectl describe gitrepository myapp -n flux-system
```

**Kustomization failed:**

When a Kustomization fails, check the logs for specific error messages. Issues often include invalid YAML, missing resources, or permission problems.

```bash
# View recent logs for the failing Kustomization
flux logs --kind=Kustomization --name=myapp --tail=50
```

**Health check timeout:**

If deployments take longer to become ready than expected, increase the timeout value to give pods more time to start up.

```yaml
spec:
  timeout: 5m                      # Increase timeout for slow-starting apps
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: production
```

## Best Practices

1. **Use dependsOn** - Order deployments correctly
2. **Enable pruning** - Remove orphaned resources
3. **Set health checks** - Verify deployments succeed
4. **Use semantic versioning** - For HelmRelease chart versions
5. **Separate infrastructure from apps** - Different reconciliation cycles
6. **Encrypt secrets** - Use SOPS or Sealed Secrets
7. **Monitor reconciliation** - Alert on failures

---

FluxCD provides a robust, CNCF-backed GitOps solution. Its modular design means you can start simple and add capabilities like image automation as you need them. Combined with proper monitoring and alerting, it enables confident, automated deployments from Git.
