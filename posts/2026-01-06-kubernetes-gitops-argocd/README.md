# How to Implement GitOps with ArgoCD in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GitOps, ArgoCD, CI/CD, DevOps, Automation

Description: A complete guide to implementing GitOps with ArgoCD, from installation and basic configuration to advanced patterns like ApplicationSets, sync waves, and multi-cluster management.

---

GitOps means Git is the source of truth. ArgoCD watches your Git repos and automatically syncs your Kubernetes clusters to match. No more `kubectl apply` from laptops.

## What Is GitOps?

```mermaid
flowchart LR
    Dev[Developer] --> Git[Git Repository]
    Git --> ArgoCD[ArgoCD]
    ArgoCD --> K8s[Kubernetes Cluster]

    subgraph GitOps Loop
        ArgoCD -->|Watch| Git
        ArgoCD -->|Compare| K8s
        ArgoCD -->|Sync| K8s
    end
```

Core principles:
1. **Declarative** - Entire system described in Git
2. **Versioned** - Git history = deployment history
3. **Automatic** - Changes applied automatically
4. **Self-healing** - Drift detected and corrected

## Installing ArgoCD

### Quick Install

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

### Install with Helm (Recommended for Production)

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

helm install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --set server.service.type=LoadBalancer \
  --set configs.params."server\.insecure"=true
```

### Access ArgoCD UI

```bash
# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port forward (if no LoadBalancer)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Open https://localhost:8080
# Username: admin
# Password: <from above>
```

### Install ArgoCD CLI

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/

# Login
argocd login localhost:8080 --insecure
```

## Creating Your First Application

### Option 1: Using the CLI

```bash
argocd app create myapp \
  --repo https://github.com/myorg/myapp.git \
  --path k8s/overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production \
  --sync-policy automated \
  --auto-prune \
  --self-heal
```

### Option 2: Using Declarative YAML

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp.git
    targetRevision: HEAD
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Apply it:

```bash
kubectl apply -f application.yaml
```

## Repository Structure

### Recommended Layout

```
myapp/
├── k8s/
│   ├── base/
│   │   ├── kustomization.yaml
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── configmap.yaml
│   └── overlays/
│       ├── development/
│       │   ├── kustomization.yaml
│       │   └── patch-replicas.yaml
│       ├── staging/
│       │   ├── kustomization.yaml
│       │   └── patch-replicas.yaml
│       └── production/
│           ├── kustomization.yaml
│           └── patch-replicas.yaml
└── .argocd/
    └── applications/
        ├── development.yaml
        └── production.yaml
```

### Base Kustomization

```yaml
# k8s/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

### Environment Overlay

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base
patches:
  - patch-replicas.yaml
images:
  - name: myapp
    newTag: v1.2.3
```

## ArgoCD Projects

Projects provide logical grouping and RBAC:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-backend
  namespace: argocd
