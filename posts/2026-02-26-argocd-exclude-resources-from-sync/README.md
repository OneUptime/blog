# How to Exclude Specific Resources from Sync in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Exclusion, Sync Configuration

Description: Learn how to exclude specific Kubernetes resources from ArgoCD sync operations using resource exclusions, ignore differences, and annotation-based approaches.

---

Not every resource in your Git repository should be synced every time. Some resources are managed by other tools, some should only be applied once, and some contain fields that change dynamically and should not trigger OutOfSync status. ArgoCD provides several mechanisms to exclude resources from sync operations.

## Global Resource Exclusions

ArgoCD supports global resource exclusions configured in the `argocd-cm` ConfigMap. These exclusions apply to all applications across the ArgoCD instance.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.exclusions: |
    - apiGroups:
        - "cilium.io"
      kinds:
        - CiliumIdentity
      clusters:
        - "*"
    - apiGroups:
        - "events.k8s.io"
      kinds:
        - Event
      clusters:
        - "*"
```

This configuration tells ArgoCD to completely ignore CiliumIdentity resources and Event resources across all clusters. ArgoCD will not track these resources, report their sync status, or include them in sync operations.

Common candidates for global exclusions include:

- Events (they are ephemeral and high-volume)
- CiliumIdentity and CiliumEndpoint (managed by Cilium CNI)
- EndpointSlice (managed by Kubernetes automatically)
- Lease resources (used for leader election, very dynamic)

```yaml
data:
  resource.exclusions: |
    - apiGroups:
        - ""
      kinds:
        - Event
      clusters:
        - "*"
    - apiGroups:
        - "discovery.k8s.io"
      kinds:
        - EndpointSlice
      clusters:
        - "*"
    - apiGroups:
        - "coordination.k8s.io"
      kinds:
        - Lease
      clusters:
        - "*"
```

## Resource Inclusions (Allowlist Approach)

Instead of excluding specific resources, you can flip the approach and only include specific resource types. This is configured with `resource.inclusions` in the same ConfigMap.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.inclusions: |
    - apiGroups:
        - "*"
      kinds:
        - Deployment
        - Service
        - ConfigMap
        - Secret
        - Ingress
        - ServiceAccount
      clusters:
        - "*"
```

When inclusions are defined, ArgoCD only tracks the listed resource types and ignores everything else. This is a more restrictive but also more predictable approach.

Note: If both `resource.exclusions` and `resource.inclusions` are defined, exclusions are applied first, then inclusions filter the remaining resources.

## Application-Level Resource Exclusion with ignoreDifferences

At the application level, use `ignoreDifferences` to tell ArgoCD to ignore specific fields on specific resources. This does not exclude the resource from sync entirely but prevents certain field differences from triggering an OutOfSync status.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/app.git
    targetRevision: main
    path: manifests/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    # Ignore replicas field (managed by HPA)
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    # Ignore annotations added by other controllers
    - group: ""
      kind: Service
      jsonPointers:
        - /metadata/annotations
    # Ignore specific annotation on all resources
    - kind: "*"
      jsonPointers:
        - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
```

This is the most common exclusion pattern. The `replicas` field is a classic example because Horizontal Pod Autoscalers change it dynamically, and you do not want ArgoCD to revert it to the value in Git.

## Using jqPathExpressions for Advanced Exclusions

For more complex field exclusions, use `jqPathExpressions` instead of `jsonPointers`.

```yaml
ignoreDifferences:
  # Ignore all labels starting with "app.kubernetes.io"
  - group: apps
    kind: Deployment
    jqPathExpressions:
      - .metadata.labels | to_entries | map(select(.key | startswith("app.kubernetes.io")))
  # Ignore the status field on CRDs (always varies)
  - group: apiextensions.k8s.io
    kind: CustomResourceDefinition
    jqPathExpressions:
      - .status
  # Ignore specific container environment variables
  - group: apps
    kind: Deployment
    name: my-app
    jqPathExpressions:
      - .spec.template.spec.containers[].env[] | select(.name == "BUILD_TIMESTAMP")
```

jqPathExpressions give you the full power of jq for matching fields to ignore. They are more flexible than jsonPointers but also more complex to write.

## Excluding Resources with Annotations

You can exclude individual resources from pruning using an annotation. This does not exclude them from sync but prevents ArgoCD from deleting them if they are removed from Git.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: manual-config
  namespace: production
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
```

For resources that should be completely excluded from ArgoCD management, use the `argocd.argoproj.io/compare-options: IgnoreExtraneous` annotation.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: operator-managed-config
  namespace: production
  annotations:
    argocd.argoproj.io/compare-options: IgnoreExtraneous
```

Resources with `IgnoreExtraneous` are tracked by ArgoCD but their differences do not affect the application's sync status.

## Excluding Resources from Specific Sync Operations

During a sync operation (using the CLI), you can exclude resources by only including the ones you want. There is no direct `--exclude` flag, but you achieve exclusion by explicitly selecting what to include.

```bash
# Instead of excluding, select only what you want to sync
argocd app sync my-app \
  --resource apps:Deployment:web-server \
  --resource :Service:api-svc
# This effectively excludes everything else
```

## Pattern: Exclude HPA-Managed Fields

The most common ignoreDifferences use case is excluding fields managed by Horizontal Pod Autoscalers.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/app.git
    targetRevision: main
    path: manifests/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    - group: apps
      kind: StatefulSet
      jsonPointers:
        - /spec/replicas
```

Without this configuration, every time the HPA scales your Deployment up or down, ArgoCD reports it as OutOfSync because the replica count in the cluster differs from the count in Git.

## Pattern: Exclude Webhook CA Bundles

Webhook configurations have a `caBundle` field that gets injected by cert-manager or other certificate management tools. This field changes when certificates are rotated.

```yaml
ignoreDifferences:
  - group: admissionregistration.k8s.io
    kind: MutatingWebhookConfiguration
    jsonPointers:
      - /webhooks/0/clientConfig/caBundle
      - /webhooks/1/clientConfig/caBundle
  - group: admissionregistration.k8s.io
    kind: ValidatingWebhookConfiguration
    jsonPointers:
      - /webhooks/0/clientConfig/caBundle
```

## Pattern: Exclude Operator-Managed Status Fields

Operators often write to the status subresource and sometimes to spec fields of the resources they manage. If ArgoCD manages the same resources, these changes cause constant OutOfSync.

```yaml
ignoreDifferences:
  - group: mongodb.com
    kind: MongoDB
    jqPathExpressions:
      - .status
      - .spec.credentials
  - group: kafka.strimzi.io
    kind: Kafka
    jqPathExpressions:
      - .status
```

## Configuring Global Ignore Differences

For ignore patterns that should apply across all applications, configure them in the `argocd-cm` ConfigMap.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager
      - kube-scheduler
    jsonPointers:
      - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jsonPointers:
      - /spec/replicas
```

The `managedFieldsManagers` option tells ArgoCD to ignore any fields managed by the specified controllers. This is a clean way to handle the overlap between ArgoCD and built-in Kubernetes controllers.

For more on selective sync operations, see the [selective sync CLI guide](https://oneuptime.com/blog/post/2026-02-26-argocd-selective-sync-cli/view). For sync options in general, check the [ArgoCD sync options guide](https://oneuptime.com/blog/post/2026-01-30-argocd-sync-windows/view).
