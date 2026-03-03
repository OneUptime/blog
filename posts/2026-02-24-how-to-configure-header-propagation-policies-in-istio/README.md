# How to Configure Header Propagation Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Headers, Distributed Tracing, Service Mesh, Observability

Description: A hands-on guide to configuring header propagation in Istio for distributed tracing, context passing, and custom header management across microservices.

---

When a request travels through multiple services in your mesh, certain headers need to travel with it. Trace headers, authentication tokens, custom context headers - these all need to be forwarded from service to service. If any service in the chain drops a header, your distributed traces break, your context is lost, and debugging becomes a nightmare.

Istio and Envoy handle some header propagation automatically, but a lot of it depends on your application code. Understanding what is automatic and what requires your attention is critical for a well-functioning service mesh.

## What Istio Propagates Automatically

Envoy proxies in Istio automatically handle several categories of headers:

**x-request-id**: Envoy generates this if it is not present and forwards it through the chain. This is used for access log correlation.

**x-envoy-** headers: Internal Envoy headers like `x-envoy-upstream-service-time` are managed by the proxy.

**Trace context headers**: Envoy generates and propagates trace headers, but here is the catch - it only does this for the first hop. Your application code must forward these headers when making outbound calls.

The trace headers that need propagation include:

- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `x-b3-flags`
- `b3`
- `traceparent`
- `tracestate`
- `x-cloud-trace-context`
- `grpc-trace-bin`
- `sw8` (SkyWalking)

## The Application's Responsibility

This is the part that trips people up. Istio does not magically propagate trace headers across service boundaries for you. The sidecar proxy adds trace headers to incoming requests, but when your application makes an outbound HTTP call to another service, your code must extract those headers from the incoming request and attach them to the outgoing request.

Here is what happens without proper propagation:

```text
User -> Service A (trace: abc123) -> Service B (trace: def456) -> Service C (trace: ghi789)
```

Each service gets a new trace ID, and you have three disconnected traces instead of one.

With proper propagation:

```text
User -> Service A (trace: abc123) -> Service B (trace: abc123) -> Service C (trace: abc123)
```

## Implementing Header Propagation in Code

Here is a Python example using Flask:

```python
from flask import Flask, request
import requests

app = Flask(__name__)

PROPAGATION_HEADERS = [
    'x-request-id',
    'x-b3-traceid',
    'x-b3-spanid',
    'x-b3-parentspanid',
    'x-b3-sampled',
    'x-b3-flags',
    'b3',
    'traceparent',
    'tracestate',
]

def extract_trace_headers():
    headers = {}
    for header in PROPAGATION_HEADERS:
        value = request.headers.get(header)
        if value:
            headers[header] = value
    return headers

@app.route('/api/orders')
def get_orders():
    trace_headers = extract_trace_headers()

    # Forward trace headers to downstream service
    response = requests.get(
        'http://inventory-service/api/stock',
        headers=trace_headers
    )
    return response.json()
```

And in Go:

```go
func propagateHeaders(r *http.Request, outReq *http.Request) {
    headers := []string{
        "x-request-id",
        "x-b3-traceid",
        "x-b3-spanid",
        "x-b3-parentspanid",
        "x-b3-sampled",
        "x-b3-flags",
        "b3",
        "traceparent",
        "tracestate",
    }
    for _, h := range headers {
        if val := r.Header.Get(h); val != "" {
            outReq.Header.Set(h, val)
        }
    }
}

func orderHandler(w http.ResponseWriter, r *http.Request) {
    outReq, _ := http.NewRequest("GET", "http://inventory-service/api/stock", nil)
    propagateHeaders(r, outReq)

    client := &http.Client{}
    resp, err := client.Do(outReq)
    // handle response...
}
```

## Configuring Custom Header Propagation with EnvoyFilter

If you need Envoy to add, remove, or modify headers at the proxy level without touching application code, you can use EnvoyFilter resources. For example, to add a custom header to all outbound requests:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-custom-header
  namespace: production
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: SIDECAR_OUTBOUND
    patch:
      operation: MERGE
      value:
        request_headers_to_add:
        - header:
            key: x-custom-source
            value: my-service
          append: true
```

## Using VirtualService for Header Manipulation

VirtualService supports header manipulation through the `headers` field. You can add, set, or remove headers on both requests and responses:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
    headers:
      request:
        set:
          x-custom-routing: "enabled"
          x-environment: "production"
        add:
          x-forwarded-by: "istio-mesh"
        remove:
        - x-internal-debug
      response:
        set:
          x-served-by: "my-service"
        remove:
        - x-envoy-upstream-service-time
```

The `set` operation replaces the header value if it exists or adds it if it does not. The `add` operation appends to existing values. The `remove` operation strips headers entirely.

## Propagating Custom Context Headers

Sometimes you have application-specific context that needs to travel through the service chain. For example, a tenant ID in a multi-tenant system or an A/B test group assignment. You can standardize this through a naming convention and propagate using the same pattern as trace headers:

```python
CUSTOM_CONTEXT_HEADERS = [
    'x-tenant-id',
    'x-ab-group',
    'x-feature-flags',
    'x-correlation-id',
]

def extract_all_propagation_headers():
    headers = {}
    for header in PROPAGATION_HEADERS + CUSTOM_CONTEXT_HEADERS:
        value = request.headers.get(header)
        if value:
            headers[header] = value
    return headers
```

## Mesh-Wide Header Configuration

Istio's MeshConfig allows you to set default headers configuration for the entire mesh. You can configure this through the Istio ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    defaultConfig:
      tracing:
        sampling: 100
      proxyHeaders:
        forwardedClientCert: SANITIZE_SET
```

The `forwardedClientCert` setting controls how the `X-Forwarded-Client-Cert` header is handled. Options include:

- `SANITIZE`: Do not forward the header
- `FORWARD_ONLY`: Forward the header as-is
- `APPEND_FORWARD`: Append proxy cert info to the existing header
- `SANITIZE_SET`: Clear existing header and set with proxy cert info

## Verifying Header Propagation

Deploy a test service that echoes back all headers it receives:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/master/samples/httpbin/httpbin.yaml
```

Then send a request with trace headers and verify they arrive:

```bash
kubectl exec deploy/sleep -- curl -s httpbin:8000/headers \
  -H "x-b3-traceid: abc123" \
  -H "x-custom-context: test-value" | jq .
```

Check that all your expected headers show up in the response.

## Common Pitfalls

Forgetting async flows. If your service puts a message on a queue, the consumer needs those trace headers too. You must serialize the headers into the message payload and extract them when processing.

Using HTTP client libraries that strip custom headers. Some libraries or frameworks drop non-standard headers by default. Always verify that your HTTP client forwards what you set.

Header size limits. Envoy has a default max header size of 60 KB. If you are propagating many headers with large values, you might hit this limit. You can adjust it through Envoy configuration but should think about whether you really need that much context in headers.

Case sensitivity. HTTP/2 lowercases all header names. Make sure your propagation code handles both `X-Request-ID` and `x-request-id`.

## Summary

Header propagation in Istio is a shared responsibility between the proxy and your application. Envoy handles the first hop of trace header generation, but your code must forward those headers on outbound calls. Use VirtualService `headers` for simple add/set/remove operations, EnvoyFilter for advanced proxy-level manipulation, and always include propagation headers in your application's HTTP client code. Test your propagation by tracing a request through the full call chain and verifying the headers arrive at each service.
