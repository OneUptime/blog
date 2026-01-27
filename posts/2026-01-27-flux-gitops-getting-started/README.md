# How to Get Started with Flux for GitOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GitOps, Flux, CI/CD, DevOps, Automation, Helm, Kustomize

Description: A comprehensive guide to implementing GitOps with Flux CD, covering installation, bootstrapping, source management, Kustomizations, Helm releases, image automation, and notifications.

---

> GitOps is infrastructure as code done right. Flux watches your Git repositories and automatically reconciles your cluster state to match what is declared in Git. Your Git repository becomes the single source of truth for your entire infrastructure.

## What Is Flux?

Flux is a set of continuous delivery tools for Kubernetes that are open source and vendor-neutral. It keeps your clusters in sync with sources like Git repositories and Helm repositories, and automates updates to configuration when new code is deployed.

Core components:
1. **Source Controller** - Manages sources (Git repos, Helm repos, S3 buckets)
2. **Kustomize Controller** - Reconciles Kustomizations
3. **Helm Controller** - Manages Helm releases
4. **Notification Controller** - Handles events and alerts
5. **Image Automation Controllers** - Updates manifests with new image tags

## Installing Flux

### Prerequisites

Before installing Flux, ensure you have:
- A Kubernetes cluster (v1.26 or newer)
- kubectl configured to access your cluster
- A GitHub personal access token with repo permissions

### Install the Flux CLI

```bash
# macOS (using Homebrew)
brew install fluxcd/tap/flux

# Linux (using curl)
curl -s https://fluxcd.io/install.sh | sudo bash

# Windows (using Chocolatey)
choco install flux

# Verify installation
flux --version
```

### Check Cluster Compatibility

```bash
# Run pre-flight checks to verify your cluster is ready
flux check --pre

# Expected output shows all checks passing:
# - Kubernetes version >= 1.26.0
# - kubectl version matches cluster
# - cluster connectivity verified
```

## Bootstrapping Flux

Bootstrapping installs Flux components and creates a Git repository structure for GitOps.

### Bootstrap with GitHub

```bash
# Export your GitHub personal access token
export GITHUB_TOKEN=<your-github-token>

# Bootstrap Flux with GitHub
flux bootstrap github \
  --owner=<your-github-username> \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal

# This command:
# 1. Creates the fleet-infra repository if it does not exist
# 2. Installs Flux components in the flux-system namespace
# 3. Configures Flux to sync from the specified path
# 4. Commits the Flux manifests to your repository
```

### Bootstrap with GitLab

```bash
# Export your GitLab personal access token
export GITLAB_TOKEN=<your-gitlab-token>

# Bootstrap Flux with GitLab
flux bootstrap gitlab \
  --owner=<your-gitlab-username> \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal
```

### Verify Installation

```bash
# Check that all Flux components are running
kubectl get pods -n flux-system

# Check Flux component status
flux check

# Watch reconciliation status
flux get all
```

## GitRepository Sources

GitRepository defines a source to produce an artifact from a Git repository revision.

### Basic GitRepository

```yaml
# git-repository.yaml
# Defines a Git repository source for Flux to watch
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  # How often to check for updates
  interval: 1m

  # Repository URL (HTTPS or SSH)
  url: https://github.com/myorg/myapp-config

  # Branch, tag, or commit to track
  ref:
    branch: main

  # Optional: specify a subdirectory
  # ignore: |
  #   # Exclude files from the artifact
  #   *.md
  #   docs/
```

### GitRepository with SSH Authentication

```yaml
# git-repository-ssh.yaml
# GitRepository using SSH key authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp-private
  namespace: flux-system
spec:
  interval: 1m
  url: ssh://git@github.com/myorg/myapp-config.git
  ref:
    branch: main

  # Reference to a Secret containing SSH credentials
  secretRef:
    name: myapp-ssh-credentials
---
# Secret containing SSH private key
apiVersion: v1
kind: Secret
metadata:
  name: myapp-ssh-credentials
  namespace: flux-system
type: Opaque
stringData:
  # SSH private key for repository access
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-private-key>
    -----END OPENSSH PRIVATE KEY-----
  # Known hosts entry for the Git server
  known_hosts: |
    github.com ecdsa-sha2-nistp256 AAAA...
```

### Create SSH Secret with Flux CLI

```bash
# Generate and configure SSH credentials automatically
flux create secret git myapp-ssh-credentials \
  --url=ssh://git@github.com/myorg/myapp-config.git \
  --private-key-file=./identity

# Or using an existing deploy key
flux create secret git myapp-ssh-credentials \
  --url=ssh://git@github.com/myorg/myapp-config.git \
  --private-key-file=~/.ssh/id_ed25519
```

## Kustomization

Kustomization defines a pipeline for fetching, decrypting, building, validating, and applying Kubernetes manifests.

### Basic Kustomization

