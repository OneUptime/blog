# Migrate NGINX Ingress Annotations to Contour HTTPProxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, Ingress-NGINX, HTTPProxy, Migration, Kubernetes, Ingress Controller, Routing, Troubleshooting

Description: Replace NGINX-specific Ingress annotations with typed Contour HTTPProxy policies while preserving tested routing behavior during migration.

---

Kubernetes Ingress standardizes hosts, paths, backends, and TLS references. Most behavior beyond that contract comes from controller-specific annotations. Contour does not translate `nginx.ingress.kubernetes.io/*` settings into HTTPProxy policy, so copying an Ingress unchanged can silently lose rewrites, authentication, timeouts, affinity, access rules, and canary behavior.

Treat this as a behavior migration, not a YAML syntax conversion.

The Kubernetes community retired ingress-nginx in March 2026. Existing deployments continue to run, but the project no longer publishes releases, bug fixes, or security updates. That makes migration urgent, but it does not make a rushed cutover safe. Community ingress-nginx is also distinct from F5's NGINX Ingress Controller, so first identify which product and annotations the cluster actually uses.

## Inventory Every Controller-Specific Setting

List Ingresses and their annotations before creating any HTTPProxy:

```bash
kubectl get ingress -A -o json \
  | jq -r '.items[] | [.metadata.namespace, .metadata.name, (.metadata.annotations // {})] | @json'
```

Classify each setting by observable behavior. Record example requests, expected status codes, redirects, headers, upstream protocol, timeout behavior, authentication flow, source-IP rules, and traffic weights. Include NGINX ConfigMap settings and snippets because they may affect many Ingresses without appearing on each object.

Arbitrary `configuration-snippet` and `server-snippet` content has no safe automatic translation. Review what it does and implement the supported Contour feature or move the behavior into the application. Do not attempt to inject copied NGINX directives into Envoy.

## Use a Translation Matrix

These mappings are starting points, not proof of equivalent semantics:

| NGINX behavior | Contour HTTPProxy feature | Migration concern |
| --- | --- | --- |
| `rewrite-target` | `pathRewritePolicy.replacePrefix` | NGINX regex captures do not translate directly; redesign and test paths. |
| `proxy-read-timeout` and `proxy-send-timeout` | `timeoutPolicy.response` and `timeoutPolicy.idle` | Timeout clocks and streaming behavior differ between proxies. |
| retry annotations | `retryPolicy` | Restrict retries to replay-safe requests and include a per-try timeout. |
| `backend-protocol` | service `protocol: tls`, `h2`, or `h2c` | TLS upstreams also need certificate validation for authenticated encryption. |
| WebSocket settings | route `enableWebsockets: true` | Enable only the route that upgrades. |
| external auth annotations | `ExtensionService` plus `authorization` | Contour requires an Envoy v3 gRPC authorization server, not an arbitrary HTTP auth URL. |
| SSL redirect settings | TLS virtual-host redirect or route `permitInsecure` | TLS HTTPProxy redirects insecure requests by default. |
| canary weight | multiple services with `weight` | Test normalization and long-lived connection behavior. |
| source-range allowlist | `ipAllowPolicy` | Select `Peer` or trusted `Remote` addresses only after validating the proxy chain. |
| cookie affinity | `loadBalancerPolicy.strategy: Cookie` | Pod churn can remap sessions; it is not durable session storage. |
| CORS annotations | virtual-host `corsPolicy` | The policy applies to every route under that virtual host. |

There is no route-level HTTPProxy equivalent for every NGINX connection setting. Contour has global configuration and Envoy defaults for some behaviors, but changing them can affect unrelated routes. Document each intentional non-mapping instead of choosing a field with a similar name.

## Translate One Route Explicitly

Suppose an NGINX Ingress rewrites `/api` to `/`, allows WebSockets, uses a 30-second response budget, and sends traffic to an HTTPS backend. A typed HTTPProxy expresses each decision:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: api
  namespace: storefront
spec:
  ingressClassName: contour
  virtualhost:
    fqdn: shop.example.com
    tls:
      secretName: shop-example-com
  routes:
  - conditions:
    - prefix: /api
    pathRewritePolicy:
      replacePrefix:
      - prefix: /api
        replacement: /
    enableWebsockets: true
    timeoutPolicy:
      response: 30s
      idle: 2m
    services:
    - name: api
      port: 8443
      protocol: tls
      validation:
        caSecret: api-upstream-ca
        subjectName: api.storefront.svc.cluster.local
        subjectNames:
        - api.storefront.svc.cluster.local
      requestHeadersPolicy:
        set:
        - name: Host
          value: api.storefront.svc.cluster.local
