# How to Configure Custom Trace Headers in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Tracing, Custom Headers, B3, W3C Trace Context

Description: How to configure custom trace header formats in Istio, switch between B3 and W3C formats, and handle custom header requirements.

---

Istio supports multiple trace header formats, and the choice of format matters more than you might think. Different tracing backends prefer different formats, and if your mesh needs to interoperate with external services that use a specific format, you need to match. Beyond the standard formats, some organizations have custom header requirements for trace correlation, tenant isolation, or compliance. This post covers how to control which trace headers Istio generates and how to work with custom headers.

## Standard Trace Header Formats

Istio supports two main trace header formats:

**B3 (Zipkin format):**
```text
X-B3-TraceId: 463ac35c9f6413ad48485a3953bb6124
X-B3-SpanId: 0020000000000001
X-B3-ParentSpanId: 0020000000000000
X-B3-Sampled: 1
X-B3-Flags: 0
```

Also available in single-header format:
```text
b3: 463ac35c9f6413ad48485a3953bb6124-0020000000000001-1-0020000000000000
```

**W3C Trace Context:**
```text
traceparent: 00-463ac35c9f6413ad48485a3953bb6124-0020000000000001-01
tracestate: istio=...
```

The format Envoy uses depends on how you configure the tracing provider.

## Choosing the Header Format

When you use the `zipkin` extension provider, Envoy generates B3 headers:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: zipkin-tracing
        zipkin:
          service: zipkin.observability.svc.cluster.local
          port: 9411
```

When you use the `opentelemetry` extension provider, Envoy generates W3C Trace Context headers by default:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-tracing
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

## Configuring B3 Headers Explicitly

If you want B3 headers with an OpenTelemetry backend, you need to configure the Envoy bootstrap to use B3 propagation. This is done through mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 10
    extensionProviders:
      - name: otel-tracing
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

The propagation format is tied to the provider type. Zipkin providers use B3, OpenTelemetry providers use W3C.

## Working with Both Formats Simultaneously

In some environments, you have services that use B3 and others that use W3C. Envoy can handle both by checking for incoming headers in multiple formats.

When a request arrives with B3 headers, Envoy uses those. When it arrives with W3C `traceparent`, Envoy uses that. If both are present, the behavior depends on the configured provider.

To support both formats in your application's header propagation:

```python
TRACE_HEADERS = [
    # B3 multi-header
    'x-b3-traceid',
    'x-b3-spanid',
    'x-b3-parentspanid',
    'x-b3-sampled',
    'x-b3-flags',
    # B3 single-header
    'b3',
    # W3C Trace Context
    'traceparent',
    'tracestate',
    # Envoy internal
    'x-request-id',
]

def propagate_all_trace_headers(incoming_request, outgoing_request):
    for header in TRACE_HEADERS:
        value = incoming_request.headers.get(header)
        if value:
            outgoing_request.headers[header] = value
```

Propagating all formats ensures compatibility regardless of which format the upstream or downstream services use.

## Adding Custom Application Headers to Traces

Beyond the standard trace headers, you might want to include application-specific headers in your traces. Use the Telemetry API's custom tags feature to capture header values as span attributes:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-header-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel-tracing
      customTags:
        correlation.id:
          header:
            name: x-correlation-id
            defaultValue: none
        session.id:
          header:
            name: x-session-id
            defaultValue: none
        request.priority:
          header:
            name: x-priority
            defaultValue: normal
```

Now when you send a request with these headers:

```bash
curl -H "X-Correlation-Id: corr-abc-123" \
     -H "X-Session-Id: sess-xyz-789" \
     -H "X-Priority: high" \
     http://my-service.example.com/api/endpoint
```

The span will include `correlation.id`, `session.id`, and `request.priority` as attributes, searchable in your tracing backend.

## Generating Custom Headers at the Gateway

You can use Envoy filters or VirtualService headers to add custom headers at the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            prefix: /api
      headers:
        request:
          set:
            x-gateway-timestamp: "%START_TIME(%s)%"
      route:
        - destination:
            host: my-service
            port:
              number: 8080
```

Note that `%START_TIME%` variable expansion in VirtualService headers is limited. For dynamic header values, you might need an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-custom-headers
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
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
                local trace_id = request_handle:headers():get("x-b3-traceid")
                if trace_id then
                  request_handle:headers():add("x-custom-trace-ref", "trace-" .. trace_id)
                end
              end
```

## Custom Headers for External Service Integration

When your mesh communicates with external services that expect specific headers, use a ServiceEntry combined with a VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.external-service.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api-headers
spec:
  hosts:
    - api.external-service.com
  http:
    - headers:
        request:
          set:
            x-trace-source: istio-mesh
            x-mesh-id: production-us-east
      route:
        - destination:
            host: api.external-service.com
            port:
              number: 443
```

## Stripping Trace Headers

Sometimes you need to remove trace headers before they leave the mesh, for example when calling external APIs that don't understand B3 headers and might reject requests with unknown headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api-clean
spec:
  hosts:
    - api.external-service.com
  http:
    - headers:
        request:
          remove:
            - x-b3-traceid
            - x-b3-spanid
            - x-b3-parentspanid
            - x-b3-sampled
            - x-b3-flags
            - x-request-id
      route:
        - destination:
            host: api.external-service.com
```

## Verifying Header Behavior

Test which headers are being generated:

```bash
# Check what headers Envoy adds to outgoing requests
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/headers | python3 -m json.tool

# Test with explicit headers
kubectl exec deploy/sleep -- curl -s \
  -H "traceparent: 00-12345678901234567890123456789012-1234567890123456-01" \
  http://httpbin:8000/headers | python3 -m json.tool
```

Check the Envoy bootstrap for tracing configuration:

```bash
istioctl proxy-config bootstrap deploy/sleep -o json | grep -A30 "tracing"
```

## Migration Between Header Formats

If you're migrating from B3 to W3C Trace Context, do it gradually:

1. Update your application code to propagate both B3 and W3C headers
2. Switch the Istio tracing provider from Zipkin to OpenTelemetry
3. Verify traces are still connected
4. After confirming everything works, you can optionally remove B3 propagation from application code

During the transition, propagating both formats ensures no traces are broken.

## Summary

The trace header format in Istio is determined by the extension provider type - Zipkin providers generate B3, OpenTelemetry providers generate W3C Trace Context. For maximum compatibility, propagate both formats in your application code. Use the Telemetry API's custom tags to capture application-specific headers as span attributes, and use VirtualService or EnvoyFilter to add or remove headers at mesh boundaries. The key is making sure all services in a trace agree on which headers carry the trace context.
