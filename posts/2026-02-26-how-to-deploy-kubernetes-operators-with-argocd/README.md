# How to Deploy Kubernetes Operators with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Operator, CRD

Description: Learn how to deploy Kubernetes Operators with ArgoCD using GitOps principles, including CRD management, sync waves, and health checks for operator lifecycle management.

---

Kubernetes Operators extend the Kubernetes API to manage complex, stateful applications declaratively. Combining them with ArgoCD gives you a fully GitOps-driven approach to operator lifecycle management. But deploying operators through ArgoCD has its quirks - CRD ordering, health checks, and sync waves all need careful attention.

This guide walks you through deploying Kubernetes Operators with ArgoCD the right way.

## Why Deploy Operators with ArgoCD?

If you are already running ArgoCD for your application deployments, managing operators through the same GitOps pipeline makes sense. You get version-controlled operator configurations, automated rollouts, drift detection, and a single pane of glass for everything running in your cluster.

Without ArgoCD, operator installations often rely on manual `kubectl apply` commands or one-off Helm installs that are hard to reproduce. With ArgoCD, every operator version, every CRD, and every custom resource is tracked in Git.

## The Challenge of CRD Ordering

The biggest hurdle when deploying operators with ArgoCD is the ordering problem. An operator typically consists of:

1. Custom Resource Definitions (CRDs)
2. RBAC resources (ServiceAccount, ClusterRole, ClusterRoleBinding)
3. The operator Deployment itself
4. Custom Resources (CRs) that the operator manages

If ArgoCD tries to apply a Custom Resource before the CRD exists, the sync will fail. This is where sync waves come in.

## Using Sync Waves for Operator Deployment

Sync waves let you control the order in which ArgoCD applies resources. Lower wave numbers are applied first.

Here is a typical structure for an operator deployment:

```yaml
# Wave 0: CRDs first
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  group: example.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
  scope: Namespaced
  names:
    plural: myresources
    singular: myresource
    kind: MyResource
```

```yaml
# Wave 1: RBAC and operator deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-operator
  namespace: operators
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-operator
  template:
    metadata:
      labels:
        app: my-operator
    spec:
      serviceAccountName: my-operator
      containers:
        - name: operator
          image: example.com/my-operator:v1.0.0
          # Operator watches for MyResource CRs
          ports:
            - containerPort: 8080
```

```yaml
# Wave 2: Custom Resources (applied after operator is running)
apiVersion: example.com/v1
kind: MyResource
metadata:
  name: my-instance
  namespace: default
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  size: 3
  version: "1.0"
```

## Setting Up the ArgoCD Application

Here is how you define an ArgoCD Application for an operator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-operator
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/k8s-operators.git
    targetRevision: main
    path: operators/my-operator
  destination:
    server: https://kubernetes.default.svc
    namespace: operators
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      # ServerSideApply helps with large CRDs
      - ServerSideApply=true
      # Create namespace if it does not exist
      - CreateNamespace=true
      # Replace resources rather than applying (useful for CRDs)
      - Replace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

The `ServerSideApply=true` option is particularly important for operators. CRDs can be large, and client-side apply sometimes hits annotation size limits. Server-side apply handles this gracefully.

## Using Helm-Based Operators

Many operators are distributed as Helm charts. ArgoCD handles Helm charts natively.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-operator
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 55.5.0
    helm:
      # Skip CRD installation via Helm, manage separately
      skipCrds: true
      values: |
        prometheus:
          prometheusSpec:
            retention: 30d
            storageSpec:
              volumeClaimTemplate:
                spec:
                  storageClassName: gp3
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

When you set `skipCrds: true`, you manage CRDs in a separate ArgoCD Application. This gives you independent control over CRD lifecycle.

## Managing CRDs Separately

A recommended pattern is to split CRDs into their own ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-crds
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/k8s-platform.git
    targetRevision: main
    path: crds/prometheus
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
      - Replace=true
```

This separation means CRD updates do not trigger a full operator redeployment, and you can version CRDs independently.

## Custom Health Checks for Operators

ArgoCD needs to know when an operator is healthy. For standard Deployments, the built-in health check works fine. But for custom resources managed by operators, you need custom health checks.

Add this to your ArgoCD ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.example.com_MyResource: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Running" then
        hs.status = "Healthy"
        hs.message = "Resource is running"
      elseif obj.status.phase == "Failed" then
        hs.status = "Degraded"
        hs.message = obj.status.message or "Resource failed"
      else
        hs.status = "Progressing"
        hs.message = "Resource is being reconciled"
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for status"
    end
    return hs
```

## Handling Operator Finalizers

Operators often add finalizers to custom resources. When ArgoCD prunes a resource with a finalizer, the deletion will hang until the operator removes the finalizer. Make sure your operator is running and healthy before pruning CRs.

You can also configure ArgoCD to handle finalizer removal:

```yaml
syncPolicy:
  syncOptions:
    # Allow ArgoCD to delete resources with finalizers
    - PrunePropagationPolicy=foreground
```

## Repository Structure

A clean Git repository structure for managing operators looks like this:

```text
operators/
  crds/
    prometheus/
      servicemonitor-crd.yaml
      prometheusrule-crd.yaml
    cert-manager/
      certificate-crd.yaml
      issuer-crd.yaml
  prometheus-operator/
    deployment.yaml
    rbac.yaml
    service.yaml
  cert-manager/
    deployment.yaml
    rbac.yaml
    service.yaml
  instances/
    prometheus/
      prometheus-instance.yaml
    cert-manager/
      cluster-issuer.yaml
```

## Monitoring Operator Deployments

Once your operators are managed by ArgoCD, you can monitor sync status through the ArgoCD UI or CLI:

```bash
# Check the sync status of all operator applications
argocd app list --selector app.kubernetes.io/part-of=operators

# Get details about a specific operator
argocd app get my-operator

# View the sync history
argocd app history my-operator
```

For deeper monitoring, integrate ArgoCD metrics with Prometheus. ArgoCD exposes metrics about application sync status, health, and reconciliation timing that you can alert on. For more on monitoring ArgoCD itself, check out our post on [monitoring ArgoCD with Prometheus](https://oneuptime.com/blog/post/2026-02-24-how-to-set-up-gitops-for-istio-with-argo-cd/view).

## Common Pitfalls

**CRD too large for annotations**: Use `ServerSideApply=true` to avoid the `metadata.annotations` size limit.

**Sync fails because CR applied before CRD**: Use sync waves, with CRDs at wave 0, operators at wave 1, and CRs at wave 2 or higher.

**Operator not ready when CR is applied**: Add a health check to the operator Deployment and use sync waves to ensure the operator is healthy before CRs are applied.

**Pruning removes CRDs**: Be very careful with pruning on CRD applications. Deleting a CRD deletes all instances of that resource type cluster-wide.

## Summary

Deploying Kubernetes Operators with ArgoCD gives you reproducible, version-controlled operator management. The key techniques are sync waves for ordering, server-side apply for large CRDs, separate applications for CRDs and operators, and custom health checks for operator-managed resources. Once you have this pattern working, adding new operators to your cluster becomes as simple as a Git commit.
