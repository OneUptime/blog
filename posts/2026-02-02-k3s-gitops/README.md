# How to Use K3s with GitOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: K3s, GitOps, Kubernetes, ArgoCD, Flux, DevOps, CI/CD, Infrastructure as Code, Lightweight Kubernetes

Description: Learn how to implement GitOps workflows with K3s, the lightweight Kubernetes distribution. Covers ArgoCD and Flux integration, repository structure, deployment strategies, and production best practices.

---

> K3s brings Kubernetes to resource-constrained environments while GitOps brings declarative, version-controlled infrastructure. Together, they create a powerful combination for edge computing, IoT deployments, and development environments. Stop manually applying manifests and let Git drive your deployments.

Running Kubernetes on edge devices or limited hardware no longer means sacrificing modern deployment practices. GitOps with K3s delivers enterprise-grade workflows on minimal infrastructure.

---

## Overview

```mermaid
flowchart LR
    subgraph "Developer Workflow"
        Dev["Developer"] --> PR["Pull Request"]
        PR --> Review["Code Review"]
        Review --> Merge["Merge to Main"]
    end

    subgraph "GitOps Pipeline"
        Merge --> Repo["Git Repository"]
        Repo --> GitOps["GitOps Controller<br/>(ArgoCD/Flux)"]
    end

    subgraph "K3s Cluster"
        GitOps --> K3s["K3s API Server"]
        K3s --> Apps["Applications"]
        K3s --> Infra["Infrastructure"]
    end
```

---

## What is K3s?

K3s is a lightweight, certified Kubernetes distribution built for production workloads in resource-constrained environments. Rancher Labs developed K3s with the following characteristics:

- **Single binary** under 100MB containing all components
- **Minimal memory footprint** starting at 512MB RAM
- **SQLite by default** instead of etcd (etcd available as option)
- **Simplified installation** with a single command
- **ARM support** for Raspberry Pi and edge devices

---

## Why GitOps with K3s?

Combining GitOps with K3s provides several advantages for lightweight Kubernetes deployments:

```mermaid
flowchart TD
    subgraph "Traditional Deployment"
        Manual["Manual kubectl apply"]
        Scripts["Custom Shell Scripts"]
        Helm["Direct Helm Commands"]
    end

    subgraph "GitOps Deployment"
        Git["Git as Single Source of Truth"]
        Auto["Automated Reconciliation"]
        Audit["Full Audit Trail"]
        Rollback["Easy Rollbacks"]
    end

    Manual --> Problems["Drift, No Audit, Manual Errors"]
    Scripts --> Problems
    Helm --> Problems

    Git --> Benefits["Consistency, Visibility, Reliability"]
    Auto --> Benefits
    Audit --> Benefits
    Rollback --> Benefits
```

---

## Installing K3s

### Single Node Installation

The following script installs K3s as a single-node cluster with the default configuration:

```bash
# Install K3s with default settings
# The script downloads the binary, sets up systemd, and starts the server
curl -sfL https://get.k3s.io | sh -

# Verify the installation succeeded
sudo k3s kubectl get nodes

# Copy kubeconfig for standard kubectl access
# K3s stores the kubeconfig in /etc/rancher/k3s/k3s.yaml
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

### Multi-Node Cluster Setup

For production deployments, set up a multi-node cluster with a dedicated server and agent nodes:

```bash
# On the server node (control plane)
# Store the token for worker nodes to join the cluster
curl -sfL https://get.k3s.io | sh -s - server \
    --cluster-init \
    --tls-san=k3s.example.com

# Retrieve the node token for worker registration
sudo cat /var/lib/rancher/k3s/server/node-token
```

Worker nodes join the cluster using the token and server address:

```bash
# On each agent node (worker)
# Replace K3S_URL with your server address and K3S_TOKEN with the retrieved token
curl -sfL https://get.k3s.io | K3S_URL=https://k3s.example.com:6443 \
    K3S_TOKEN=your-node-token \
    sh -
```

### K3s with External Database

For high availability, K3s can use an external PostgreSQL or MySQL database instead of SQLite:

```bash
# Install K3s with PostgreSQL as the datastore
# The datastore-endpoint parameter accepts a connection string
curl -sfL https://get.k3s.io | sh -s - server \
    --datastore-endpoint="postgres://user:password@postgres.example.com:5432/k3s"
