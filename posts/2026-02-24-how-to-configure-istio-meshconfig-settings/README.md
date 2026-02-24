# How to Configure Istio MeshConfig Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MeshConfig, Configuration, Kubernetes, Service Mesh

Description: A comprehensive walkthrough of Istio MeshConfig settings covering how to view, modify, and apply mesh-wide configuration for your service mesh.

---

MeshConfig is the central configuration object for Istio. It controls mesh-wide behavior including proxy settings, access logging, tracing, traffic policies, and more. Understanding how to work with MeshConfig is essential because it affects every sidecar and gateway in your mesh.

## Where MeshConfig Lives

MeshConfig is stored in the `istio` ConfigMap in the `istio-system` namespace. You can view it with:

```bash
kubectl get configmap istio -n istio-system -o yaml
```

The mesh configuration is in the `mesh` key of the ConfigMap data. It is a YAML string that maps to the `MeshConfig` protobuf.

You can also set MeshConfig values during installation through the IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

Values set through IstioOperator end up in the same ConfigMap, but the IstioOperator approach is better for reproducibility and version control.

## Viewing Current MeshConfig

To see the effective mesh configuration in a readable format:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | yq .
```

Or with `istioctl`:

```bash
istioctl mesh-config
```

## Common MeshConfig Settings

Here are the settings you will most frequently need to adjust:

### Access Logging

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
  accessLogFormat: |
    [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
    %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT%
    %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%
    "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%"
    "%REQ(X-REQUEST-ID)%" "%REQ(:AUTHORITY)%" "%UPSTREAM_HOST%"
```

Setting `accessLogFile` to `/dev/stdout` enables access logs on all sidecars. The logs go to the sidecar container's stdout, where your log collection system can pick them up.

### Default Proxy Configuration

The `defaultConfig` section sets proxy-level defaults that apply to all sidecars unless overridden per workload:

```yaml
meshConfig:
  defaultConfig:
    holdApplicationUntilProxyStarts: true
    concurrency: 2
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"
    tracing:
      zipkin:
        address: zipkin.istio-system:9411
      sampling: 1.0
```

`holdApplicationUntilProxyStarts` is particularly important. When set to true, the application container waits for the sidecar to be ready before starting. This prevents connection failures during pod startup.

### Outbound Traffic Policy

```yaml
meshConfig:
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
```

`REGISTRY_ONLY` blocks all traffic to services not in the mesh registry. `ALLOW_ANY` (the default) lets traffic to unknown destinations pass through. For production, `REGISTRY_ONLY` is more secure because it forces you to explicitly define external services through ServiceEntry.

### Trust Domain

```yaml
meshConfig:
  trustDomain: cluster.local
```

The trust domain is used in SPIFFE IDs for workload identity. Changing this after deployment affects all mTLS connections, so set it correctly from the start.

## Modifying MeshConfig

You have three ways to modify MeshConfig:

### Option 1: Edit the ConfigMap Directly

```bash
kubectl edit configmap istio -n istio-system
```

Changes take effect within a few seconds as Istiod watches the ConfigMap for changes. Existing sidecars get updated configuration through xDS pushes. This is quick but not tracked in version control.

### Option 2: Use istioctl

```bash
istioctl install --set meshConfig.accessLogFile=/dev/stdout
```

This modifies the installation, which updates the ConfigMap.

### Option 3: Apply an Updated IstioOperator

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

```bash
istioctl install -f updated-config.yaml
```

This is the recommended approach for production because the IstioOperator YAML can be stored in Git.

## Per-Workload Overrides

Many MeshConfig settings can be overridden per workload using pod annotations. This is useful when a specific service needs different settings from the mesh defaults:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-special-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 4
          holdApplicationUntilProxyStarts: true
          tracing:
            sampling: 100.0
```

The `proxy.istio.io/config` annotation accepts the same fields as `meshConfig.defaultConfig`.

## MeshConfig and ProxyConfig Relationship

There is an important distinction between `meshConfig` and `meshConfig.defaultConfig`:

- `meshConfig` controls mesh-wide settings like access logging, outbound policy, and discovery selectors
- `meshConfig.defaultConfig` (which maps to `ProxyConfig`) controls per-proxy settings like concurrency, tracing, and proxy metadata

Settings in `defaultConfig` can be overridden per workload. Settings at the `meshConfig` level generally cannot be overridden per workload (they are truly mesh-wide).

## Validating MeshConfig Changes

Before applying changes, validate the configuration:

```bash
istioctl analyze
```

This checks for common configuration issues. After applying changes, verify that proxies have received the update:

```bash
# Check a specific proxy's configuration
istioctl proxy-config bootstrap <pod-name> -n <namespace> -o json

# Check the sync status of all proxies
istioctl proxy-status
```

The proxy-status output shows whether each proxy is SYNCED with the latest configuration or if it is stale.

## Rollback Strategy

If a MeshConfig change causes problems, you can roll back by:

1. Reverting the ConfigMap to its previous value
2. Running `istioctl install` with the previous IstioOperator configuration

Changes propagate to all sidecars within seconds. If specific pods are stuck with old configuration, restart them:

```bash
kubectl rollout restart deployment -n affected-namespace
```

## Production MeshConfig Template

Here is a MeshConfig template that works well for production environments:

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
  enableTracing: true
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
  defaultConfig:
    holdApplicationUntilProxyStarts: true
    concurrency: 2
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"
    tracing:
      sampling: 1.0
  discoverySelectors:
    - matchLabels:
        istio-managed: "true"
```

Start with this and adjust based on your specific needs. MeshConfig is the control panel for your entire mesh, so take the time to understand each setting before changing it in production.
