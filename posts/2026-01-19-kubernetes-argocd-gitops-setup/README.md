# How to Set Up ArgoCD for GitOps in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ArgoCD, GitOps, CI/CD, Continuous Deployment, Helm, Kustomize, Git

Description: Implement GitOps for your Kubernetes clusters with ArgoCD - install, connect Git repositories, deploy applications declaratively, and manage multiple environments using Git as your source of truth.

---

GitOps is a modern approach to continuous deployment where Git repositories serve as the single source of truth for your infrastructure and applications. Instead of pushing changes to your cluster, you declare the desired state in Git, and a GitOps tool ensures the cluster matches that state.

ArgoCD is the most popular GitOps tool for Kubernetes. It continuously monitors your Git repositories and automatically (or manually) syncs your cluster to match the declared state.

## Why ArgoCD and GitOps?

```mermaid
flowchart LR
    subgraph "Traditional CI/CD"
        Dev1[Developer] --> CI1[CI Pipeline]
        CI1 -->|kubectl apply| K8s1[Kubernetes]
        style K8s1 fill:#f96
    end
    
    subgraph "GitOps with ArgoCD"
        Dev2[Developer] --> Git[Git Repository]
        Git -->|Watches| ArgoCD[ArgoCD]
        ArgoCD -->|Syncs| K8s2[Kubernetes]
        style K8s2 fill:#9f9
    end
```

Benefits of GitOps:

1. **Git as Single Source of Truth** - All configuration is versioned in Git
2. **Audit Trail** - Git history shows who changed what and when
3. **Easy Rollbacks** - Revert to any previous state with `git revert`
4. **Self-Healing** - ArgoCD automatically corrects drift from desired state
5. **Security** - No need to expose cluster credentials to CI pipelines

## Architecture Overview

```mermaid
flowchart TB
    subgraph "Git Repositories"
        AppRepo[Application Repo<br/>Source Code]
        ConfigRepo[Config Repo<br/>Kubernetes Manifests]
    end
    
    subgraph "CI Pipeline"
        CI[CI System<br/>Build & Test]
        Registry[Container Registry]
    end
    
    subgraph "Kubernetes Cluster"
        subgraph "argocd namespace"
            ArgoCDServer[ArgoCD Server<br/>API & UI]
            RepoServer[Repo Server<br/>Git Operations]
            AppController[Application Controller<br/>Sync Engine]
            Redis[Redis<br/>Cache]
        end
        
        subgraph "Application Namespaces"
            ProdNS[production]
            StageNS[staging]
        end
    end
    
    AppRepo -->|Push| CI
    CI -->|Build Image| Registry
    CI -->|Update Image Tag| ConfigRepo
    ConfigRepo -->|Pull| RepoServer
    RepoServer --> AppController
    AppController -->|Deploy| ProdNS
    AppController -->|Deploy| StageNS
    ArgoCDServer --> AppController
```

## Installing ArgoCD

### Quick Install (Non-HA)

```bash
# Create the argocd namespace
kubectl create namespace argocd

# Install ArgoCD (non-HA, suitable for dev/small clusters)
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods to be ready
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# Verify installation
kubectl get pods -n argocd
```

### Production Install (HA)

```bash
# For production, use the HA manifests
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
```

### Install with Helm (Recommended)

```bash
# Add ArgoCD Helm repository
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# Install ArgoCD with custom values
helm install argocd argo/argo-cd \
    --namespace argocd \
    --create-namespace \
    --set server.service.type=LoadBalancer \
    --set configs.params.server.insecure=true \
    --wait
```

```yaml
# argocd-values.yaml
# Production Helm values
global:
  # Use a specific image tag for reproducibility
  image:
    tag: v2.10.0

server:
  # Expose via LoadBalancer or Ingress
  service:
    type: LoadBalancer
  
  # Or use Ingress
  ingress:
    enabled: true
    ingressClassName: nginx
    hosts:
      - argocd.example.com
    tls:
      - secretName: argocd-tls
        hosts:
          - argocd.example.com
  
  # Enable metrics for monitoring
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

controller:
  # Increase replicas for HA
  replicas: 2
  
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

repoServer:
  replicas: 2
  
  # Resource limits for repo server
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

redis-ha:
  enabled: true

# Enable ApplicationSet controller
applicationSet:
  enabled: true
  replicas: 2
```

