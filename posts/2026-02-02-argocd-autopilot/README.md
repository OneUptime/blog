# How to Implement ArgoCD Autopilot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Autopilot, GitOps, Kubernetes, CI/CD, DevOps, Automation

Description: A comprehensive guide to implementing ArgoCD Autopilot for automated GitOps repository bootstrapping, covering installation, project management, application deployment, and production best practices.

---

ArgoCD Autopilot automates the entire GitOps setup process. Instead of manually configuring ArgoCD, repositories, and applications, Autopilot bootstraps everything from a single command. Your Git repository becomes the source of truth for both your applications and the ArgoCD installation itself.

## What Is ArgoCD Autopilot?

ArgoCD Autopilot provides an opinionated way to manage ArgoCD and your applications using GitOps principles. It creates a structured repository layout and manages ArgoCD as code.

```mermaid
flowchart TB
    subgraph Developer
        CLI[argocd-autopilot CLI]
    end

    subgraph Git Repository
        Bootstrap[Bootstrap Directory]
        Projects[Projects Directory]
        Apps[Applications Directory]
    end

    subgraph Kubernetes Cluster
        ArgoCD[ArgoCD Controller]
        AppController[Application Controller]
        Workloads[Application Workloads]
    end

    CLI -->|Creates| Bootstrap
    CLI -->|Creates| Projects
    CLI -->|Creates| Apps
    Bootstrap -->|Manages| ArgoCD
    ArgoCD -->|Watches| Projects
    ArgoCD -->|Watches| Apps
    AppController -->|Deploys| Workloads
```

Key benefits of Autopilot:

1. **Declarative Setup** - ArgoCD configuration lives in Git alongside your applications
2. **Reproducible** - Recreate your entire GitOps infrastructure from a single repository
3. **Self-Managing** - ArgoCD manages itself through GitOps
4. **Structured** - Enforces a consistent repository layout for projects and applications

## Installing ArgoCD Autopilot CLI

Before bootstrapping, install the Autopilot CLI on your local machine.

### macOS Installation

The following command installs argocd-autopilot using Homebrew package manager.

```bash
brew install argocd-autopilot
```

### Linux Installation

Download the binary directly from GitHub releases and move it to your PATH.

```bash
# Download the latest release for Linux
VERSION=$(curl --silent "https://api.github.com/repos/argoproj-labs/argocd-autopilot/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
curl -L --output - https://github.com/argoproj-labs/argocd-autopilot/releases/download/$VERSION/argocd-autopilot-linux-amd64.tar.gz | tar zx
sudo mv argocd-autopilot /usr/local/bin/

# Verify installation
argocd-autopilot version
```

### Windows Installation

Use the following PowerShell commands to download and install on Windows.

```powershell
# Download the Windows binary
$VERSION = (Invoke-RestMethod "https://api.github.com/repos/argoproj-labs/argocd-autopilot/releases/latest").tag_name
Invoke-WebRequest -Uri "https://github.com/argoproj-labs/argocd-autopilot/releases/download/$VERSION/argocd-autopilot-windows-amd64.exe" -OutFile "argocd-autopilot.exe"

# Move to a directory in your PATH
Move-Item argocd-autopilot.exe C:\Windows\System32\
```

## Setting Up Prerequisites

Autopilot requires a Git token and access to your Kubernetes cluster.

### Creating a Git Token

Generate a personal access token with repository permissions for your Git provider.

For GitHub, navigate to Settings > Developer settings > Personal access tokens > Tokens (classic) and create a token with the following scopes:

```
repo (Full control of private repositories)
  - repo:status
  - repo_deployment
  - public_repo
  - repo:invite
  - security_events
```

### Configuring Environment Variables

Export the required environment variables before running Autopilot commands.

```bash
# Set your Git token
export GIT_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Set the repository URL where GitOps configs will be stored
export GIT_REPO=https://github.com/your-org/gitops-repo

# Verify kubectl has cluster access
kubectl cluster-info
```

## Bootstrapping ArgoCD with Autopilot

The bootstrap command installs ArgoCD and creates the initial repository structure.

### Repository Structure Overview

