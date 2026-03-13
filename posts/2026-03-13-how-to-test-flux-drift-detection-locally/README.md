# How to Test Flux Drift Detection Locally

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Drift Detection, Testing, Compliance

Description: Learn how to test and verify Flux drift detection locally to ensure your cluster state always matches your Git repository.

---

Drift detection is a core feature of Flux that identifies when the actual state of resources in your cluster diverges from the desired state defined in Git. Testing drift detection locally helps you understand how Flux handles manual changes and ensures your GitOps pipeline enforces the desired state correctly.

This guide walks through setting up and testing drift detection with Flux.

## What Is Drift Detection

Drift occurs when someone or something modifies a Kubernetes resource directly in the cluster without updating the corresponding manifest in Git. Flux can detect this drift and either report it or automatically correct it by reapplying the desired state from Git.

Flux uses server-side apply to track field ownership. When a field managed by Flux is modified by another actor, Flux detects the conflict during the next reconciliation cycle.

## Enabling Drift Detection

Drift detection is configured at the Kustomization level. Enable it by setting the `force` field or by using the drift detection feature:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/production
  prune: true
  force: false
  sourceRef:
    kind: GitRepository
    name: flux-system
```

With `prune: true`, Flux will also remove resources that have been deleted from Git.

## Setting Up a Local Test Environment

Create a local Kubernetes cluster for testing with kind:

```bash
kind create cluster --name flux-drift-test
```

Install Flux:

```bash
flux install
```

Create a simple GitRepository source pointing to your repository:

```bash
flux create source git test-repo \
  --url=https://github.com/your-org/your-repo \
  --branch=main
```

Create a Kustomization:

```bash
flux create kustomization test-apps \
  --source=GitRepository/test-repo \
  --path=./apps/production \
  --prune=true \
  --interval=1m
```

## Testing Drift with Manual Changes

Once your resources are deployed, introduce drift by modifying a resource directly:

```bash
kubectl scale deployment my-app --replicas=10 -n default
```

Now wait for Flux to reconcile. Check the current replica count:

```bash
kubectl get deployment my-app -n default -o jsonpath='{.spec.replicas}'
```

After the next reconciliation cycle (up to the configured interval), Flux will detect the drift and reset the replica count to match Git.

## Observing Drift Detection Events

Monitor Flux events to see drift detection in action:

```bash
flux events --for kustomization/test-apps -n flux-system --watch
```

You will see events like:

```text
Deployment/default/my-app configured (server dry run)
```

This indicates Flux detected a difference and corrected it.

## Testing with kubectl diff

Before Flux reconciles, you can manually check for drift using kubectl:

```bash
kubectl diff -f <(kustomize build apps/production)
```

This shows the differences between what is in the cluster and what the manifests define.

## Testing Drift on Different Resource Types

Test drift detection across various resource types to ensure comprehensive coverage.

ConfigMap drift:

```bash
kubectl edit configmap my-app-config -n default
# Change a value and save
```

Service drift:

```bash
kubectl patch service my-app -n default -p '{"spec":{"type":"NodePort"}}'
```

Verify Flux corrects both changes on the next reconciliation:

```bash
flux reconcile kustomization test-apps -n flux-system
kubectl get configmap my-app-config -n default -o yaml
kubectl get service my-app -n default -o yaml
```

## Testing Prune Behavior

Pruning removes resources from the cluster when they are deleted from Git. Test this by deploying a resource, then removing it from your manifests:

```bash
# Verify the resource exists
kubectl get deployment extra-app -n default

# Remove extra-app from your Git manifests and push

# Trigger reconciliation
flux reconcile kustomization test-apps -n flux-system --with-source

# Verify the resource was pruned
kubectl get deployment extra-app -n default
# Should return "not found"
```

## Using Dry Run to Preview Corrections

See what Flux would change without actually applying corrections:

```bash
flux diff kustomization test-apps -n flux-system
```

This shows the diff between the cluster state and the desired state without making any changes.

## Testing with Field Managers

Flux uses server-side apply with a specific field manager. You can inspect field ownership:

```bash
kubectl get deployment my-app -n default -o yaml | grep -A 20 managedFields
```

This shows which fields are managed by Flux (field manager `kustomize-controller`) and which are managed by other actors.

## Automating Drift Tests

Create a script that introduces drift and verifies correction:

```bash
#!/bin/bash
set -euo pipefail

echo "Introducing drift..."
kubectl scale deployment my-app --replicas=10 -n default

echo "Current replicas: $(kubectl get deployment my-app -n default -o jsonpath='{.spec.replicas}')"

echo "Triggering reconciliation..."
flux reconcile kustomization test-apps -n flux-system

echo "Waiting for reconciliation..."
sleep 10

REPLICAS=$(kubectl get deployment my-app -n default -o jsonpath='{.spec.replicas}')
EXPECTED=3

if [ "$REPLICAS" = "$EXPECTED" ]; then
  echo "PASS: Drift was corrected. Replicas: $REPLICAS"
else
  echo "FAIL: Expected $EXPECTED replicas, got $REPLICAS"
  exit 1
fi
```

## Cleanup

When done testing, delete the local cluster:

```bash
kind delete cluster --name flux-drift-test
```

## Conclusion

Testing drift detection locally gives you confidence that your Flux GitOps pipeline will maintain the desired cluster state even when manual changes occur. By systematically introducing drift across different resource types and verifying that Flux corrects it, you can validate your configuration and ensure your cluster stays in sync with Git.
