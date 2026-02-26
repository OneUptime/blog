# ArgoCD Best Practices for Application Design

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Application Architecture, DevOps

Description: Learn how to design ArgoCD applications for maintainability including granularity decisions, resource grouping, sync strategies, health checks, and lifecycle management patterns.

---

How you design your ArgoCD applications - what resources you group together, how you configure sync behavior, what health checks you define - has a massive impact on your day-to-day operational experience. Poor application design leads to slow syncs, confusing deployments, and debugging nightmares. Good application design makes your GitOps workflow predictable and manageable.

This guide covers the key decisions and best practices for designing ArgoCD applications that work well at any scale.

## Application granularity: how much goes in one application

The biggest design decision is what resources belong in a single ArgoCD application. There are three approaches:

### Fine-grained: one application per microservice

```yaml
# Each microservice is its own ArgoCD application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-user-service
spec:
  source:
    path: manifests/user-service/overlays/production
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-order-service
spec:
  source:
    path: manifests/order-service/overlays/production
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-payment-service
spec:
  source:
    path: manifests/payment-service/overlays/production
```

**Pros:** Independent sync, clear ownership, easy rollback per service
**Cons:** Many applications to manage, no atomic cross-service deploys
**Best for:** Microservice architectures where services deploy independently

### Coarse-grained: one application per domain

```yaml
# Group related services together
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-payment-platform
spec:
  source:
    path: manifests/payment-platform/overlays/production
    # Contains: payment-api, payment-processor, payment-webhook
```

**Pros:** Fewer applications, atomic deploys for related services
**Cons:** Slower syncs, one service failure blocks the whole group
**Best for:** Tightly coupled services that always deploy together

### Layered: separate infrastructure from application workloads

```yaml
# Layer 1: Cluster infrastructure
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-infrastructure
spec:
  source:
    path: infrastructure/production
    # Contains: namespaces, RBAC, network policies, resource quotas
---
# Layer 2: Shared platform services
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-platform
spec:
  source:
    path: platform/production
    # Contains: ingress controller, cert-manager, monitoring
---
# Layer 3: Application workloads (one per service)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-user-service
spec:
  source:
    path: manifests/user-service/overlays/production
```

**Best for:** Most organizations. Separates concerns and allows different sync policies per layer.

## Sync policy design

Choose sync policies based on the application's risk level:

### Low-risk applications (dev, staging)

```yaml
syncPolicy:
  automated:
    selfHeal: true    # Auto-revert manual changes
    prune: true       # Auto-delete removed resources
  retry:
    limit: 5          # Retry failed syncs
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m
```

### High-risk applications (production)

```yaml
syncPolicy:
  # No automated sync - require manual trigger or CI pipeline
  syncOptions:
    - Prune=false           # Never auto-prune in production
    - ApplyOutOfSyncOnly=true  # Only apply changed resources
    - ServerSideApply=true     # Use server-side apply for better conflict handling
    - CreateNamespace=true
```

### Infrastructure applications

```yaml
syncPolicy:
  automated:
    selfHeal: true    # Critical: infra must always match desired state
    prune: false      # Never auto-prune infrastructure resources
  syncOptions:
    - ServerSideApply=true
    - RespectIgnoreDifferences=true
```

## Resource grouping patterns

### Group by lifecycle

Resources that are created, updated, and deleted together should be in the same application:

```
# Good: These are always deployed together
user-service/
  deployment.yaml
  service.yaml
  configmap.yaml
  hpa.yaml
  pdb.yaml
  service-monitor.yaml

# Bad: Mixing different lifecycles
everything/
  user-deployment.yaml      # Changes weekly
  postgres-statefulset.yaml # Changes rarely
  monitoring-stack.yaml     # Changes monthly
```

### Separate stateful from stateless

Databases and stateful services should be separate applications from the stateless services that use them:

```yaml
# Stateless application - can be freely synced, rolled back
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-api
spec:
  source:
    path: manifests/api/overlays/production
  syncPolicy:
    automated:
      selfHeal: true

---
# Stateful application - sync with extreme care
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-database
spec:
  source:
    path: manifests/database/overlays/production
  syncPolicy:
    # Manual sync only for databases
    syncOptions:
      - Prune=false
      - Replace=false
```

### Use sync waves for dependency ordering

When resources within an application have dependencies, use sync waves:

```yaml
# Namespace first (wave -1)
apiVersion: v1
kind: Namespace
metadata:
  name: my-service
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
# ConfigMap and Secrets before Deployment (wave 0)
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  annotations:
    argocd.argoproj.io/sync-wave: "0"

---
# Deployment after config is ready (wave 1)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  annotations:
    argocd.argoproj.io/sync-wave: "1"

---
# HPA after Deployment exists (wave 2)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-service
  annotations:
    argocd.argoproj.io/sync-wave: "2"
```

## Health check configuration

Define meaningful health checks so ArgoCD accurately reports application status:

### Custom health for CRDs

```lua
-- Custom health check for a Certificate resource
hs = {}
if obj.status ~= nil then
  if obj.status.conditions ~= nil then
    for i, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" and condition.status == "True" then
        hs.status = "Healthy"
        hs.message = condition.message
        return hs
      end
      if condition.type == "Ready" and condition.status == "False" then
        hs.status = "Degraded"
        hs.message = condition.message
        return hs
      end
    end
  end
end
hs.status = "Progressing"
hs.message = "Waiting for certificate to be ready"
return hs
```

### Ignore differences for fields you do not control

```yaml
spec:
  ignoreDifferences:
    # Ignore fields set by mutating webhooks
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/template/metadata/annotations/sidecar.istio.io~1inject

    # Ignore auto-generated fields
    - group: ""
      kind: Service
      jsonPointers:
        - /spec/clusterIP
        - /spec/clusterIPs

    # Ignore fields managed by controllers
    - group: autoscaling
      kind: HorizontalPodAutoscaler
      jsonPointers:
        - /spec/metrics/0/resource/target/averageValue

    # Ignore status fields on CRDs
    - group: cert-manager.io
      kind: Certificate
      jsonPointers:
        - /status
```

## Naming conventions

Consistent naming prevents confusion:

```yaml
# Pattern: <env>-<service-name>
# Examples:
metadata:
  name: prod-user-service
  # OR
  name: staging-payment-api
  # OR
  name: dev-order-worker

  labels:
    # Standard labels for filtering
    environment: production
    team: payments
    tier: backend
    app.kubernetes.io/part-of: payment-platform
```

## Annotation standards

Define a standard set of annotations for all applications:

```yaml
metadata:
  annotations:
    # Ownership and contact
    owner: payments-team@myorg.com
    slack-channel: "#payments-deploy"

    # Notification subscriptions
    notifications.argoproj.io/subscribe.on-sync-failed.slack: payments-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.slack: payments-alerts

    # Documentation links
    argocd.argoproj.io/link.docs: "https://wiki.myorg.com/payments/runbook"
    argocd.argoproj.io/link.dashboard: "https://grafana.myorg.com/d/payments"
```

## Handling configuration drift

Design applications to handle drift gracefully:

```yaml
spec:
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      # Use server-side apply to handle conflicts with other controllers
      - ServerSideApply=true
      # Respect ignore differences during sync
      - RespectIgnoreDifferences=true

  # Define what ArgoCD should ignore
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        # HPA changes replica count - do not fight it
        - /spec/replicas
```

## Application lifecycle patterns

### Blue-green application swaps

```yaml
# Two applications, one active
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-api-blue
  labels:
    slot: blue
    active: "true"
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-api-green
  labels:
    slot: green
    active: "false"
```

### Canary with Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-api
spec:
  source:
    path: manifests/api/overlays/production
    # Includes a Rollout resource instead of Deployment
  # Custom health check for Rollout
  # ArgoCD understands Rollout health status natively
```

## Testing application design

Before deploying to production, validate your application design:

```bash
# Dry-run sync to see what will happen
argocd app sync my-app --dry-run

# Preview diff
argocd app diff my-app

# Validate manifests locally
kustomize build manifests/my-service/overlays/production | kubectl apply --dry-run=server -f -
```

## Summary

Good ArgoCD application design starts with choosing the right granularity - one application per microservice for independent teams, grouped by domain for tightly coupled services, and layered for infrastructure versus application separation. Configure sync policies based on risk level, use sync waves for dependency ordering, separate stateful from stateless workloads, define meaningful health checks, establish consistent naming conventions, and handle configuration drift explicitly with ignoreDifferences. The time invested in application design pays dividends every time you deploy, debug, or roll back.