```

---

## Setting Up ArgoCD on K3s

### Installing ArgoCD

ArgoCD provides a declarative GitOps continuous delivery tool for Kubernetes. Install it on your K3s cluster:

```bash
# Create the argocd namespace for all ArgoCD components
kubectl create namespace argocd

# Install ArgoCD using the official manifest
# The install.yaml contains all required resources: CRDs, deployments, services
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for all ArgoCD pods to become ready before proceeding
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

### ArgoCD Resource Optimization for K3s

K3s environments often have limited resources. Adjust ArgoCD resource requests to fit within constraints:

```yaml
# argocd-resource-patch.yaml
# Apply resource limits suitable for resource-constrained environments
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-application-controller
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

Apply the resource patches:

```bash
# Apply the resource optimization patches to ArgoCD deployments
kubectl apply -f argocd-resource-patch.yaml
```

### Accessing ArgoCD UI

Expose ArgoCD through a K3s Traefik ingress or port-forward for initial setup:

```bash
# Port-forward the ArgoCD server for local access
# Access the UI at https://localhost:8080
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Retrieve the initial admin password from the generated secret
kubectl -n argocd get secret argocd-initial-admin-secret \
    -o jsonpath="{.data.password}" | base64 -d
```

---

## Setting Up Flux on K3s

### Installing Flux

Flux offers an alternative GitOps solution with a more modular architecture. Bootstrap Flux into your K3s cluster:

```bash
# Install the Flux CLI tool
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the cluster meets Flux prerequisites
flux check --pre

# Bootstrap Flux with GitHub as the source repository
# Replace owner with your GitHub username and repository with your GitOps repo name
flux bootstrap github \
    --owner=your-org \
    --repository=k3s-gitops \
    --branch=main \
    --path=./clusters/production \
    --personal
```

### Flux Components Overview

```mermaid
flowchart TB
    subgraph "Flux Controllers"
        Source["Source Controller<br/>Git, Helm, OCI"]
        Kustomize["Kustomize Controller<br/>Manifests"]
        Helm["Helm Controller<br/>Charts"]
        Notification["Notification Controller<br/>Alerts"]
    end

    subgraph "Sources"
        GitRepo["Git Repository"]
        HelmRepo["Helm Repository"]
        OCIRepo["OCI Repository"]
    end

    GitRepo --> Source
    HelmRepo --> Source
    OCIRepo --> Source

    Source --> Kustomize
    Source --> Helm
    Kustomize --> K3s["K3s Cluster"]
    Helm --> K3s
```

---

## GitOps Repository Structure

### Recommended Directory Layout

Organize your GitOps repository to separate cluster configurations, applications, and infrastructure:

```
k3s-gitops/
├── clusters/
│   ├── production/
│   │   ├── flux-system/        # Flux bootstrap components
│   │   ├── apps.yaml           # Applications Kustomization
│   │   └── infrastructure.yaml # Infrastructure Kustomization
│   └── staging/
│       ├── flux-system/
│       ├── apps.yaml
│       └── infrastructure.yaml
├── apps/
│   ├── base/
│   │   ├── nginx/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   └── api-server/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       └── kustomization.yaml
│   └── overlays/
│       ├── production/
│       │   └── kustomization.yaml
│       └── staging/
│           └── kustomization.yaml
└── infrastructure/
    ├── base/
    │   ├── cert-manager/
    │   ├── ingress-nginx/
    │   └── monitoring/
    └── overlays/
        ├── production/
        └── staging/
```

### Base Application Configuration

Define a base application configuration that gets customized per environment:

```yaml
# apps/base/nginx/deployment.yaml
# Base deployment configuration for nginx web server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
```

### Environment-Specific Overlays

Production overlays increase replicas and apply environment-specific configurations:

```yaml
# apps/overlays/production/kustomization.yaml
# Production environment customizations
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base/nginx
  - ../../base/api-server
patches:
  - patch: |-
      - op: replace
        path: /spec/replicas
        value: 3
    target:
      kind: Deployment
      name: nginx
images:
  - name: nginx
    newTag: "1.25-alpine"
```

---

## ArgoCD Application Configuration

### Application Manifest

Define an ArgoCD Application resource that points to your GitOps repository:

```yaml
# argocd-apps/production-app.yaml
# ArgoCD Application for production workloads
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-apps
  namespace: argocd
  # Finalizer ensures proper cleanup when the Application is deleted
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k3s-gitops.git
    targetRevision: main
    path: apps/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    # Automated sync keeps cluster state matching Git
    automated:
      prune: true       # Remove resources not in Git
      selfHeal: true    # Revert manual changes
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### ApplicationSet for Multiple Clusters

