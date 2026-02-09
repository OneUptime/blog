# How to implement Kustomize with ArgoCD for GitOps deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, ArgoCD, GitOps

Description: Master the integration of Kustomize with ArgoCD to implement GitOps workflows for automated, declarative Kubernetes deployments with full audit trails.

---

ArgoCD and Kustomize complement each other perfectly in GitOps workflows. While Kustomize handles configuration management and environment-specific customizations, ArgoCD automates deployment and ensures your cluster state matches what's defined in Git. Together, they provide a complete GitOps solution with version control, automation, and observability.

This integration eliminates manual kubectl commands and provides a clear audit trail of all changes. Every deployment becomes a Git commit, every rollback is a Git revert, and every configuration lives in version control where it can be reviewed and tested before reaching production.

## Basic ArgoCD application with Kustomize

Create an ArgoCD Application that uses a Kustomize directory:

```yaml
# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/myapp-config
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

ArgoCD monitors the repository and automatically applies changes when commits update the kustomization. The automated sync policy keeps your cluster synchronized with Git.

## Directory structure for ArgoCD integration

Organize your repository to support multiple applications and environments:

```
config-repo/
├── apps/
│   ├── webapp/
│   │   ├── base/
│   │   │   ├── kustomization.yaml
│   │   │   ├── deployment.yaml
│   │   │   └── service.yaml
│   │   └── overlays/
│   │       ├── development/
│   │       ├── staging/
│   │       └── production/
│   └── api/
│       ├── base/
│       └── overlays/
└── argocd/
    ├── webapp-dev.yaml
    ├── webapp-staging.yaml
    └── webapp-prod.yaml
```

Each ArgoCD Application points to a specific overlay directory. This separation allows different sync policies and deployment schedules per environment.

## Environment-specific ArgoCD applications

Create separate applications for each environment with appropriate configurations:

```yaml
# argocd/webapp-production.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: webapp-production
  namespace: argocd
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: production-alerts
spec:
  project: production
  source:
    repoURL: https://github.com/example/config
    targetRevision: release-v2.1
    path: apps/webapp/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

```yaml
# argocd/webapp-development.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: webapp-development
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/config
    targetRevision: HEAD
    path: apps/webapp/overlays/development
  destination:
    server: https://kubernetes.default.svc
    namespace: development
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Production uses a specific release branch and notifies on changes, while development tracks HEAD for rapid iteration.

## Using Kustomize build options in ArgoCD

Configure Kustomize build options in the Application spec:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
spec:
  source:
    repoURL: https://github.com/example/config
    path: overlays/production
    kustomize:
      namePrefix: prod-
      nameSuffix: -v2
      commonLabels:
        environment: production
      commonAnnotations:
        managed-by: argocd
      images:
      - name: webapp
        newTag: v2.1.5
```

These options apply during ArgoCD's kustomize build, overriding values in the kustomization.yaml. This is useful for promoting specific versions through environments without modifying Git.

## Image updater integration

Use ArgoCD Image Updater to automate image version updates:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: webapp-staging
  annotations:
    argocd-image-updater.argoproj.io/image-list: webapp=registry.example.com/webapp
    argocd-image-updater.argoproj.io/webapp.update-strategy: latest
    argocd-image-updater.argoproj.io/write-back-method: git
spec:
  source:
    repoURL: https://github.com/example/config
    path: overlays/staging
```

Image Updater monitors the registry and automatically updates the kustomization when new images are available. Changes commit back to Git, maintaining GitOps principles.

## Multi-source applications

Combine multiple Kustomize bases or add Helm charts alongside Kustomize:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: full-stack
spec:
  sources:
  - repoURL: https://github.com/example/app-config
    path: overlays/production
    targetRevision: main
  - repoURL: https://github.com/example/shared-bases
    path: monitoring
    targetRevision: v1.0.0
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

ArgoCD builds and merges resources from multiple sources, enabling composition of configurations from different repositories.

## Sync waves for ordered deployment

Use sync waves to control deployment order:

```yaml
# base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "0"
```

```yaml
# base/database.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

```yaml
# base/application.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  annotations:
    argocd.argoproj.io/sync-wave: "2"
```

Resources deploy in wave order, ensuring namespaces exist before resources, and databases start before applications.

## Health checks and sync status

