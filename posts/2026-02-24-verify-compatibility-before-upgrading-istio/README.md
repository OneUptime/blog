# How to Verify Compatibility Before Upgrading Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Compatibility, Pre-Upgrade

Description: A thorough pre-upgrade compatibility checklist for Istio covering Kubernetes version support, CRD compatibility, proxy versions, and add-on integrations.

---

The worst time to discover a compatibility issue is during a production upgrade. Istio has dependencies on the Kubernetes version, its own CRDs, the Envoy proxy version, and various add-ons. Checking compatibility before you even begin the upgrade process avoids the nasty surprises that lead to rollbacks and late-night debugging sessions.

Here is a complete compatibility verification process you should run before every Istio upgrade.

## Check Kubernetes Version Compatibility

Every Istio release supports specific Kubernetes versions. Running Istio on an unsupported Kubernetes version can cause subtle issues that are hard to diagnose.

Check your Kubernetes version:

```bash
kubectl version --short
```

Then check the Istio support matrix. Istio publishes supported Kubernetes versions for each release in its documentation. As a general rule:

- Istio 1.20 supports Kubernetes 1.25 through 1.28
- Istio 1.21 supports Kubernetes 1.26 through 1.29
- Istio 1.22 supports Kubernetes 1.27 through 1.30

(Check the official docs for your specific version - these numbers change with each release.)

If your Kubernetes version is outside the supported range, you either need to upgrade Kubernetes first or choose a different Istio version.

## Run the Pre-Check Tool

Istio provides a built-in pre-check command that catches common issues:

```bash
# Use the NEW version of istioctl (the one you plan to upgrade to)
export PATH=$PWD/istio-1.21.0/bin:$PATH

istioctl x precheck
```

This command checks for:

- Kubernetes version compatibility
- Deprecated Istio resource usage
- API version compatibility
- Configuration issues that would cause problems after upgrade
- Certificate expiration

Example output:

```
✔ No issues found when checking the cluster. Istio is safe to install or upgrade!
```

Or with warnings:

```
Warning [IST0152] (DestinationRule default/my-rule) This resource is using a deprecated API version.
Warning [IST0135] (Gateway default/my-gateway) This resource has a conflict with another Gateway resource.
Error [IST0101] (VirtualService default/my-vs) Referenced host "unknown-service" not found.
```

Fix all errors and address warnings before proceeding.

## Verify CRD Compatibility

Istio CRDs evolve between versions. New fields are added, old ones are deprecated, and occasionally CRDs are removed entirely.

List your current CRDs:

```bash
kubectl get crds | grep istio.io
```

Check what versions are stored:

```bash
for crd in $(kubectl get crds -o name | grep istio.io); do
  echo "$crd:"
  kubectl get $crd -o jsonpath='{.spec.versions[*].name}'
  echo ""
done
```

Compare this against what the new Istio version expects. Generate the new manifests and look at CRD definitions:

```bash
istioctl manifest generate --set profile=default | grep "kind: CustomResourceDefinition" -A 20
```

Watch for:

- CRDs that exist in your cluster but are not in the new version (they may have been removed)
- CRDs in the new version that do not exist in your cluster yet (they will be created during upgrade)
- Stored version changes (e.g., moving from v1alpha3 to v1beta1 as the stored version)

## Check Existing Istio Resources

Your VirtualServices, DestinationRules, and other Istio resources need to be compatible with the new version.

### Validate Resources Against New Schema

```bash
# Export all resources
kubectl get vs,dr,gw,se,pa,ra,ef,sidecar --all-namespaces -o yaml > all-resources.yaml

# Validate against new version
istioctl validate -f all-resources.yaml
```

If validation fails, fix the resources before upgrading.

### Check for Deprecated Fields

The Istio analyzer catches many deprecation issues:

```bash
istioctl analyze --all-namespaces
```

Pay special attention to warnings about deprecated fields. These might still work in the target version but could be removed in the next one.

### EnvoyFilter Compatibility

EnvoyFilters are the most fragile resource type during upgrades because they directly reference Envoy internals that change between Envoy versions (which change between Istio versions).

```bash
kubectl get envoyfilters --all-namespaces -o yaml
```

For each EnvoyFilter, check:

- Does the target Envoy version still support the filter name?
- Has the configuration structure changed?
- Are the patching operations still valid?

There is no automated way to check this. You need to compare your EnvoyFilter configs against the Envoy changelog for the version bundled with the target Istio release.