```bash
# Install with custom values
helm install argocd argo/argo-cd \
    --namespace argocd \
    --create-namespace \
    -f argocd-values.yaml \
    --wait
```

## Accessing ArgoCD

### Get Initial Admin Password

```bash
# The initial admin password is stored in a secret
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
echo  # Add newline

# For security, delete this secret after changing the password
```

### Access via Port Forward

```bash
# Port forward the ArgoCD server
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access at https://localhost:8080
# Username: admin
# Password: (from the secret above)
```

### Install ArgoCD CLI

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/

# Login to ArgoCD
argocd login localhost:8080 --username admin --password <your-password> --insecure
```

## Connecting Git Repositories

### Public Repository

```bash
# Add a public repository (no credentials needed)
argocd repo add https://github.com/myorg/my-k8s-configs
```

### Private Repository with SSH

```bash
# Generate or use existing SSH key
ssh-keygen -t ed25519 -f ~/.ssh/argocd -N ""

# Add the public key as a deploy key in your Git provider
cat ~/.ssh/argocd.pub

# Add repository with SSH key
argocd repo add git@github.com:myorg/my-k8s-configs.git \
    --ssh-private-key-path ~/.ssh/argocd
```

### Private Repository with HTTPS Token

```bash
# Add repository with personal access token
argocd repo add https://github.com/myorg/my-k8s-configs \
    --username git \
    --password <your-github-token>
```

### Repository as Kubernetes Secret

```yaml
# repo-secret.yaml
# Declarative repository configuration
apiVersion: v1
kind: Secret
metadata:
  name: my-private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  # Repository URL
  url: https://github.com/myorg/my-k8s-configs
  # Authentication
  username: git
  password: ghp_xxxxxxxxxxxx
  # Or for SSH:
  # sshPrivateKey: |
  #   -----BEGIN OPENSSH PRIVATE KEY-----
  #   ...
  #   -----END OPENSSH PRIVATE KEY-----
```

## Creating Applications

### CLI Application Creation

```bash
# Create an application pointing to a Git repository
argocd app create my-app \
    --repo https://github.com/myorg/my-k8s-configs \
    --path apps/my-app \
    --dest-server https://kubernetes.default.svc \
    --dest-namespace production \
    --sync-policy automated \
    --auto-prune \
    --self-heal

# Check application status
argocd app get my-app

# Sync manually
argocd app sync my-app
```

### Declarative Application (Recommended)

```yaml
# applications/my-app.yaml
# This is the recommended way to manage ArgoCD applications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  # Finalizer ensures resources are deleted when app is deleted
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  # Project this application belongs to
  project: default
  
  # Source repository and path
  source:
    repoURL: https://github.com/myorg/my-k8s-configs
    targetRevision: HEAD  # Branch, tag, or commit
    path: apps/my-app     # Path within the repository
  
  # Destination cluster and namespace
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  
  # Sync policy
  syncPolicy:
    # Automated sync - ArgoCD will automatically apply changes
    automated:
      # Prune resources that are no longer in Git
      prune: true
      # Self-heal - revert manual changes to match Git
      selfHeal: true
      # Only sync when git changes, not when cluster resources change
      allowEmpty: false
    
    # Sync options
    syncOptions:
      # Create namespace if it doesn't exist
      - CreateNamespace=true
      # Apply resources server-side
      - ServerSideApply=true
      # Prune last to avoid issues
      - PruneLast=true
    
    # Retry on failure
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

```bash
# Apply the application definition
kubectl apply -f applications/my-app.yaml

# Or let ArgoCD manage it (app of apps pattern)
```

### Helm Application

