# How to Troubleshoot Kustomize Controller Pod Crashes in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Kustomize Controller, Pod Crashes, CrashLoopBackOff

Description: Learn how to diagnose and fix Kustomize Controller pod crashes in Flux, covering OOMKilled errors, invalid manifests, and resource contention issues.

---

The Kustomize Controller is responsible for reconciling Kustomization resources in Flux. It takes artifacts produced by the Source Controller, applies kustomize overlays and variable substitutions, and then applies the resulting manifests to the cluster. When this controller crashes, no Kustomization resources can be reconciled. This guide helps you diagnose and resolve Kustomize Controller pod crashes.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Permissions to view pods, logs, and events in the flux-system namespace

## Step 1: Check Pod Status

Start by checking the Kustomize Controller pod:

```bash
kubectl get pods -n flux-system -l app=kustomize-controller
```

Get detailed information about the pod:

```bash
kubectl describe pod -n flux-system -l app=kustomize-controller
```

Note the `Restart Count`, `State`, and `Last State` fields. A high restart count indicates repeated crashes.

## Step 2: Review Logs

Check the logs from the crashed container:

```bash
kubectl logs -n flux-system deploy/kustomize-controller --previous
```

For current logs:

```bash
kubectl logs -n flux-system deploy/kustomize-controller --tail=200
```

Look for panic messages, nil pointer dereferences, or memory-related errors in the output.

## Step 3: Identify Common Crash Causes

### OOMKilled Due to Large Manifests

The Kustomize Controller loads all manifests into memory during reconciliation. If you have very large Kustomization resources with many manifests, the controller can run out of memory:

```bash
kubectl get pod -n flux-system -l app=kustomize-controller -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
```

If the result is `OOMKilled`, increase the memory limit:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: 2Gi
      - op: replace
        path: /spec/template/spec/containers/0/resources/requests/memory
        value: 512Mi
```

### Recursive or Circular Kustomization References

If Kustomizations reference each other in a circular manner, the controller can enter an infinite loop and eventually crash:

```bash
flux get kustomizations
```

Review your Kustomization dependency chains to ensure there are no circular references. Each Kustomization should have a clear dependency path.

### SOPS Decryption Failures

If the Kustomize Controller is configured to decrypt SOPS-encrypted secrets and the decryption keys are missing or misconfigured, the controller may crash during startup:

```bash
kubectl logs -n flux-system deploy/kustomize-controller | grep -i "sops\|decrypt\|pgp\|age\|kms"
```

Verify that the decryption secret exists and is properly referenced:

```bash
kubectl get secret -n flux-system sops-gpg
kubectl get secret -n flux-system sops-age
```

### Invalid Kustomize Overlays

Malformed kustomization.yaml files in your repositories can cause the controller to panic:

```bash
kubectl logs -n flux-system deploy/kustomize-controller | grep -i "panic\|fatal\|invalid"
```

Validate your kustomize overlays locally before pushing:

```bash
kustomize build ./path/to/overlay
```

## Step 4: Check Concurrent Reconciliation Settings

The Kustomize Controller reconciles multiple Kustomizations concurrently. If the concurrency is set too high relative to available resources, the controller may crash:

```bash
kubectl get deploy kustomize-controller -n flux-system -o jsonpath='{.spec.template.spec.containers[0].args}'
```

Look for the `--concurrent` flag. Reduce concurrency if the controller is under memory pressure:

```bash
kubectl patch deployment kustomize-controller -n flux-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--concurrent=5"}]'
```

## Step 5: Check Events and Node Resources

Review cluster events for scheduling or resource issues:

```bash
kubectl get events -n flux-system --sort-by=.metadata.creationTimestamp | grep kustomize-controller
```

Check node resource availability:

```bash
kubectl top nodes
kubectl top pod -n flux-system -l app=kustomize-controller
```

## Step 6: Restart and Verify

After addressing the root cause, restart the controller:

```bash
kubectl rollout restart deployment/kustomize-controller -n flux-system
kubectl rollout status deployment/kustomize-controller -n flux-system
```

Verify that Kustomizations are being reconciled:

```bash
flux get kustomizations
```

## Prevention Tips

- Split large Kustomizations into smaller, focused ones to reduce memory consumption per reconciliation cycle
- Use `dependsOn` to create clear ordering instead of relying on implicit dependencies
- Validate kustomize overlays in CI before merging to prevent invalid manifests from reaching the cluster
- Monitor controller memory usage and set alerts for when usage approaches the limit
- Run `flux check` periodically to verify all controllers are healthy
- Keep SOPS key secrets updated and test decryption as part of your CI pipeline

## Summary

Kustomize Controller pod crashes are commonly caused by memory exhaustion from large manifests, SOPS decryption failures, circular dependencies, or excessive concurrency. Systematic log analysis and proper resource configuration will resolve most crash scenarios. Breaking large Kustomizations into smaller units and validating overlays before deployment are effective preventive measures.
