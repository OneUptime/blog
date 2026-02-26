# How to Handle ArgoCD Applications with Shared Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Multi-Tenancy

Description: Learn how to manage Kubernetes resources shared across multiple ArgoCD Applications without conflicts, sync issues, or accidental pruning.

---

When two or more ArgoCD Applications need to manage the same Kubernetes resource, you have a problem. ArgoCD tracks which resources belong to which Application using labels, and a resource can only belong to one Application at a time. If Application A creates a ConfigMap and Application B also tries to manage it, you will get sync errors, unexpected behavior, and possibly one Application pruning the other's resources.

This guide covers the different strategies for handling shared resources in ArgoCD without conflict.

## Understanding the Problem

ArgoCD uses the `app.kubernetes.io/instance` label to track ownership. When you sync an Application, ArgoCD adds this label to every resource it manages. If two Applications try to manage the same resource, you will see errors like:

```
ComparisonError: shared resource my-namespace/my-configmap is already managed by application other-app
```

Common scenarios where shared resources appear:

- Multiple Applications in the same namespace that share a ConfigMap or Secret
- A shared Ingress or Service that routes to multiple backends
- CRDs that are needed by multiple Applications
- RBAC resources (ClusterRoles, ClusterRoleBindings) used by multiple services
- Namespaces that multiple Applications deploy into

## Strategy 1: Dedicate a Shared Resources Application

The cleanest approach is to create a separate ArgoCD Application that owns all shared resources:

```yaml
# Shared resources Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shared-resources
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/repo.git
    targetRevision: main
    path: shared-resources/production
  destination:
    server: https://kubernetes.default.svc
    namespace: shared
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Your shared resources directory contains everything that is common:

```
shared-resources/production/
  namespace.yaml
  shared-configmap.yaml
  shared-ingress.yaml
  cluster-roles.yaml
```

The individual Applications then reference these resources but do not try to manage them:

```yaml
# App A - does NOT include the shared ConfigMap
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-a
spec:
  source:
    path: apps/app-a  # Only contains app-a specific resources
```

This is the recommended pattern. It clearly defines ownership and avoids conflicts.

## Strategy 2: Use Resource Tracking Annotations

ArgoCD 2.2+ introduced a resource tracking method using annotations instead of labels. This can be configured to allow shared resources:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Use annotation-based tracking
  application.resourceTrackingMethod: annotation
```

With annotation-based tracking, you can configure how ArgoCD handles resources that are tracked by multiple Applications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation+label
```

However, this does not fully solve the shared resource problem - it just changes the tracking mechanism. You still need to handle the ownership question.

## Strategy 3: Exclude Shared Resources from Individual Apps

Tell each Application to ignore certain resources so they do not conflict with the shared resources Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-a
spec:
  source:
    path: apps/app-a
    directory:
      exclude: '{shared-*.yaml}'
  # Ignore specific resources during sync
  ignoreDifferences:
    - group: ""
      kind: ConfigMap
      name: shared-config
      jqPathExpressions:
        - .data
```

## Strategy 4: Use the Shared Resource Annotation

ArgoCD supports a special annotation that tells it a resource is shared and should not cause ownership conflicts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-config
  namespace: my-namespace
  annotations:
    # Tell ArgoCD this resource is shared
    argocd.argoproj.io/managed-by: shared-resources
```

You can also prevent ArgoCD from pruning a resource by annotating it:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
```

This means ArgoCD will create and update the resource but never delete it, even if it is removed from Git.

## Strategy 5: Use Namespaces as Boundaries

The simplest approach to avoid shared resources is to not share them. Give each Application its own namespace with its own copy of the shared resources:

```yaml
# App A in its own namespace
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-a
spec:
  destination:
    namespace: app-a
  source:
    path: apps/app-a
    # Each app has its own copy of the ConfigMap
```

```
apps/app-a/
  deployment.yaml
  service.yaml
  configmap.yaml   # App A's own copy

apps/app-b/
  deployment.yaml
  service.yaml
  configmap.yaml   # App B's own copy
```

This duplicates configuration but eliminates sharing conflicts entirely. Use Kustomize or Helm to generate the shared configuration for each namespace from a common base:

```yaml
# kustomization.yaml for app-a
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: app-a
resources:
  - ../../base/shared-config
  - deployment.yaml
  - service.yaml
```

## Strategy 6: Handle Shared CRDs

CRDs are a special case because they are cluster-scoped and often needed by multiple Applications. The best approach is to manage CRDs in a dedicated Application with sync waves:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-crds
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
spec:
  source:
    path: platform/crds
  syncPolicy:
    syncOptions:
      # Replace CRDs instead of applying (avoids annotation size limits)
      - Replace=true
    automated:
      prune: false  # Never auto-prune CRDs
```

Individual Applications that use these CRDs should configure:

```yaml
spec:
  syncPolicy:
    syncOptions:
      # Skip dry run for CRD resources that might not exist yet
      - SkipDryRunOnMissingResource=true
```

## Strategy 7: Use ApplicationSets for Shared Patterns

If multiple Applications follow the same pattern and share resource templates, use ApplicationSets to generate them consistently:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
spec:
  generators:
    - list:
        elements:
          - name: service-a
            namespace: service-a
          - name: service-b
            namespace: service-b
  template:
    metadata:
      name: '{{name}}'
    spec:
      source:
        repoURL: https://github.com/org/repo.git
        path: 'services/{{name}}'
      destination:
        namespace: '{{namespace}}'
```

Each service gets its own namespace and its own set of resources, generated from a common template.

## Handling the Namespace Resource

One of the most common shared resource conflicts is the Namespace itself. Multiple Applications might target the same namespace, and each one tries to manage the Namespace resource.

The best practice is to have namespaces managed by a single Application:

```yaml
# Namespace management Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: namespaces
spec:
  source:
    path: namespaces/
  # ...
```

And configure other Applications to not create namespaces:

```yaml
spec:
  syncPolicy:
    syncOptions:
      - CreateNamespace=false
```

Or if you want Applications to create their namespace, use the `CreateNamespace` option but do not include the Namespace resource in your manifests - let ArgoCD create it implicitly.

## Debugging Shared Resource Conflicts

When you encounter shared resource errors:

```bash
# Check which Application owns a resource
kubectl get configmap shared-config -n my-namespace \
  -o jsonpath='{.metadata.labels.app\.kubernetes\.io/instance}'

# Check annotations for resource tracking
kubectl get configmap shared-config -n my-namespace \
  -o jsonpath='{.metadata.annotations}'

# List all resources managed by a specific Application
argocd app resources my-app
```

The key takeaway is that ArgoCD enforces single ownership of resources. Design your Application boundaries so that each resource has exactly one owner. Use a dedicated shared resources Application for anything that multiple services need, and use Kustomize or Helm to generate per-namespace copies of shared configuration when possible.