```yaml
# applications/my-helm-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-helm-app
  namespace: argocd
spec:
  project: default
  
  source:
    repoURL: https://github.com/myorg/my-k8s-configs
    targetRevision: main
    path: charts/my-app
    
    # Helm-specific configuration
    helm:
      # Values file to use
      valueFiles:
        - values.yaml
        - values-production.yaml
      
      # Override values inline
      values: |
        replicaCount: 3
        image:
          tag: v1.2.3
      
      # Or set specific parameters
      parameters:
        - name: image.tag
          value: v1.2.3
        - name: resources.limits.memory
          value: 512Mi
      
      # Release name (defaults to app name)
      releaseName: my-app
  
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Kustomize Application

```yaml
# applications/my-kustomize-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-kustomize-app
  namespace: argocd
spec:
  project: default
  
  source:
    repoURL: https://github.com/myorg/my-k8s-configs
    targetRevision: main
    path: overlays/production  # Kustomize overlay path
    
    # Kustomize-specific configuration
    kustomize:
      # Override images
      images:
        - my-app=myregistry.com/my-app:v1.2.3
      
      # Add name prefix/suffix
      namePrefix: prod-
      
      # Add common labels
      commonLabels:
        environment: production
      
      # Add common annotations
      commonAnnotations:
        deployment.kubernetes.io/revision: "1"
  
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## App of Apps Pattern

Manage multiple applications with a parent application:

```yaml
# applications/root.yaml
# This is the "parent" application that manages other applications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-k8s-configs
    targetRevision: main
    # This directory contains Application manifests
    path: argocd/applications
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Directory structure:

```
my-k8s-configs/
├── argocd/
│   └── applications/           # App of Apps - managed by root application
│       ├── frontend.yaml       # Application manifest
│       ├── backend.yaml
│       ├── database.yaml
│       └── monitoring.yaml
├── apps/
│   ├── frontend/              # Actual Kubernetes manifests
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── backend/
│   └── database/
└── charts/
    └── monitoring/            # Helm chart
```

## ApplicationSets for Multiple Environments

```yaml
# applicationsets/my-app.yaml
# Generate applications for multiple environments from a template
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    # Generate one application per list element
    - list:
        elements:
          - env: development
            namespace: dev
            replicas: "1"
          - env: staging
            namespace: staging
            replicas: "2"
          - env: production
            namespace: production
            replicas: "3"
  
  template:
    metadata:
      name: 'my-app-{{env}}'
      namespace: argocd
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/my-k8s-configs
        targetRevision: main
        path: 'overlays/{{env}}'
        kustomize:
          images:
            - 'my-app=myregistry.com/my-app:{{env}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

### Git Generator