Understanding the repository layout helps you navigate and extend your GitOps setup.

```mermaid
graph TD
    Root[gitops-repo/] --> Bootstrap[bootstrap/]
    Root --> Projects[projects/]
    Root --> Apps[apps/]

    Bootstrap --> ArgoCD[argo-cd/]
    Bootstrap --> ClusterResources[cluster-resources/]

    Projects --> ProjectYAML[project.yaml files]

    Apps --> AppDirs[app directories]
    AppDirs --> Base[base/]
    AppDirs --> Overlays[overlays/]
```

### Running the Bootstrap Command

Execute the bootstrap command to install ArgoCD and initialize the repository structure.

```bash
# Bootstrap ArgoCD into your cluster
argocd-autopilot repo bootstrap

# For a specific namespace (default is argocd)
argocd-autopilot repo bootstrap --namespace argocd

# With a specific installation type
argocd-autopilot repo bootstrap --installation-mode normal
```

### What Bootstrap Creates

The bootstrap process generates several directories and files in your repository.

```
gitops-repo/
├── bootstrap/
│   ├── argo-cd/
│   │   ├── kustomization.yaml
│   │   └── namespace.yaml
│   └── cluster-resources/
│       └── in-cluster/
│           ├── argocd-ns.yaml
│           └── kustomization.yaml
├── projects/
│   └── README.md
└── apps/
    └── README.md
```

### Verifying the Installation

Check that ArgoCD pods are running and the repository has been properly configured.

```bash
# Check ArgoCD pods
kubectl get pods -n argocd

# Expected output:
# NAME                                               READY   STATUS    RESTARTS   AGE
# argocd-application-controller-0                   1/1     Running   0          2m
# argocd-applicationset-controller-xxx              1/1     Running   0          2m
# argocd-dex-server-xxx                             1/1     Running   0          2m
# argocd-notifications-controller-xxx               1/1     Running   0          2m
# argocd-redis-xxx                                  1/1     Running   0          2m
# argocd-repo-server-xxx                            1/1     Running   0          2m
# argocd-server-xxx                                 1/1     Running   0          2m

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## Creating Projects

Projects in Autopilot provide logical grouping and access control for applications.

### Understanding Project Structure

Each project creates an ArgoCD AppProject resource with defined source repos and destinations.

```mermaid
flowchart LR
    subgraph Project
        AppProject[ArgoCD AppProject]
        SourceRepos[Allowed Source Repos]
        Destinations[Allowed Destinations]
    end

    subgraph Applications
        App1[App 1]
        App2[App 2]
        App3[App 3]
    end

    AppProject --> SourceRepos
    AppProject --> Destinations
    App1 --> AppProject
    App2 --> AppProject
    App3 --> AppProject
```

### Creating a New Project

Use the project create command to add a new project to your GitOps repository.

```bash
# Create a project for production workloads
argocd-autopilot project create production

# Create a project for development workloads
argocd-autopilot project create development

# Create a project with specific settings
argocd-autopilot project create staging \
  --dest-kube-context staging-cluster \
  --dest-namespace "staging-*"
```

### Project Configuration File

The project command creates a YAML file in the projects directory with the AppProject definition.

```yaml
# projects/production.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
spec:
  description: Production workloads
  sourceRepos:
    - '*'
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
  namespaceResourceWhitelist:
    - group: '*'
      kind: '*'
