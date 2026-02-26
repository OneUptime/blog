# How to Handle GitOps Anti-Patterns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Best Practices, DevOps

Description: Identify and fix common GitOps anti-patterns including secret sprawl, environment drift, monorepo chaos, and broken reconciliation loops in ArgoCD deployments.

---

GitOps promises a clean, declarative approach to managing Kubernetes infrastructure. But in practice, teams often fall into patterns that undermine the very benefits GitOps is supposed to provide. These anti-patterns create technical debt, security risks, and operational headaches that make teams question whether GitOps was worth adopting in the first place.

I have seen every one of these anti-patterns in production environments. Here is how to identify them and what to do about each one.

## Anti-Pattern 1: Storing Secrets in Git

This is the most dangerous anti-pattern and it happens more often than you think. A developer commits a Kubernetes Secret to the GitOps repository because "it is just the staging password" or "I'll rotate it later":

```yaml
# DO NOT DO THIS
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
type: Opaque
data:
  # Base64 is NOT encryption
  password: cGFzc3dvcmQxMjM=
```

Base64 encoding is not encryption. Anyone with read access to the repository can decode the secret. Even after you remove the secret from the current branch, it remains in Git history forever.

**The fix**: Use external secrets management:

```yaml
# Use External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: database-credentials
  data:
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
```

Alternatively, use Sealed Secrets which encrypt the values so they are safe to commit to Git:

```bash
# Create a sealed secret - safe to commit
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
```

## Anti-Pattern 2: Manual kubectl Changes Alongside GitOps

This is the "just this once" syndrome. A developer needs to fix a production issue quickly and runs `kubectl edit deployment` instead of going through Git. The change works, ArgoCD detects drift, and one of two things happens:

1. If self-heal is enabled, ArgoCD reverts the change and the fix is lost.
2. If self-heal is disabled, the cluster drifts from Git and nobody knows what is actually running.

**The fix**: Enable self-heal and train the team that all changes go through Git:

```yaml
syncPolicy:
  automated:
    selfHeal: true
    prune: true
```

For legitimate emergency operations, use ArgoCD's sync hooks or create a documented escape hatch process:

```yaml
# Emergency hotfix process
# 1. Create a hotfix branch
# 2. Make the change in Git
# 3. Push and create a PR
# 4. ArgoCD syncs the change
# 5. Merge the PR when stable
```

The key is making the Git path fast enough that it is not significantly slower than kubectl.

## Anti-Pattern 3: One Giant Repository for Everything

Teams sometimes put everything - application code, Kubernetes manifests, Helm charts, infrastructure configuration - in a single monorepo without clear structure:

```
# Anti-pattern: Unstructured monorepo
repo/
  app1/
    src/
    Dockerfile
    deployment.yaml
  app2/
    src/
    deployment.yaml
  terraform/
  scripts/
  random-yaml/
```

This causes multiple problems:
- ArgoCD watches the entire repo and gets triggered by unrelated changes
- RBAC is difficult because different teams need access to different parts
- Repository size grows uncontrollably, slowing down clone operations

**The fix**: Separate application code from deployment configuration:

```
# Application code repo (triggers CI)
app-code-repo/
  src/
  tests/
  Dockerfile

# Deployment configuration repo (triggers ArgoCD)
gitops-repo/
  apps/
    app1/
      base/
        deployment.yaml
        service.yaml
      overlays/
        dev/
        staging/
        production/
    app2/
      base/
      overlays/
  infrastructure/
    monitoring/
    logging/
```

The CI pipeline builds the application, creates a container image, and then updates the image tag in the GitOps repository. ArgoCD only watches the GitOps repository.

## Anti-Pattern 4: Ignoring Differences Instead of Fixing Them

When ArgoCD reports differences between desired and live state, teams sometimes suppress the warnings by adding ignore rules rather than fixing the root cause:

```yaml
# Anti-pattern: Ignoring everything that diffs
spec:
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas
    - /spec/template/metadata/annotations
    - /spec/template/spec/containers/0/resources
    - /spec/template/spec/containers/0/env
```

Ignoring legitimate differences hides real drift. The resource limits you thought were in production might have been changed by someone months ago.

**The fix**: Only ignore differences that are genuinely managed by other systems:

```yaml
spec:
  ignoreDifferences:
  # HPA manages replicas - legitimate ignore
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas
  # Mutating webhook adds sidecar - legitimate ignore
  - group: apps
    kind: Deployment
    jqPathExpressions:
    - '.spec.template.spec.containers[] | select(.name == "istio-proxy")'
```

Document why each ignore rule exists. If you cannot explain why a difference should be ignored, fix it instead.

## Anti-Pattern 5: No Environment Promotion Strategy

Some teams deploy to all environments simultaneously from the same Git branch, or worse, manually cherry-pick changes between environment branches:

```
# Anti-pattern: Same branch for all environments
main branch --> deploys to dev, staging, AND production simultaneously
```

**The fix**: Implement a structured promotion strategy. Use directory-based environment separation with Kustomize overlays:

```yaml
# ApplicationSet with environment promotion
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
spec:
  generators:
  - list:
      elements:
      - environment: dev
        cluster: dev-cluster
        autoSync: "true"
      - environment: staging
        cluster: staging-cluster
        autoSync: "true"
      - environment: production
        cluster: prod-cluster
        autoSync: "false"  # Manual sync for production
  template:
    spec:
      source:
        path: 'apps/my-app/overlays/{{environment}}'
      destination:
        server: '{{cluster}}'
      syncPolicy:
        automated:
          prune: '{{autoSync}}'
```

Changes flow through environments in order. Production requires manual approval.

## Anti-Pattern 6: No Health Checks on Applications

Teams sometimes deploy ArgoCD applications without custom health checks, relying on the default "resource exists" health assessment:

```yaml
# Anti-pattern: No health check - assumes healthy if pods exist
spec:
  source:
    path: apps/my-app
  # No health check configuration
```

**The fix**: Define custom health checks that verify the application is actually working:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.apps_Deployment: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.availableReplicas ~= nil then
        if obj.status.availableReplicas == obj.status.replicas then
          hs.status = "Healthy"
          hs.message = "All replicas available"
        else
          hs.status = "Progressing"
          hs.message = "Waiting for replicas"
        end
      end
    end
    return hs
```

## Anti-Pattern 7: Overly Aggressive Auto-Sync

Enabling automated sync with prune and self-heal on every application without consideration is dangerous:

```yaml
# Anti-pattern: Full auto-pilot on everything
syncPolicy:
  automated:
    prune: true
    selfHeal: true
  retry:
    limit: -1  # Infinite retries
```

If a misconfiguration is committed to Git, ArgoCD will enthusiastically deploy it to production and keep retrying if it fails.

**The fix**: Use graduated sync policies:

```yaml
# Development: Full auto
syncPolicy:
  automated:
    prune: true
    selfHeal: true

# Staging: Auto-sync but no auto-prune
syncPolicy:
  automated:
    selfHeal: true

# Production: Manual sync required
syncPolicy:
  syncOptions:
  - Validate=true
  - CreateNamespace=false
```

For monitoring these anti-patterns across your deployments, [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-outofsync-applications/view) can alert you when applications are consistently out of sync or experiencing repeated sync failures.

## Summary

GitOps anti-patterns undermine the benefits of declarative infrastructure management. The most critical ones to address are: never store secrets in Git, enforce all changes through Git (not kubectl), separate application code from deployment configuration, only ignore differences with documented justification, implement proper environment promotion, add health checks to all applications, and use graduated sync policies across environments. Addressing these anti-patterns is an ongoing process, not a one-time cleanup. Build team habits and automated guardrails that prevent anti-patterns from recurring.