Configure custom health checks for your resources:

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations: |
    apps/Deployment:
      health.lua: |
        hs = {}
        if obj.status ~= nil then
          if obj.status.updatedReplicas == obj.spec.replicas then
            hs.status = "Healthy"
            hs.message = "All replicas are updated"
            return hs
          end
        end
        hs.status = "Progressing"
        hs.message = "Waiting for rollout to finish"
        return hs
```

Custom health checks ensure ArgoCD accurately reports application status based on your specific criteria.

## Automated PR-based workflows

Create preview environments for pull requests:

```yaml
# .github/workflows/preview.yml
name: Create Preview Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Create preview overlay
      run: |
        PR_NUMBER=${{ github.event.pull_request.number }}
        mkdir -p overlays/preview-pr-${PR_NUMBER}

        cat > overlays/preview-pr-${PR_NUMBER}/kustomization.yaml <<EOF
        apiVersion: kustomize.config.k8s.io/v1beta1
        kind: Kustomization
        namespace: preview-pr-${PR_NUMBER}
        namePrefix: pr-${PR_NUMBER}-
        bases:
        - ../../base
        images:
        - name: webapp
          newTag: pr-${PR_NUMBER}
        EOF

    - name: Create ArgoCD Application
      run: |
        PR_NUMBER=${{ github.event.pull_request.number }}
        kubectl apply -f - <<EOF
        apiVersion: argoproj.io/v1alpha1
        kind: Application
        metadata:
          name: webapp-preview-pr-${PR_NUMBER}
          namespace: argocd
        spec:
          project: previews
          source:
            repoURL: https://github.com/example/config
            path: overlays/preview-pr-${PR_NUMBER}
            targetRevision: ${{ github.head_ref }}
          destination:
            server: https://kubernetes.default.svc
            namespace: preview-pr-${PR_NUMBER}
          syncPolicy:
            automated:
              prune: true
        EOF

    - name: Comment preview URL
      uses: actions/github-script@v6
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: 'Preview environment: https://pr-${{ github.event.pull_request.number }}.preview.example.com'
          })
```

Each PR gets its own namespace and deployment, enabling testing before merging to main.

## Progressive delivery with Argo Rollouts

Integrate Kustomize-managed Rollouts with ArgoCD:

```yaml
# base/rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: webapp
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 10m}
      - setWeight: 100
  template:
    spec:
      containers:
      - name: webapp
        image: webapp:v2.0.0
```

ArgoCD monitors Rollout status and reports deployment health through the progressive delivery process.

## Secrets management with external sources

Combine Kustomize with external secret operators:

```yaml
# base/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-credentials
  data:
  - secretKey: password
    remoteRef:
      key: production/database/password
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- external-secret.yaml
```

ArgoCD deploys the ExternalSecret, which triggers the operator to fetch actual secrets from your secret store.

## Monitoring ArgoCD sync status

Create dashboards and alerts for sync health:

```yaml
# PrometheusRule for ArgoCD
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-alerts
spec:
  groups:
  - name: argocd
    rules:
    - alert: ArgoAppOutOfSync
      expr: |
        argocd_app_info{sync_status="OutOfSync"} > 0
      for: 10m
      annotations:
        summary: "ArgoCD application out of sync"
    - alert: ArgoAppSyncFailed
      expr: |
        argocd_app_sync_total{phase="Failed"} > 0
      annotations:
        summary: "ArgoCD sync failed"
```

Monitor these metrics to ensure your GitOps pipeline operates correctly.

## Best practices for ArgoCD and Kustomize

Structure repositories with clear separation between applications and environments. This makes it easy to understand what deploys where.

Use separate ArgoCD projects for different teams or security boundaries. Projects enforce resource restrictions and provide multi-tenancy.

Enable auto-sync for non-production environments to get fast feedback. Use manual sync approval for production deployments requiring human oversight.

Tag releases in Git and point production ArgoCD applications at tags instead of branches. This provides stable, auditable production deployments.

Implement comprehensive monitoring of ArgoCD itself. Your GitOps pipeline is critical infrastructure that needs observability.

## Conclusion

Combining Kustomize with ArgoCD creates a powerful GitOps platform where Git is the single source of truth for your Kubernetes configurations. Kustomize handles the complexity of multi-environment configurations while ArgoCD automates deployment and maintains desired state.

This approach provides full auditability through Git history, automated synchronization between Git and clusters, and declarative management of all your Kubernetes resources. Whether you're running a single cluster or a global multi-cluster deployment, the Kustomize and ArgoCD combination scales to meet your needs while maintaining simplicity and reliability.
