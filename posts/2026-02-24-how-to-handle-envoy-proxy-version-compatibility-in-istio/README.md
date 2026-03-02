# How to Handle Envoy Proxy Version Compatibility in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Upgrade, Compatibility, Kubernetes

Description: A practical guide to managing Envoy proxy version compatibility during Istio upgrades, including version skew policies, canary upgrades, and debugging version mismatches.

---

Every Istio release bundles a specific version of Envoy proxy. When you upgrade Istio, you're also upgrading every sidecar in your mesh to a new Envoy version. This can break things if you're not careful, especially if you're using EnvoyFilters that reference specific Envoy APIs or if you have a large mesh where not all sidecars get updated at the same time.

## Istio and Envoy Version Mapping

Each Istio release pins a specific Envoy version. You can check which Envoy version your current Istio is running:

```bash
# Check the Envoy version in a sidecar
kubectl exec -it <pod-name> -c istio-proxy -- envoy --version
```

Or check the istiod version:

```bash
istioctl version
```

This shows both the client (istioctl), control plane (istiod), and data plane (proxy) versions. If these don't match, you have a version skew.

## Version Skew Policy

Istio officially supports a version skew of N-1 between the control plane and data plane. This means if your control plane is running Istio 1.24, your sidecars can be running either 1.24 or 1.23. Anything older than that is unsupported and might break.

In practice, this means:

- You can upgrade istiod first and leave sidecars running the old version temporarily
- You should upgrade sidecars within a reasonable window after upgrading the control plane
- You should never have sidecars running a newer version than the control plane

Check for version mismatches across your mesh:

```bash
istioctl proxy-status
```

This shows every sidecar and its sync status with the control plane. Look for the `PROXY-VERSION` column:

```
NAME                                    CLUSTER        CDS    LDS    EDS    RDS    ECDS   ISTIOD                     PROXY-VERSION
frontend-7b9d8c5f66-abc12.production    Kubernetes     SYNCED SYNCED SYNCED SYNCED        istiod-5d4f8b6c99-xyz.     1.24.0
backend-6c7d9e4f55-def34.production     Kubernetes     SYNCED SYNCED SYNCED SYNCED        istiod-5d4f8b6c99-xyz.     1.23.2
```

If you see a mix of proxy versions, some pods haven't been restarted since the upgrade.

## Canary Upgrades

For large meshes, Istio supports canary upgrades where you run two versions of the control plane simultaneously. This lets you migrate sidecars gradually:

```bash
# Install the new version as a canary
istioctl install --set revision=1-24
```

This creates a new control plane with the revision label `1-24` alongside your existing one. You can then migrate namespaces one at a time:

```bash
# Label a namespace to use the new revision
kubectl label namespace staging istio.io/rev=1-24 --overwrite

# Remove the old injection label
kubectl label namespace staging istio-injection-

# Restart pods to get new sidecars
kubectl rollout restart deployment -n staging
```

Verify the pods got the new sidecar version:

```bash
istioctl proxy-status | grep staging
```

Once all namespaces are migrated, remove the old control plane:

```bash
istioctl uninstall --revision=default
```

## EnvoyFilter Compatibility

EnvoyFilters are the biggest source of breakage during upgrades because they reference Envoy's internal API directly. When the Envoy version changes, API fields might be renamed, deprecated, or removed.

Before upgrading, audit your EnvoyFilters:

```bash
kubectl get envoyfilter --all-namespaces
```

Then check each one against the new Envoy version's API documentation. Common breaking changes include:

- TypedConfig type URLs changing (e.g., `envoy.config.filter.network.http_connection_manager.v2` becoming `envoy.extensions.filters.network.http_connection_manager.v3`)
- Filter names changing (e.g., `envoy.http_connection_manager` becoming `envoy.filters.network.http_connection_manager`)
- Configuration field names changing

You can test EnvoyFilter compatibility without upgrading the whole mesh by applying the filter in a test namespace with the new sidecar version.

## Checking Configuration Validity

After an upgrade, verify that Envoy is accepting the configuration without errors:

```bash
# Check for config rejection
istioctl proxy-status
```

If the `CDS`, `LDS`, `EDS`, or `RDS` columns show `STALE` instead of `SYNCED`, Envoy rejected the configuration update. This usually means the config references something that's not valid in the new Envoy version.

Get more details:

```bash
istioctl proxy-config log <pod-name> -n <namespace> --level config:debug
```

Then check the sidecar logs for rejection errors:

```bash
kubectl logs <pod-name> -c istio-proxy | grep -i "rejected\|error\|invalid"
```

## Handling Mixed Versions During Rolling Updates

During a rolling deployment, you'll have pods running both old and new Envoy versions simultaneously. This is usually fine for traffic routing, but there are a few things to watch out for:

**Protocol negotiation** - Older and newer Envoy versions might negotiate different protocol versions (e.g., HTTP/2 vs HTTP/1.1) in some edge cases. Monitor for unexpected protocol downgrades.

**Feature flags** - New Envoy features might be enabled in the control plane configuration but not supported by older sidecar versions. The control plane handles this by checking the proxy version before pushing config, but EnvoyFilters bypass this check.

**mTLS handshake** - Different Envoy versions might support different TLS versions or cipher suites. Istio handles this gracefully, but if you've customized TLS settings, verify they work across both versions.

## Rollback Strategy

If an upgrade goes wrong, you need a rollback plan. Here's how to handle it:

**Rolling back sidecars:**

```bash
# If using revisions, switch back to the old revision
kubectl label namespace production istio.io/rev=1-23 --overwrite
kubectl rollout restart deployment -n production
```

**Rolling back the control plane:**

```bash
# If using revisions
istioctl install --set revision=1-23

# Or reinstall the old version
istioctl install --set tag=1.23.2
```

**Emergency: Disable sidecar injection temporarily:**

```bash
kubectl label namespace production istio-injection=disabled --overwrite
```

This stops new pods from getting sidecars, which is a nuclear option but can stabilize things quickly.

## Automated Compatibility Checks

Before upgrading, Istio provides an analyze command that catches common issues:

```bash
istioctl analyze --all-namespaces
```

You can also do a dry-run of the upgrade:

```bash
istioctl upgrade --dry-run
```

This shows what would change without actually applying anything.

For EnvoyFilter compatibility, you can validate individual filters:

```bash
istioctl experimental envoyfilter-check <pod-name> -n <namespace>
```

## Best Practices for Version Management

**Pin sidecar versions in production.** Use the `sidecar.istio.io/proxyImage` annotation to control exactly which image a sidecar uses:

```yaml
annotations:
  sidecar.istio.io/proxyImage: docker.io/istio/proxyv2:1.24.0
```

**Use revision-based upgrades for large meshes.** This gives you a controlled migration path and easy rollback.

**Test EnvoyFilters in a staging environment.** Deploy the new Istio version in staging first and verify all EnvoyFilters still work.

**Automate version checks.** Add a CI check that compares sidecar versions across your namespaces and alerts if the skew exceeds N-1.

**Document your Envoy customizations.** Keep a list of all EnvoyFilters and what they do. This makes upgrade planning much easier.

Version compatibility might seem tedious, but a botched Envoy upgrade in production can take down your entire mesh. Taking the time to plan upgrades carefully pays off every time.
