# How to Troubleshoot Post-Build Substitution Not Working in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Kubernetes, Kustomization, Post-Build, Substitution, Troubleshooting, Debugging

Description: A comprehensive troubleshooting guide for diagnosing and fixing post-build variable substitution issues in Flux Kustomizations.

---

## Introduction

Post-build substitution in Flux is a powerful feature, but when it does not work as expected, the root cause can be difficult to identify. Variables might not be replaced, wrong values might appear, or the Kustomization might fail to reconcile entirely. This guide walks through the most common issues, how to diagnose them, and how to fix them.

## Prerequisites

- Flux CD v2.0 or later installed on your cluster
- Flux CLI installed locally
- kubectl access to your cluster
- A Kustomization with post-build substitution configured

## Step 1: Check the Kustomization Status

The first thing to check is the status of the Kustomization resource:

```bash
flux get kustomizations
```

For more detail:

```bash
kubectl get kustomization my-app -n flux-system -o yaml
```

Look at the `status.conditions` section. Common messages include:

- `ReconciliationFailed`: A referenced ConfigMap or Secret does not exist, or substitution failed
- `BuildFailed`: The Kustomize build itself failed before substitution could occur
- `HealthCheckFailed`: Substitution worked but the resulting resources are unhealthy

## Step 2: Verify the postBuild Configuration

Ensure your Kustomization has the `postBuild` field correctly defined. A common mistake is placing it at the wrong level in the YAML:

Correct:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: "production"
```

Incorrect (postBuild outside of spec):

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
postBuild:   # WRONG - this is outside spec
  substitute:
    CLUSTER_NAME: "production"
```

## Step 3: Check Variable Syntax in Manifests

Flux uses `${VAR_NAME}` syntax for substitution. Variable names can contain letters, numbers, and underscores, and must start with a letter or underscore. Common syntax mistakes include:

```yaml
# Correct

replicas: ${REPLICAS}

# Wrong - missing braces
replicas: $REPLICAS

# Wrong - extra spaces inside braces
replicas: ${ REPLICAS }

# Wrong - using double braces
replicas: ${{REPLICAS}}
```

Only `${VAR_NAME}`-style expressions are recognized by the Flux substitution engine. Flux also supports default values and a subset of bash-style string operations, such as `${VAR_NAME:=default}`.

## Step 4: Verify ConfigMap or Secret Exists

If you are using `substituteFrom`, verify the referenced ConfigMap or Secret exists in the correct namespace:

```bash
kubectl get configmap cluster-config -n flux-system
kubectl get secret cluster-secrets -n flux-system
```

The ConfigMap or Secret must be in the same namespace as the Kustomization resource (usually `flux-system`). If it is in a different namespace, reconciliation fails by default. If the `substituteFrom` entry has `optional: true`, Flux treats the missing object as empty.

Check the contents:

```bash
kubectl get configmap cluster-config -n flux-system -o yaml
```

Verify that the keys match exactly what your manifests expect. Variable names are case-sensitive.

## Step 5: Check Variable Precedence

When using both `substitute` and `substituteFrom`, inline values take precedence. If you have the same variable in both places, the inline value wins:

```yaml
postBuild:
  substitute:
    REPLICAS: "5"        # This value wins
  substituteFrom:
    - kind: ConfigMap
      name: cluster-config  # REPLICAS in here is ignored
```

Among `substituteFrom` entries, later entries take precedence over earlier ones:

```yaml
postBuild:
  substituteFrom:
    - kind: ConfigMap
      name: primary-config    # Lower precedence
    - kind: ConfigMap
      name: secondary-config  # Takes precedence over primary-config for matching keys
```

## Step 6: Confirm All Variables Are Defined

If a variable is referenced in a manifest but not defined in any source, Flux substitutes it with an empty string unless a default value is provided, such as `${VAR_NAME:=default}`. This can cause errors if the field expects a number or a specific format. To make missing variables fail reconciliation, enable the `StrictPostBuildSubstitutions` feature gate on the kustomize-controller.