## Verify Proxy Version Skew

Check the current proxy versions in your cluster:

```bash
istioctl proxy-status -o json | jq -r '.[] | .proxy.istioVersion' | sort | uniq -c
```

If you already have proxies running mixed versions, make sure the upgrade will not push the version skew beyond one minor version:

```
Current: CP 1.20, DP 1.19-1.20
After upgrade: CP 1.21, DP 1.19-1.21
Problem: 1.19 is now two minor versions behind
```

In this case, upgrade the 1.19 proxies to 1.20 first, then upgrade the control plane.

## Check Add-on and Integration Compatibility

### Prometheus

If you are scraping Istio metrics with Prometheus, check if metric names or labels changed:

```bash
# Check current scrape targets
kubectl get configmap prometheus -n monitoring -o yaml | grep istio
```

Some Istio versions rename or restructure metrics. Check the release notes for telemetry changes.

### Grafana Dashboards

Istio's built-in Grafana dashboards may change between versions. If you are using custom dashboards, verify the metric queries still work.

### Kiali

Kiali versions are tied to specific Istio versions. Check the Kiali compatibility matrix:

```bash
# Check current Kiali version
kubectl get deployment kiali -n istio-system -o jsonpath='{.spec.template.spec.containers[0].image}'
```

You may need to upgrade Kiali alongside Istio.

### Jaeger / Zipkin

If you are using distributed tracing, verify the trace propagation headers and format are still compatible:

```bash
# Check tracing configuration
kubectl get configmap istio -n istio-system -o yaml | grep -A5 tracing
```

### cert-manager Integration

If you are using cert-manager for Istio certificates instead of the built-in CA:

```bash
kubectl get certificate -n istio-system
```

Verify the certificate configuration is still valid for the new Istio version.

## Test Helm Chart Compatibility

If you use Helm, check that your values file is compatible with the new chart:

```bash
# Download the new chart values
helm show values istio/istiod --version 1.21.0 > new-default-values.yaml

# Compare with your values
diff production-values.yaml new-default-values.yaml
```

Look for:

- Values that were renamed or moved
- New required values
- Default value changes that affect your configuration

Validate your values against the new chart without actually installing:

```bash
helm template istiod istio/istiod -n istio-system --version 1.21.0 -f production-values.yaml > /dev/null
```

If this errors out, your values file needs updating.

## Check Network Policy Compatibility

If you have NetworkPolicies that reference Istio ports or services:

```bash
kubectl get networkpolicies --all-namespaces -o yaml | grep -A10 "15012\|15014\|15017\|15021"
```

Verify the Istio ports have not changed in the new version. Common Istio ports:

- 15012: istiod webhook
- 15014: istiod metrics
- 15017: istiod injection webhook
- 15021: sidecar health check
- 15090: proxy metrics

## Create a Compatibility Report

Document your findings in a report before proceeding:

```
## Istio Upgrade Compatibility Report
## Current: 1.20.5 -> Target: 1.21.0

### Kubernetes Version
- Current: 1.28.3
- Supported: Yes (1.21 supports 1.26-1.29)

### Pre-Check Results
- Status: PASS
- Warnings: 2 deprecated fields in DestinationRules
- Action: Update DestinationRules before upgrade

### CRD Compatibility
- New CRDs: None
- Removed CRDs: None
- Changed CRDs: VirtualService (new field added)

### Resource Validation
- VirtualServices: 45/45 valid
- DestinationRules: 43/45 valid (2 need updates)
- EnvoyFilters: 3/3 need manual review

### Proxy Version Skew
- All proxies at 1.20.5 - OK for upgrade

### Add-on Compatibility
- Prometheus: Compatible
- Kiali: Needs upgrade to 1.75+
- Jaeger: Compatible

### Helm Values
- 2 deprecated values need updating
- New default for holdApplicationUntilProxyStarts

### Conclusion
- Fix 2 DestinationRules
- Update Helm values
- Upgrade Kiali
- Then proceed with Istio upgrade
```

## Summary

Verifying compatibility before an Istio upgrade involves checking Kubernetes version support, running the pre-check tool, validating existing Istio resources, checking proxy version skew, verifying add-on compatibility, and testing Helm chart values. Take the time to work through each check systematically. Finding a compatibility issue during planning costs you a few hours of work. Finding it during a production upgrade costs you much more.
