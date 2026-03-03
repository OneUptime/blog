# How to Configure Istio for gRPC-Web Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, gRPC-Web, Frontend, Envoy, Traffic Management

Description: How to configure Istio to handle gRPC-Web traffic from browser clients, including the Envoy gRPC-Web filter, gateway configuration, and CORS settings.

---

gRPC-Web is a JavaScript client library that lets browser applications call gRPC services. Browsers cannot use native gRPC because they do not support HTTP/2 trailers or direct control over HTTP/2 frames. gRPC-Web works around this by encoding gRPC messages in a format that works over HTTP/1.1 or HTTP/2 without trailers, and it relies on a proxy to translate between gRPC-Web and native gRPC.

Envoy, which powers Istio's data plane, has built-in support for this translation. This guide shows how to configure Istio to serve gRPC-Web traffic from browser clients.

## How gRPC-Web Works

The flow looks like this:

```text
Browser (gRPC-Web over HTTP/1.1 or HTTP/2)
  -> Istio Ingress Gateway (Envoy translates gRPC-Web to gRPC)
    -> gRPC Service (native gRPC over HTTP/2)
```

The browser sends a request with `Content-Type: application/grpc-web` or `application/grpc-web+proto`. Envoy's gRPC-Web filter converts this into a standard gRPC request and forwards it to the backend. The response goes through the reverse translation.

## Enabling gRPC-Web on the Ingress Gateway

Envoy's gRPC-Web filter is available in Istio but needs to be enabled through an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: grpc-web-filter
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
        name: envoy.filters.http.grpc_web
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
```

This inserts the gRPC-Web filter before the router filter, enabling automatic protocol translation.

## Gateway and VirtualService Configuration

Set up the Gateway to accept HTTPS traffic from browsers:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: grpc-web-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: grpc-web-tls-secret
    hosts:
    - "api.example.com"
```

Route traffic to your gRPC backend:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-web-routes
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/grpc-web-gateway
  http:
  - match:
    - uri:
        prefix: /order.OrderService
    route:
    - destination:
        host: order-service
        port:
          number: 50051
  - match:
    - uri:
        prefix: /user.UserService
    route:
    - destination:
        host: user-service
        port:
          number: 50051
```

## Configuring CORS

Browser clients need CORS (Cross-Origin Resource Sharing) headers. This is critical because gRPC-Web requests from a frontend application at `https://app.example.com` to an API at `https://api.example.com` are cross-origin.

Add CORS configuration to your VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-web-routes
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/grpc-web-gateway
  http:
  - corsPolicy:
      allowOrigins:
      - exact: "https://app.example.com"
      - exact: "https://staging.example.com"
      allowMethods:
      - POST
      - OPTIONS
      allowHeaders:
      - content-type
      - x-grpc-web
      - x-user-agent
      - grpc-timeout
      - authorization
      exposeHeaders:
      - grpc-status
      - grpc-message
      - grpc-status-details-bin
      maxAge: "24h"
    route:
    - destination:
        host: order-service
        port:
          number: 50051
```

The key CORS settings for gRPC-Web:

- `allowMethods`: Must include POST (gRPC-Web uses POST) and OPTIONS (for preflight)
- `allowHeaders`: Must include `content-type`, `x-grpc-web`, and `x-user-agent`. Add `authorization` if you use auth headers.
- `exposeHeaders`: Must include `grpc-status`, `grpc-message`, and optionally `grpc-status-details-bin` for rich error details

## Backend Service Configuration

Make sure your backend gRPC service is properly configured:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: default
spec:
  selector:
    app: order-service
  ports:
  - name: grpc
    port: 50051
    targetPort: 50051
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: order-service:latest
        ports:
        - containerPort: 50051
```

The backend does not need to know about gRPC-Web at all. It just serves native gRPC. Envoy handles the translation.

## Client-Side Setup

On the frontend, use the `grpc-web` npm package:

```bash
npm install grpc-web google-protobuf
```

Generate the client stubs from your proto files:

