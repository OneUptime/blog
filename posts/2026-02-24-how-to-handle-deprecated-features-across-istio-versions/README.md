# How to Handle Deprecated Features Across Istio Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Deprecation, Migration, Kubernetes, Best Practice

Description: A comprehensive guide to identifying, tracking, and handling deprecated features across Istio versions to keep your mesh configuration current and supported.

---

Istio moves fast. Minor releases can deprecate old features, change API versions, and shift recommended practices. If you are not actively tracking these changes, you will eventually upgrade and find that something you depend on no longer works. Or worse, it still works but produces subtly different behavior.

This guide covers the major deprecations across recent Istio versions and gives you practical strategies for staying ahead of them.

## Why Deprecations Matter

A deprecated feature still works in the version where it is deprecated. But it will be removed in a future version, often after one or more supported release cycles. If you ignore deprecation warnings and then try to skip multiple versions during an upgrade, you will hit hard breakages.

The pattern is typically:
1. Feature deprecated with warnings in version N
2. Feature still functional but flagged in version N+1
3. Feature removed or behavior changed in version N+2

## Major Deprecation Timeline

### API Version Changes

One of the most common deprecations in Istio is API version changes. Here is the progression:

**Networking APIs:**

```yaml
# Deprecated (but still functional in recent versions)

apiVersion: networking.istio.io/v1alpha3

# Current recommended
apiVersion: networking.istio.io/v1
```

The v1alpha3 and v1beta1 versions of VirtualService, DestinationRule, Gateway, ServiceEntry, and Sidecar resources may still work in many supported versions, but you should update to v1:

```bash
# Find manifests using older networking API versions
rg 'apiVersion: networking\.istio\.io/v1(alpha3|beta1)' ./manifests ./deploy ./k8s 2>/dev/null || true
```

Update them by changing the apiVersion field. The spec remains the same:

```yaml
# Before
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service

# After
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
```

**Security APIs:**

```yaml
# Old
apiVersion: security.istio.io/v1beta1

# Current
apiVersion: security.istio.io/v1
```

AuthorizationPolicy, PeerAuthentication, and RequestAuthentication should all use v1.

### Mixer and Telemetry v1

Mixer was deprecated a long time ago (Istio 1.8) and fully removed. If you have any remnants of Mixer configuration, they need to go:

```bash
# Check for mixer-related resources
kubectl get handler,instance,rule --all-namespaces 2>/dev/null
```

If these exist, delete them. They do nothing in modern Istio and just clutter your cluster.

The replacement is the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
  accessLogging:
    - providers:
        - name: envoy
```

### In-Cluster Operator Deprecation

Starting with Istio 1.23-1.24, the in-cluster Istio operator was deprecated and then removed. The `istioctl install` command and Helm remain supported installation methods, and Helm is recommended for most production GitOps workflows.

If you are still using in-cluster IstioOperator resources:

```yaml
# This is the old way
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
```

Migrate to Helm values, or keep using `istioctl install -f` outside the cluster:

```yaml
# This is the new way (Helm values file)
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
```

The translation is not always one-to-one, so review the Helm chart values documentation for your target version.

### EnvoyFilter Evolution

EnvoyFilter is not technically deprecated, but its use is strongly discouraged for anything that can be achieved with higher-level APIs. With each Envoy version bump in Istio, EnvoyFilters that reference specific Envoy configuration structures can break.

Common EnvoyFilter use cases and their replacements:

**Custom headers:** Use VirtualService instead:

```yaml
# Instead of EnvoyFilter for headers
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: add-headers
spec:
  hosts:
    - my-service
  http:
    - headers:
        request:
          add:
            x-custom-header: "value"
      route:
        - destination:
            host: my-service
```

**Rate limiting:** Istio's documented rate limiting task still uses EnvoyFilter, or you can use external rate limiting at another gateway/API layer.

**Access log enablement:** Use the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-logging
spec:
  accessLogging:
    - providers:
        - name: envoy
```

Custom access log formats are still configured with mesh access log settings such as `meshConfig.accessLogFormat`.

### Sidecar Injection Label

The `istio-injection=enabled` namespace label still works but there is an additional label for revision-based and ambient mode:

```bash
# Traditional (still supported)
kubectl label namespace default istio-injection=enabled

# Revision-based
kubectl label namespace default istio.io/rev=1-24

# Ambient mode
kubectl label namespace default istio.io/dataplane-mode=ambient
```

### Gateway Resources

The Istio-specific Gateway resource (networking.istio.io/v1 Gateway) is being gradually replaced by the Kubernetes Gateway API:

```yaml
# Old Istio Gateway
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"

# New Kubernetes Gateway API
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
spec:
  gatewayClassName: istio
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: All
```

Similarly, VirtualService route rules can be replaced with HTTPRoute:

```yaml
# Old VirtualService
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-route
spec:
  hosts:
    - app.example.com
  http:
    - route:
        - destination:
            host: my-service
            port:
              number: 8080

# New HTTPRoute
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-route
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - app.example.com
  rules:
    - backendRefs:
        - name: my-service
          port: 8080
```

The Istio-specific resources are not deprecated yet, but the direction is clear. Start using the Gateway API for new configurations.

## Automated Deprecation Detection

Create a script that checks for deprecated configurations:

```bash
#!/bin/bash
echo "=== Checking for deprecated Istio configurations ==="

# Check manifests for older networking API versions
echo ""
echo "--- Manifests using older networking API versions ---"
rg 'apiVersion: networking\.istio\.io/v1(alpha3|beta1)' ./manifests ./deploy ./k8s 2>/dev/null || true

# Check manifests for v1beta1 security APIs (should be v1)
echo ""
echo "--- Security manifests using v1beta1 (should be v1) ---"
rg 'apiVersion: security\.istio\.io/v1beta1' ./manifests ./deploy ./k8s 2>/dev/null || true

# Check for EnvoyFilters
echo ""
echo "--- EnvoyFilters (review for alternatives) ---"
kubectl get envoyfilter --all-namespaces -o json 2>/dev/null | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name)"'

# Check for in-cluster Istio operator resources
echo ""
echo "--- In-cluster IstioOperator resources (migrate away from the removed in-cluster operator) ---"
kubectl get istiooperator --all-namespaces -o json 2>/dev/null | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name)"'

# Run istioctl analysis
echo ""
echo "--- istioctl analysis ---"
istioctl analyze --all-namespaces 2>&1 | grep -i "deprecated\|warning"
```

Run this before every upgrade:

```bash
chmod +x check-deprecations.sh
./check-deprecations.sh
```

## Best Practices for Staying Current

1. **Subscribe to Istio release notes**: Every release has a "Before you upgrade" section that lists breaking changes.

2. **Run `istioctl analyze` regularly**: It catches many deprecation issues automatically.

3. **Use CI/CD validation**: Add istioctl analyze to your deployment pipeline so deprecated configurations get flagged before they reach production.

4. **Test upgrades in staging first**: Always. No exceptions.

5. **Update API versions proactively**: Do not wait until the old version is removed. Update to the new API version as soon as it is available.

6. **Minimize EnvoyFilter usage**: Every EnvoyFilter is a potential break point on upgrade. Replace them with higher-level APIs whenever possible.

Staying on top of deprecations is boring but essential operational work. A few minutes reviewing release notes before each upgrade saves hours of debugging broken configurations in production.
