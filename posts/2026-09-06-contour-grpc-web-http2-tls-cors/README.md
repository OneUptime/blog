# Expose gRPC-Web Through Contour with HTTP/2, TLS, and CORS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, gRPC, HTTP/2, TLS, CORS, Envoy, Kubernetes

Description: Publish a gRPC-Web endpoint through Contour with explicit upstream HTTP/2, edge TLS, and a narrow browser CORS policy.

---

Contour programs Envoy to translate gRPC-Web requests into ordinary gRPC calls automatically. The part you must configure is the route around that filter:

- TLS at the public virtual host;
- `h2c` for a plaintext HTTP/2 backend, or `h2` for a TLS HTTP/2 backend;
- a Service port that resolves to the gRPC server; and
- a CORS policy that names only trusted browser origins and required headers.

Do not add `enableWebsockets` for gRPC-Web. gRPC-Web is carried over HTTP requests, not a WebSocket upgrade.

## Use a Dedicated Host When Possible

In HTTPProxy, `corsPolicy` belongs to the virtual host and applies to all its routes. A dedicated hostname such as `grpc.example.com` keeps the browser policy from unintentionally covering an unrelated website or admin API on the same host.

The following example terminates public TLS at Envoy and forwards plaintext HTTP/2 to the in-cluster server:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: orders-grpc-web
  namespace: orders
spec:
  virtualhost:
    fqdn: grpc.example.com
    tls:
      secretName: grpc-example-com-tls
    corsPolicy:
      allowOrigin:
      - https://console.example.com
      allowMethods:
      - POST
      - OPTIONS
      allowHeaders:
      - authorization
      - content-type
      - grpc-timeout
      - x-grpc-web
      - x-user-agent
      exposeHeaders:
      - grpc-message
      - grpc-status
      - grpc-status-details-bin
      maxAge: 10m
  routes:
  - conditions:
    - prefix: /orders.v1.OrderService/
    timeoutPolicy:
      response: 5m
      idle: 1m
    services:
    - name: orders-grpc
      port: 9000
      protocol: h2c
```

The path of a gRPC call is `/<fully-qualified-service>/<method>`. A trailing slash after the service name scopes this route to that service's methods. Use `prefix: /` instead when this host intentionally exposes multiple gRPC services.

The public browser connection can negotiate HTTP/2, but gRPC-Web also works over an HTTP/1.1 downstream. The important protocol setting above is between Envoy and the native gRPC backend.

## Choose `h2c` or `h2` Deliberately

`protocol: h2c` means HTTP/2 over cleartext from Envoy to the Service endpoints. Use it only when the backend listens for cleartext gRPC on that port.

For a backend that serves TLS, use `protocol: h2` and validate its certificate:

```yaml
    services:
    - name: orders-grpc
      port: 9443
      protocol: h2
      validation:
        caSecret: orders-upstream-ca
        subjectName: orders-grpc.orders.svc.cluster.local
        subjectNames:
        - orders-grpc.orders.svc.cluster.local
      requestHeadersPolicy:
        set:
        - name: Host
          value: orders-grpc.orders.svc.cluster.local
```

Contour 1.33 still requires the deprecated `subjectName` field and also supports `subjectNames`; when the plural field is supplied, its first entry must equal `subjectName`. The CA Secret is an Opaque Secret with a `ca.crt` key. The certificate must contain at least one configured name in a DNS Subject Alternative Name. The Host rewrite makes Contour send that name as both HTTP/2 authority and TLS SNI; SAN validation alone does not set SNI for a ClusterIP Service.

Do not use `protocol: tls` for native gRPC. It establishes TLS without selecting HTTP/2 as the upstream application protocol. Use `h2` for TLS gRPC and `h2c` for plaintext gRPC.

## Make the CORS Policy Specific

A browser sends an `Origin` header and can send a preflight `OPTIONS` request before the gRPC-Web `POST`. The exact header list depends on the client library and authentication design, so capture a real preflight before finalizing the policy.

Important rules are:

- use an exact trusted origin when possible;
- include the scheme and non-default port in the origin;
- list the actual request headers the client sends;
- expose gRPC status headers that the browser client needs; and
- never combine credentialed CORS with an unrestricted origin.

If cookies are required, add `allowCredentials: true` and keep the origin exact. Browser CORS enforcement is not authentication. The gRPC service must still validate a bearer token, session, or another credential.

Contour also accepts regular-expression origin patterns. They are regexes, not shell globs. `*.example.com` is not a correct wildcard expression and can be rejected or behave unexpectedly. Prefer exact origins unless a controlled multi-tenant use case truly requires a regex.

## Confirm the Backend Before Testing the Browser

Prove the Kubernetes Service and native gRPC path first:

```bash
kubectl -n orders get service orders-grpc -o yaml
kubectl -n orders get endpointslice \
  -l kubernetes.io/service-name=orders-grpc -o yaml

kubectl -n orders run grpcurl --rm -it --restart=Never \
  --image=fullstorydev/grpcurl -- \
  -plaintext orders-grpc.orders.svc.cluster.local:9000 list
```

Use a trusted, pinned diagnostic image in production rather than copying a floating image reference. If reflection is disabled, call a known method with the relevant proto descriptors instead of treating reflection failure as a transport failure.

Then test the public native gRPC route where supported:

```bash
grpcurl -authority grpc.example.com \
  grpc.example.com:443 list
```

Finally test a browser client or a gRPC-Web command-line client. A CORS preflight can be inspected directly:

```bash
curl -i -X OPTIONS https://grpc.example.com/orders.v1.OrderService/GetOrder \
  -H 'Origin: https://console.example.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,x-grpc-web,authorization'
```

Verify the returned `Access-Control-Allow-Origin` matches the requesting origin and that the allowed headers are no broader than intended.

## Diagnose Failures by Layer

| Symptom | Check first |
| --- | --- |
| Browser reports a CORS error | Preflight status, exact Origin, allowed request headers, exposed response headers |
| HTTP 415 | gRPC-Web content type reached an endpoint that does not understand it, or the expected Envoy route was missed |
| HTTP 503 with `UH` | Service has no ready or actively healthy endpoint |
| HTTP 503 with `UF` | Upstream port, `h2` or `h2c`, TLS trust, or application listener is wrong |
| gRPC status 12 | Service or method path is not implemented |
| Stream closes at a fixed duration | Route response, idle, or global connection-duration timeout |

Inspect the HTTPProxy condition and Envoy log for the same request ID:

```bash
kubectl -n orders describe httpproxy orders-grpc-web
kubectl -n projectcontour logs daemonset/envoy -c envoy --since=10m |
  grep 'grpc.example.com'
```

Do not treat an HTTP 200 alone as success. gRPC-Web communicates the final RPC result through gRPC status metadata, commonly exposed as response trailers or translated headers. Check the client-visible `grpc-status` too.

## Conclusion

Contour already supplies the gRPC-Web translation filter. Give it a correct native gRPC upstream protocol, a TLS virtual host, and a CORS policy tailored to the real browser client. Test the native backend, public route, preflight, and final gRPC status separately so a browser error does not obscure an HTTP/2 or service-discovery problem.

## Official Documentation

- [Contour 1.33 gRPC guide](https://projectcontour.io/docs/1.33/guides/grpc/)
- [Contour 1.33 CORS](https://projectcontour.io/docs/1.33/config/cors/)
- [Contour 1.33 upstream TLS](https://projectcontour.io/docs/1.33/config/upstream-tls/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [gRPC-Web protocol](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)
- [MDN: Cross-Origin Resource Sharing](https://developer.mozilla.org/docs/Web/HTTP/Guides/CORS)