```yaml
# kustomization.yaml
# Defines how to apply manifests from a GitRepository
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  # How often to reconcile
  interval: 10m

  # Retry interval on failure
  retryInterval: 2m

  # Timeout for apply operations
  timeout: 5m

  # Source reference (GitRepository, OCIRepository, or Bucket)
  sourceRef:
    kind: GitRepository
    name: myapp

  # Path to kustomization.yaml or directory with manifests
  path: ./deploy/production

  # Enable garbage collection of removed resources
  prune: true

  # Wait for resources to become ready
  wait: true

  # Target namespace for resources without explicit namespace
  targetNamespace: myapp-production
```

### Kustomization with Dependencies

```yaml
# kustomization-with-deps.yaml
# Kustomization that depends on other Kustomizations
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: myapp
  path: ./deploy/production
  prune: true

  # Wait for these Kustomizations before applying
  dependsOn:
    - name: infrastructure
    - name: cert-manager

  # Health checks to verify deployment success
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp-production
```

### Kustomization with Variable Substitution

```yaml
# kustomization-vars.yaml
# Kustomization using post-build variable substitution
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: myapp
  path: ./deploy
  prune: true

  # Post-build variable substitution
  postBuild:
    # Inline variable definitions
    substitute:
      ENVIRONMENT: production
      CLUSTER_NAME: prod-us-east-1
      REPLICAS: "3"

    # Variables from ConfigMaps and Secrets
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
      - kind: Secret
        name: app-secrets
```

In your manifests, use `${VARIABLE_NAME}` syntax:

```yaml
# deployment.yaml (in your Git repository)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: ${REPLICAS}
  template:
    spec:
      containers:
        - name: myapp
          env:
            - name: ENVIRONMENT
              value: ${ENVIRONMENT}
```

## HelmRelease

HelmRelease defines a Helm chart release with values from various sources.

### HelmRepository Source

```yaml
# helm-repository.yaml
# Defines a Helm chart repository source
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  # How often to fetch repository index
  interval: 1h

  # Helm repository URL
  url: https://charts.bitnami.com/bitnami

  # Optional: type can be "default" or "oci"
  type: default
```

### Basic HelmRelease

```yaml
# helm-release.yaml
# Defines a Helm chart release
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: flux-system
spec:
  # Reconciliation interval
  interval: 30m

  # Helm chart reference
  chart:
    spec:
      # Chart name from the HelmRepository
      chart: redis
      # Chart version (semver range supported)
      version: "18.x"
      # Source reference
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      # How often to check for new chart versions
      interval: 12h

  # Target namespace for release
  targetNamespace: redis

  # Create namespace if it does not exist
  install:
    createNamespace: true

  # Helm values
  values:
    # Inline values for the Helm chart
    architecture: standalone
    auth:
      enabled: true
      password: "${REDIS_PASSWORD}"
    master:
      persistence:
        size: 10Gi
    replica:
      replicaCount: 2
```

### HelmRelease with Values from ConfigMap and Secret

```yaml
# helm-release-external-values.yaml
# HelmRelease with values from multiple sources
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: myapp
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: myorg
  targetNamespace: production

  # Values from multiple sources (merged in order)
  valuesFrom:
    # Values from a ConfigMap
    - kind: ConfigMap
      name: myapp-values
      valuesKey: values.yaml

    # Values from a Secret (for sensitive data)
    - kind: Secret
      name: myapp-secrets
      valuesKey: secrets.yaml

    # Override specific keys from a ConfigMap
    - kind: ConfigMap
      name: environment-config
      valuesKey: production.yaml
      targetPath: global.environment

  # Inline values (highest priority)
  values:
    replicaCount: 3
```

### HelmRelease from OCI Registry

```yaml
# helm-release-oci.yaml
# HelmRelease using OCI registry for chart storage
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  # OCI registry type
  type: oci
  interval: 5m
  url: oci://ghcr.io/stefanprodan/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: podinfo
      version: "6.x"
      sourceRef:
        kind: HelmRepository
        name: podinfo
  targetNamespace: default
```

## Image Automation

Flux can automatically update container image tags in your Git repository when new images are pushed to a container registry.

### Image Repository

```yaml
# image-repository.yaml
# Scans a container registry for image tags
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  # Container image to scan (without tag)
  image: ghcr.io/myorg/myapp

  # How often to scan for new tags
  interval: 5m

  # Optional: credentials for private registries
  secretRef:
    name: ghcr-credentials
```

### Image Policy

```yaml
# image-policy.yaml
# Defines how to select the latest image tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  # Reference to ImageRepository
  imageRepositoryRef:
    name: myapp

  # Policy for selecting the latest tag
  policy:
    # Semantic versioning filter
    semver:
      # Select latest patch version for 1.x releases
      range: 1.x

    # Or use alphabetical sorting for date-based tags
    # alphabetical:
    #   order: asc

    # Or use numerical sorting
    # numerical:
    #   order: asc

  # Optional: filter tags before applying policy
  filterTags:
    # Only consider tags matching this pattern
    pattern: '^main-[a-f0-9]+-(?P<ts>[0-9]+)'
    extract: '$ts'
```