```yaml
# Generate applications from directories in Git
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-addons
  namespace: argocd
spec:
  generators:
    # Generate an application for each directory
    - git:
        repoURL: https://github.com/myorg/my-k8s-configs
        revision: main
        directories:
          - path: addons/*  # Each subdirectory becomes an app
  
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/my-k8s-configs
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Projects for Multi-Tenancy

```yaml
# projects/team-a.yaml
# ArgoCD Projects provide RBAC and restrictions
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  description: Team A's applications
  
  # Only allow applications in these Git repos
  sourceRepos:
    - https://github.com/myorg/team-a-*
    - https://github.com/myorg/shared-charts
  
  # Only allow deploying to these namespaces
  destinations:
    - namespace: team-a-*
      server: https://kubernetes.default.svc
    - namespace: team-a-dev
      server: https://kubernetes.default.svc
  
  # Deny list - prevent deployments of sensitive resources
  namespaceResourceBlacklist:
    - group: ''
      kind: ResourceQuota
    - group: ''
      kind: LimitRange
  
  # Cluster resource whitelist
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
  
  # Role definitions for this project
  roles:
    - name: developer
      description: Developer role
      policies:
        # Allow sync and get
        - p, proj:team-a:developer, applications, get, team-a/*, allow
        - p, proj:team-a:developer, applications, sync, team-a/*, allow
      groups:
        - team-a-developers  # OIDC/LDAP group
    
    - name: admin
      description: Admin role
      policies:
        - p, proj:team-a:admin, applications, *, team-a/*, allow
      groups:
        - team-a-admins
```

## Sync Waves and Hooks

Control the order of resource deployment:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    # Sync wave - lower numbers sync first
    # Wave 0: CRDs, Namespaces
    # Wave 1: ConfigMaps, Secrets
    # Wave 2: Services, Deployments
    argocd.argoproj.io/sync-wave: "2"
spec:
  # ...
```

```yaml
# pre-sync-job.yaml
# Hook to run database migrations before deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    # Run this job before syncing other resources
    argocd.argoproj.io/hook: PreSync
    # Delete job after it completes
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: my-app:latest
          command: ["./migrate.sh"]
      restartPolicy: Never
```

Hook types:
- `PreSync` - Before sync starts
- `Sync` - During sync (same as wave 0)
- `PostSync` - After all resources are synced
- `SyncFail` - If sync fails

## Monitoring ArgoCD

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  endpoints:
    - port: metrics
      interval: 30s
```

Key metrics:

```promql
# Application sync status
argocd_app_info{sync_status="Synced"}
argocd_app_info{health_status="Healthy"}

# Sync operations
argocd_app_sync_total
argocd_app_reconcile_count

# API server request latency
argocd_redis_request_duration_seconds
```

```yaml
# Alert rules
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-alerts
spec:
  groups:
    - name: argocd
      rules:
        - alert: ArgoAppOutOfSync
          expr: argocd_app_info{sync_status!="Synced"} == 1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD application out of sync"
            description: "{{ $labels.name }} has been out of sync for 30 minutes"
        
        - alert: ArgoAppUnhealthy
          expr: argocd_app_info{health_status!="Healthy"} == 1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD application unhealthy"
            description: "{{ $labels.name }} has been unhealthy for 15 minutes"
```

## Best Practices

### 1. Repository Structure

```
# Recommended monorepo structure
my-k8s-configs/
├── base/                    # Base configurations
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/                # Environment-specific overrides
│   ├── development/
│   │   └── kustomization.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── production/
│       └── kustomization.yaml
├── argocd/                  # ArgoCD configurations
│   ├── applications/
│   └── projects/
└── charts/                  # Helm charts
```

### 2. Image Updater

```yaml
# Use ArgoCD Image Updater for automatic image updates
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    # Enable image updater
    argocd-image-updater.argoproj.io/image-list: myapp=myregistry.com/my-app
    # Update strategy: semver, latest, digest
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    # Write back to Git
    argocd-image-updater.argoproj.io/write-back-method: git
```

### 3. Secrets Management

```yaml
# Use External Secrets or Sealed Secrets
# Don't commit plain secrets to Git!

# Option 1: External Secrets (see our blog post)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-secret
spec:
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: my-secret
  data:
    - secretKey: password
      remoteRef:
        key: secret/data/myapp
        property: password
```

For more on managing secrets with ArgoCD, see our guide on [External Secrets Operator and HashiCorp Vault](https://oneuptime.com/blog/post/kubernetes-external-secrets-vault-integration/view).

## Conclusion

ArgoCD transforms how you deploy to Kubernetes by making Git your single source of truth. Key takeaways:

1. **Start with declarative applications** - Define your apps in YAML, not CLI commands
2. **Use ApplicationSets** - Scale to multiple environments without duplication
3. **Implement App of Apps** - Manage your ArgoCD configuration in Git too
4. **Enable automated sync** - Let ArgoCD keep your cluster in sync
5. **Monitor sync status** - Alert on out-of-sync or unhealthy applications

GitOps with ArgoCD provides audit trails, easy rollbacks, and self-healing infrastructure. Combined with proper CI pipelines for building and testing, it creates a robust deployment workflow.

For comprehensive monitoring of your ArgoCD deployments and applications, check out [OneUptime's monitoring capabilities](https://oneuptime.com/product/metrics).

## Related Resources

- [How to Secure Kubernetes Secrets with External Secrets Operator](https://oneuptime.com/blog/post/kubernetes-external-secrets-vault-integration/view)
- [How to Implement Kubernetes RBAC Best Practices](https://oneuptime.com/blog/post/kubernetes-rbac-multi-tenant-best-practices/view)
- [How to Set Up Health Checks for Kubernetes](https://oneuptime.com/blog/post/python-health-checks-kubernetes/view)
