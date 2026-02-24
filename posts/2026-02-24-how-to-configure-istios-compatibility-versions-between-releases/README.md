# How to Configure Istio's Compatibility Versions Between Releases

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Upgrades, Compatibility, Kubernetes, Service Mesh

Description: How to use Istio's compatibility versions feature to maintain backward-compatible behavior during upgrades and manage breaking changes across releases.

---

Upgrading Istio between minor versions sometimes introduces behavioral changes that can break things. A new default setting here, a changed API behavior there, and suddenly your carefully tuned mesh is acting differently. Istio's compatibility versions feature gives you a way to upgrade the binary while keeping the old behavior, then gradually opt into new defaults on your own schedule.

## The Problem with Upgrades

Each Istio release can change default behaviors. For example:

- mTLS mode might switch from PERMISSIVE to STRICT
- Proxy protocol detection might change
- Header handling or routing precedence might be adjusted
- New security defaults might be enabled

When you upgrade from 1.23 to 1.24, you get all of 1.24's new defaults at once. If something breaks, it can be hard to figure out which change caused the issue.

## What Are Compatibility Versions?

Compatibility versions let you run Istio 1.24 with 1.23 behavior. You get the new binary (with bug fixes and security patches) but the behavioral defaults from the previous version. Then you can switch individual features to the new behavior one at a time.

This is configured through the `compatibilityVersion` field in the mesh configuration.

## Setting the Compatibility Version

### With istioctl

```yaml
# istio-compat.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    pilot:
      env:
        ISTIO_DELTA_XDS: "false"
    compatibilityVersion: "1.23"
```

```bash
istioctl install -f istio-compat.yaml -y
```

### With Helm

```yaml
# values-compat.yaml
compatibilityVersion: "1.23"

pilot:
  env:
    ISTIO_DELTA_XDS: "false"
```

```bash
helm upgrade istiod istio/istiod -n istio-system \
  -f values-compat.yaml \
  --version 1.24.0
```

## Understanding What Changes Between Versions

To see what behavioral changes exist between versions, check the Istio release notes. Here are some common categories of changes:

### Traffic Management Changes

Between releases, Istio might change:

- How protocol sniffing works
- Default timeout values
- How HTTP/2 upgrade is handled
- Route matching precedence

### Security Changes

Common security-related changes:

- Default mTLS mode
- Trust domain validation behavior
- Auto mTLS for TCP traffic
- Minimum TLS version

### Telemetry Changes

- Default metrics exposed
- Tracing sampling rates
- Access log format

## Gradual Migration Strategy

The recommended approach for upgrades:

### Phase 1: Upgrade with Compatibility

Upgrade Istio but keep old behavior:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    compatibilityVersion: "1.23"
```

Restart your workload pods to get the new proxy version:

```bash
kubectl rollout restart deployment -n my-app
```

At this point, you are running the new Istio binary with old behavior. Everything should work exactly as before.

### Phase 2: Test New Defaults in Staging

In your staging environment, remove the compatibility version to test new defaults:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  # No compatibilityVersion set - use current defaults
  meshConfig:
    accessLogFile: /dev/stdout
```

Run your test suite and verify nothing breaks.

### Phase 3: Selectively Enable New Features

If full new-defaults break something, you can enable individual features while keeping the compatibility version:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    compatibilityVersion: "1.23"
  meshConfig:
    # Explicitly opt into specific new behaviors
    defaultConfig:
      holdApplicationUntilProxyStarts: true
    enableAutoMtls: true
```

### Phase 4: Remove Compatibility Version

Once you have verified everything works with new defaults:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  # Clean configuration with current version defaults
  meshConfig:
    accessLogFile: /dev/stdout
```

## Checking Current Compatibility Settings

See what version your mesh is running with:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep compatibilityVersion
```

Check effective configuration:

```bash
istioctl proxy-config bootstrap deploy/my-app -n my-app | head -30
```

## Per-Namespace Override

You can run different namespaces with different compatibility settings using proxy annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: test
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            SOME_FEATURE_FLAG: "old_behavior"
    spec:
      containers:
        - name: app
          image: my-app:latest
```

This lets you test new behavior for specific workloads while keeping the rest of the mesh on old defaults.

## Skipping Versions

If you are upgrading across multiple minor versions (say from 1.21 to 1.24), set the compatibility version to your starting version:

```yaml
values:
  compatibilityVersion: "1.21"
```

Then gradually step through each version's changes. This is safer than jumping straight to the latest defaults.

## Monitoring for Issues After Changing Defaults

After removing the compatibility version, watch for:

**Increased error rates**:

```bash
kubectl exec -n my-app deploy/my-app -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_rq_5xx"
```

**Connection failures**:

```bash
kubectl exec -n my-app deploy/my-app -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_cx_connect_fail"
```

**mTLS handshake failures**:

```bash
kubectl exec -n my-app deploy/my-app -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "ssl.connection_error"
```

Run istioctl analysis to check for newly detected issues:

```bash
istioctl analyze -A
```

## Version Support Matrix

Keep in mind that compatibility versions are only supported for a limited range. Typically Istio supports the previous minor version's compatibility mode. You cannot set `compatibilityVersion: "1.18"` on Istio 1.24 and expect it to work.

Check the official Istio release notes for the specific compatibility range your version supports.

## Example: Upgrading from 1.23 to 1.24

Here is a complete real-world workflow:

```bash
# Step 1: Upgrade with compatibility
helm upgrade istiod istio/istiod -n istio-system \
  --set compatibilityVersion=1.23 \
  --version 1.24.0

# Step 2: Restart proxies to get new version
kubectl rollout restart deployment -n my-app

# Step 3: Verify everything works
istioctl analyze -n my-app
istioctl proxy-status

# Step 4: Remove compatibility in staging first
helm upgrade istiod-staging istio/istiod -n istio-system-staging \
  --version 1.24.0  # no compatibilityVersion

# Step 5: After testing, remove from production
helm upgrade istiod istio/istiod -n istio-system \
  --version 1.24.0  # no compatibilityVersion

# Step 6: Restart proxies again
kubectl rollout restart deployment -n my-app
```

## Wrapping Up

Compatibility versions are a safety net for Istio upgrades. They let you decouple the binary upgrade from behavioral changes, which dramatically reduces the risk of upgrades breaking things. Use them for every minor version upgrade, verify the new defaults in a non-production environment, and remove the compatibility flag only after thorough testing. It adds one extra step to the upgrade process but can save hours of troubleshooting.
