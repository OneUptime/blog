# How to Use the 'Validate' Sync Option to Skip Validation in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Options, Validation

Description: Learn how to use the Validate sync option in ArgoCD to skip or enable Kubernetes schema validation during sync operations for handling CRDs and edge cases.

---

When ArgoCD syncs resources to your Kubernetes cluster, it validates each manifest before applying it, using behavior equivalent to `kubectl apply --validate=true`. This validation catches errors like invalid field names, wrong data types, and missing required fields. But sometimes this validation gets in the way - especially when dealing with Kubernetes types that use flexible schemas, beta APIs, or resources with fields that the local validation schema does not recognize.

The `Validate=false` sync option tells ArgoCD to skip this client-side validation, applying resources directly without checking them against the schema first.

## How Kubernetes Validation Works

Kubernetes validation happens at two levels:

**Client-side validation** happens before the request reaches the API server. The kubectl client (or in ArgoCD's case, the sync engine) checks the manifest against the known schema. This catches obvious errors early.

**Server-side validation** happens at the API server. Even if you skip client-side validation, the API server still performs its own validation. This means `Validate=false` does not bypass all validation - it only skips the client-side check.

By default, ArgoCD performs client-side validation during sync, equivalent to running `kubectl apply --validate=true`.

## When You Need to Skip Validation

There are several scenarios where client-side validation causes problems:

**Custom Resource Definitions with flexible schemas.** Some CRDs and Kubernetes types use flexible fields such as `RawExtension` or intentionally preserve unknown fields. Client-side validation can reject manifests for these resources even though the API server accepts them.

**Beta or alpha APIs.** Some Kubernetes features are behind feature gates and use API versions that your client libraries might not know about.

**Third-party operators with flexible custom resources.** Some operators accept fields through CRD schemas that are more flexible than the local validation schema. Client-side validation can reject these even though the server accepts them.

**Schema version mismatches.** When your ArgoCD version bundles an older Kubernetes client library than your cluster version, the client might not know about newer fields.

## Disabling Validation at the Application Level

Add the option to your Application manifest:

```yaml
# Application with validation disabled

apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: custom-operator-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/custom-operator.git
    targetRevision: main
    path: deploy/
  destination:
    server: https://kubernetes.default.svc
    namespace: custom-system
  syncPolicy:
    syncOptions:
      - Validate=false
```

## Disabling Validation via CLI

The ArgoCD CLI configures sync options with `argocd app set`. To temporarily disable validation from the CLI, add the sync option, sync the application, and then remove the option:

```bash
# Temporarily skip validation for the application
argocd app set custom-operator-app --sync-option Validate=false
argocd app sync custom-operator-app
argocd app set custom-operator-app --sync-option '!Validate=false'
```

## Per-Resource Validation Control

You can disable validation for specific resources rather than the entire application. This is the recommended approach when only certain resources have validation issues:

```yaml
# CRD that needs validation disabled
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
  annotations:
    argocd.argoproj.io/sync-options: Validate=false
spec:
  group: example.com
  names:
    kind: MyResource
    plural: myresources
  scope: Namespaced
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
              x-kubernetes-preserve-unknown-fields: true
```

By applying the annotation only to resources that need it, you keep validation active for everything else.

## Practical Example: CRD and CR in the Same Application

A common pattern is deploying a CRD and its custom resources in the same ArgoCD application. ArgoCD automatically skips the dry run for a new custom resource type when the CRD is part of the same sync. If the custom resource itself still fails kubectl validation because of a flexible schema, add `Validate=false` to that custom resource.

Here is how to handle it properly using sync waves and selective validation:

```yaml
# CRD - deployed first via sync wave
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: widgets.example.com
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  group: example.com
  names:
    kind: Widget
    plural: widgets
  scope: Namespaced
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
              properties:
                size:
                  type: string
                color:
                  type: string
---
# Custom Resource - deployed after CRD, validation skipped
apiVersion: example.com/v1
kind: Widget
metadata:
  name: my-widget
  annotations:
    argocd.argoproj.io/sync-wave: "0"
    argocd.argoproj.io/sync-options: Validate=false
spec:
  size: large
  color: blue
```

The sync wave ensures the CRD is created first (wave -1 before wave 0), and `Validate=false` on the custom resource prevents kubectl validation failures that are specific to that resource's schema.

## Example: Third-Party Operator Resources

When installing operators like Prometheus Operator, Istio, or Cert-Manager, their CRDs often include fields that trigger validation warnings or errors:

```yaml
# Application deploying Prometheus Operator and its CRs
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: monitoring-stack
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/monitoring.git
    targetRevision: main
    path: prometheus/
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - Validate=false
      - CreateNamespace=true
      - ServerSideApply=true
```

Combining `Validate=false` with `ServerSideApply=true` is a common pattern for operator deployments. Server-side apply handles large CRDs better than client-side apply, and skipping client-side validation avoids schema issues.

## Risks of Disabling Validation

Skipping validation is not without tradeoffs:

**You lose early error detection.** Typos in field names, wrong indentation, and type mismatches will not be caught until the API server rejects them. This means errors surface later in the sync process.

**Debugging becomes harder.** When validation is enabled, error messages are clear and point to the exact field that is wrong. Server-side errors can be less specific.

**Silent field ignoring.** If validation is disabled, unknown or duplicate fields can be silently dropped by kubectl or pruned by the API server instead of being rejected. Your resource might be created without the configuration you intended.

## Best Practices

1. **Prefer per-resource annotation over application-level setting.** Only disable validation on the specific resources that need it.

2. **Use sync waves to order CRD before CR.** This helps the API server know about the custom resource type before ArgoCD applies the custom resource.

3. **Re-enable validation after initial deployment.** If you only needed `Validate=false` for the initial CRD setup, consider removing it afterward.

4. **Combine with CI validation.** Even if ArgoCD skips validation, your CI pipeline can run `kubectl apply --dry-run=server --validate=true` against a cluster that already has the CRDs installed.

```bash
# CI pipeline validation step
kubectl apply --dry-run=server -f manifests/ --validate=true
```

The `--dry-run=server` flag sends the request to the actual API server for validation without creating resources. This catches more issues than client-side validation alone.

## Checking Current Sync Options

To verify what sync options are configured for an application:

```bash
# View application sync options
argocd app get my-app -o yaml | grep -A 10 syncOptions

# Or using kubectl directly
kubectl get application my-app -n argocd -o jsonpath='{.spec.syncPolicy.syncOptions}'
```

## Summary

The `Validate=false` sync option is a necessary escape hatch for situations where client-side Kubernetes schema validation prevents legitimate resources from being applied. Use it surgically - on specific resources that need it, not as a blanket setting for your entire application. Combined with sync waves and server-side apply, you can handle even the most complex CRD deployment scenarios while keeping validation active for the majority of your resources.
