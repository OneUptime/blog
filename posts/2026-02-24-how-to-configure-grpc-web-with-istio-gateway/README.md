# How to Configure gRPC-Web with Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GRPC-Web, Gateway, Kubernetes, Frontend

Description: Configure Istio's ingress gateway to serve gRPC-Web traffic from browser clients, enabling web applications to call gRPC backends directly.

---

Browsers cannot speak native gRPC because they do not support HTTP/2 trailers, which gRPC relies on for status codes and metadata. gRPC-Web is a protocol that bridges this gap. It wraps gRPC calls in a format that works over HTTP/1.1 or HTTP/2 without trailers. Envoy has built-in support for transcoding between gRPC-Web and native gRPC, and since Istio uses Envoy, you can set this up at the gateway level.

## How gRPC-Web Works

A gRPC-Web client (typically running in a browser) sends requests using either `application/grpc-web` or `application/grpc-web-text` content types. The request format is similar to native gRPC but with a different framing. The Envoy proxy at the gateway receives the gRPC-Web request, converts it to native gRPC, forwards it to the backend, and then converts the response back to gRPC-Web format.

The conversion is transparent to both the browser client and the backend service. The backend just sees a normal gRPC call.

## Setting Up the Istio Gateway

First, configure an Istio Gateway to accept traffic on port 443 (or 80 for testing):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: grpc-web-gateway
  namespace: default
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
        credentialName: grpc-web-cert
      hosts:
        - "api.example.com"
```

For the TLS certificate, create a Kubernetes secret:

```bash
kubectl create secret tls grpc-web-cert \
  --cert=tls.crt \
  --key=tls.key \
  -n istio-system
```

## Configuring the VirtualService

Route gRPC-Web traffic to your backend service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-web-vs
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - grpc-web-gateway
  http:
    - route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
            port:
              number: 50051
```

The `http` section handles both regular HTTP and gRPC-Web traffic. Envoy automatically detects gRPC-Web based on the content type header and performs the transcoding.

## Enabling the gRPC-Web Filter

In recent Istio versions, the gRPC-Web filter is enabled by default on the ingress gateway. You can verify:

```bash
kubectl exec -it deploy/istio-ingressgateway -n istio-system -- \
  pilot-agent request GET config_dump | grep -A5 "grpc_web"
```

If it is not enabled, you can add it with an EnvoyFilter:

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

## Handling CORS

Browser-based gRPC-Web clients need CORS headers. Without them, browsers block cross-origin requests. Configure CORS in the VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-web-vs
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - grpc-web-gateway
  http:
    - corsPolicy:
        allowOrigins:
          - exact: "https://app.example.com"
        allowMethods:
          - POST
          - GET
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
        maxAge: "24h"
        allowCredentials: true
      route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
            port:
              number: 50051
```

Pay attention to the headers. gRPC-Web uses specific headers like `x-grpc-web`, `grpc-status`, and `grpc-message` that need to be allowed through CORS.

## Client-Side Setup

On the browser side, use the `grpc-web` npm package:

```bash
npm install grpc-web
```

Generate the client code from your proto file:

```bash
protoc -I=. service.proto \
  --js_out=import_style=commonjs:./generated \
  --grpc-web_out=import_style=commonjs,mode=grpcwebtext:./generated
```

Then use the generated client:

```javascript
const { MyServiceClient } = require('./generated/service_grpc_web_pb');
const { MyRequest } = require('./generated/service_pb');

const client = new MyServiceClient('https://api.example.com');

const request = new MyRequest();
request.setName('test');

client.myMethod(request, {}, (err, response) => {
  if (err) {
    console.error('gRPC-Web error:', err.code, err.message);
    return;
  }
  console.log('Response:', response.getMessage());
});
```

## Server Streaming with gRPC-Web

gRPC-Web supports server streaming but not client streaming or bidirectional streaming. For server streaming, use the `grpcwebtext` mode:

```javascript
const stream = client.serverStreamMethod(request, {});

stream.on('data', (response) => {
  console.log('Received:', response.getMessage());
});

stream.on('end', () => {
  console.log('Stream ended');
});

stream.on('error', (err) => {
  console.error('Stream error:', err);
});
```

The `grpcwebtext` mode uses base64 encoding, which is necessary for server streaming over HTTP/1.1. If you are only using unary calls, `grpcweb` mode (binary) is more efficient.

## Multiple Services Behind One Gateway

You can route to different gRPC services based on the path:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-web-vs
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - grpc-web-gateway
  http:
    - match:
        - uri:
            prefix: "/users.UserService/"
      route:
        - destination:
            host: user-service.default.svc.cluster.local
            port:
              number: 50051
    - match:
        - uri:
            prefix: "/orders.OrderService/"
      route:
        - destination:
            host: order-service.default.svc.cluster.local
            port:
              number: 50051
      corsPolicy:
        allowOrigins:
          - exact: "https://app.example.com"
        allowMethods:
          - POST
          - OPTIONS
        allowHeaders:
          - content-type
          - x-grpc-web
          - authorization
        exposeHeaders:
          - grpc-status
          - grpc-message
```

The gRPC method path `/<package>.<service>/<method>` makes routing straightforward.

## Troubleshooting

Common issues with gRPC-Web through Istio:

**CORS preflight failing.** Browser sends an OPTIONS request first. Make sure your CORS policy allows the OPTIONS method and the necessary headers. Check the gateway logs:

```bash
kubectl logs deploy/istio-ingressgateway -n istio-system | grep "OPTIONS"
```

**Content type mismatch.** The client must send `application/grpc-web` or `application/grpc-web-text`. If it sends `application/grpc`, Envoy expects native gRPC and the browser cannot handle the response.

**TLS issues.** gRPC-Web from browsers typically requires HTTPS. Make sure your TLS certificate is valid and the Gateway TLS mode is configured correctly.

**Missing grpc-web filter.** If you get raw gRPC responses in the browser (binary garbage), the gRPC-Web filter is not active. Check the Envoy config dump as shown above.

```bash
# Test gRPC-Web from curl
curl -v \
  -H "Content-Type: application/grpc-web-text" \
  -H "X-Grpc-Web: 1" \
  -d "base64-encoded-request" \
  https://api.example.com/mypackage.MyService/MyMethod
```

gRPC-Web through Istio's ingress gateway is a solid way to connect browser applications to gRPC backends. The key pieces are the gRPC-Web Envoy filter (usually enabled by default), proper CORS configuration, and TLS setup. Once those are in place, your browser clients can make gRPC calls as naturally as REST calls.
