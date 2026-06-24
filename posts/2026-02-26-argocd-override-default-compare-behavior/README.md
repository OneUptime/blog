# How to Override Default Compare Behavior in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration Management

Description: Learn how to override ArgoCD default resource comparison behavior at the system, project, and application level to handle edge cases in diff calculation and sync determination.

---

ArgoCD ships with a sensible default comparison strategy that works well for standard Kubernetes resources. But real-world clusters have custom operators, mutating webhooks, and infrastructure patterns that break these defaults. When the built-in comparison logic does not match your needs, you need to override it. This guide covers every level of override available - from global system settings to per-resource customizations.

## How ArgoCD Default Comparison Works

Before overriding anything, it helps to understand the default behavior. ArgoCD compares resources by:

1. Fetching the desired state from your Git repository
2. Fetching the live state from the Kubernetes API server
3. Normalizing both states (removing known server-side fields)
4. Computing a structured diff between the two
5. Marking resources as Synced or OutOfSync based on whether differences exist

The default normalization removes common server-side fields like `metadata.resourceVersion`, `metadata.uid`, `metadata.creationTimestamp`, and the `status` field. Everything else is compared field by field.

## Override Level 1: Global System Settings

The broadest override applies to all resources across all applications. Resource customizations live in the `argocd-cm` ConfigMap, while controller parameters such as server-side diff live in `argocd-cmd-params-cm`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable server-side diff for all applications
  controller.diff.server.side: "true"
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Ignore aggregated ClusterRole rules
  resource.compareoptions: |
    ignoreAggregatedRoles: true

  # Ignore specific fields on ALL resource types
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager
      - kube-scheduler
    jsonPointers:
      - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
```

### Server-Side Diff Mode

Server-side diff delegates the comparison to the Kubernetes API server using dry-run apply. This is the most accurate comparison method because the API server understands field ownership, defaulting, and conversion natively:

```yaml
# Enable globally

apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.diff.server.side: "true"
```

After changing this ConfigMap, restart the `argocd-application-controller`. Server-side diff does not include mutating webhook changes by default. To include them for an application, add `IncludeMutationWebhook=true` to that Application's compare-options annotation.

### Ignoring Aggregated ClusterRoles

Kubernetes aggregates ClusterRoles based on label selectors. The aggregated rules are server-managed and should not trigger sync:

```yaml
data:
  resource.compareoptions: |
    ignoreAggregatedRoles: true
```

## Override Level 2: Per-Resource-Type Customizations

Override comparison for specific resource types using the `resource.customizations.ignoreDifferences.<group>_<kind>` pattern:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Deployments: ignore replicas (HPA-managed) and revision annotation
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jsonPointers:
      - /spec/replicas
    jqPathExpressions:
      - .metadata.annotations["deployment.kubernetes.io/revision"]

  # Services: ignore clusterIP assignment
  resource.customizations.ignoreDifferences._Service: |
    jsonPointers:
      - /spec/clusterIP
      - /spec/clusterIPs

  # Jobs: ignore controller-uid label
  resource.customizations.ignoreDifferences.batch_Job: |
    jqPathExpressions:
      - .spec.selector
      - .spec.template.metadata.labels["controller-uid"]
      - .spec.template.metadata.labels["batch.kubernetes.io/controller-uid"]

  # PVCs: ignore volume name after binding
  resource.customizations.ignoreDifferences._PersistentVolumeClaim: |
    jsonPointers:
      - /spec/volumeName
      - /spec/storageClassName
```

The naming convention is `<apiGroup>_<Kind>`. For core API group resources (no group), use an underscore prefix: `_Service`, `_ConfigMap`, `_Secret`.

## Override Level 3: Per-Application Settings

Override comparison on individual applications using `spec.ignoreDifferences`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/my-org/payment-service.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
  ignoreDifferences:
    - group: apps
      kind: Deployment
      name: payment-api
      jsonPointers:
        - /spec/replicas
    - group: ""
      kind: ConfigMap
      name: payment-config
      jqPathExpressions:
        - .data["dynamic-settings.json"]