When managing multiple K3s clusters, ApplicationSets generate Applications dynamically:

```yaml
# argocd-apps/cluster-appset.yaml
# Generate Applications for each cluster defined in the list
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: k3s-clusters
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: edge-01
            url: https://edge-01.example.com:6443
          - cluster: edge-02
            url: https://edge-02.example.com:6443
          - cluster: edge-03
            url: https://edge-03.example.com:6443
  template:
    metadata:
      # Name includes the cluster identifier for uniqueness
      name: '{{cluster}}-apps'
    spec:
      project: default
      source:
        repoURL: https://github.com/your-org/k3s-gitops.git
        targetRevision: main
        path: 'apps/overlays/{{cluster}}'
      destination:
        server: '{{url}}'
        namespace: default
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

---

## Flux GitRepository and Kustomization

### GitRepository Source

Define the Git source that Flux monitors for changes:

```yaml
# clusters/production/flux-system/gotk-sync.yaml
# GitRepository defines where Flux finds the manifests
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m0s
  ref:
    branch: main
  # Secret containing SSH key or token for private repos
  secretRef:
    name: flux-system
  url: ssh://git@github.com/your-org/k3s-gitops.git
```

### Kustomization for Applications

Flux Kustomization resources apply manifests from the GitRepository:

```yaml
# clusters/production/apps.yaml
# Kustomization tells Flux what to deploy from the repository
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m0s
  # Dependencies ensure infrastructure deploys before applications
  dependsOn:
    - name: infrastructure
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/overlays/production
  prune: true
  # Health checks verify deployments are running before marking as ready
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx
      namespace: production
  timeout: 2m
```

---

## Helm Integration

### ArgoCD with Helm

ArgoCD natively supports Helm charts as application sources:

```yaml
# argocd-apps/monitoring-helm.yaml
# ArgoCD Application deploying Prometheus via Helm
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: monitoring
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 55.5.0
    helm:
      # Values optimized for K3s resource constraints
      values: |
        prometheus:
          prometheusSpec:
            resources:
              requests:
                memory: "256Mi"
                cpu: "100m"
              limits:
                memory: "512Mi"
                cpu: "500m"
        grafana:
          resources:
            requests:
              memory: "128Mi"
              cpu: "50m"
            limits:
              memory: "256Mi"
              cpu: "200m"
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Flux HelmRelease

Flux manages Helm releases through the HelmRelease custom resource:

```yaml
# infrastructure/base/monitoring/helmrelease.yaml
# HelmRelease for Flux-managed Prometheus deployment
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 5m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "55.5.0"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    prometheus:
      prometheusSpec:
        retention: 24h
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
    alertmanager:
      enabled: false
  # Upgrade settings for zero-downtime deployments
  upgrade:
    remediation:
      retries: 3
```

---

## Secrets Management

### Sealed Secrets with K3s

Sealed Secrets allow encrypted secrets to be stored safely in Git:

```bash
# Install Sealed Secrets controller on K3s
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.5/controller.yaml

# Install kubeseal CLI for encrypting secrets
# macOS
brew install kubeseal

# Linux
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.5/kubeseal-0.24.5-linux-amd64.tar.gz
tar -xzf kubeseal-0.24.5-linux-amd64.tar.gz
sudo mv kubeseal /usr/local/bin/
```

Create and seal a secret for Git storage:

```bash
# Create a regular Kubernetes secret
kubectl create secret generic database-credentials \
    --from-literal=username=admin \
    --from-literal=password=secretpassword \
    --dry-run=client -o yaml > secret.yaml

# Seal the secret for safe Git storage
# The sealed secret can only be decrypted by the cluster that generated it
kubeseal --format yaml < secret.yaml > sealed-secret.yaml

# The sealed-secret.yaml is safe to commit to Git
```

### SOPS with Flux

Flux integrates with Mozilla SOPS for secret encryption:

```yaml
# clusters/production/flux-system/gotk-sync.yaml
# Kustomization with SOPS decryption enabled
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Decryption configuration for SOPS-encrypted secrets
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

Create the SOPS configuration file for your repository:

```yaml
# .sops.yaml
# SOPS configuration defining encryption rules
creation_rules:
  # Encrypt secrets in the production path with age
  - path_regex: clusters/production/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  # Encrypt staging secrets with a different key
  - path_regex: clusters/staging/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

---

## Image Automation

### Flux Image Automation

