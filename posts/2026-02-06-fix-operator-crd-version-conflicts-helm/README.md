# How to Fix OpenTelemetry Operator CRD Version Conflicts After Upgrading the

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Operator, CRD, Helm

Description: Resolve CRD version conflicts that occur after upgrading the OpenTelemetry Operator Helm chart to a newer version.

Upgrading the OpenTelemetry Operator via Helm should be straightforward, but CRD (Custom Resource Definition) version conflicts can turn it into a headache. Helm does not upgrade CRDs installed from a chart's special `crds/` directory by default, and current OpenTelemetry Operator charts install templated CRDs that must be owned by the Helm release. If those CRDs are still unmanaged or were installed separately, your Operator binary can expect one CRD schema while the cluster has an older one. This post walks through the problem and the cleanest solutions.

## The Problem

Helm has a well-known limitation for CRDs in a chart's `crds/` directory: it installs them on the first `helm install` but does not update them on subsequent `helm upgrade` calls. In the OpenTelemetry Operator chart, this especially matters when upgrading from older chart versions where CRDs were not managed as Helm templates, or when you set `crds.create=false` and manage CRDs separately.

```bash
# After upgrading the Operator Helm chart, you might see:

kubectl logs -n opentelemetry-operator-system deployment/opentelemetry-operator-controller-manager

# Error: "no kind \"OpenTelemetryCollector\" is registered for version
# \"opentelemetry.io/v1beta1\" in scheme"
# Or:
# "the server could not find the requested resource (post opentelemetrycollectors.opentelemetry.io)"
```

This can happen because the new Operator expects the `OpenTelemetryCollector` CRD to serve `v1beta1`, but the cluster still has an older CRD that only serves `v1alpha1`.

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

The safest approach depends on how the CRDs are currently managed. For OpenTelemetry Operator chart upgrades from old CRDs that are not yet owned by Helm, first add the Helm ownership metadata documented by the chart:

```bash
# Option 1: Let the OpenTelemetry Operator chart manage existing CRDs
RELEASE_NAME=opentelemetry-operator
RELEASE_NAMESPACE=opentelemetry-operator-system

kubectl annotate crds \
  instrumentations.opentelemetry.io \
  opentelemetrycollectors.opentelemetry.io \
  opampbridges.opentelemetry.io \
  meta.helm.sh/release-name=${RELEASE_NAME} \
  meta.helm.sh/release-namespace=${RELEASE_NAMESPACE} \
  --overwrite

kubectl label crds \
  instrumentations.opentelemetry.io \
  opentelemetrycollectors.opentelemetry.io \
  opampbridges.opentelemetry.io \
  app.kubernetes.io/managed-by=Helm \
  --overwrite
```

If you intentionally keep CRDs outside Helm by setting `crds.create=false`, render the target chart version and apply the templated CRD manifests before the Helm upgrade:

```bash
# Option 2: Apply CRDs from the rendered chart output
CHART_VERSION="0.58.0"  # Match your target Helm chart version
RELEASE_NAME=opentelemetry-operator
RELEASE_NAMESPACE=opentelemetry-operator-system

helm template "$RELEASE_NAME" open-telemetry/opentelemetry-operator \
  --version "$CHART_VERSION" \
  --namespace "$RELEASE_NAMESPACE" \
  --show-only templates/admission-webhooks/operator-webhook.yaml \
  | kubectl apply --server-side -f -
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

CHART_VERSION="0.58.0"  # Match your target Helm chart version
RELEASE_NAME=opentelemetry-operator
RELEASE_NAMESPACE=opentelemetry-operator-system

# Pull the chart to render the templated CRDs with the release namespace
helm pull open-telemetry/opentelemetry-operator \
  --version "$CHART_VERSION" \
  --untar \
  --untardir /tmp/otel-operator

# Apply CRDs before upgrading
helm template "$RELEASE_NAME" /tmp/otel-operator/opentelemetry-operator \
  --namespace "$RELEASE_NAMESPACE" \
  --show-only templates/admission-webhooks/operator-webhook.yaml \
  | kubectl apply --server-side -f -

# Clean up
rm -rf /tmp/otel-operator

# Now upgrade the chart
helm upgrade opentelemetry-operator open-telemetry/opentelemetry-operator \
  --version "$CHART_VERSION" \
  --namespace "$RELEASE_NAMESPACE" \
  --wait
```

The `--server-side` flag with `kubectl apply` handles CRD updates more gracefully than client-side apply.

## Handling Stored Version Migration

After upgrading CRDs, existing custom resources can remain stored at the old storage version until they are rewritten. Kubernetes uses conversion webhooks to serve them through the requested API version, but you can verify:

```bash
# List existing OpenTelemetryCollector resources
kubectl get opentelemetrycollectors -A

# Check if they are accessible via the new API version
kubectl get opentelemetrycollectors.v1beta1.opentelemetry.io -A

# If the above fails, the conversion webhook might not be working
kubectl logs -n opentelemetry-operator-system \
  deployment/opentelemetry-operator-controller-manager | grep -i "convert\|migration"
```

To fully migrate storage to `v1beta1`, update and re-apply your `OpenTelemetryCollector` manifests with `apiVersion: opentelemetry.io/v1beta1`, then patch the CRD status after all objects have been rewritten:

```bash
kubectl patch customresourcedefinitions opentelemetrycollectors.opentelemetry.io \
  --subresource='status' \
  --type='merge' \
  -p '{"status":{"storedVersions":["v1beta1"]}}'
```

## Fixing Stuck CRDs

Sometimes CRDs get stuck in a bad state. If `kubectl apply` fails on the CRD:

```bash
# Check for conflicts using the same rendered chart output
helm template "$RELEASE_NAME" /tmp/otel-operator/opentelemetry-operator \
  --namespace "$RELEASE_NAMESPACE" \
  --show-only templates/admission-webhooks/operator-webhook.yaml \
  | kubectl diff -f -

# Force replace the CRD (caution: this can cause brief disruption)
helm template "$RELEASE_NAME" /tmp/otel-operator/opentelemetry-operator \
  --namespace "$RELEASE_NAMESPACE" \
  --show-only templates/admission-webhooks/operator-webhook.yaml \
  | kubectl replace -f -

# If the CRD is stuck deleting after you have backed up and removed its custom resources
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
helm template opentelemetry-operator ./opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  --show-only templates/admission-webhooks/operator-webhook.yaml \
  | kubectl apply --server-side -f -
```

## Best Practices

1. Always read the Operator release notes before upgrading, especially for major version bumps.
2. Test CRD upgrades in a staging cluster first.
3. Include CRD application in your upgrade scripts, not just Helm upgrade.
4. Use `kubectl apply --server-side` for CRD updates to handle field ownership properly.
5. Keep your Operator and CRD versions in sync at all times.

CRD version conflicts are an artifact of Helm's design decisions. Once you build the CRD update step into your upgrade process, it becomes routine rather than a surprise.
