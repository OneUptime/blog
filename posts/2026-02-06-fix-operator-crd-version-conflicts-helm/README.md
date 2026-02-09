# How to Fix OpenTelemetry Operator CRD Version Conflicts After Upgrading the Operator Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Operator, CRD, Helm

Description: Resolve CRD version conflicts that occur after upgrading the OpenTelemetry Operator Helm chart to a newer version.

Upgrading the OpenTelemetry Operator via Helm should be straightforward, but CRD (Custom Resource Definition) version conflicts can turn it into a headache. Helm does not upgrade CRDs by default, which means your Operator binary expects one CRD schema while the cluster has an older one. This post walks through the problem and the cleanest solutions.

## The Problem

Helm has a well-known limitation: it installs CRDs on the first `helm install` but does not update them on subsequent `helm upgrade` calls. This is by design to prevent accidental data loss, but it causes version skew.

```bash
# After upgrading the Operator Helm chart, you might see:
kubectl logs -n opentelemetry-operator-system deployment/opentelemetry-operator-controller-manager

# Error: "no kind \"OpenTelemetryCollector\" is registered for version
# \"opentelemetry.io/v1beta1\" in scheme"
# Or:
# "the server could not find the requested resource (post opentelemetrycollectors.opentelemetry.io)"
```

This happens because the new Operator expects `v1beta1` CRDs but the cluster still has `v1alpha1`.

## Step 1: Check Current CRD Versions

```bash
# List all OpenTelemetry CRDs
kubectl get crd | grep opentelemetry

# Check the stored versions of a specific CRD
kubectl get crd opentelemetrycollectors.opentelemetry.io -o jsonpath='{.status.storedVersions}'
# Output: ["v1alpha1"]  <- old version

# Check what versions are served
kubectl get crd opentelemetrycollectors.opentelemetry.io \
  -o jsonpath='{.spec.versions[*].name}'
# Output: v1alpha1  <- missing v1beta1
```

## Step 2: Manually Upgrade the CRDs

The safest approach is to apply the CRDs from the new Helm chart version manually:

```bash
# Option 1: Apply CRDs from the chart's crds/ directory
helm pull open-telemetry/opentelemetry-operator --untar
kubectl apply -f opentelemetry-operator/crds/

# Option 2: Apply CRDs directly from the GitHub release
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/download/v0.95.0/opentelemetry-operator-crds.yaml
```

Verify the CRDs are updated:

```bash
kubectl get crd opentelemetrycollectors.opentelemetry.io \
  -o jsonpath='{.spec.versions[*].name}'
# Output: v1alpha1 v1beta1  <- both versions now available
```

## Step 3: Upgrade the Helm Chart

Now upgrade the Operator:

```bash
helm upgrade opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  --wait
```

## Automating CRD Updates

To avoid this problem in the future, add a pre-upgrade step to your CI/CD pipeline:

```bash
#!/bin/bash
# pre-upgrade-crds.sh

CHART_VERSION="0.95.0"  # Match your target Helm chart version

# Pull the chart to get the CRDs
helm pull open-telemetry/opentelemetry-operator \
  --version "$CHART_VERSION" \
  --untar \
  --untardir /tmp/otel-operator

# Apply CRDs before upgrading
kubectl apply --server-side -f /tmp/otel-operator/opentelemetry-operator/crds/

# Clean up
rm -rf /tmp/otel-operator

# Now upgrade the chart
helm upgrade opentelemetry-operator open-telemetry/opentelemetry-operator \
  --version "$CHART_VERSION" \
  --namespace opentelemetry-operator-system \
  --wait
```

The `--server-side` flag with `kubectl apply` handles CRD updates more gracefully than client-side apply.

## Handling Stored Version Migration

After upgrading CRDs, you might need to migrate existing custom resources from the old version to the new one. The Operator should handle this automatically via conversion webhooks, but you can verify:

```bash
# List existing OpenTelemetryCollector resources
kubectl get opentelemetrycollectors -A

# Check if they are accessible via the new API version
kubectl get opentelemetrycollectors.v1beta1.opentelemetry.io -A

# If the above fails, the conversion webhook might not be working
kubectl logs -n opentelemetry-operator-system \
  deployment/opentelemetry-operator-controller-manager | grep -i "convert\|migration"
```

## Fixing Stuck CRDs

Sometimes CRDs get stuck in a bad state. If `kubectl apply` fails on the CRD:

```bash
# Check for conflicts
kubectl diff -f opentelemetry-operator/crds/

# Force replace the CRD (caution: this can cause brief disruption)
kubectl replace -f opentelemetry-operator/crds/

# If the CRD has a finalizer preventing updates
kubectl patch crd opentelemetrycollectors.opentelemetry.io \
  --type=json -p='[{"op": "remove", "path": "/metadata/finalizers"}]'
```

## Rollback Plan

If the upgrade goes wrong, you can rollback the Helm release, but you also need to restore the old CRDs:

```bash
# Rollback the Operator
helm rollback opentelemetry-operator 1 -n opentelemetry-operator-system

# Restore old CRDs from the previous chart version
helm pull open-telemetry/opentelemetry-operator --version "PREVIOUS_VERSION" --untar
kubectl apply --server-side -f opentelemetry-operator/crds/
```

## Best Practices

1. Always read the Operator release notes before upgrading, especially for major version bumps.
2. Test CRD upgrades in a staging cluster first.
3. Include CRD application in your upgrade scripts, not just Helm upgrade.
4. Use `kubectl apply --server-side` for CRD updates to handle field ownership properly.
5. Keep your Operator and CRD versions in sync at all times.

CRD version conflicts are an artifact of Helm's design decisions. Once you build the CRD update step into your upgrade process, it becomes routine rather than a surprise.
