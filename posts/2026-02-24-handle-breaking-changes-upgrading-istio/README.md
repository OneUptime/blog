# How to Handle Breaking Changes When Upgrading Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Breaking Changes, Migration

Description: How to identify, prepare for, and handle breaking changes when upgrading Istio versions, with real examples of common breaking changes and fixes.

---

Every Istio upgrade carries the possibility of breaking changes. An API field gets removed. A default value changes. A deprecated feature is finally dropped. If you do not catch these before upgrading, you end up debugging production issues at 2 AM. The good news is that Istio documents its breaking changes well, and there are systematic ways to find and fix them before they cause problems.

## Where to Find Breaking Changes

Istio publishes breaking changes in several places:

1. **Release notes** for each version at istio.io/latest/news/releases
2. **Upgrade notes** that specifically call out what changed between versions
3. **Deprecation notices** that give advance warning of upcoming removals

Before any upgrade, read the upgrade notes for your target version. This is not optional and not something to skim. Read them carefully, compare each item against your configuration, and make a list of things you need to address.

## Common Types of Breaking Changes

### API Field Removals

Istio follows a deprecation cycle. A field gets deprecated in version N, triggers a warning in version N+1, and gets removed in version N+2. If you ignored the deprecation warnings, the removal breaks your config.

Example: The `meshConfig.disablePolicyChecks` field was deprecated and later removed. If your IstioOperator still references it:

```yaml
# This will cause an error after the upgrade
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    disablePolicyChecks: true  # Removed field
```

Fix: Remove the field from your configuration before upgrading.

### Default Value Changes

Sometimes Istio changes the default value of a setting. Your workloads may depend on the old default without you realizing it.

Example: If the default mTLS mode changes from PERMISSIVE to STRICT, services without proper certificates will stop being able to communicate.

Check your current effective configuration:

```bash
# See what PeerAuthentication policies exist
kubectl get peerauthentication --all-namespaces

# If you have no explicit policy, you are using the default
```

Fix: If you depend on a specific behavior, set it explicitly rather than relying on defaults:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

### CRD API Version Changes

Istio resources may move between API versions. For example, moving from `v1alpha3` to `v1beta1` to `v1`.

```bash
# Check which API versions your resources use
kubectl get virtualservices --all-namespaces -o jsonpath='{range .items[*]}{.apiVersion}{"\n"}{end}' | sort | uniq
```

If you see older API versions like `networking.istio.io/v1alpha3`, check whether the new Istio version still supports them. Usually Istio maintains backward compatibility for API versions, but eventually old versions get dropped.

### Feature Flag Changes

Features that were behind experimental flags may become default-on or default-off:

```yaml
# Example: a feature that was opt-in becomes opt-out
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"  # Was opt-in, now default
```

After upgrading, the flag might not be needed anymore, or the behavior it controlled might have changed.

## Pre-Upgrade Analysis Process

### Step 1: Export Current Configuration

```bash
# Get your IstioOperator or Helm values
kubectl get istiooperator -n istio-system -o yaml > current-config.yaml

# Get all Istio resources
kubectl get vs,dr,gw,se,pa,ra,ef,sidecar --all-namespaces -o yaml > all-resources.yaml
```

### Step 2: Run Pre-Check

```bash
# Use the NEW version of istioctl
istioctl x precheck
```

The precheck command catches many issues:

```text
✔ No issues found when checking the cluster. Istio is safe to install or upgrade!
  To get started, check out https://istio.io/latest/docs/setup/getting-started/
```

Or it might warn you:

```text
Warning [IST0152] (DestinationRule default/reviews) This resource is using a deprecated field
```

### Step 3: Validate Resources Against New Schema

Generate the manifest for the new version and check for conflicts:

```bash
# Generate what the new version would install
istioctl manifest generate --set profile=default > new-manifest.yaml

# Compare with current installation
istioctl manifest diff current-manifest.yaml new-manifest.yaml
```

### Step 4: Check Deprecation Warnings

Look at your current istiod logs for deprecation warnings that the current version is already generating:

```bash
kubectl logs -n istio-system -l app=istiod | grep -i "deprecat"
```

These warnings tell you what will break in the next version.

## Fixing Breaking Changes Before Upgrading

### Updating Istio Resources

If a VirtualService uses a deprecated field, update it:

```yaml
# Old - using deprecated field
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-route
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v1
      appendHeaders:  # Deprecated field
        x-custom: "value"
```

```yaml
# New - using replacement field
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-route
spec:
  hosts:
  - reviews
  http:
  - headers:
      request:
        set:
          x-custom: "value"
    route:
    - destination:
        host: reviews
        subset: v1
```

Apply the updated resource:

```bash
kubectl apply -f updated-virtualservice.yaml
```

### Updating IstioOperator Configuration

If your IstioOperator uses removed fields:

```bash
# Validate your operator config against the new version
istioctl validate -f current-config.yaml
```

Remove or replace deprecated fields. Test the updated config in staging before applying to production.

### Updating Helm Values

If you use Helm, the values schema might change between versions. Compare your values against the new chart:

```bash
# See what values the new chart accepts
helm show values istio/istiod --version 1.21.0 > new-chart-values.yaml

# Compare with your current values
diff production-values.yaml new-chart-values.yaml
```

## Building a Breaking Changes Checklist

For each upgrade, create a checklist like this:

```text
## Upgrade from 1.20 to 1.21 - Breaking Changes Checklist

- [ ] Read upgrade notes: https://istio.io/latest/news/releases/1.21.x/
- [ ] Run `istioctl x precheck` with new version
- [ ] Check for deprecated API fields in VirtualServices
- [ ] Check for deprecated API fields in DestinationRules
- [ ] Verify IstioOperator config has no removed fields
- [ ] Check default value changes in meshConfig
- [ ] Review EnvoyFilter compatibility
- [ ] Test in staging environment
- [ ] Document all changes made for audit trail
```

## EnvoyFilter Compatibility

EnvoyFilters deserve special attention because they directly manipulate the Envoy proxy configuration. When Istio upgrades the bundled Envoy version, the Envoy API may change, and your EnvoyFilters can silently break.

```bash
# List all EnvoyFilters
kubectl get envoyfilters --all-namespaces
```

For each EnvoyFilter, check that:

- The Envoy API version it targets still exists
- The filter names have not changed
- The configuration structure has not been modified

EnvoyFilters are the most fragile part of any Istio upgrade because they bypass Istio's abstraction layer and interact directly with Envoy.

## Communicating Breaking Changes to Your Team

When you identify breaking changes that affect your organization, communicate them clearly:

- What is changing and why
- What teams or services are affected
- What action each team needs to take
- When the changes need to be complete by
- How to test that the fix works

Give teams enough lead time to make their changes. Rushing breaking change fixes at the last minute leads to mistakes.

## Summary

Handling breaking changes during Istio upgrades is about preparation, not reaction. Read the release notes, run pre-checks with the new version, audit your resources for deprecated fields, and fix everything before you upgrade. Pay special attention to EnvoyFilters, default value changes, and API version shifts. Testing in staging catches what automated checks miss. Take the time to do it right, and your production upgrades will be boring - which is exactly what you want.