To find unresolved placeholders that were escaped, disabled, or otherwise not processed, check the applied resources:

```bash
kubectl get deployment my-app -o yaml | grep '\${'
```

If you see empty values where `${...}` patterns should have been substituted, those variables are missing from your postBuild configuration. You can test locally with `flux envsubst --strict` to fail on missing variables before pushing changes.

## Step 7: Check for API Version Mismatch

Make sure you are using the correct API version for the Kustomization resource:

```yaml
# Correct - v1 (stable)
apiVersion: kustomize.toolkit.fluxcd.io/v1

# Older - v1beta2 (also supports postBuild)
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
```

The `postBuild` field is available in both versions, but if you are using an older Flux installation, make sure the API version matches what your cluster supports.

## Step 8: Force Reconciliation

After fixing issues, force a reconciliation to test immediately instead of waiting for the interval:

```bash
flux reconcile kustomization my-app --with-source
```

The `--with-source` flag also reconciles the GitRepository source, ensuring the latest changes are pulled.

## Step 9: Check the Kustomize Build Separately

Sometimes the issue is not with substitution but with the Kustomize build itself. Test the build locally:

```bash
kustomize build ./apps/my-app
```

If the build fails, substitution never runs. Fix the Kustomize build first. If your Flux path contains plain YAML files without a `kustomization.yaml`, use `flux build kustomization my-app --path ./apps/my-app` instead, because Flux can generate a temporary kustomization file for plain YAML directories.

## Step 10: Examine Flux Controller Logs

For deeper investigation, check the kustomize-controller logs:

```bash
kubectl logs -n flux-system deployment/kustomize-controller --tail=50
```

Filter for your specific Kustomization:

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep my-app
```

Look for error messages related to substitution, ConfigMap lookups, or build failures.

## Common Issues and Solutions

**Issue: Variables not replaced in HelmRelease valuesFrom**

Post-build substitution only works on the YAML rendered by the Flux Kustomization before resources are applied. It can substitute placeholders in the HelmRelease object itself, including inline `spec.values`, but it does not process the contents of ConfigMaps or Secrets later loaded by the helm-controller through HelmRelease `spec.valuesFrom`. Put substitutions in the HelmRelease manifest or in the referenced ConfigMap/Secret manifest that Flux applies.

**Issue: Numeric and boolean values in string fields**

YAML can be tricky with types. If a number or boolean is substituted into a field that Kubernetes expects to be a string, wrap the substituted value in quotes:

```yaml
# Safe for numeric fields
replicas: ${REPLICAS}

# Safe for string fields
metadata:
  annotations:
    example.com/id: "${ID}"
```

**Issue: Multi-line values**

Multi-line substitutions can break YAML if indentation and block scalar formatting are not handled carefully. For larger multi-line content, consider using ConfigMaps mounted as files rather than variable substitution.

**Issue: Literal shell variables are replaced**

Flux substitution can also affect embedded scripts or container commands. Use `$VAR_NAME` when you do not need Flux substitution, or escape the expression as `$${VAR_NAME}` if you need the rendered manifest to contain the literal `${VAR_NAME}` string.

## Quick Diagnostic Checklist

1. Is the Kustomization reconciling? (`flux get kustomizations`)
2. Is `postBuild` under `spec`?
3. Is the variable syntax `${VAR_NAME}` correct?
4. Does the ConfigMap/Secret exist in `flux-system` namespace?
5. Are variable names case-sensitive matches?
6. Does kustomize build succeed locally?
7. Have you forced reconciliation after fixes?

## Conclusion

Most post-build substitution issues fall into a few categories: syntax errors in variable references, missing ConfigMaps or Secrets, YAML structure mistakes, or Kustomize build failures that prevent substitution from running. By systematically working through the diagnostic steps above, you can quickly identify and resolve substitution problems. Using `flux envsubst --strict` locally before pushing changes helps prevent many of these issues from reaching your cluster.
