# How to Map ArgoCD Health Checks to Flux Health Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Health Check, Migration, GitOps, Kubernetes, Custom Resources

Description: Learn how to convert ArgoCD custom health check configurations to Flux CD health check specifications for accurate deployment readiness detection.

---

## Introduction

ArgoCD supports custom health check scripts written in Lua that evaluate the health of any Kubernetes resource, including custom resources from operators. Flux CD uses a simpler model: health checks reference specific Kubernetes resources and use their standard readiness conditions. For custom resources without standard conditions, Flux waits for the resource to exist and have specific status fields.

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

Flux CD's `healthChecks` field in Kustomization uses the health status conditions of Kubernetes resources. For standard resources (Deployment, StatefulSet, DaemonSet), Flux knows how to evaluate readiness natively.

For custom resources, Flux checks:
1. If the resource exists
2. If the resource has a `status.conditions` field with `type: Ready` and `status: "True"`

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

For CRDs that use the standard `status.conditions` pattern, Flux health checks work automatically:

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

For CRDs that use a `phase` or `state` field instead of `conditions`, you need a different approach. Use a Kubernetes Job to poll the status:

```yaml
# apps/myapp/wait-for-db-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: wait-for-database
  namespace: myapp
  annotations:
    # This job runs after database creation and signals readiness
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: OnFailure
      serviceAccountName: wait-job-sa
      containers:
        - name: wait
          image: bitnami/kubectl:1.29
          command:
            - /bin/bash
            - -c
            - |
              echo "Waiting for Database to be ready..."
              until kubectl get database production-db -n myapp \
                -o jsonpath='{.status.phase}' | grep -q "Ready"; do
                echo "Database phase: $(kubectl get database production-db -n myapp -o jsonpath='{.status.phase}')"
                sleep 10
              done
              echo "Database is ready!"
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
    # Check that cert-manager pods are running
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager-webhook
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

# Watch Kustomization wait for health
flux get kustomizations myapp -n flux-system --watch
```

## Best Practices

- Prefer operators that implement the standard `status.conditions` pattern; Flux health checks work automatically for these.
- For operators that use non-standard status fields, open an issue or PR with the operator to add standard condition support.
- Use `timeout` on Kustomizations to prevent health checks from blocking indefinitely if a resource never becomes ready.
- Test health check behavior by scaling down a deployment and observing that downstream Kustomizations move to a not-ready state.
- Document which custom resources in your environment support standard conditions versus those requiring workarounds.

## Conclusion

Flux CD's health check model is simpler than ArgoCD's Lua scripting approach, which is both its strength and its limitation. Standard Kubernetes resources and well-behaved CRDs work automatically. For non-standard CRDs, you may need helper Jobs or need to request condition support from the operator maintainers. The good news is that the Kubernetes ecosystem is increasingly adopting the standard conditions pattern, making Flux's approach more broadly applicable over time.
