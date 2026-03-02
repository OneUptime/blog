# How to Create Per-Environment Applications with ArgoCD ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSet, Multi-Environment

Description: Learn how to use ArgoCD ApplicationSets to automatically generate separate application instances for each environment like dev, staging, and production.

---

Most applications need to run in multiple environments - development, staging, and production at a minimum. Traditionally, you would create separate ArgoCD Application manifests for each environment, leading to duplicated YAML that drifts over time. ApplicationSets solve this by generating one Application per environment from a single definition.

This guide covers multiple approaches to per-environment ApplicationSets, from simple list generators to more dynamic patterns that scale.

## Simple List Generator Approach

The most straightforward way to create per-environment applications is with a list generator containing one element per environment.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-per-env
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            cluster: https://dev.example.com
            namespace: myapp-dev
            targetRevision: develop
            values_file: values-dev.yaml
          - env: staging
            cluster: https://staging.example.com
            namespace: myapp-staging
            targetRevision: release
            values_file: values-staging.yaml
          - env: production
            cluster: https://prod.example.com
            namespace: myapp
            targetRevision: main
            values_file: values-prod.yaml
  template:
    metadata:
      name: 'myapp-{{env}}'
      labels:
        app: myapp
        env: '{{env}}'
    spec:
      project: '{{env}}'
      source:
        repoURL: https://github.com/myorg/myapp.git
        targetRevision: '{{targetRevision}}'
        path: deploy
        helm:
          valueFiles:
            - '{{values_file}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

This creates three applications: `myapp-dev`, `myapp-staging`, and `myapp-production`, each pointing to its own cluster, branch, and values file.

## Kustomize Overlay Approach

If you use Kustomize with a base and per-environment overlays, the Git directory generator maps naturally.

```
manifests/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
  overlays/
    dev/
      kustomization.yaml
      patches.yaml
    staging/
      kustomization.yaml
      patches.yaml
    production/
      kustomization.yaml
      patches.yaml
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-kustomize-envs
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/myapp.git
        revision: HEAD
        directories:
          - path: 'manifests/overlays/*'
  template:
    metadata:
      name: 'myapp-{{path.basename}}'
      labels:
        app: myapp
        env: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/myapp.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: 'myapp-{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

When you add a new overlay directory (e.g., `manifests/overlays/qa`), a new Application is automatically created.

## Git File Generator with Environment Config

For more complex configurations, use the Git file generator with per-environment config files.

```
config/
  dev.json
  staging.json
  production.json
```

Each config file contains environment-specific parameters:

```json
{
  "env": "dev",
  "cluster": "https://dev.example.com",
  "replicas": 1,
  "domain": "dev.myapp.example.com",
  "resources_cpu": "100m",
  "resources_memory": "256Mi",
  "autoscaling_enabled": "false"
}
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-from-config
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/myapp.git
        revision: HEAD
        files:
          - path: 'config/*.json'
  template:
    metadata:
      name: 'myapp-{{env}}'
      labels:
        app: myapp
        env: '{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/myapp.git
        targetRevision: HEAD
        path: deploy
        helm:
          parameters:
            - name: replicaCount
              value: '{{replicas}}'
            - name: ingress.host
              value: '{{domain}}'
            - name: resources.requests.cpu
              value: '{{resources_cpu}}'
            - name: resources.requests.memory
              value: '{{resources_memory}}'
            - name: autoscaling.enabled
              value: '{{autoscaling_enabled}}'
      destination:
        server: '{{cluster}}'
        namespace: 'myapp-{{env}}'
      syncPolicy:
        automated:
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Matrix Generator for Multiple Apps Across Environments