```

### Customizing Project Permissions

Edit the generated project file to restrict access based on your security requirements.

```yaml
# projects/production.yaml - Restricted version
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production workloads with restricted access
  # Only allow specific repositories
  sourceRepos:
    - 'https://github.com/your-org/production-apps'
    - 'https://github.com/your-org/shared-charts'
  # Restrict to production namespaces only
  destinations:
    - namespace: 'prod-*'
      server: https://kubernetes.default.svc
  # Limit cluster-scoped resources
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
    - group: networking.k8s.io
      kind: IngressClass
  # Define role-based access
  roles:
    - name: read-only
      description: Read-only access to production apps
      policies:
        - p, proj:production:read-only, applications, get, production/*, allow
      groups:
        - production-viewers
    - name: deployer
      description: Deploy access to production apps
      policies:
        - p, proj:production:deployer, applications, *, production/*, allow
      groups:
        - production-deployers
```

## Deploying Applications

Applications represent your workloads managed through GitOps.

### Application Deployment Workflow

Autopilot manages applications through a structured directory layout with base configurations and environment overlays.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CLI as Autopilot CLI
    participant Git as Git Repository
    participant ArgoCD as ArgoCD
    participant K8s as Kubernetes

    Dev->>CLI: argocd-autopilot app create
    CLI->>Git: Create app manifests
    Git->>ArgoCD: Webhook/Poll triggers sync
    ArgoCD->>Git: Fetch manifests
    ArgoCD->>K8s: Apply resources
    K8s-->>ArgoCD: Report status
    ArgoCD-->>Dev: Sync status
```

### Creating an Application from a Directory

Deploy an application by pointing to an existing Kubernetes manifest directory.

```bash
# Create an application from a local path
argocd-autopilot app create my-api \
  --app https://github.com/your-org/my-api.git/manifests \
  --project production \
  --type dir

# Create application targeting specific namespace
argocd-autopilot app create my-api \
  --app https://github.com/your-org/my-api.git/k8s \
  --project production \
  --type dir \
  --dest-namespace my-api-prod
```

### Creating an Application from Kustomize

Use Kustomize for applications that need environment-specific configurations.

```bash
# Create Kustomize-based application
argocd-autopilot app create my-frontend \
  --app https://github.com/your-org/my-frontend.git/k8s/overlays/production \
  --project production \
  --type kustomize
```

### Creating an Application from Helm

Deploy Helm charts with Autopilot by specifying the chart location and values.

```bash
# Create Helm-based application
argocd-autopilot app create redis \
  --app https://charts.bitnami.com/bitnami/redis \
  --project production \
  --type helm \
  --helm-set replica.replicaCount=3 \
  --helm-set auth.enabled=true
```

### Generated Application Structure

Autopilot creates a structured layout for each application in the apps directory.

```
apps/
└── my-api/
    ├── base/
    │   ├── kustomization.yaml
    │   └── install.yaml
    └── overlays/
        └── production/
            ├── kustomization.yaml
            └── config.json
```

### Examining the Generated Files

Review the generated configuration files to understand how Autopilot structures applications.

```yaml
# apps/my-api/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - install.yaml
```

```yaml
# apps/my-api/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: my-api-prod
resources:
  - ../../base
```

```yaml
# apps/my-api/overlays/production/config.json
{
  "appName": "my-api",
  "userGivenName": "my-api",
  "destNamespace": "my-api-prod",
  "destServer": "https://kubernetes.default.svc",
  "srcPath": "apps/my-api/overlays/production",
  "srcRepoURL": "https://github.com/your-org/gitops-repo"
}
```

## Multi-Environment Deployment

Manage the same application across multiple environments with Autopilot.

### Environment Architecture

Structure your repository to support multiple deployment environments.

```mermaid
flowchart TB
    subgraph GitOps Repository
        subgraph Apps
            AppBase[my-app/base/]
            DevOverlay[my-app/overlays/development/]
            StagingOverlay[my-app/overlays/staging/]
            ProdOverlay[my-app/overlays/production/]
        end
    end

    subgraph Clusters
        DevCluster[Development Cluster]
        StagingCluster[Staging Cluster]
        ProdCluster[Production Cluster]
    end

    DevOverlay -->|Syncs to| DevCluster
    StagingOverlay -->|Syncs to| StagingCluster
    ProdOverlay -->|Syncs to| ProdCluster

    AppBase -.->|Inherited by| DevOverlay
    AppBase -.->|Inherited by| StagingOverlay
    AppBase -.->|Inherited by| ProdOverlay
```

### Creating Environment-Specific Deployments

Add the same application to multiple projects representing different environments.

```bash
# Create development deployment
argocd-autopilot app create my-service \
  --app https://github.com/your-org/my-service.git/k8s \
  --project development \
  --type kustomize \
  --dest-namespace dev-services

# Create staging deployment
argocd-autopilot app create my-service \
  --app https://github.com/your-org/my-service.git/k8s \
  --project staging \
  --type kustomize \
  --dest-namespace staging-services

# Create production deployment
argocd-autopilot app create my-service \
  --app https://github.com/your-org/my-service.git/k8s \
  --project production \
  --type kustomize \
  --dest-namespace prod-services
```

### Environment-Specific Customizations

Modify the generated overlay files to apply environment-specific patches.

```yaml
# apps/my-service/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: prod-services
resources:
  - ../../base
# Add production-specific patches
patchesStrategicMerge:
  - replica-patch.yaml
  - resource-patch.yaml
# Use production image tag
images:
  - name: my-service
    newTag: v1.2.3-stable
```

```yaml
# apps/my-service/overlays/production/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 5
```

```yaml
# apps/my-service/overlays/production/resource-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      containers:
        - name: my-service
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
```

## Managing Cluster Resources

Configure cluster-wide resources that ArgoCD should manage.

### Adding Cluster Resources

Place cluster-scoped resources in the bootstrap cluster-resources directory.

```bash
# Directory structure for cluster resources
bootstrap/
└── cluster-resources/
    └── in-cluster/
        ├── argocd-ns.yaml
        ├── kustomization.yaml
        ├── namespaces.yaml
        ├── rbac.yaml
        └── resource-quotas.yaml
```

### Namespace Management

Define namespaces that should be created and managed by ArgoCD.

```yaml
# bootstrap/cluster-resources/in-cluster/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    managed-by: argocd
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
    managed-by: argocd
---
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    environment: development
    managed-by: argocd
```

### Resource Quotas

Apply resource quotas to namespaces for resource governance.

```yaml
# bootstrap/cluster-resources/in-cluster/resource-quotas.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "100"
    services: "50"
```

### Updating Kustomization

Include new resources in the cluster-resources kustomization file.

```yaml
# bootstrap/cluster-resources/in-cluster/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - argocd-ns.yaml
  - namespaces.yaml
  - rbac.yaml
  - resource-quotas.yaml
```

## Integrating with CI/CD Pipelines

Combine Autopilot with your existing CI/CD workflows for automated deployments.

### CI/CD Integration Architecture

Connect your build pipeline with the GitOps repository for seamless deployments.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CI as CI Pipeline
    participant Registry as Container Registry
    participant GitOps as GitOps Repository
    participant ArgoCD as ArgoCD
    participant K8s as Kubernetes

    Dev->>CI: Push code
    CI->>CI: Build & Test
    CI->>Registry: Push image (v1.2.3)
    CI->>GitOps: Update image tag
    GitOps->>ArgoCD: Trigger sync
    ArgoCD->>Registry: Pull image
    ArgoCD->>K8s: Deploy new version
```

### GitHub Actions Workflow

Create a workflow that updates the GitOps repository when new images are built.

```yaml
# .github/workflows/deploy.yaml
name: Build and Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  GITOPS_REPO: your-org/gitops-repo

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Generate image metadata including tags
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch

      # Build and push the container image
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout GitOps repo
        uses: actions/checkout@v4
        with:
          repository: ${{ env.GITOPS_REPO }}
          token: ${{ secrets.GITOPS_TOKEN }}
          path: gitops

      # Update the image tag in the Kustomize overlay
      - name: Update image tag
        run: |
          cd gitops/apps/my-app/overlays/production
          kustomize edit set image my-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      # Commit and push changes to trigger ArgoCD sync
      - name: Commit and push
        run: |
          cd gitops
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "Deploy my-app:${{ github.sha }}"
          git push
```

### GitLab CI Pipeline

Configure GitLab CI to update the GitOps repository after successful builds.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

variables:
  REGISTRY: registry.gitlab.com
  IMAGE_NAME: $CI_PROJECT_PATH
  GITOPS_REPO: https://gitlab.com/your-org/gitops-repo.git

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    # Build and tag the container image
    - docker build -t $REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA .
    - docker push $REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA
  only:
    - main

deploy:
  stage: deploy
  image: alpine/git
  before_script:
    # Install kustomize for manifest updates
    - apk add --no-cache curl
    - curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
    - mv kustomize /usr/local/bin/
  script:
    # Clone and update the GitOps repository
    - git clone https://deploy-token:${GITOPS_TOKEN}@gitlab.com/your-org/gitops-repo.git
    - cd gitops-repo/apps/my-app/overlays/production
    - kustomize edit set image my-app=$REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA
    - git config user.name "GitLab CI"
    - git config user.email "ci@gitlab.com"
    - git add .
    - git commit -m "Deploy my-app:$CI_COMMIT_SHA"
    - git push
  only:
    - main
```

## Advanced Configuration

Customize Autopilot behavior for complex deployment scenarios.

### Custom ArgoCD Installation

Modify the ArgoCD installation by editing bootstrap manifests.

```yaml
# bootstrap/argo-cd/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: argocd
resources:
  - namespace.yaml
  - https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.0/manifests/install.yaml
patches:
  - path: patches/argocd-cm.yaml
  - path: patches/argocd-rbac-cm.yaml
  - path: patches/resource-limits.yaml
```

### ArgoCD ConfigMap Patches

Configure ArgoCD behavior through ConfigMap patches.

```yaml
# bootstrap/argo-cd/patches/argocd-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
data:
  # Enable status badge for repositories
  statusbadge.enabled: "true"
  # Configure resource tracking method
  application.resourceTrackingMethod: annotation
  # Set sync timeout
  timeout.reconciliation: 180s
  # Configure health checks for custom resources
  resource.customizations.health.networking.k8s.io_Ingress: |
    hs = {}
    hs.status = "Healthy"
    return hs
```

### RBAC Configuration

Define role-based access control for ArgoCD users.

```yaml
# bootstrap/argo-cd/patches/argocd-rbac-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
data:
  policy.csv: |
    # Admins have full access
    p, role:admin, applications, *, */*, allow
    p, role:admin, clusters, *, *, allow
    p, role:admin, repositories, *, *, allow
    p, role:admin, projects, *, *, allow

    # Developers can sync applications in development project
    p, role:developer, applications, get, development/*, allow
    p, role:developer, applications, sync, development/*, allow

    # Read-only access for viewers
    p, role:viewer, applications, get, */*, allow
    p, role:viewer, projects, get, *, allow

    # Group bindings
    g, admin-team, role:admin
    g, dev-team, role:developer
    g, stakeholders, role:viewer
  policy.default: role:viewer
