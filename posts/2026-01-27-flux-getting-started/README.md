# How to Get Started with Flux for GitOps

By [Nawaz Dhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, GitOps, Flux, CD, DevOps, Automation, Helm, Kustomize

Description: A complete guide to getting started with Flux for GitOps, covering installation, bootstrapping, GitRepository and Kustomization resources, HelmRelease deployments, and best practices for continuous delivery in Kubernetes.

---

> "The goal of GitOps is to make operations automatic, auditable, and easy to understand." - Weaveworks

## What Is Flux?

Flux is a set of continuous delivery tools that keeps Kubernetes clusters in sync with configuration sources like Git repositories and Helm repositories. It automatically applies changes to your cluster when your source changes.

```mermaid
flowchart LR
    Dev[Developer] -->|Push| Git[Git Repository]
    Git -->|Watch| Flux[Flux Controllers]
    Flux -->|Reconcile| K8s[Kubernetes Cluster]

    subgraph Flux Components
        SC[Source Controller]
        KC[Kustomize Controller]
        HC[Helm Controller]
        NC[Notification Controller]
    end

    SC --> KC
    SC --> HC
    KC --> K8s
    HC --> K8s
    NC -->|Alert| Slack[Slack/Teams]
```

Core principles of Flux GitOps:
1. **Declarative** - Your entire system is described in Git
2. **Versioned** - Git history becomes your deployment history
3. **Automated** - Approved changes are applied automatically
4. **Continuously Reconciled** - Flux ensures your cluster always matches the desired state

## Flux Components

Flux consists of several specialized controllers that work together:

```mermaid
flowchart TB
    subgraph Sources["Source Controller"]
        GR[GitRepository]
        HR[HelmRepository]
        OCI[OCIRepository]
        Bucket[Bucket]
    end

    subgraph Reconcilers["Reconciliation Controllers"]
        KC[Kustomize Controller]
        HC[Helm Controller]
    end

    subgraph Notifications["Notification Controller"]
        Provider[Providers]
        Alert[Alerts]
        Receiver[Receivers]
    end

    Sources --> Reconcilers
    Reconcilers --> Notifications
```

### Source Controller

The Source Controller manages sources of Kubernetes manifests:

- **GitRepository** - Watches Git repositories for changes
- **HelmRepository** - Watches Helm chart repositories
- **OCIRepository** - Watches OCI artifacts (container registries)
- **Bucket** - Watches S3-compatible buckets

### Kustomize Controller

The Kustomize Controller:
- Reconciles the cluster state from GitRepository or OCIRepository sources
- Generates manifests using Kustomize
- Applies manifests to the cluster
- Prunes resources that are no longer defined

### Helm Controller

The Helm Controller:
- Reconciles HelmRelease resources
- Fetches charts from HelmRepository, GitRepository, or Bucket sources
- Installs, upgrades, tests, and uninstalls Helm releases
- Supports values from ConfigMaps and Secrets

### Notification Controller

The Notification Controller:
- Handles inbound events (webhooks from Git providers)
- Handles outbound notifications (Slack, Teams, etc.)
- Triggers reconciliation from external events

## Prerequisites

Before installing Flux, ensure you have:

```bash
# Check Kubernetes cluster access
kubectl cluster-info

# Verify kubectl version (1.20+)
kubectl version --client

# Install Flux CLI
# macOS
brew install fluxcd/tap/flux

# Linux
curl -s https://fluxcd.io/install.sh | sudo bash

# Windows (with Chocolatey)
choco install flux

# Verify Flux CLI installation
flux --version
```

Check cluster prerequisites:

```bash
# Run Flux pre-flight checks
# This validates your cluster meets all requirements
flux check --pre
```

## Bootstrap Process

Bootstrapping installs Flux components and sets up the Git repository connection. Flux supports GitHub, GitLab, Bitbucket, and generic Git servers.

### Bootstrap with GitHub

```bash
# Export your GitHub personal access token
# Token needs repo permissions for private repos
export GITHUB_TOKEN=<your-github-token>

# Bootstrap Flux on your cluster
# This creates the flux-system namespace and installs all controllers
flux bootstrap github \
  --owner=<github-username> \
  --repository=<repository-name> \
  --path=clusters/my-cluster \
  --personal \
  --branch=main
```

### Bootstrap with GitLab

```bash
# Export your GitLab personal access token
export GITLAB_TOKEN=<your-gitlab-token>

# Bootstrap with GitLab
# Similar to GitHub but uses gitlab subcommand
flux bootstrap gitlab \
  --owner=<gitlab-username> \
  --repository=<repository-name> \
  --path=clusters/my-cluster \
  --branch=main
```

### Bootstrap with Generic Git Server

```bash
# For self-hosted Git servers
# Uses SSH key authentication
flux bootstrap git \
  --url=ssh://git@git.example.com/org/repository.git \
  --branch=main \
  --path=clusters/my-cluster \
  --private-key-file=/path/to/private-key
```

### What Bootstrap Creates

After bootstrapping, your repository will have:

```
clusters/my-cluster/
├── flux-system/
│   ├── gotk-components.yaml    # Flux controllers and CRDs
│   ├── gotk-sync.yaml          # GitRepository and Kustomization for flux-system
│   └── kustomization.yaml      # Kustomize configuration
```

Verify the installation:

```bash
# Check Flux components are running
# All pods should be in Running state
flux check

# View installed components
kubectl get pods -n flux-system

# Example output:
# NAME                                       READY   STATUS
# helm-controller-5b96d94c7f-xxxxx           1/1     Running
# kustomize-controller-7b7b8d8c7f-xxxxx      1/1     Running
# notification-controller-5c4d48c8c-xxxxx    1/1     Running
# source-controller-7667765cd7-xxxxx         1/1     Running
```

## GitRepository Resource

The GitRepository resource defines a source for Kubernetes manifests from a Git repository.

### Basic GitRepository

```yaml
# git-repository.yaml
# Defines a Git source that Flux will monitor
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # How often to check for new commits
  interval: 1m
  # Repository URL (HTTPS or SSH)
  url: https://github.com/myorg/my-app
  # Branch, tag, or semver range to track
  ref:
    branch: main
  # Optional: specific path in repository
  # ignore: |
  #   # Exclude all markdown files
  #   /*.md
```

### GitRepository with SSH Authentication

```yaml
# git-repository-ssh.yaml
# Use SSH keys for private repository access
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-private-app
  namespace: flux-system
spec:
  interval: 1m
  url: ssh://git@github.com/myorg/my-private-app.git
  ref:
    branch: main
  # Reference to Secret containing SSH key
  secretRef:
    name: my-app-ssh-key
---
# Create the SSH key secret
apiVersion: v1
kind: Secret
metadata:
  name: my-app-ssh-key
  namespace: flux-system
type: Opaque
stringData:
  # Private SSH key for repository access
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-private-key>
    -----END OPENSSH PRIVATE KEY-----
  # Known hosts to avoid MITM attacks
  known_hosts: |
    github.com ssh-rsa AAAA...
```

### GitRepository with Semver Tags

```yaml
# git-repository-semver.yaml
# Track releases using semantic versioning
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-releases
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/my-app
  ref:
    # Matches tags like v1.0.0, v1.2.3, etc.
    semver: ">=1.0.0"
```

Check GitRepository status:

```bash
# Get all GitRepository resources
flux get sources git

# Describe specific GitRepository
kubectl describe gitrepository my-app -n flux-system
```

## Kustomization Resource

The Kustomization resource tells Flux which path in a GitRepository to reconcile and how.

### Basic Kustomization

```yaml
# kustomization.yaml
# Reconciles manifests from a GitRepository path
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  # How often to reconcile
  interval: 10m
  # Target namespace for resources without explicit namespace
  targetNamespace: production
  # Source reference
  sourceRef:
    kind: GitRepository
    name: my-app
  # Path in the repository containing manifests
  path: ./deploy/production
  # Delete resources that are no longer in Git
  prune: true
  # Wait for resources to become ready
  wait: true
  # Timeout for the apply operation
  timeout: 2m
```

### Kustomization with Dependencies

```yaml
# kustomization-with-deps.yaml
# Deploy infrastructure before applications
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  # Wait for infrastructure to be ready first
  dependsOn:
    - name: infrastructure
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./apps
  prune: true
```

### Kustomization with Variable Substitution

```yaml
# kustomization-vars.yaml
# Use post-build variable substitution
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-app
  path: ./deploy
  prune: true
  # Substitute variables in manifests
  postBuild:
    substitute:
      ENVIRONMENT: production
      REPLICAS: "3"
    # Variables from ConfigMaps and Secrets
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
      - kind: Secret
        name: cluster-secrets
```

In your manifests, use `${VARIABLE}` syntax:

```yaml
# deployment.yaml in your Git repository
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: ${REPLICAS}
  template:
    spec:
      containers:
        - name: app
          env:
            - name: ENVIRONMENT
              value: ${ENVIRONMENT}
```

### Kustomization with Health Checks

```yaml
# kustomization-health.yaml
# Custom health checks for resources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-app
  path: ./deploy
  prune: true
  wait: true
  # Define custom health checks
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
    - apiVersion: v1
      kind: Service
      name: my-app
      namespace: production
```

Check Kustomization status:

```bash
# Get all Kustomization resources
flux get kustomizations

# Trigger manual reconciliation
flux reconcile kustomization my-app

# View events and status
kubectl describe kustomization my-app -n flux-system
```

## HelmRelease Resources

HelmRelease resources let you deploy applications using Helm charts with GitOps.

### HelmRepository Source

```yaml
# helm-repository.yaml
# Define a Helm chart repository source
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  # How often to check for new charts
  interval: 30m
  # Helm repository URL
  url: https://charts.bitnami.com/bitnami
```

### Basic HelmRelease

```yaml
# helm-release.yaml
# Deploy a Helm chart from a HelmRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: flux-system
spec:
  # How often to reconcile the release
  interval: 10m
  # Target namespace for the release
  targetNamespace: cache
  # Chart source and version
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      # How often to check for new chart versions
      interval: 1h
  # Helm release name
  releaseName: redis-cache
  # Helm values
  values:
    architecture: standalone
    auth:
      enabled: true
    master:
      persistence:
        size: 10Gi
```

### HelmRelease from GitRepository

```yaml
# helm-release-git.yaml
# Deploy a chart stored in a Git repository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: production
  chart:
    spec:
      # Chart is in a subdirectory of the Git repository
      chart: ./charts/my-app
      sourceRef:
        kind: GitRepository
        name: my-app
        namespace: flux-system
  values:
    replicaCount: 3
    image:
      tag: v1.2.3
```

### HelmRelease with Values from Secrets

```yaml
# helm-release-secrets.yaml
# Reference values from ConfigMaps and Secrets
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: production
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-charts
  # Merge values from multiple sources
  valuesFrom:
    - kind: ConfigMap
      name: my-app-values
      # Optional: specific key in ConfigMap
      valuesKey: values.yaml
    - kind: Secret
      name: my-app-secrets
      valuesKey: secrets.yaml
  # Inline values (lowest priority)
  values:
    replicaCount: 2
```

### HelmRelease with Upgrade Strategy

```yaml
# helm-release-upgrade.yaml
# Configure upgrade and rollback behavior
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: production
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-charts
  # Installation configuration
  install:
    # Create namespace if it doesn't exist
    createNamespace: true
    # Remediation on install failure
    remediation:
      retries: 3
  # Upgrade configuration
  upgrade:
    # Clean up old resources
    cleanupOnFail: true
    # Remediation on upgrade failure
    remediation:
      retries: 3
      # Rollback on failure
      remediateLastFailure: true
  # Rollback configuration
  rollback:
    timeout: 3m
    cleanupOnFail: true
  # Test configuration
  test:
    enable: true
    # Delete test pods after successful test
    ignoreFailures: false
```

Check HelmRelease status:

```bash
# Get all HelmRelease resources
flux get helmreleases -A

# Trigger manual reconciliation
flux reconcile helmrelease my-app -n flux-system

# View Helm release status
helm list -n production

# Get detailed status
kubectl describe helmrelease my-app -n flux-system
```

## Repository Structure Best Practices

A well-organized repository structure makes managing multiple clusters and environments easier.

```mermaid
flowchart TB
    subgraph Repository["Fleet Repository Structure"]
        Clusters["clusters/"]
        Infra["infrastructure/"]
        Apps["apps/"]
    end

    subgraph ClusterDirs["clusters/"]
        Prod["production/"]
        Stage["staging/"]
    end

    subgraph InfraDirs["infrastructure/"]
        Controllers["controllers/"]
        Configs["configs/"]
    end

    subgraph AppDirs["apps/"]
        Base["base/"]
        Overlays["overlays/"]
    end

    Clusters --> ClusterDirs
    Infra --> InfraDirs
    Apps --> AppDirs
```

### Recommended Directory Layout

```
fleet-repo/
├── clusters/
│   ├── production/
│   │   ├── flux-system/          # Flux bootstrap files
│   │   ├── infrastructure.yaml   # Kustomization for infra
│   │   └── apps.yaml             # Kustomization for apps
│   └── staging/
│       ├── flux-system/
│       ├── infrastructure.yaml
│       └── apps.yaml
├── infrastructure/
│   ├── controllers/
│   │   ├── cert-manager/
│   │   ├── ingress-nginx/
│   │   └── external-secrets/
│   └── configs/
│       ├── cluster-issuer.yaml
│       └── storage-class.yaml
└── apps/
    ├── base/
    │   └── my-app/
    │       ├── kustomization.yaml
    │       ├── deployment.yaml
    │       └── service.yaml
    └── overlays/
        ├── production/
        │   └── my-app/
        │       ├── kustomization.yaml
        │       └── patch.yaml
        └── staging/
            └── my-app/
                ├── kustomization.yaml
                └── patch.yaml
```

### Cluster Entry Point

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/controllers
  prune: true
  wait: true
---
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: infrastructure
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/overlays/production
  prune: true
```

## Monitoring and Notifications

Set up notifications to stay informed about Flux reconciliation events.

### Slack Notification Provider

```yaml
# notification-provider.yaml
# Configure Slack as notification destination
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  # Reference to Secret containing webhook URL
  secretRef:
    name: slack-webhook
---
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook
  namespace: flux-system
stringData:
  address: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Alert Configuration

```yaml
# alert.yaml
# Define which events trigger notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-alerts
  namespace: flux-system
spec:
  # Reference to notification provider
  providerRef:
    name: slack
  # Filter events by severity
  eventSeverity: info
  # Include events from these sources
  eventSources:
    - kind: GitRepository
      name: "*"
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  # Optional: exclude specific events
  exclusionList:
    - ".*upgrade.*"
```

### Webhook Receiver for Auto-Reconciliation

```yaml
# receiver.yaml
# Trigger reconciliation from Git webhooks
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - ping
    - push
  # Secret containing webhook token
  secretRef:
    name: receiver-token
  # Resources to reconcile when webhook is received
  resources:
    - kind: GitRepository
      name: flux-system
---
apiVersion: v1
kind: Secret
metadata:
  name: receiver-token
  namespace: flux-system
stringData:
  token: <random-token>
```

Get the webhook URL:

```bash
# Get the webhook URL to configure in GitHub
flux create receiver github-receiver \
  --type github \
  --event ping \
  --event push \
  --secret-ref receiver-token \
  --resource GitRepository/flux-system \
  --export

# The webhook URL format:
# http://<ingress-address>/hook/<receiver-token>
```

## Troubleshooting

### Check Flux Logs

```bash
# View logs for all Flux controllers
flux logs --all-namespaces

# View logs for specific controller
kubectl logs -n flux-system deploy/source-controller

# Follow logs in real-time
flux logs -f
```

### Common Issues and Solutions

```bash
# Issue: Source not ready
# Check GitRepository status
kubectl describe gitrepository <name> -n flux-system

# Issue: Kustomization failed
# Get detailed error message
kubectl describe kustomization <name> -n flux-system

# Issue: HelmRelease stuck
# Check Helm release status
flux get helmreleases -A
helm history <release-name> -n <namespace>

# Force reconciliation
flux reconcile source git flux-system
flux reconcile kustomization apps
flux reconcile helmrelease my-app -n flux-system
```

### Suspend and Resume

```bash
# Temporarily stop reconciliation
flux suspend kustomization my-app

# Resume reconciliation
flux resume kustomization my-app

# Suspend all resources of a type
flux suspend kustomization --all
```

## Integrate with OneUptime for Monitoring

While Flux handles continuous delivery, you need observability into your deployments. [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your Kubernetes applications:

- **Uptime Monitoring** - Track availability of services deployed by Flux
- **Log Management** - Centralize logs from Flux controllers and applications
- **Metrics** - Monitor resource usage and application performance
- **Alerting** - Get notified when deployments cause issues
- **Status Pages** - Keep stakeholders informed about deployment status

```yaml
# Example: Monitor Flux-deployed applications with OneUptime
# Deploy OneUptime agent alongside your applications
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: oneuptime-agent
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: monitoring
  chart:
    spec:
      chart: oneuptime-kubernetes-agent
      sourceRef:
        kind: HelmRepository
        name: oneuptime
  values:
    oneuptime:
      url: https://oneuptime.com
      secretKey: ${ONEUPTIME_SECRET_KEY}
```

---

Flux brings true GitOps to Kubernetes. Start with a simple setup, add HelmReleases as needed, and scale to multiple clusters. The key is making Git the single source of truth for your infrastructure. Combined with proper monitoring through [OneUptime](https://oneuptime.com), you will have full visibility into both your delivery pipeline and running applications.
