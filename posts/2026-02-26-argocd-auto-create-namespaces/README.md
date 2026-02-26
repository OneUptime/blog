# How to Configure ArgoCD to Auto-Create Namespaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Namespaces, Configuration

Description: Learn how to configure ArgoCD to automatically create Kubernetes namespaces before syncing application resources, covering sync options, Application specs, and ApplicationSet patterns.

---

By default, ArgoCD does not create the target namespace for an application. If you deploy an application to a namespace that does not exist, the sync fails with "namespace not found" errors. You then face the chicken-and-egg problem: the namespace needs to exist before the resources can be deployed, but you want the namespace to be managed as part of your GitOps workflow. ArgoCD solves this with the `CreateNamespace=true` sync option. This guide covers how to use it properly, including edge cases and best practices.

## The Problem

When ArgoCD syncs an application, it applies resources to the target namespace specified in the Application's `destination.namespace` field. If that namespace does not exist, kubectl returns an error.

```
FATA[0001] ComparisonError: namespace "production" not found
```

You could create the namespace manually, but that defeats the purpose of GitOps. You could include a Namespace resource in your manifests, but ArgoCD might try to apply other resources before the Namespace is created.

## The Solution: CreateNamespace Sync Option

ArgoCD provides a sync option that automatically creates the namespace before syncing any resources.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/repo.git
    path: k8s/production
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-production
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
```

With `CreateNamespace=true`, ArgoCD creates the namespace if it does not exist before applying any resources. If the namespace already exists, ArgoCD does nothing - it does not modify or take ownership of existing namespaces.

## Adding Labels and Annotations to Auto-Created Namespaces

Often you need the namespace to have specific labels or annotations - for example, Istio sidecar injection labels, pod security standards, or organizational metadata. ArgoCD supports this through the `managedNamespaceMetadata` field.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/repo.git
    path: k8s/production
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-production
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
    managedNamespaceMetadata:
      labels:
        # Enable Istio sidecar injection
        istio-injection: enabled
        # Pod security standard
        pod-security.kubernetes.io/enforce: restricted
        # Team ownership
        team: backend
      annotations:
        # Cost allocation
        cost-center: "12345"
        # Contact info
        owner: backend-team@example.com
```

The `managedNamespaceMetadata` field was introduced in ArgoCD 2.5. It only applies to auto-created namespaces. If the namespace already exists, ArgoCD will still update its labels and annotations to match the specified metadata.

## Using CreateNamespace with Helm

When using Helm charts, the namespace handling works the same way, but there are some considerations.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-ingress
  namespace: argocd
spec:
  source:
    repoURL: https://kubernetes.github.io/ingress-nginx
    chart: ingress-nginx
    targetRevision: 4.7.1
    helm:
      releaseName: nginx-ingress
  destination:
    server: https://kubernetes.default.svc
    namespace: ingress-nginx
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
```

Helm charts sometimes include a Namespace resource in their templates. When combined with `CreateNamespace=true`, the namespace is created twice - once by ArgoCD and once by the Helm template. This is usually harmless because creating an existing namespace is idempotent, but it can cause issues if the Helm template specifies different labels or annotations.

To avoid conflicts, either remove the Namespace template from the Helm chart or do not use `CreateNamespace=true` when the chart manages the namespace itself.

## Using CreateNamespace with Kustomize

Kustomize overlays work seamlessly with auto-created namespaces.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/repo.git
    path: overlays/production
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
```

If your Kustomize overlay includes a `namespace` transformer, ensure it matches the `destination.namespace` in the Application spec to avoid confusion.

```yaml
# kustomization.yaml
namespace: production  # Should match the Application's destination.namespace
resources:
- deployment.yaml
- service.yaml
```

## Using CreateNamespace with ApplicationSets

ApplicationSets commonly create applications for multiple environments, each with its own namespace.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - environment: staging
        namespace: my-app-staging
      - environment: production
        namespace: my-app-production
  template:
    metadata:
      name: 'my-app-{{environment}}'
    spec:
      source:
        repoURL: https://github.com/org/repo.git
        path: 'overlays/{{environment}}'
        targetRevision: main
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
        managedNamespaceMetadata:
          labels:
            environment: '{{environment}}'
            app: my-app
```

This automatically creates `my-app-staging` and `my-app-production` namespaces with the appropriate labels.

## Namespace Deletion Behavior

By default, when you delete an ArgoCD Application, the auto-created namespace is NOT deleted. This is a safety measure to prevent accidental namespace deletion.

```bash
# Deleting the application does NOT delete the namespace
argocd app delete my-app

# The namespace still exists
kubectl get namespace my-app-production
# Still there
```

If you want the namespace to be deleted when the application is deleted, include the namespace as a resource in your manifests and enable pruning.

```yaml
# Include namespace in your manifests
apiVersion: v1
kind: Namespace
metadata:
  name: my-app-production
  labels:
    app.kubernetes.io/instance: my-app
```

```yaml
# Enable pruning in the sync policy
syncPolicy:
  automated:
    prune: true
```

With this setup, deleting the ArgoCD Application will also delete the namespace (and everything in it).

## Alternative: Managing Namespaces as Separate Applications

For more control over namespace lifecycle, manage namespaces as separate ArgoCD applications.

```yaml
# namespace-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: namespaces
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/cluster-config.git
    path: namespaces
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

```yaml
# namespaces/production.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    istio-injection: enabled
    pod-security.kubernetes.io/enforce: restricted
  annotations:
    cost-center: "12345"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
```

This approach lets you manage namespaces, resource quotas, limit ranges, and network policies together as a single application. Other applications can then deploy into these pre-existing namespaces without needing `CreateNamespace=true`.

## Using Sync Waves with Namespaces

If you include the Namespace resource in the same application as the workloads, use sync waves to ensure the namespace is created first.

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app-production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"  # Create before other resources
  labels:
    istio-injection: enabled

---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app-production
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # Created after namespace
spec:
  # ...
```

## Troubleshooting

### Namespace Created But Missing Labels

If `managedNamespaceMetadata` labels are not appearing:

```bash
# Check ArgoCD version (requires 2.5+)
argocd version

# Verify the Application spec
argocd app get my-app -o yaml | grep -A 10 managedNamespaceMetadata

# Force a sync to apply the metadata
argocd app sync my-app
```

### Permission Denied Creating Namespace

ArgoCD's service account needs permission to create namespaces.

```bash
# Check RBAC
kubectl get clusterrolebinding -l app.kubernetes.io/part-of=argocd

# The argocd-application-controller should have cluster-admin or
# a custom role that includes namespace creation
```

### Namespace Stuck in Terminating

If a namespace is stuck terminating after application deletion:

```bash
# Check for finalizers
kubectl get namespace my-app-production -o json | jq '.spec.finalizers'

# Remove stuck finalizers if needed (use with caution)
kubectl get namespace my-app-production -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/my-app-production/finalize" -f -
```

## Summary

Use `CreateNamespace=true` in your sync options to let ArgoCD create namespaces automatically. Add `managedNamespaceMetadata` for labels and annotations. For complex namespace configurations with quotas and policies, manage namespaces as separate applications. Use sync waves when namespace resources are in the same application as workloads to ensure correct ordering.
