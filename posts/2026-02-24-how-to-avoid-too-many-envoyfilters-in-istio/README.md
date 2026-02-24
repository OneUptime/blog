# How to Avoid Too Many EnvoyFilters in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Envoy, Configuration, Best Practices

Description: Why excessive EnvoyFilters in Istio create maintenance nightmares and upgrade risks, and how to use higher-level APIs and alternatives instead.

---

EnvoyFilters are the escape hatch of Istio. When the higher-level APIs do not support what you need, EnvoyFilters let you modify the Envoy proxy configuration directly. The problem is that once teams discover this power, they start using EnvoyFilters for everything. Before long, you have dozens of them, and your mesh becomes fragile, hard to upgrade, and nearly impossible to debug.

Here is why you should minimize EnvoyFilters and what to use instead.

## The Problem with Too Many EnvoyFilters

EnvoyFilters operate at a different abstraction level than the rest of Istio's API. They patch the raw Envoy configuration, which means:

1. They are tightly coupled to specific Envoy versions
2. They can break during Istio upgrades when Envoy changes
3. They apply in a specific order that is hard to reason about
4. They can conflict with each other in ways that are not obvious
5. Debugging issues requires understanding Envoy internals

Check how many you have:

```bash
kubectl get envoyfilter -A
```

If you have more than a handful, you probably have too many.

## Audit Your Existing EnvoyFilters

Start by understanding what each one does:

```bash
kubectl get envoyfilter -A -o json | jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name): patches=\(.spec.configPatches | length) scope=\(.spec.workloadSelector.labels // "ALL")"'
```

For each EnvoyFilter, ask:
- Is there a higher-level Istio API that can do this?
- Is this still needed?
- Who owns this and why was it added?

## Replace EnvoyFilters with Higher-Level APIs

Many EnvoyFilters were created because the Istio API did not support a feature at the time. But Istio has evolved significantly, and many of those features are now available through the standard API.

### Custom Headers

If you are using EnvoyFilters to add response headers, use VirtualService instead:

```yaml
# BAD: EnvoyFilter for response headers
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-security-headers
spec:
  configPatches:
    - applyTo: HTTP_ROUTE
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          route:
            response_headers_to_add:
              - header:
                  key: X-Frame-Options
                  value: DENY

---
# GOOD: VirtualService for response headers
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
      headers:
        response:
          set:
            X-Frame-Options: DENY
            X-Content-Type-Options: nosniff
            Strict-Transport-Security: max-age=31536000
```

### Rate Limiting

If you are using EnvoyFilters for local rate limiting, consider using the Istio Telemetry API or an external rate limiting service:

```yaml
# Instead of an EnvoyFilter, use a dedicated rate limiting service
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api
  http:
    - route:
        - destination:
            host: api
      timeout: 5s
      retries:
        attempts: 2
```

For global rate limiting, deploy an external rate limiter and reference it through DestinationRule circuit breakers:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api
spec:
  host: api
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 50
```

### Custom Access Logging

Use the Telemetry API instead of EnvoyFilters for custom access logging:

```yaml
# BAD: EnvoyFilter for access logging
# GOOD: Telemetry API
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

### Custom Metrics

The Telemetry API also handles custom metrics:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT_AND_SERVER
          tagOverrides:
            custom_tag:
              operation: UPSERT
              value: "request.headers['x-custom-header']"
```

## When EnvoyFilters Are Justified

There are legitimate cases where EnvoyFilters are the right tool:

1. Adding Lua filters for custom request/response transformation
2. Configuring compression that is not available through the API
3. Custom load balancing algorithms
4. Protocol-specific tuning (like HTTP/2 window sizes)

When you do use them, follow these rules:

### Always Scope to Specific Workloads

Never create mesh-wide EnvoyFilters unless absolutely necessary:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-lua-filter
  namespace: production
spec:
  workloadSelector:
    labels:
      app: specific-service
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                request_handle:headers():add("x-custom-header", "value")
              end
```

### Pin to Specific Proxy Versions

Add a comment documenting which Envoy version this was tested against:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: specific-tuning
  namespace: production
  annotations:
    istio.io/tested-envoy-version: "1.28.0"
    istio.io/reason: "Custom HTTP/2 window size for high-throughput service"
spec:
  workloadSelector:
    labels:
      app: high-throughput-service
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
      patch:
        operation: MERGE
        value:
          typed_extension_protocol_options:
            envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
              "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
              explicit_http_config:
                http2_protocol_options:
                  initial_stream_window_size: 1048576
```

### Test After Every Upgrade

EnvoyFilters are the number one cause of upgrade failures. Before upgrading Istio, test every EnvoyFilter against the new version:

```bash
#!/bin/bash
echo "=== EnvoyFilter Compatibility Check ==="

for ef in $(kubectl get envoyfilter -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  NS=$(echo "$ef" | cut -d/ -f1)
  NAME=$(echo "$ef" | cut -d/ -f2)

  echo "Checking $ef..."

  # Get the workload selector
  SELECTOR=$(kubectl get envoyfilter "$NAME" -n "$NS" -o jsonpath='{.spec.workloadSelector.labels}')

  if [ -z "$SELECTOR" ] || [ "$SELECTOR" = "{}" ]; then
    echo "  WARNING: No workload selector - applies to all proxies"
  fi

  # Check if it uses deprecated fields
  kubectl get envoyfilter "$NAME" -n "$NS" -o yaml | grep -i "deprecated" && echo "  WARNING: Uses deprecated fields"
done
```

## Reduce EnvoyFilter Count Over Time

Set a goal to reduce your EnvoyFilter count. Track it as a metric:

```bash
# Add to your monitoring dashboard
ENVOYFILTER_COUNT=$(kubectl get envoyfilter -A --no-headers 2>/dev/null | wc -l)
echo "envoyfilter_count $ENVOYFILTER_COUNT"
```

Review each EnvoyFilter quarterly:
- Has Istio added native support for this feature?
- Is the workload that needs this still running?
- Can it be replaced with a simpler approach?

The goal is not zero EnvoyFilters, because sometimes they are genuinely needed. The goal is to have as few as possible, each with clear documentation, tight scoping, and a plan to replace it when Istio catches up.