Automatically update container image tags in Git when new versions are pushed:

```yaml
# infrastructure/base/image-automation/image-repository.yaml
# ImageRepository scans container registries for new tags
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  image: nginx
  interval: 1m0s
---
# ImagePolicy selects which tags should trigger updates
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: nginx
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: nginx
  policy:
    # Select tags matching semver pattern, taking the latest
    semver:
      range: ">=1.24.0 <2.0.0"
```

Configure automatic Git commits when images update:

```yaml
# infrastructure/base/image-automation/image-update.yaml
# ImageUpdateAutomation commits image tag changes to Git
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m0s
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux
      messageTemplate: 'Update image to {{range .Updated.Images}}{{.}}{{end}}'
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

Mark deployment images for automatic updates:

```yaml
# apps/base/nginx/deployment.yaml
# The marker comment tells Flux which ImagePolicy to use
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  template:
    spec:
      containers:
      - name: nginx
        image: nginx:1.24-alpine # {"$imagepolicy": "flux-system:nginx"}
```

---

## Progressive Delivery with Flagger

### Installing Flagger on K3s

Flagger enables canary deployments and automated rollbacks:

```bash
# Add the Flagger Helm repository
helm repo add flagger https://flagger.app

# Install Flagger with Traefik provider (K3s default ingress)
helm install flagger flagger/flagger \
    --namespace flagger-system \
    --create-namespace \
    --set meshProvider=traefik \
    --set metricsServer=http://prometheus.monitoring:9090
```

### Canary Deployment Configuration

Define a Canary resource for gradual traffic shifting:

```yaml
# apps/base/api-server/canary.yaml
# Canary manages progressive delivery for the api-server
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  # Traefik IngressRoute for traffic splitting
  ingressRef:
    apiVersion: traefik.containo.us/v1alpha1
    kind: IngressRoute
    name: api-server
  progressDeadlineSeconds: 60
  service:
    port: 80
    targetPort: 8080
  analysis:
    # Run analysis every 30 seconds
    interval: 30s
    # Promote after 5 successful iterations
    threshold: 5
    # Maximum traffic percentage for canary
    maxWeight: 50
    # Increase traffic by 10% each iteration
    stepWeight: 10
    metrics:
      - name: request-success-rate
        # Require 99% success rate to continue
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        # P99 latency must be under 500ms
        thresholdRange:
          max: 500
        interval: 1m
```

---

## Monitoring GitOps

### ArgoCD Metrics

ArgoCD exposes Prometheus metrics for monitoring sync status and health:

```yaml
# infrastructure/base/monitoring/argocd-servicemonitor.yaml
# ServiceMonitor for Prometheus to scrape ArgoCD metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-metrics
  namespaceSelector:
    matchNames:
      - argocd
  endpoints:
    - port: metrics
      interval: 30s
```

### Flux Metrics

Flux controllers expose metrics through their built-in endpoints:

```yaml
# infrastructure/base/monitoring/flux-servicemonitor.yaml
# ServiceMonitor for Flux controller metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: source-controller
  namespaceSelector:
    matchNames:
      - flux-system
  endpoints:
    - port: http-prom
      interval: 30s
```

### GitOps Dashboard

Create a Grafana dashboard for GitOps visibility:

```yaml
# infrastructure/base/monitoring/gitops-dashboard-configmap.yaml
# ConfigMap containing Grafana dashboard JSON
apiVersion: v1
kind: ConfigMap
metadata:
  name: gitops-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  gitops-dashboard.json: |
    {
      "title": "GitOps Overview",
      "panels": [
        {
          "title": "ArgoCD Sync Status",
          "type": "stat",
          "targets": [
            {
              "expr": "sum(argocd_app_info{sync_status=\"Synced\"})",
              "legendFormat": "Synced Apps"
            }
          ]
        },
        {
          "title": "Flux Reconciliation",
          "type": "graph",
          "targets": [
            {
              "expr": "rate(gotk_reconcile_duration_seconds_sum[5m])",
              "legendFormat": "{{kind}}"
            }
          ]
        }
      ]
    }
```

---

## Edge Deployment Patterns

### Hub and Spoke Architecture

Manage multiple edge K3s clusters from a central hub:

```mermaid
flowchart TB
    subgraph "Central Hub"
        GitRepo["Git Repository"]
        Hub["Management Cluster<br/>(ArgoCD)"]
    end

    subgraph "Edge Clusters"
        Edge1["K3s Edge 01<br/>(Retail Store)"]
        Edge2["K3s Edge 02<br/>(Warehouse)"]
        Edge3["K3s Edge 03<br/>(Factory Floor)"]
    end

    GitRepo --> Hub
    Hub --> Edge1
    Hub --> Edge2
    Hub --> Edge3
