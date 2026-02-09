# How to Troubleshoot Helm Chart Upgrade Failures Due to Selector Label Breaking Changes in v0.110.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Helm, Kubernetes

Description: Fix Helm chart upgrade failures for the OpenTelemetry Collector caused by immutable selector label changes in chart version 0.110.0.

You run `helm upgrade` for the OpenTelemetry Collector and get:

```
Error: UPGRADE FAILED: cannot patch "otel-collector" with kind Deployment:
Deployment.apps "otel-collector" is invalid: spec.selector:
Invalid value: ...: field is immutable
```

Kubernetes does not allow changing the `spec.selector.matchLabels` on an existing Deployment. When the Helm chart changes these labels between versions, the upgrade fails.

## Why Selector Labels Are Immutable

Kubernetes uses selector labels to match Deployments with their Pods. Changing the selector would orphan existing Pods and could cause unpredictable behavior. Kubernetes prevents this by making the selector immutable after creation.

The OpenTelemetry Collector Helm chart changed its default selector labels in version 0.110.0. If you installed with an older chart version and try to upgrade to 0.110.0+, the label change causes the upgrade to fail.

## The Label Change

```yaml
# Before v0.110.0
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: opentelemetry-collector
      app.kubernetes.io/instance: otel-collector

# After v0.110.0 (example - check actual chart for exact labels)
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: otel-collector
      app.kubernetes.io/instance: otel-collector
      app.kubernetes.io/component: standalone
```

## Fix 1: Delete and Recreate the Deployment

The safest approach is to delete the existing Deployment and let Helm recreate it:

```bash
# Step 1: Get the current Helm values
helm get values otel-collector -o yaml > current-values.yaml

# Step 2: Delete the Deployment (NOT helm uninstall)
kubectl delete deployment otel-collector

# Step 3: Run the upgrade - Helm will create a new Deployment
helm upgrade otel-collector open-telemetry/opentelemetry-collector \
  -f current-values.yaml \
  --version 0.110.0
```

During the delete/recreate window, there is a brief period where the Collector is not running. Plan for this during a maintenance window.

## Fix 2: Use the --force Flag (With Caution)

The `--force` flag tells Helm to delete and recreate resources that cannot be patched:

```bash
helm upgrade otel-collector open-telemetry/opentelemetry-collector \
  -f values.yaml \
  --version 0.110.0 \
  --force
```

This has the same effect as manually deleting the Deployment, but Helm handles it automatically. There will still be a brief downtime.

## Fix 3: Override Selector Labels

If you want a zero-downtime upgrade, override the chart's selector labels to match the old ones:

```yaml
# values.yaml - override labels to match old chart
podLabels:
  app.kubernetes.io/name: opentelemetry-collector
  app.kubernetes.io/instance: otel-collector

# Some charts expose selector label overrides
nameOverride: opentelemetry-collector
```

Check the chart's `values.yaml` for the exact keys that control selector labels.

## Fix 4: Blue-Green Deployment

Deploy the new version as a separate release, switch traffic, then remove the old one:

```bash
# Step 1: Install new version with a different release name
helm install otel-collector-new open-telemetry/opentelemetry-collector \
  -f values.yaml \
  --version 0.110.0

# Step 2: Verify the new Collector is working
kubectl get pods -l app.kubernetes.io/instance=otel-collector-new
kubectl logs -l app.kubernetes.io/instance=otel-collector-new

# Step 3: Update your applications to point to the new Collector Service
# (or update the Service selector to match the new Deployment)

# Step 4: Remove the old release
helm uninstall otel-collector
```

## Preventing This in the Future

### Pin Chart Versions

Always specify the chart version in your Helm commands and CI/CD:

```bash
helm upgrade otel-collector open-telemetry/opentelemetry-collector \
  --version 0.110.0  # pin to a specific version
```

### Test Upgrades in Staging First

Before upgrading production, test in a staging environment:

```bash
# Staging
helm upgrade otel-collector-staging open-telemetry/opentelemetry-collector \
  -f staging-values.yaml \
  --version 0.110.0 \
  --dry-run
```

The `--dry-run` flag shows what changes would be made without applying them. Check for selector label changes in the output.

### Review Chart Changelog

Before upgrading, check the chart changelog:

```bash
# Check chart version history
helm search repo open-telemetry/opentelemetry-collector --versions

# View chart notes for a specific version
helm show readme open-telemetry/opentelemetry-collector --version 0.110.0
```

### Use an Explicit Selector Override

To protect against future label changes, explicitly set selector labels in your values:

```yaml
# values.yaml
selectorLabels:
  app: otel-collector
  release: production
```

By controlling the selector labels yourself, chart upgrades cannot change them.

## Summary

Helm chart selector label changes cause upgrade failures because Kubernetes does not allow modifying Deployment selectors. The fix is to either delete and recreate the Deployment, use `--force`, or override the labels. Always test chart upgrades in staging and pin chart versions in production to avoid surprises.