```

### Using Annotations for Compare Options

You can also set compare options through annotations on the Application resource:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  annotations:
    # Enable server-side diff and include mutation webhook effects for this app
    argocd.argoproj.io/compare-options: ServerSideDiff=true,IncludeMutationWebhook=true
spec:
  # ...
```

Available annotation options:
- `ServerSideDiff=true` - Use server-side apply for comparison
- `IncludeMutationWebhook=true` - Include mutation webhook effects in server-side diff

## Override Level 4: Resource-Level Annotations

For generated resources that should not affect the application's sync status when they are extraneous, annotate individual Kubernetes resources within your Git manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    # Exclude this extraneous resource from the app's sync status
    argocd.argoproj.io/compare-options: IgnoreExtraneous
```

This annotation on the resource itself (not the Application) tells ArgoCD to exclude the resource from the application's overall sync status when it is extraneous. It does not suppress the resource's health status.

## Custom Diff Normalization

For complex comparison overrides, ArgoCD supports resource customizations that normalize resources before comparison:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Custom normalization for a CRD
  resource.customizations.ignoreDifferences.mygroup.io_MyResource: |
    jsonPointers:
      - /metadata/annotations/last-reconciled
```

## Overriding Compare Behavior in ApplicationSets

When using ApplicationSets, you can template compare options:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/my-org/apps.git
        revision: main
        directories:
          - path: services/*
  template:
    metadata:
      name: '{{path.basename}}'
      annotations:
        argocd.argoproj.io/compare-options: ServerSideDiff=true
    spec:
      project: default
      source:
        repoURL: https://github.com/my-org/apps.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      ignoreDifferences:
        - group: apps
          kind: Deployment
          jsonPointers:
            - /spec/replicas
```

## How Overrides Stack Together

Understanding the precedence of overrides is important:

```mermaid
graph TD
    A[Global argocd-cm settings] --> B[Per-resource-type customizations]
    B --> C[Per-application ignoreDifferences]
    C --> D[Per-application annotations]
    D --> E[Per-resource annotations]
    style A fill:#f0f0f0
    style E fill:#e0ffe0
```

Ignore-difference rules are additive, not replacing. A field ignored at the global level stays ignored even if the per-application configuration does not mention it. Per-application rules add additional ignore rules on top of system-level settings. Compare-options annotations such as `ServerSideDiff=true` and `IgnoreExtraneous` control separate comparison behaviors rather than replacing ignore-difference rules.

## Testing Override Configurations

Always verify your overrides work correctly before declaring victory:

```bash
# Test 1: Check application diff after override
argocd app diff my-app

# Test 2: Force a hard refresh to bypass cache
argocd app get my-app --hard-refresh

# Test 3: Check if the application is now in sync
argocd app get my-app -o json | jq '.status.sync.status'

# Test 4: Verify the override is actually applied
argocd app get my-app -o yaml | grep -A 30 ignoreDifferences

# Test 5: Check controller logs for any comparison errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller \
  --tail=50 | grep -i "diff\|compare"
```

## Common Pitfalls

1. **Forgetting to hard refresh** - ArgoCD caches comparison results. After changing ignore rules, always hard refresh.
2. **Wrong API group format** - Use `apps` not `apps/v1`. The group does not include the version.
3. **Overly broad ignores** - Ignoring `/spec` on all Deployments means ArgoCD will never detect real drift in deployment specs.
4. **Changing status compare defaults without checking impact** - ArgoCD ignores resource status fields by default, but `resource.compareoptions.ignoreResourceStatusField` can change this behavior.
5. **Not testing after config changes** - Always verify with `argocd app diff` after changing comparison overrides.

Mastering comparison overrides is key to running ArgoCD smoothly in production. Start with the most specific override level that solves your problem, and only escalate to broader overrides when the same pattern affects many applications. For per-application configuration details, see [How to Configure Compare Options per Application](https://oneuptime.com/blog/post/2026-02-26-argocd-compare-options-per-application/view).
