# How to Map ArgoCD Health Checks to Flux Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Health Check, Migration, GitOps, Kubernetes, Custom Resources

Description: Learn how to convert ArgoCD custom health check configurations to Flux CD health check specifications for accurate deployment readiness detection.

---

## Introduction

ArgoCD supports custom health check scripts written in Lua that evaluate the health of any Kubernetes resource, including custom resources from operators. Flux CD uses a simpler model: health checks reference specific Kubernetes resources and use their standard readiness conditions. For custom resources without standard conditions, Flux can use CEL-based health check expressions to evaluate the resource status.

Understanding how to translate ArgoCD's Lua health checks to Flux's health check configuration is essential for a complete migration.

## Prerequisites

- ArgoCD Applications with custom health checks to migrate
- Flux CD bootstrapped on the cluster
- Custom resources with health status fields

## Step 1: ArgoCD Health Check Model

ArgoCD health checks are Lua scripts configured in the `argocd-cm` ConfigMap:

```yaml
# argocd-cm ConfigMap with custom health checks

apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Custom health check for a Database CRD
  resource.customizations.health.example.com_Database: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Ready" then
        hs.status = "Healthy"
        hs.message = "Database is ready"
      elseif obj.status.phase == "Provisioning" then
        hs.status = "Progressing"
        hs.message = "Database is being provisioned"
      else
        hs.status = "Degraded"
        hs.message = obj.status.message
      end
    else
      hs.status = "Progressing"
      hs.message = "Status not yet available"
    end
    return hs
```

## Step 2: Flux Health Check Model

Flux CD's `healthChecks` field in Kustomization uses the health status of Kubernetes resources. For standard resources (Deployment, StatefulSet, DaemonSet), Flux knows how to evaluate readiness natively.

For custom resources, Flux checks:
1. If the resource exists
2. If the resource is compatible with the Kubernetes `kstatus` readiness conventions, such as a `Ready` condition

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  # Health checks for standard Kubernetes resources
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp
    - apiVersion: apps/v1
      kind: StatefulSet
      name: myapp-db
      namespace: myapp
  timeout: 5m
```

## Step 3: Custom Resource Health Checks

For CRDs that use the standard `status.conditions` pattern in a `kstatus`-compatible way, Flux health checks work automatically:

```yaml
# Custom resource that uses standard conditions
status:
  conditions:
    - type: Ready
      status: "True"
      reason: DatabaseProvisioned
      message: "Database is ready"
```

```yaml
# Flux health check for this CRD
healthChecks:
  - apiVersion: example.com/v1
    kind: Database
    name: production-db
    namespace: myapp
```

Flux will wait until `status.conditions[?(@.type=="Ready")].status == "True"`.

## Step 4: Handling Custom Resources Without Standard Conditions

For CRDs that use a `phase` or `state` field instead of `conditions`, define custom health check expressions with CEL:

```yaml
# Flux Kustomization with CEL health checks for a phase-based CRD
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: example.com/v1
      kind: Database
      name: production-db
      namespace: myapp
  healthCheckExprs:
    - apiVersion: example.com/v1
      kind: Database
      inProgress: status.phase == 'Provisioning'
      failed: status.phase == 'Failed'
      current: status.phase == 'Ready'
  timeout: 5m
```

## Step 5: Health Check for Helm Releases

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    # Check that the cert-manager HelmRelease reconciled
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: cert-manager
      namespace: cert-manager
    # Check a Certificate resource (standard conditions)
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: production-tls
      namespace: myapp
```

## Step 6: Validate Health Check Configuration

```bash
# Check that health checks are being evaluated
flux events --for Kustomization/myapp -n flux-system

# Check specific resource readiness
kubectl get deployment myapp -n myapp \
  -o jsonpath='{.status.conditions[?(@.type=="Available")].status}'

# For custom resources, check conditions
kubectl get database production-db -n myapp \
  -o jsonpath='{.status.conditions}'

# Watch Kustomizations wait for health
flux get kustomizations -n flux-system --watch
```

## Best Practices

- Prefer operators that implement the standard `status.conditions` pattern; Flux health checks work automatically for these.
- For operators that use non-standard status fields, use `healthCheckExprs`, or open an issue or PR with the operator to add standard condition support.
- Use `timeout` on Kustomizations to prevent health checks from blocking indefinitely if a resource never becomes ready.
- Test health check behavior by scaling down a deployment and observing that downstream Kustomizations move to a not-ready state.
- Document which custom resources in your environment support standard conditions versus those requiring workarounds.

## Conclusion

Flux CD's health check model is simpler than ArgoCD's Lua scripting approach, which is both its strength and its limitation. Standard Kubernetes resources and well-behaved CRDs work automatically. For non-standard CRDs, you can use `healthCheckExprs` or request condition support from the operator maintainers. The good news is that the Kubernetes ecosystem is increasingly adopting the standard conditions pattern, making Flux's approach more broadly applicable over time.