```

### Enabling Notifications

Configure ArgoCD notifications for deployment events.

```yaml
# bootstrap/argo-cd/patches/notifications.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  # Slack service configuration
  service.slack: |
    token: $slack-token

  # Deployment notification template
  template.app-deployed: |
    message: |
      Application *{{.app.metadata.name}}* has been deployed.
      Revision: {{.app.status.sync.revision}}
      Health: {{.app.status.health.status}}

  # Sync failure notification template
  template.app-sync-failed: |
    message: |
      Application *{{.app.metadata.name}}* sync failed.
      Error: {{.app.status.operationState.message}}

  # Trigger definitions
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      send: [app-deployed]

  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Failed', 'Error']
      send: [app-sync-failed]

---
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
type: Opaque
stringData:
  slack-token: xoxb-your-slack-token
```

## Disaster Recovery

Prepare for disaster recovery scenarios with Autopilot.

### Repository Backup Strategy

Your GitOps repository serves as the single source of truth, making backup straightforward.

```mermaid
flowchart LR
    subgraph Primary
        PrimaryRepo[GitOps Repository]
        PrimaryCluster[Production Cluster]
    end

    subgraph Backup
        BackupRepo[Mirror Repository]
        BackupCluster[DR Cluster]
    end

    PrimaryRepo -->|Mirror| BackupRepo
    BackupRepo -->|Bootstrap| BackupCluster
