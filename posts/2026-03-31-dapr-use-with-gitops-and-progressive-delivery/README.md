# How to Use Dapr with GitOps and Progressive Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GitOps, Progressive Delivery, Argo CD, Flux

Description: Learn how to manage Dapr component configuration with GitOps using Argo CD or Flux, and how to implement progressive delivery for Dapr-enabled services with Argo Rollouts.

---

GitOps treats infrastructure and configuration as code stored in Git. For Dapr deployments, this means component YAML, resiliency policies, and app deployments are all managed through Git pull requests with automated sync to clusters.

## GitOps Repository Structure

Organize your GitOps repository with Dapr configuration clearly separated:

```text
gitops/
  components/               # Dapr component definitions
    base/
      statestore.yaml
      pubsub.yaml
      secretstore.yaml
      resiliency.yaml
    overlays/
      staging/
      production/
  apps/                     # Application deployments
    order-service/
      deployment.yaml
      service.yaml
      subscription.yaml
  config/                   # Dapr Configuration resources
    dapr-config.yaml
```

## Setting Up Argo CD for Dapr

Install Argo CD and configure it to sync Dapr components:

```bash
# Install Argo CD
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Create an Application resource for Dapr components:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dapr-components
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops.git
    targetRevision: main
    path: components/overlays/production
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

## Flux for Dapr Component Management

Using Flux, define a Kustomization to sync Dapr components:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: dapr-components
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: gitops-repo
  path: ./components/overlays/production
  prune: true
  healthChecks:
    - apiVersion: dapr.io/v1alpha1
      kind: Component
      name: statestore
      namespace: production
```

## Progressive Delivery for Dapr Services

Use Argo Rollouts to implement canary deployments for Dapr-enabled services:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: order-service
spec:
  replicas: 10
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
        - name: order-service
          image: myrepo/order-service:2.0.0
  strategy:
    canary:
      steps:
        - setWeight: 10      # 10% canary
        - pause: {duration: 5m}
        - setWeight: 50      # 50% canary
        - pause: {duration: 5m}
        - setWeight: 100     # full rollout
      analysis:
        templates:
          - templateName: dapr-error-rate
        startingStep: 1
```

Define an analysis template based on Dapr metrics:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: dapr-error-rate
spec:
  metrics:
    - name: dapr-error-rate
      successCondition: result[0] < 0.01
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(dapr_http_server_request_count{status=~"5..",app_id="order-service"}[5m]))
            /
            sum(rate(dapr_http_server_request_count{app_id="order-service"}[5m]))
```

## Validating Component Changes via GitOps

Add a CI validation step before merging component changes:

```bash
# .github/workflows/validate-dapr-components.yml
- name: Validate Dapr Components
  run: |
    kustomize build components/overlays/staging | \
      kubectl apply --dry-run=server -f -
```

## Summary

GitOps with Dapr means storing all component YAML, resiliency policies, and Configuration resources in Git and syncing them via Argo CD or Flux. Progressive delivery using Argo Rollouts enables canary deployments for Dapr-enabled services with automatic analysis based on Dapr sidecar metrics from Prometheus.
