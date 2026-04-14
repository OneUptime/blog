# How to Fix Dapr Namespace Conflicts During Installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Installation, Namespace, Helm

Description: Resolve Dapr namespace conflicts during installation caused by existing resources, duplicate CRDs, or leftover control plane components.

---

Installing Dapr into a cluster that already has partial Dapr resources - from a previous install or a failed upgrade - causes namespace conflicts, CRD errors, and installation failures.

## Common Conflict Scenarios

**Scenario 1:** A previous `dapr init -k` left behind resources in `dapr-system` namespace.

**Scenario 2:** The `dapr-system` namespace exists but was manually modified.

**Scenario 3:** CRDs from an older Dapr version conflict with new ones.

**Scenario 4:** Installing via Helm after using the CLI (or vice versa).

## Checking Existing Dapr Resources

Before installing, audit what already exists:

```bash
kubectl get ns dapr-system
kubectl get all -n dapr-system
kubectl get crd | grep dapr
kubectl get clusterrole | grep dapr
kubectl get clusterrolebinding | grep dapr
```

## Clean Uninstall of Previous Dapr

If a previous installation exists, remove it cleanly before reinstalling:

```bash
# Via Dapr CLI
dapr uninstall -k --all

# Via Helm
helm uninstall dapr -n dapr-system
helm uninstall dapr-dashboard -n dapr-system

# Delete the namespace
kubectl delete ns dapr-system

# Remove CRDs (Helm does not remove these automatically)
kubectl get crd | grep dapr.io | awk '{print $1}' | xargs kubectl delete crd
```

## Installing Into a Different Namespace

If you cannot remove the existing namespace, install into a new one:

```bash
helm install dapr dapr/dapr \
  --namespace my-dapr-system \
  --create-namespace \
  --wait
```

The Helm chart automatically configures the sidecar injector and all control plane components in the new namespace. No additional per-app annotations are needed - the sidecar injector webhook will point injected `daprd` sidecars to the correct control plane address.

## Resolving CRD Conflicts

If CRDs conflict between versions, force the update:

```bash
# Update CRDs manually before upgrading
kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v1.14.0/charts/dapr/crds/components.yaml
kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v1.14.0/charts/dapr/crds/configuration.yaml
kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v1.14.0/charts/dapr/crds/subscription.yaml
kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v1.14.0/charts/dapr/crds/resiliency.yaml
kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v1.14.0/charts/dapr/crds/httpendpoints.yaml
```

Then run the Helm upgrade:

```bash
helm upgrade dapr dapr/dapr -n dapr-system --reuse-values
```

## Helm Release Stuck in Pending State

If the Helm release is stuck:

```bash
helm list -n dapr-system -a
helm rollback dapr -n dapr-system
```

Or delete the stuck release and reinstall:

```bash
helm delete dapr -n dapr-system
helm install dapr dapr/dapr -n dapr-system --create-namespace --wait
```

## Summary

Dapr namespace conflicts during installation stem from leftover resources, stale CRDs, or mixed installation methods. Always perform a complete cleanup with `dapr uninstall -k --all` and remove CRDs manually before reinstalling. Use Helm for production installs and maintain a consistent installation method to avoid future conflicts.