```

### Recovering ArgoCD Installation

Restore ArgoCD to a new cluster from your GitOps repository.

```bash
# Set environment variables pointing to your existing repo
export GIT_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
export GIT_REPO=https://github.com/your-org/gitops-repo

# Bootstrap to a new cluster using existing repo
argocd-autopilot repo bootstrap --recover

# ArgoCD will automatically sync all projects and applications
```

### Exporting Application State

Export current application configurations for backup purposes.

```bash
# Export all applications to YAML files
kubectl get applications -n argocd -o yaml > applications-backup.yaml

# Export all AppProjects
kubectl get appprojects -n argocd -o yaml > projects-backup.yaml

# Export ArgoCD configuration
kubectl get configmap argocd-cm -n argocd -o yaml > argocd-cm-backup.yaml
kubectl get configmap argocd-rbac-cm -n argocd -o yaml > argocd-rbac-backup.yaml
```

## Best Practices

Follow these recommendations for successful Autopilot implementations.

### Repository Organization

Maintain a clean and logical repository structure.

```
gitops-repo/
├── README.md                    # Document your GitOps setup
├── bootstrap/
│   ├── argo-cd/                 # ArgoCD installation manifests
│   │   ├── kustomization.yaml
│   │   ├── namespace.yaml
│   │   └── patches/             # Custom configurations
│   └── cluster-resources/       # Cluster-scoped resources
│       └── in-cluster/
├── projects/
│   ├── development.yaml         # Development project
│   ├── staging.yaml             # Staging project
│   └── production.yaml          # Production project
└── apps/
    ├── app-1/                   # Application 1
    │   ├── base/
    │   └── overlays/
    └── app-2/                   # Application 2
        ├── base/
        └── overlays/
