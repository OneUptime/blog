# How to Add a Public Helm Repository to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Repository Management

Description: Learn how to add public Helm chart repositories to ArgoCD and deploy community charts like Prometheus, Grafana, and NGINX Ingress using the GitOps approach.

---

Public Helm repositories are the primary distribution method for community and vendor Kubernetes applications. Charts for tools like Prometheus, Grafana, cert-manager, and NGINX Ingress Controller are all available from public Helm repos. Adding these repositories to ArgoCD lets you deploy and manage them using GitOps principles. This guide covers how to add public Helm repos and create applications from them.

## Public Helm Repository Basics

A Helm repository is an HTTP server that hosts an `index.yaml` file listing available charts and their versions. ArgoCD supports both traditional Helm repositories and OCI-based registries.

Common public Helm repositories:

```text
# Bitnami
https://charts.bitnami.com/bitnami

# Prometheus Community
https://prometheus-community.github.io/helm-charts

# Grafana
https://grafana.github.io/helm-charts

# Ingress NGINX
https://kubernetes.github.io/ingress-nginx

# cert-manager
https://charts.jetstack.io

# Argo (for Argo Rollouts, Workflows, etc.)
https://argoproj.github.io/argo-helm
```

## Adding a Helm Repository via CLI

```bash
# Add a public Helm repository
argocd repo add https://prometheus-community.github.io/helm-charts \
  --type helm \
  --name prometheus-community

# Add another repository
argocd repo add https://grafana.github.io/helm-charts \
  --type helm \
  --name grafana

# List all repositories
argocd repo list
```

The `--type helm` flag tells ArgoCD this is a Helm repository, not a Git repository. The `--name` is an alias used when referencing charts.

## Adding a Helm Repository Declaratively

For a GitOps approach, declare the repository as a Kubernetes Secret:

```yaml
# prometheus-helm-repo.yaml
apiVersion: v1
kind: Secret
metadata:
  name: prometheus-community-helm
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: prometheus-community
  url: https://prometheus-community.github.io/helm-charts
```

```bash
kubectl apply -f prometheus-helm-repo.yaml
```

You can add multiple repositories in a single file:

```yaml
# public-helm-repos.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitnami-helm
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: bitnami
  url: https://charts.bitnami.com/bitnami
---
apiVersion: v1
kind: Secret
metadata:
  name: grafana-helm
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: grafana
  url: https://grafana.github.io/helm-charts
---
apiVersion: v1
kind: Secret
metadata:
  name: ingress-nginx-helm
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: ingress-nginx
  url: https://kubernetes.github.io/ingress-nginx
---
apiVersion: v1
kind: Secret
metadata:
  name: jetstack-helm
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: jetstack
  url: https://charts.jetstack.io
```

```bash
kubectl apply -f public-helm-repos.yaml
```

## Deploying a Chart from a Public Helm Repository

### Example 1: Prometheus Stack

```yaml
# prometheus-stack-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kube-prometheus-stack
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 56.6.2  # Pin to a specific version
    helm:
      releaseName: kube-prometheus-stack
      values: |
        grafana:
          enabled: true
          adminPassword: admin
        prometheus:
          prometheusSpec:
            retention: 30d
            storageSpec:
              volumeClaimTemplate:
                spec:
                  accessModes: ["ReadWriteOnce"]
                  resources:
                    requests:
                      storage: 50Gi
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

### Example 2: NGINX Ingress Controller

```yaml
# nginx-ingress-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-ingress
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://kubernetes.github.io/ingress-nginx
    chart: ingress-nginx
    targetRevision: 4.9.1
    helm:
      releaseName: ingress-nginx
      values: |
        controller:
          replicaCount: 2
          service:
            type: LoadBalancer
          metrics:
            enabled: true
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: ingress-nginx
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Example 3: cert-manager

```yaml
# cert-manager-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.jetstack.io
    chart: cert-manager
    targetRevision: v1.14.3
    helm:
      releaseName: cert-manager
      parameters:
        - name: installCRDs
          value: "true"
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Key Differences Between Git and Helm Sources

When using a Helm repository, the Application spec differs from Git-based applications:

```yaml
# Git source - uses path
source:
  repoURL: https://github.com/org/repo.git
  path: charts/my-chart
  targetRevision: main

# Helm repo source - uses chart name
source:
  repoURL: https://charts.bitnami.com/bitnami
  chart: postgresql
  targetRevision: 14.2.3  # This is the chart version, not a Git ref
```

With Helm repositories, `targetRevision` refers to the chart version, not a Git branch or tag. And you use `chart` instead of `path` to specify which chart to install.

## Using Helm Values from Git with Multi-Source

A powerful pattern is combining a public Helm chart with custom values stored in your Git repository:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-with-custom-values
  namespace: argocd
spec:
  project: default
  sources:
    - repoURL: https://prometheus-community.github.io/helm-charts
      chart: kube-prometheus-stack
      targetRevision: 56.6.2
      helm:
        releaseName: kube-prometheus-stack
        valueFiles:
          - $values/monitoring/prometheus/values.yaml
    - repoURL: https://github.com/my-org/k8s-config.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
```

This separates the chart (from the public repo) from your custom configuration (from your Git repo), giving you the best of both worlds.

## Version Pinning Best Practices

Always pin Helm chart versions in production:

```yaml
# Good - pinned to specific version
targetRevision: 56.6.2

# Risky - tracks latest minor version
targetRevision: 56.*

# Dangerous - always uses latest
targetRevision: "*"
```

You can use semantic version ranges, but for production deployments, pinning to an exact version is recommended. Update versions deliberately through pull requests, not automatically.

## Checking Available Chart Versions

```bash
# List available versions of a chart
argocd repo get https://prometheus-community.github.io/helm-charts

# Or use helm CLI for more detail
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm search repo prometheus-community/kube-prometheus-stack --versions | head -20
```

## Troubleshooting

### "chart not found" Error

```bash
# Verify the repository is registered
argocd repo list | grep helm

# Check the exact chart name
helm repo update
helm search repo prometheus-community/ | grep kube-prometheus
```

### Slow Index Downloads

Large repositories like Bitnami have huge `index.yaml` files. This can cause timeouts:

```yaml
# Increase timeout for Helm operations
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  timeout.reconciliation: 300s
```

### Repository Index Stale

ArgoCD caches the Helm repository index. Force a refresh:

```bash
argocd repo get https://prometheus-community.github.io/helm-charts --refresh
```

Public Helm repositories are the backbone of community Kubernetes tooling. With ArgoCD managing them, you get version control, audit trails, and automated sync for all your infrastructure components. For more on deploying Helm charts with ArgoCD, see the [comprehensive Helm deployment guide](https://oneuptime.com/blog/post/2026-01-25-deploy-helm-charts-argocd/view).
