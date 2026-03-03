# ArgoCD Best Practices for Small Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Best Practices, DevOps

Description: Practical ArgoCD best practices for small teams covering simple architecture, minimal overhead setup, repository structure, access control, and efficient workflow patterns.

---

Small teams have different constraints than enterprises. You probably have 2 to 10 engineers, a handful of services, and limited time for infrastructure overhead. ArgoCD can be incredibly powerful for small teams, but only if you keep things simple and avoid over-engineering.

This guide covers ArgoCD best practices specifically tailored for small teams where pragmatism beats perfection.

## Keep the architecture simple

Small teams do not need multi-cluster ArgoCD with sharded controllers and external Redis clusters. Start with the simplest architecture that works:

```yaml
# Single ArgoCD instance managing one cluster
# This is all most small teams need
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/infrastructure.git
    targetRevision: main
    path: argocd
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
```

**What you should NOT do as a small team:**
- Do not set up HA ArgoCD unless you have proven you need it
- Do not shard controllers unless you have hundreds of applications
- Do not set up external Redis unless you are hitting memory limits
- Do not deploy ArgoCD across multiple clusters unless you genuinely operate multiple clusters

**What you should do:**
- Install ArgoCD with the standard (non-HA) manifests
- Use the built-in Redis
- Start with the default project for everything
- Use the UI - it is actually good

## Use a monorepo for everything

With a small team, managing multiple Git repositories creates overhead that slows you down. Put everything in one repo:

```text
infrastructure/
  argocd/               # ArgoCD installation manifests
  apps/                 # Application definitions
    app-of-apps.yaml    # Parent application
    web-app.yaml
    api-server.yaml
    worker.yaml
  manifests/            # Kubernetes manifests for each service
    web-app/
      deployment.yaml
      service.yaml
      ingress.yaml
    api-server/
      deployment.yaml
      service.yaml
    worker/
      deployment.yaml
  environments/         # Environment-specific overrides (if needed)
    production/
      kustomization.yaml
    staging/
      kustomization.yaml
```

```yaml
# App-of-apps that manages everything
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/infrastructure.git
    targetRevision: main
    path: apps
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

## Enable auto-sync with self-healing

For a small team, you want deployments to happen automatically when code is merged. Do not make engineers manually click sync:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/infrastructure.git
    targetRevision: main
    path: manifests/web-app
  destination:
    server: https://kubernetes.default.svc
    namespace: web-app
  syncPolicy:
    automated:
      selfHeal: true   # Revert manual changes automatically
      prune: true       # Clean up removed resources
    syncOptions:
      - CreateNamespace=true  # Create namespace if it does not exist
```

Self-healing is critical for small teams because you do not have someone watching the cluster 24/7. If someone manually patches something in the cluster, ArgoCD reverts it to the Git state automatically.

## Keep RBAC simple

Do not create 15 roles for a 5-person team. Start with two roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Everyone on the team gets admin access
    # With a small team, trust and velocity matter more than restriction
    g, myorg:engineering, role:admin

  policy.default: role:readonly
  scopes: '[groups]'
```

If you need slightly more control:

```yaml
data:
  policy.csv: |
    # Engineers can do everything except delete production apps
    p, role:engineer, applications, *, */*, allow
    p, role:engineer, applications, delete, default/prod-*, deny

    # Map GitHub team to role
    g, myorg:engineering, role:engineer
```

The goal is to avoid RBAC becoming a bottleneck. In a small team, you should be able to deploy and debug without waiting for someone to grant permissions.

## Use Kustomize for environment differences

Kustomize is simpler than Helm for small teams. You get environment-specific configuration without the template complexity:

```yaml
# manifests/web-app/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml

# manifests/web-app/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - replica-count.yaml
images:
  - name: myorg/web-app
    newTag: staging-latest

# manifests/web-app/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - replica-count.yaml
  - resource-limits.yaml
images:
  - name: myorg/web-app
    newTag: v1.2.3
```

## Set up notifications early

Even with a small team, you need to know when deployments happen and when they fail. Set up Slack notifications on day one:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token

  # Keep it simple - one channel for everything
  defaultTriggers: |
    - on-sync-succeeded
    - on-sync-failed
    - on-health-degraded

  trigger.on-sync-succeeded: |
    - send: [sync-succeeded]
      when: app.status.operationState.phase in ['Succeeded']

  trigger.on-sync-failed: |
    - send: [sync-failed]
      when: app.status.operationState.phase in ['Error', 'Failed']

  trigger.on-health-degraded: |
    - send: [health-degraded]
      when: app.status.health.status == 'Degraded'

  template.sync-succeeded: |
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "{{ .app.metadata.name }} synced successfully",
          "text": "Revision: {{ .app.status.sync.revision | trunc 7 }}"
        }]

  template.sync-failed: |
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "title": "{{ .app.metadata.name }} sync FAILED",
          "text": "{{ .app.status.operationState.message }}"
        }]

  template.health-degraded: |
    slack:
      attachments: |
        [{
          "color": "#f4c030",
          "title": "{{ .app.metadata.name }} is degraded",
          "text": "Health: {{ .app.status.health.status }}"
        }]
```

Subscribe all applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: deployments
    notifications.argoproj.io/subscribe.on-health-degraded.slack: alerts
```

## Use Sealed Secrets for simplicity

For a small team, Sealed Secrets is the simplest approach to secrets management. You do not need HashiCorp Vault or AWS Secrets Manager:

```bash
# Install kubeseal CLI
brew install kubeseal

# Seal a secret
kubectl create secret generic my-app-secrets \
  --from-literal=DB_PASSWORD=secretvalue \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > manifests/web-app/sealed-secret.yaml

# Commit the sealed secret to Git
git add manifests/web-app/sealed-secret.yaml
git commit -m "Add web-app database credentials"
git push
```

Sealed Secrets can be safely stored in Git because they can only be decrypted by the controller running in your cluster.

## Automate image updates

Set up ArgoCD Image Updater so you do not have to manually update image tags after every build:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app
  annotations:
    argocd-image-updater.argoproj.io/image-list: web=myorg/web-app
    argocd-image-updater.argoproj.io/web.update-strategy: semver
    argocd-image-updater.argoproj.io/web.semver-constraint: ">=1.0.0"
    argocd-image-updater.argoproj.io/write-back-method: git
```

This means your CI pipeline builds and pushes images, and ArgoCD Image Updater automatically detects new versions and updates the deployment. No manual steps needed.

## Do not over-engineer from the start

Here is a simple checklist of what to implement now vs later:

**Implement now:**
- Single ArgoCD instance with standard install
- Monorepo with app-of-apps
- Auto-sync with self-healing
- Slack notifications
- Sealed Secrets
- Basic RBAC (one or two roles)

**Implement later (when you actually need it):**
- HA ArgoCD setup
- ApplicationSets
- Multiple projects with fine-grained RBAC
- External Secrets Operator or Vault
- Multiple clusters
- Custom health checks
- Config Management Plugins

The worst thing a small team can do is spend weeks building "enterprise-grade" infrastructure when you could have been shipping features. Start simple, add complexity only when you hit real problems.

## Summary

For small teams, ArgoCD best practices center on simplicity: use a monorepo, enable auto-sync, keep RBAC minimal, use Kustomize over Helm for environment management, set up notifications from day one, and resist the urge to over-engineer. The goal is to spend less time managing ArgoCD and more time building your product. Every additional layer of complexity needs to solve an actual problem you are experiencing, not a hypothetical one you might face someday.
