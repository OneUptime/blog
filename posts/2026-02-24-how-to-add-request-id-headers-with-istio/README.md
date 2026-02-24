# How to Add Request ID Headers with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Request ID, Distributed Tracing, Observability, Headers

Description: How to configure and use request ID headers in Istio for distributed tracing, debugging, and request correlation across microservices.

---

When you are debugging an issue across a dozen microservices, the first question is always "which request caused this?" Request IDs solve that problem by tagging every request with a unique identifier that flows through the entire call chain. Istio and its underlying Envoy proxy have built-in support for request ID generation, but you can also customize the behavior to match your needs.

## How Istio Handles Request IDs by Default

Envoy, the proxy that powers Istio's data plane, automatically generates a `x-request-id` header for every request that does not already have one. This happens at the ingress gateway and is propagated through the mesh as long as your services forward the header.

By default, Envoy generates a UUID v4 for each request. You can see this in action without any configuration:

```bash
kubectl exec deploy/sleep -- curl -s httpbin:8000/headers | python3 -m json.tool
```

The output will include something like:

```json
{
  "headers": {
    "X-Request-Id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

This happens automatically for every request passing through an Envoy sidecar.

## Configuring Request ID Generation

You can control how request IDs are generated through the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        sampling: 100.0
```

The request ID is generated regardless of tracing sampling. Even with sampling at 1%, every request gets a `x-request-id` header. The sampling rate only controls whether trace data is sent to the tracing backend.

## Preserving Client-Provided Request IDs

If the client already sends an `x-request-id` header, Envoy preserves it by default. This is useful when you want the client to control the correlation ID:

```bash
curl -H "x-request-id: my-custom-id-123" http://api.example.com/users
```

The backend will receive `my-custom-id-123` as the request ID instead of a generated UUID.

## Adding Custom Correlation Headers

Sometimes `x-request-id` is not enough, or your organization uses a different header name. You can add custom correlation headers using VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            request:
              add:
                x-correlation-id: "%REQ(x-request-id)%"
```

For more advanced ID generation, use an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-request-id
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
            inlineCode: |
              function envoy_on_request(request_handle)
                local request_id = request_handle:headers():get("x-request-id")
                if request_id then
                  request_handle:headers():add("x-correlation-id", request_id)
                end
                -- Add a timestamp-based trace ID
                local trace_id = string.format("trace-%x-%x", os.time(), math.random(0, 0xFFFFFF))
                request_handle:headers():add("x-trace-id", trace_id)
              end
```

## Returning Request ID in Responses

By default, Envoy includes the `x-request-id` in the response headers. This is useful for clients to correlate their requests with server-side logs. You can verify this:

```bash
curl -sI http://api.example.com/health | grep -i request-id
```

If you want to add additional correlation headers to the response:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            response:
              add:
                x-trace-reference: "Check logs with this request ID"
```

## Propagating Request IDs Across Services

This is the critical part that many teams get wrong. Istio automatically generates and attaches the request ID at the sidecar level, but your application code must forward these headers when making outbound calls to other services.

The headers your application needs to propagate:

```
x-request-id
x-b3-traceid
x-b3-spanid
x-b3-parentspanid
x-b3-sampled
x-b3-flags
b3
```

Here is an example in Python:

```python
import requests
from flask import Flask, request

app = Flask(__name__)

PROPAGATION_HEADERS = [
    'x-request-id',
    'x-b3-traceid',
    'x-b3-spanid',
    'x-b3-parentspanid',
    'x-b3-sampled',
    'x-b3-flags',
    'b3',
]

@app.route('/api/orders')
def get_orders():
    # Forward tracing headers to upstream service
    headers = {}
    for header in PROPAGATION_HEADERS:
        value = request.headers.get(header)
        if value:
            headers[header] = value

    # Call another service with propagated headers
    response = requests.get('http://inventory-service:8080/api/stock', headers=headers)
    return response.json()
```

In Node.js:

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

const PROPAGATION_HEADERS = [
  'x-request-id',
  'x-b3-traceid',
  'x-b3-spanid',
  'x-b3-parentspanid',
  'x-b3-sampled',
  'x-b3-flags',
  'b3',
];

app.get('/api/orders', async (req, res) => {
  const headers = {};
  for (const header of PROPAGATION_HEADERS) {
    if (req.headers[header]) {
      headers[header] = req.headers[header];
    }
  }

  const response = await axios.get('http://inventory-service:8080/api/stock', { headers });
  res.json(response.data);
});
```

## Logging Request IDs

Configure your services to include the request ID in log output. With Istio's access logging, you can see request IDs in the proxy logs:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%" %RESPONSE_CODE% %REQ(X-REQUEST-ID)% "%UPSTREAM_HOST%"
```

Check the logs:

```bash
kubectl logs deploy/api-service -c istio-proxy | head -20
```

Each log line will include the request ID, making it easy to trace a request across services.

## Using Request IDs for Debugging

When a user reports an issue, ask them for the `x-request-id` from the response headers. Then search your logs:

```bash
kubectl logs deploy/api-service -c istio-proxy | grep "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
kubectl logs deploy/user-service -c istio-proxy | grep "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
kubectl logs deploy/order-service -c istio-proxy | grep "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

If your application logs also include the request ID, you can correlate proxy logs with application logs.

## Configuring Request ID in Envoy's Connection Manager

For more control over request ID behavior, use an EnvoyFilter to configure the HTTP connection manager:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: request-id-config
  namespace: istio-system
spec:
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            request_id_extension:
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.request_id.uuid.v3.UuidRequestIdConfig
                pack_trace_reason: true
                use_request_id_for_trace_sampling: true
```

## Tips

- Always return `x-request-id` in error responses. It is especially important when things go wrong.
- If you use a log aggregation tool like Elasticsearch or Loki, index the request ID field for fast lookups.
- For internal services that only communicate within the mesh, the request ID is already handled by the sidecars. You just need to make sure your application forwards it.
- Do not generate your own request IDs if Envoy already provides one. Use the Envoy-generated ID and let it be the single source of truth.

Request IDs are the foundation of observability in a microservice architecture. Istio gives you the generation and attachment for free, but the propagation through your application code is your responsibility.