```

`api-upstream-ca` is an Opaque Secret with the trusted CA bundle in `ca.crt`. The upstream certificate must be valid for `api.storefront.svc.cluster.local`. Contour 1.33 deprecates `subjectName` in favor of `subjectNames`, but still requires `subjectName` to match the first entry in `subjectNames`. The Host rewrite also supplies that name as SNI for this ClusterIP backend. Do not set `protocol: tls` without deciding how the upstream identity will be verified.

Contour's prefix replacement is literal. It does not implement NGINX capture groups such as `$1`. It also rewrites the request sent upstream, not `Location` headers returned by the application. Configure the application with its public base URL or handle response redirects explicitly.

## Rebuild Weighted Traffic Instead of Copying Canary Annotations

Place both Services on one route and make the intended total obvious:

```yaml
routes:
- conditions:
  - prefix: /
  services:
  - name: storefront-v1
    port: 8080
    weight: 95
  - name: storefront-v2
    port: 8080
    weight: 5
```

This is weighted load balancing for matching requests. It does not reproduce every ingress-nginx canary selector, cookie, or header rule. If the old rollout depends on those selectors, use separate Contour routes with explicit header conditions where the API can represent the requirement, or keep rollout policy in a dedicated deployment tool.

Add retries only for requests that can safely be replayed:

```yaml
retryPolicy:
  count: 2
  perTryTimeout: 2s
  retryOn:
  - connect-failure
  - refused-stream
```

A retry may duplicate work if the upstream processed a request before the connection failed. Do not blindly apply an old retry policy to payments, uploads, or other non-idempotent operations.

## Treat Authentication and Source IP as Security Reviews

ingress-nginx `auth-url` commonly calls an HTTP endpoint. Contour 1.33 external authorization instead uses Envoy's v3 gRPC authorization protocol through an `ExtensionService`. That is an architecture change, not a renamed annotation. Build or deploy a compatible adapter, validate it over TLS, define failure behavior, and test redirect or login flows separately.

For allowlists, determine whether the policy should use Envoy's physical peer address or the derived remote address:

```yaml
ipAllowPolicy:
- source: Remote
  cidr: 10.20.0.0/16
```

`Remote` may depend on X-Forwarded-For or PROXY protocol trust configuration. An incorrect trusted-hop count can let a client spoof an allowed address. Preserve and verify the actual load-balancer hop chain before enforcing the policy.

## Run Both Controllers Without Dual Ownership

Install Contour with an explicit class such as `contour`, and leave existing Ingresses assigned to the ingress-nginx class. Create new HTTPProxies on a temporary validation hostname or a separate Contour load-balancer address.

Do not let NGINX and Contour claim the same production hostname and DNS address unintentionally. Two controllers can publish conflicting status or serve different behavior depending on which load balancer receives a request.

Build a request-level comparison suite. These requests use the configured hostname on separate load-balancer addresses without changing DNS; replace `CONTOUR_IP` and `NGINX_IP` with the actual IP addresses:

```bash
curl --resolve shop.example.com:443:CONTOUR_IP \
  https://shop.example.com/api/health

curl --resolve shop.example.com:443:NGINX_IP \
  https://shop.example.com/api/health
```

Do not compare only successful 200 responses. Check redirect targets, error bodies and codes, WebSocket upgrades, request and response headers, large requests, slow and streaming responses, client IP logging, authentication failures, and upstream TLS verification.

Use a reversible DNS change with a suitably lowered TTL. Keep the old controller and configuration available through the observation window. Roll back DNS if service-level indicators regress, then diagnose the behavior gap without rushing a production manifest edit.

## Validate the HTTPProxy Before Cutover

Contour reports whether the object is valid:

```bash
kubectl -n storefront get httpproxy api \
  -o custom-columns=NAME:.metadata.name,STATE:.status.currentStatus,DETAIL:.status.description
```

An HTTPProxy can be syntactically accepted by Kubernetes but invalid in Contour because a Service, Secret, include, condition, or policy is inconsistent. Require a valid status, ready Service endpoints, a trusted certificate, and passing comparison tests before publishing production DNS.

Kubernetes has frozen the Ingress API, but that does not force every migration to Gateway API immediately. HTTPProxy is Contour's typed, feature-rich API and is often the most direct replacement for annotation-heavy Ingress. Gateway API is another valid destination when its portable model covers the required behavior.

## Conclusion

Inventory ingress-nginx behavior before translating it, then express each supported policy explicitly in HTTPProxy. Test redirects, upgrades, authentication, timeouts, client identity, and failure paths on a separate Contour endpoint before a reversible DNS cutover.

## Official Documentation

- [Project Contour 1.33 annotations reference](https://projectcontour.io/docs/1.33/config/annotations/)
- [Project Contour 1.33 HTTPProxy fundamentals](https://projectcontour.io/docs/1.33/config/fundamentals/)
- [Project Contour 1.33 request routing](https://projectcontour.io/docs/1.33/config/request-routing/)
- [Project Contour 1.33 request rewriting](https://projectcontour.io/docs/1.33/config/request-rewriting/)
- [Project Contour 1.33 external authorization](https://projectcontour.io/docs/1.33/guides/external-authorization/)
- [ingress-nginx annotations documentation](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [ingress-nginx annotation risks](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations-risk/)
- [Kubernetes ingress-nginx retirement notice](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- [Kubernetes Ingress documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)