### Image Update Automation

```yaml
# image-update-automation.yaml
# Automatically commits image tag updates to Git
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: myapp
  namespace: flux-system
spec:
  # How often to check for image updates
  interval: 30m

  # Git repository to update
  sourceRef:
    kind: GitRepository
    name: fleet-infra

  # Git commit configuration
  git:
    checkout:
      ref:
        branch: main

    # Commit settings
    commit:
      author:
        name: fluxbot
        email: fluxbot@myorg.com
      messageTemplate: |
        Automated image update

        Automation: {{ .AutomationObject }}

        Updates:
        {{ range .Changed.Changes }}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end }}

    # Push to a different branch (for PR workflow)
    push:
      branch: main

  # Path to update in the repository
  update:
    path: ./clusters/production
    strategy: Setters
```

### Mark Images for Update

In your manifests, add markers to indicate which images should be updated:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          # Flux will update the tag based on ImagePolicy
          # {"$imagepolicy": "flux-system:myapp"}
          image: ghcr.io/myorg/myapp:1.0.0
```

## Notifications

Flux can send notifications about reconciliation events to various platforms.

### Provider Configuration

```yaml
# notification-provider.yaml
# Configure notification destination (Slack, Teams, Discord, etc.)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  # Provider type: slack, discord, msteams, github, gitlab, etc.
  type: slack

  # Channel to send notifications to
  channel: deployments

  # Reference to Secret containing webhook URL
  secretRef:
    name: slack-webhook
---
# Secret containing the webhook URL
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook
  namespace: flux-system
type: Opaque
stringData:
  address: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Alert Configuration

```yaml
# alert.yaml
# Defines which events trigger notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: on-call
  namespace: flux-system
spec:
  # Reference to notification provider
  providerRef:
    name: slack

  # Event severity filter: info, error
  eventSeverity: error

  # Resources to monitor
  eventSources:
    # Watch all Kustomizations in flux-system
    - kind: Kustomization
      namespace: flux-system
      name: '*'

    # Watch all HelmReleases in flux-system
    - kind: HelmRelease
      namespace: flux-system
      name: '*'

    # Watch specific GitRepository
    - kind: GitRepository
      namespace: flux-system
      name: fleet-infra

  # Optional: include specific events only
  # inclusionList:
  #   - ".*failed.*"

  # Optional: exclude specific events
  # exclusionList:
  #   - ".*upgrade.*"
```

### GitHub Commit Status Provider

```yaml
# github-provider.yaml
# Update GitHub commit status on reconciliation
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github-status
  namespace: flux-system
spec:
  type: github
  address: https://github.com/myorg/fleet-infra
  secretRef:
    name: github-token
---
apiVersion: v1
kind: Secret
metadata:
  name: github-token
  namespace: flux-system
type: Opaque
stringData:
  token: <your-github-token>
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: github-status
  namespace: flux-system
spec:
  providerRef:
    name: github-status
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      namespace: flux-system
      name: '*'
```

## Best Practices Summary

1. **Repository Structure**: Separate your application code from your GitOps configuration. Use a dedicated repository for cluster manifests.

2. **Multi-Environment Setup**: Use directory-based or branch-based separation for different environments (development, staging, production).

3. **Secrets Management**: Never store plain text secrets in Git. Use Sealed Secrets, SOPS, or external secret managers like HashiCorp Vault.

4. **Dependency Management**: Define explicit dependencies between Kustomizations to ensure resources are applied in the correct order.

5. **Health Checks**: Configure health checks in your Kustomizations to verify that deployments succeed before marking reconciliation complete.

6. **Notifications**: Set up alerts for failed reconciliations to catch issues early. Use different channels for different severity levels.

7. **Image Automation**: Use semantic versioning for container images and configure ImagePolicies with appropriate version ranges.

8. **Garbage Collection**: Enable pruning (`prune: true`) to automatically remove resources that are no longer defined in Git.

9. **Reconciliation Intervals**: Set appropriate intervals based on your needs. Shorter intervals mean faster deployments but more API calls.

10. **Testing Changes**: Use `flux diff kustomization` and `flux diff helmrelease` to preview changes before they are applied.

---

Flux provides a powerful, declarative approach to managing Kubernetes infrastructure. By keeping your cluster state in Git, you gain version control, audit trails, and the ability to roll back changes easily. Start with basic GitRepository and Kustomization resources, then gradually adopt Helm releases and image automation as your needs grow.

For monitoring your Flux-managed applications and infrastructure, consider using [OneUptime](https://oneuptime.com) for comprehensive observability, alerting, and incident management.