When you have multiple services that all need to be deployed to every environment, the matrix generator avoids duplicating the environment list.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services-per-env
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - matrix:
        generators:
          # Environments
          - list:
              elements:
                - env: dev
                  cluster: https://dev.example.com
                  branch: develop
                - env: staging
                  cluster: https://staging.example.com
                  branch: release
                - env: production
                  cluster: https://prod.example.com
                  branch: main
          # Services
          - list:
              elements:
                - service: api-gateway
                - service: user-service
                - service: order-service
                - service: notification-service
  template:
    metadata:
      name: '{{.service}}-{{.env}}'
      labels:
        service: '{{.service}}'
        env: '{{.env}}'
    spec:
      project: '{{.env}}'
      source:
        repoURL: https://github.com/myorg/microservices.git
        targetRevision: '{{.branch}}'
        path: 'services/{{.service}}'
        helm:
          valueFiles:
            - values.yaml
            - 'values-{{.env}}.yaml'
      destination:
        server: '{{.cluster}}'
        namespace: '{{.service}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

This creates 12 applications (4 services x 3 environments) from a single ApplicationSet.

## Environment-Specific Sync Policies

Different environments typically need different sync policies. Go templates make this easy.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: smart-env-apps
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - list:
        elements:
          - env: dev
            cluster: https://dev.example.com
            auto_sync: "true"
            prune: "true"
          - env: staging
            cluster: https://staging.example.com
            auto_sync: "true"
            prune: "true"
          - env: production
            cluster: https://prod.example.com
            auto_sync: "false"
            prune: "false"
  template:
    metadata:
      name: 'webapp-{{.env}}'
      labels:
        env: '{{.env}}'
      annotations:
        # Different notification channels per environment
        notifications.argoproj.io/subscribe.on-sync-succeeded.slack: '{{.env}}-deploys'
        notifications.argoproj.io/subscribe.on-sync-failed.slack: '{{if eq .env "production"}}prod-incidents{{else}}{{.env}}-deploys{{end}}'
    spec:
      project: '{{.env}}'
      source:
        repoURL: https://github.com/myorg/webapp.git
        targetRevision: '{{if eq .env "production"}}main{{else if eq .env "staging"}}release{{else}}develop{{end}}'
        path: deploy
        helm:
          valueFiles:
            - 'values-{{.env}}.yaml'
      destination:
        server: '{{.cluster}}'
        namespace: webapp
      syncPolicy:
        {{- if eq .auto_sync "true"}}
        automated:
          prune: {{.prune}}
          selfHeal: true
        {{- end}}
        syncOptions:
          - CreateNamespace=true
        retry:
          limit: {{if eq .env "production"}}5{{else}}3{{end}}
          backoff:
            duration: 30s
            factor: 2
            maxDuration: 5m
```

## Progressive Rollout Across Environments

Combine per-environment generation with progressive syncs for safe rollouts.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: progressive-env-rollout
  namespace: argocd
spec:
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: env
              operator: In
              values: [dev]
        - matchExpressions:
            - key: env
              operator: In
              values: [staging]
        - matchExpressions:
            - key: env
              operator: In
              values: [production]
  generators:
    - list:
        elements:
          - env: dev
            cluster: https://dev.example.com
          - env: staging
            cluster: https://staging.example.com
          - env: production
            cluster: https://prod.example.com
  template:
    metadata:
      name: 'myservice-{{env}}'
      labels:
        env: '{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/myservice.git
        targetRevision: HEAD
        path: 'overlays/{{env}}'
      destination:
        server: '{{cluster}}'
        namespace: myservice
      syncPolicy:
        automated:
          selfHeal: true
```

Changes first deploy to dev. Only after dev is healthy does staging sync. Production waits for staging to be healthy. A failure at any stage halts the progression.

## Verifying Per-Environment Setup

```bash
# List all generated applications
argocd appset get myapp-per-env

# Check environment-specific applications
argocd app list -l env=production
argocd app list -l env=staging
argocd app list -l env=dev

# Verify sync status per environment
argocd app list -l app=myapp -o wide
```

Per-environment ApplicationSets eliminate the toil of maintaining duplicate manifests while preserving full control over environment-specific configurations. For monitoring your applications across all environments, [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-label-selectors/view) provides unified visibility and alerting.