spec:
  description: Backend team applications
  sourceRepos:
    - 'https://github.com/myorg/backend-*'
  destinations:
    - namespace: 'backend-*'
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
  namespaceResourceWhitelist:
    - group: '*'
      kind: '*'
  roles:
    - name: developer
      description: Developer access
      policies:
        - p, proj:team-backend:developer, applications, get, team-backend/*, allow
        - p, proj:team-backend:developer, applications, sync, team-backend/*, allow
      groups:
        - backend-developers
```

## Sync Waves and Hooks

Control deployment order with sync waves:

```yaml
# CRDs first (wave -1)
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
# Namespace second (wave 0)
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "0"

---
# ConfigMaps third (wave 1)
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  annotations:
    argocd.argoproj.io/sync-wave: "1"

---
# Deployment last (wave 2)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "2"
```

### Sync Hooks

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:latest
          command: ["./migrate.sh"]
      restartPolicy: Never
```

Hook phases:
- `PreSync` - Before sync
- `Sync` - During sync
- `PostSync` - After sync
- `SyncFail` - On sync failure

## ApplicationSets

Automatically generate Applications from templates:

### List Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-environments
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: development
            cluster: https://kubernetes.default.svc
          - env: staging
            cluster: https://kubernetes.default.svc
          - env: production
            cluster: https://prod.example.com
  template:
    metadata:
      name: 'myapp-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/myapp.git
        targetRevision: HEAD
        path: 'k8s/overlays/{{env}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{env}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

### Git Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/services.git
        revision: HEAD
        directories:
          - path: 'services/*'
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/services.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
```

### Cluster Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: infrastructure
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            env: production
  template:
    metadata:
      name: 'infra-{{name}}'
    spec:
      project: infrastructure
      source:
        repoURL: https://github.com/myorg/infra.git
        path: base
      destination:
        server: '{{server}}'
        namespace: infrastructure
```

## Multi-Cluster Management

### Add a Cluster

```bash
# Add cluster using kubeconfig context
argocd cluster add prod-context --name production

# Or declaratively
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: prod-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
stringData:
  name: production
  server: https://prod.example.com
  config: |
    {
      "bearerToken": "<token>",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<base64-ca-cert>"
      }
    }
EOF
```

### Deploy to Multiple Clusters

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: global-monitoring
  namespace: argocd
spec:
  generators:
    - clusters: {}  # All clusters
  template:
    metadata:
      name: 'monitoring-{{name}}'
    spec:
      source:
        repoURL: https://github.com/myorg/monitoring.git
        path: base
      destination:
        server: '{{server}}'
        namespace: monitoring
```

## Handling Secrets

### Option 1: Sealed Secrets

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-creds
spec:
  encryptedData:
    password: AgBy3i4OJSWK+...
```

### Option 2: External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-creds
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault
    kind: ClusterSecretStore
  target:
    name: db-creds
  data:
    - secretKey: password
      remoteRef:
        key: myapp/db
        property: password
```

### Option 3: Vault Plugin

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
spec:
  source:
    plugin:
      name: argocd-vault-plugin
      env:
        - name: AVP_TYPE
          value: vault
        - name: AVP_AUTH_TYPE
          value: k8s
```

## Notifications

### Configure Slack Notifications

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token
  template.app-deployed: |
    message: |
      Application {{.app.metadata.name}} is now running new version.
  trigger.on-deployed: |
    - description: Application is synced and healthy
      send:
        - app-deployed
      when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'

---
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
stringData:
  slack-token: xoxb-your-token
```

### Subscribe Applications

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  annotations:
    notifications.argoproj.io/subscribe.on-deployed.slack: deployments
```

## Best Practices

### 1. Use App of Apps Pattern

```yaml
# Root application that manages other applications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: applications
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/argocd-apps.git
    path: applications
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
```

### 2. Separate Config from Code

```
# Application code repo
myapp/
├── src/
├── Dockerfile
└── .github/workflows/build.yml

# GitOps config repo
myapp-config/
├── base/
└── overlays/
```

### 3. Use Automated Sync Wisely

```yaml
syncPolicy:
  automated:
    prune: true      # Remove resources not in Git
    selfHeal: true   # Fix manual changes
  syncOptions:
    - Validate=true  # Validate before apply
    - PruneLast=true # Prune after sync
```

### 4. Set Resource Tracking

```yaml
spec:
  syncPolicy:
    syncOptions:
      - ServerSideApply=true  # Better conflict resolution
```

## Troubleshooting

### Application Stuck Syncing

```bash
# Check sync status
argocd app get myapp

# Force refresh
argocd app get myapp --refresh

# Hard refresh (clear cache)
argocd app get myapp --hard-refresh
```

### Out of Sync but No Changes

```bash
# Check for ignored differences
argocd app diff myapp

# Common cause: metadata fields
# Add to ignoreDifferences
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

### Sync Failed

```bash
# Get detailed sync result
argocd app sync myapp --dry-run

# Check events
kubectl get events -n argocd --field-selector involvedObject.name=myapp
```

---

ArgoCD transforms how you deploy to Kubernetes. Start simple with a single application, then expand to ApplicationSets and multi-cluster as you grow. The investment in GitOps pays dividends in auditability, reliability, and developer experience.
