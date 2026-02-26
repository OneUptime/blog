# How to Use the 'Validate' Sync Option to Skip Validation in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Options, Validation

Description: Learn how to use the Validate sync option in ArgoCD to skip or enable Kubernetes schema validation during sync operations for handling CRDs and edge cases.

---

When ArgoCD syncs resources to your Kubernetes cluster, it validates each manifest against the Kubernetes API server's schema before applying it. This validation catches errors like invalid field names, wrong data types, and missing required fields. But sometimes this validation gets in the way - especially when dealing with Custom Resource Definitions, beta APIs, or resources with fields that the API server does not recognize.

The `Validate=false` sync option tells ArgoCD to skip this client-side validation, applying resources directly without checking them against the schema first.

## How Kubernetes Validation Works

Kubernetes validation happens at two levels:

**Client-side validation** happens before the request reaches the API server. The kubectl client (or in ArgoCD's case, the sync engine) checks the manifest against the known schema. This catches obvious errors early.

**Server-side validation** happens at the API server. Even if you skip client-side validation, the API server still performs its own validation. This means `Validate=false` does not bypass all validation - it only skips the client-side check.

By default, ArgoCD performs client-side validation during sync, equivalent to running `kubectl apply --validate=true`.

## When You Need to Skip Validation

There are several scenarios where client-side validation causes problems:

**Custom Resource Definitions.** When you apply CRDs and their instances in the same sync, the client might not have the CRD schema available during validation. The CRD has not been applied yet, so the client does not know how to validate the custom resource.

**Beta or alpha APIs.** Some Kubernetes features are behind feature gates and use API versions that your client libraries might not know about.

**Third-party operators with non-standard fields.** Some operators accept fields that are not part of the standard Kubernetes schema. Client-side validation rejects these even though the server accepts them.

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

For a one-time sync without validation:

```bash
# Skip validation for this sync only
argocd app sync custom-operator-app --sync-option Validate=false
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

A common pattern is deploying a CRD and its custom resources in the same ArgoCD application. Without `Validate=false`, this often fails because the custom resource cannot be validated against a CRD that has not been installed yet.

Here is how to handle it properly using sync waves and selective validation:

```yaml
# CRD - deployed first via sync wave, validation skipped
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

The sync wave ensures the CRD is created first (wave -1 before wave 0), and `Validate=false` on the custom resource prevents the client-side validation failure.

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

**Silent field ignoring.** If you misspell a field name, Kubernetes might silently ignore it instead of rejecting it. Your resource gets created but without the configuration you intended.

## Best Practices

1. **Prefer per-resource annotation over application-level setting.** Only disable validation on the specific resources that need it.

2. **Use sync waves to order CRD before CR.** This often eliminates the need for `Validate=false` entirely, since the CRD exists by the time the CR is validated.

3. **Re-enable validation after initial deployment.** If you only needed `Validate=false` for the initial CRD setup, consider removing it afterward.

4. **Combine with CI validation.** Even if ArgoCD skips validation, your CI pipeline can run `kubectl apply --dry-run=client --validate=true` against a cluster that already has the CRDs installed.

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