```

### Sync Policy Recommendations

Configure appropriate sync policies based on environment sensitivity.

```yaml
# Development - Fully automated
syncPolicy:
  automated:
    prune: true
    selfHeal: true
    allowEmpty: false
  syncOptions:
    - CreateNamespace=true

# Staging - Automated with manual promotion
syncPolicy:
  automated:
    prune: true
    selfHeal: true
  syncOptions:
    - CreateNamespace=true
    - ApplyOutOfSyncOnly=true

# Production - Manual sync with self-heal
syncPolicy:
  automated:
    prune: false
    selfHeal: true
  syncOptions:
    - CreateNamespace=false
    - Validate=true
```

### Security Considerations

Implement security best practices for your GitOps workflow.

```yaml
# Restrict project permissions
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
spec:
  # Limit source repositories
  sourceRepos:
    - 'https://github.com/your-org/approved-apps'

  # Restrict destination clusters and namespaces
  destinations:
    - namespace: 'prod-*'
      server: https://kubernetes.default.svc

  # Deny dangerous resources
  clusterResourceBlacklist:
    - group: ''
      kind: ResourceQuota
    - group: ''
      kind: LimitRange
    - group: ''
      kind: NetworkPolicy

  # Require signed commits
  signatureKeys:
    - keyID: ABC123DEF456
```

## Troubleshooting

Resolve common issues encountered with Autopilot.

### Bootstrap Failures

When bootstrap fails, check these common issues.

```bash
# Check cluster connectivity
kubectl cluster-info

# Verify Git token permissions
curl -H "Authorization: token $GIT_TOKEN" https://api.github.com/user

# Check for existing ArgoCD installation
kubectl get namespace argocd

# View bootstrap logs
argocd-autopilot repo bootstrap --log-level debug
```

### Application Sync Issues

Debug applications that fail to synchronize.

```bash
# Check application status
kubectl get applications -n argocd

# Describe specific application
kubectl describe application my-app -n argocd

# View sync details
argocd app get my-app --show-operation

# Force refresh
argocd app get my-app --refresh
```

### Repository Connection Problems

Resolve issues connecting to Git repositories.

```bash
# Test repository access
argocd repo list

# Check repository secrets
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository

# View repository server logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server
```

---

ArgoCD Autopilot streamlines GitOps adoption by automating repository structure and ArgoCD management. Start with a simple bootstrap, add projects for logical separation, and deploy applications using the structured approach. The declarative, Git-based workflow ensures reproducibility and simplifies disaster recovery. Your entire platform configuration lives in Git, enabling version control, audit trails, and collaborative infrastructure management.