```

### Cluster Registration with ArgoCD

Register remote K3s clusters with the central ArgoCD instance:

```bash
# Add edge cluster to ArgoCD
# The context name must match a kubeconfig context for the edge cluster
argocd cluster add edge-01-context --name edge-01

# Verify cluster registration
argocd cluster list
```

Alternatively, define clusters declaratively:

```yaml
# argocd-config/edge-clusters.yaml
# Declarative cluster registration secret
apiVersion: v1
kind: Secret
metadata:
  name: edge-01-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: edge-01
  server: https://edge-01.example.com:6443
  config: |
    {
      "bearerToken": "eyJhbGciOiJSUzI1...",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "LS0tLS1CRUdJTi..."
      }
    }
```

---

## Disaster Recovery

### Backup Strategy

Implement backups for GitOps state and K3s data:

```yaml
# infrastructure/base/backup/velero-schedule.yaml
# Velero schedule for regular cluster backups
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    # Include all namespaces except system namespaces
    includedNamespaces:
      - "*"
    excludedNamespaces:
      - kube-system
      - velero
    # Include persistent volumes in backup
    snapshotVolumes: true
    storageLocation: default
    ttl: 720h  # Retain for 30 days
```

### K3s Etcd Snapshots

For K3s clusters using etcd, configure automatic snapshots:

```yaml
# K3s server configuration with etcd snapshots
# /etc/rancher/k3s/config.yaml
cluster-init: true
etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 10
etcd-snapshot-dir: /var/lib/rancher/k3s/server/db/snapshots
```

---

## Best Practices

### Repository Organization

1. **Separate concerns** - Keep applications, infrastructure, and cluster configs in distinct directories
2. **Environment isolation** - Use overlays for production, staging, and development
3. **Consistent naming** - Follow conventions for resource names and labels
4. **Document structure** - Include README files explaining repository layout

### Security Considerations

1. **Never commit plain secrets** - Use Sealed Secrets, SOPS, or external secret operators
2. **Least privilege RBAC** - GitOps controllers should have minimal required permissions
3. **Audit trail** - Enable Git signing and protected branches
4. **Network policies** - Restrict GitOps controller network access

### Resource Management for K3s

1. **Set resource limits** - K3s environments often have constrained resources
2. **Optimize images** - Use alpine or distroless base images
3. **Monitor capacity** - Alert on node resource utilization
4. **Scale appropriately** - Match replica counts to available resources

---

## Troubleshooting

### Common ArgoCD Issues

Diagnose sync failures and application health problems:

```bash
# Check application sync status
argocd app get production-apps

# View sync operation details
argocd app sync production-apps --dry-run

# Check controller logs for errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Force refresh application state from Git
argocd app refresh production-apps --hard
```

### Common Flux Issues

Debug Flux reconciliation problems:

```bash
# Check all Flux resources status
flux get all

# View source controller logs
flux logs --kind=GitRepository --name=flux-system

# Check kustomization status
flux get kustomizations

# Manually trigger reconciliation
flux reconcile kustomization apps --with-source
```

### K3s Specific Issues

Address K3s-related problems in GitOps workflows:

```bash
# Verify K3s is running
sudo systemctl status k3s

# Check K3s logs
sudo journalctl -u k3s -f

# Verify network connectivity
kubectl run test --rm -it --image=busybox -- wget -qO- http://kubernetes.default

# Check Traefik ingress status
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik
```

---

## Conclusion

K3s and GitOps form a powerful combination for managing lightweight Kubernetes deployments. Key takeaways:

- **K3s reduces infrastructure overhead** while maintaining Kubernetes compatibility
- **ArgoCD and Flux** bring enterprise GitOps capabilities to resource-constrained environments
- **Repository structure matters** - organize for clarity and environment separation
- **Security remains critical** - encrypt secrets, limit permissions, audit changes
- **Automation improves reliability** - image updates, canary deployments, and auto-sync

Start small with a single K3s cluster and basic GitOps workflow, then expand to multi-cluster management as your edge infrastructure grows.

---

*Ready to implement GitOps on your K3s clusters? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Kubernetes environments, helping you track application health, resource utilization, and deployment status across all your clusters.*
