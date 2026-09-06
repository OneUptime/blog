# Delegate Contour Routes Across Namespaces with HTTPProxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, HTTPProxy, Kubernetes, Routing, Ingress Controller, TLS, Service

Description: Let a platform-owned root HTTPProxy delegate bounded path prefixes to application teams in their own namespaces.

---

HTTPProxy inclusion separates virtual-host ownership from application-route ownership. A platform team can own the public FQDN and TLS settings in one root HTTPProxy, while each application team owns a non-root child HTTPProxy beside its Service.

Contour reads the inclusion tree and renders one Envoy virtual host. The route is still governed by Kubernetes RBAC because each team edits resources only in its namespace.

## Keep the Root Small

The root is the HTTPProxy with `spec.virtualhost`. It owns hostname-wide settings such as TLS, CORS, external authorization, and default JWT policy. It includes application route space:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: company-api
  namespace: edge-routes
spec:
  ingressClassName: contour-public
  virtualhost:
    fqdn: api.example.com
    tls:
      secretName: api-example-com-tls
  includes:
  - name: orders-routes
    namespace: orders
    conditions:
    - prefix: /orders
  - name: catalog-routes
    namespace: catalog
    conditions:
    - prefix: /catalog
  routes:
  - conditions:
    - exact: /healthz
    services:
    - name: edge-health
      port: 8080
```

The Services on root-owned routes resolve in `edge-routes`. Services on an included child's routes resolve in the child's namespace.

`--root-namespaces` can restrict which namespaces may create roots, reducing hostname-claim conflicts. `--watch-namespaces` is different: it limits all resources Contour can observe, so it must include the root and every child namespace in the tree.

## Create Non-Root Children

The orders team defines only routes and services:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: orders-routes
  namespace: orders
spec:
  ingressClassName: contour-public
  routes:
  - conditions:
    - prefix: /v1
    services:
    - name: orders-api
      port: 8080
  - conditions:
    - prefix: /metrics
    services:
    - name: orders-metrics
      port: 9090
```

Contour concatenates include prefixes in root-to-leaf order. These child paths render as `/orders/v1` and `/orders/metrics`. The child must not repeat `/orders`, or the result becomes `/orders/orders/...`.

A child must not define `virtualhost`; that would make it another root, which cannot be included. It should carry the same `ingressClassName` as its root when Contour filters by class. It can itself include more non-root HTTPProxies when deeper delegation is useful.

## Understand Condition Composition

Include conditions and route conditions are combined with logical AND. Prefixes are concatenated through the inclusion chain. Exact and regex path conditions are not allowed on includes, while header and query-parameter constraints can further narrow a delegated slice.

Keep the boundary obvious. A platform-owned prefix is easier to audit than complex duplicated header conditions. Contour rejects contradictory or ambiguous combinations, including more than one path matcher in one route condition set.

If one child is included under different roots or prefixes, its `pathRewritePolicy.replacePrefix` may need explicit `prefix` entries matching each fully rendered prefix. Test every parent, since a rewrite that works under one include path may not apply under another.

## Preserve Central Security Policy

Hostname-wide controls belong on the root so a child cannot omit them. Examples include:

- edge TLS and minimum TLS version;
- a default external authorization service;
- a default JWT provider;
- virtual-host CORS policy; and
- virtual-host IP allow or deny policy.

Some route-level fields can override root behavior. For example, a child route can disable a default auth or JWT policy if the API permits it. Use admission policy to prohibit unsafe exceptions in delegated namespaces instead of assuming inclusion makes every root policy immutable.

Do not delegate `/`, a broad prefix, or an authentication callback to a team without considering overlap. Contour detects many duplicate routes, but semantic exposure still needs review.

TLS Secret ownership remains with the root. If the server certificate lives in another namespace, configure a separate `TLSCertificateDelegation`; HTTPProxy inclusion does not grant Secret use.

## Read Status Across the Whole Tree

Inspect root and children together:

```bash
kubectl get httpproxy -A \
  -o custom-columns='NS:.metadata.namespace,NAME:.metadata.name,FQDN:.spec.virtualhost.fqdn,STATUS:.status.currentStatus,DESCRIPTION:.status.description'

kubectl -n edge-routes describe httpproxy company-api
kubectl -n orders describe httpproxy orders-routes
```

A child can be valid in isolation but make a particular inclusion path invalid through conflicting composed conditions. A missing child, wrong namespace, inclusion cycle, child virtual host, missing child Service, or unwatched namespace can invalidate the tree.

Apply the child first during initial creation, then the root include. During deletion, remove the include before deleting the child. This minimizes expected invalid intervals.

## Test Ownership and Routing

Use server-side dry-run for schema checks, then wait for Contour's semantic condition:

```bash
kubectl apply --server-side --dry-run=server -f orders-routes.yaml
kubectl apply -f orders-routes.yaml
kubectl -n orders wait httpproxy/orders-routes \
  --for=condition=Valid --timeout=60s
kubectl -n edge-routes wait httpproxy/company-api \
  --for=condition=Valid --timeout=60s
```

Exercise positive and negative paths:

```bash
curl --fail https://api.example.com/orders/v1/healthz
curl -i https://api.example.com/orders-not-delegated
curl -i https://api.example.com/catalog/v1/healthz
```

Enable route-source metadata in Envoy access logs so each request records the HTTPProxy kind, namespace, and name that produced the route. That provides a direct audit trail from public request to delegated owner.

## Conclusion

Use a root HTTPProxy for FQDN and shared security, then include non-root HTTPProxies under explicit prefixes. Each child resolves Services in its own namespace and can evolve under that team's RBAC. Restrict root namespaces, watch every participating namespace, and enforce admission rules for route-level security exceptions.

## Official Documentation

- [Contour 1.33 inclusion and delegation](https://projectcontour.io/docs/1.33/config/inclusion-delegation/)
- [Contour 1.33 HTTPProxy fundamentals](https://projectcontour.io/docs/1.33/config/fundamentals/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Contour 1.33 deployment options](https://projectcontour.io/docs/1.33/deploy-options/)
- [Contour 1.33 access logging](https://projectcontour.io/docs/1.33/config/access-logging/)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