```bash
protoc -I=. order.proto \
  --js_out=import_style=commonjs:./src/generated \
  --grpc-web_out=import_style=commonjs,mode=grpcwebtext:./src/generated
```

Use the generated client:

```javascript
const { OrderServiceClient } = require('./generated/order_grpc_web_pb');
const { GetOrderRequest } = require('./generated/order_pb');

const client = new OrderServiceClient('https://api.example.com');

const request = new GetOrderRequest();
request.setOrderId('123');

client.getOrder(request, {
  'authorization': 'Bearer ' + token
}, (err, response) => {
  if (err) {
    console.error('gRPC error:', err.code, err.message);
    return;
  }
  console.log('Order:', response.toObject());
});
```

## Handling Authentication

Pass authentication tokens through gRPC metadata:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["*"]
```

Make sure the `authorization` header is in your CORS `allowHeaders` list.

## gRPC-Web Streaming

gRPC-Web supports server-side streaming but not client-side or bidirectional streaming. For server streaming:

```javascript
const stream = client.streamOrders(request, {});

stream.on('data', (response) => {
  console.log('Received order update:', response.toObject());
});

stream.on('status', (status) => {
  console.log('Stream status:', status.code, status.details);
});

stream.on('end', () => {
  console.log('Stream ended');
});
```

For server streaming, the connection stays open while the server sends messages. Istio handles this correctly, but make sure your timeout is long enough:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-web-routes
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/grpc-web-gateway
  http:
  - match:
    - uri:
        prefix: /order.OrderService/StreamOrders
    timeout: 0s  # No timeout for streaming endpoints
    route:
    - destination:
        host: order-service
        port:
          number: 50051
```

Setting timeout to `0s` disables the timeout for streaming endpoints.

## Debugging gRPC-Web Issues

Common issues and how to debug them:

### CORS Preflight Failures

Open browser DevTools and check the Network tab. Look for a failed OPTIONS request. The response must include the correct `Access-Control-Allow-*` headers.

```bash
# Test preflight manually
curl -v -X OPTIONS https://api.example.com/order.OrderService/GetOrder \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-grpc-web"
```

### Protocol Translation Errors

Check the ingress gateway logs:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway | \
  grep -i "grpc\|error"
```

### Content-Type Mismatches

The client must send `Content-Type: application/grpc-web` or `application/grpc-web+proto`. If the wrong content type is sent, the gRPC-Web filter will not process the request.

## Monitoring gRPC-Web Traffic

gRPC-Web requests show up in Istio metrics with the same labels as regular gRPC:

```text
istio_requests_total{
  destination_service="order-service.default.svc.cluster.local",
  request_protocol="grpc",
  grpc_response_status="0"
}
```

The `request_protocol` will show `grpc` because by the time the request reaches the destination, it has been translated from gRPC-Web to native gRPC.

## Testing the Full Setup

Use a simple HTML page to test:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="./generated/order_grpc_web_pb.js"></script>
  <script src="./generated/order_pb.js"></script>
</head>
<body>
  <button onclick="testGrpc()">Test gRPC-Web</button>
  <div id="result"></div>
  <script>
    function testGrpc() {
      const client = new proto.order.OrderServiceClient('https://api.example.com');
      const req = new proto.order.GetOrderRequest();
      req.setOrderId('test-123');
      client.getOrder(req, {}, (err, resp) => {
        if (err) {
          document.getElementById('result').innerText = 'Error: ' + err.message;
        } else {
          document.getElementById('result').innerText = 'Success: ' + JSON.stringify(resp.toObject());
        }
      });
    }
  </script>
</body>
</html>
```

## Wrapping Up

gRPC-Web with Istio lets your browser applications talk to gRPC backends without running a separate proxy like Envoy in front of your services (Istio already provides that). The setup requires enabling the gRPC-Web filter on the ingress gateway, configuring CORS properly for cross-origin requests, and making sure your VirtualService routes are set up correctly. The backend services do not need any modification since Envoy transparently translates between gRPC-Web and native gRPC. Get the CORS headers right, and everything else falls into place.
