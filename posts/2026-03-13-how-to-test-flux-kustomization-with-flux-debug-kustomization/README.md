# How to Test Flux Kustomization with flux debug kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Kustomize, Testing, Debugging

Description: Learn how to use flux debug kustomization to inspect and troubleshoot Flux Kustomization resources for faster GitOps debugging.

---

Flux Kustomization resources control how manifests are applied to your cluster. When a Kustomization fails to reconcile, understanding the root cause can be challenging without the right debugging tools. The `flux debug kustomization` command provides detailed insight into the state and behavior of your Kustomization resources.

This guide explains how to use it effectively for testing and troubleshooting.

## What flux debug kustomization Shows

The `flux debug kustomization` command displays the current state of a Kustomization resource, including its status conditions, last applied revision, source information, and any error messages. This information helps you understand whether reconciliation is working correctly and, if not, what went wrong.

## Basic Usage

To debug a Kustomization named `apps` in the `flux-system` namespace:

```bash
flux debug kustomization apps -n flux-system
```

This outputs the resource status, including readiness, the last attempted revision, and any conditions that indicate problems.

## Checking Reconciliation Status

Get a quick view of all Kustomizations and their status:

```bash
flux get kustomization --all-namespaces
```

For a specific Kustomization with full details:

```bash
flux get kustomization apps -n flux-system -o yaml
```

The YAML output shows the complete status block:

```yaml
status:
  conditions:
    - lastTransitionTime: "2024-01-15T10:30:00Z"
      message: "Applied revision: main@sha1:abc123"
      observedGeneration: 3
      reason: ReconciliationSucceeded
      status: "True"
      type: Ready
  lastAppliedRevision: "main@sha1:abc123"
  lastAttemptedRevision: "main@sha1:abc123"
```

## Debugging Source Issues

Kustomizations depend on source resources like GitRepository. If the source is not ready, the Kustomization cannot reconcile:

```bash
flux get source git flux-system -n flux-system
```

Common source issues include authentication failures, unreachable repositories, and branch not found errors. Check the source status first when a Kustomization is stuck.

## Inspecting the Inventory

Flux tracks all resources managed by a Kustomization in its inventory. To see what resources a Kustomization manages:

```bash
flux debug kustomization apps -n flux-system
```

The inventory section lists every resource with its namespace, name, group, version, and kind. This is useful for verifying that all expected resources are being tracked.

## Testing Path Resolution

A frequent cause of Kustomization failures is incorrect path configuration. The `path` field in the Kustomization spec must point to a directory containing a valid `kustomization.yaml` file:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  path: ./apps/production
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Verify locally that the path exists and builds correctly:

```bash
ls -la apps/production/kustomization.yaml
kustomize build apps/production
```

## Debugging Dependency Chains

Kustomizations can depend on each other using the `dependsOn` field:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
  path: ./apps/production
  sourceRef:
    kind: GitRepository
    name: flux-system
```

If the dependency is not ready, the dependent Kustomization will not reconcile. Check the dependency chain:

```bash
flux get kustomization infrastructure -n flux-system
flux get kustomization apps -n flux-system
```

## Testing Health Checks

Kustomizations can include health checks that must pass before the resource is considered ready:

```yaml
spec:
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
```

Debug the health check status:

```bash
flux debug kustomization apps -n flux-system
```

Look for health check failure messages in the conditions. You can also check the deployment directly:

```bash
kubectl rollout status deployment/my-app -n default
```

## Forcing Reconciliation

Trigger an immediate reconciliation to test changes:

```bash
flux reconcile kustomization apps -n flux-system --with-source
```

The `--with-source` flag also reconciles the source, ensuring the latest commit is fetched before the Kustomization is processed.

## Suspending and Resuming

Sometimes you need to pause reconciliation for debugging or maintenance:

```bash
flux suspend kustomization apps -n flux-system
```

Make your changes and then resume:

```bash
flux resume kustomization apps -n flux-system
```

## Exporting for Local Testing

Export the current Kustomization definition:

```bash
flux export kustomization apps -n flux-system > kustomization-apps.yaml
```

This gives you the exact resource definition that you can modify and test locally with `flux build`:

```bash
flux build kustomization apps \
  --path ./apps/production \
  --dry-run
```

## Viewing Events

Check Kubernetes events related to your Kustomization for additional context:

```bash
kubectl events -n flux-system --for kustomization/apps
```

Events provide a timeline of reconciliation attempts, successes, and failures that complement the debug output.

## Conclusion

The `flux debug kustomization` command is essential for understanding and troubleshooting Kustomization resources in your Flux GitOps workflow. By combining it with source checks, dependency verification, health check inspection, and local build testing, you can quickly identify the root cause of reconciliation failures and resolve them before they impact your deployments.
