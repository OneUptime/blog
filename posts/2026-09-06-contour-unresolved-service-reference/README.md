# Fix Contour `unresolved service reference` Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, HTTPProxy, Kubernetes, Service Discovery, Envoy, Troubleshooting

Description: Resolve Contour service references by checking namespace scope, Service ports, selectors, and ready EndpointSlices.

---

Contour marks an `HTTPProxy` invalid when one of its route services cannot be resolved. The message often looks like `unresolved service reference`, but the underlying mistake is usually one of four things:

- the Service name is misspelled;
- the Service is in a different namespace from the `HTTPProxy` that contains the route;
- the route names a target or container port instead of a Service port; or
- the Service was deleted or changed while the proxy still refers to its old shape.

This is a configuration error, not an Envoy reachability error. Contour must resolve the reference before it can send a usable route and cluster to Envoy.

## Read the HTTPProxy Status First

Inspect the object instead of starting with application logs:

```bash
kubectl -n storefront get httpproxy shop -o wide
kubectl -n storefront describe httpproxy shop
kubectl -n storefront get httpproxy shop -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" reason="}{.reason}{" message="}{.message}{"\n"}{end}'
```

Contour owns a positive `Valid` condition. `Valid=True` means Contour accepted the object, although warnings may still be present. `Valid=False` and the detailed status errors tell you which route and service failed.

Confirm that you are reading status from the intended object and cluster. An included child `HTTPProxy` can be invalid even when the root object is the one users know by hostname:

```bash
kubectl get httpproxy -A \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,FQDN:.spec.virtualhost.fqdn,STATUS:.status.currentStatus,DESCRIPTION:.status.description'
```

## Resolve the Name in the Route Owner's Namespace

An HTTPProxy service reference is a Kubernetes Service name, not a DNS name and not a namespaced name. Contour looks up the Service in the namespace of the `HTTPProxy` that contains that route.

This route is valid only when `storefront/catalog` exists:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: shop
  namespace: storefront
spec:
  ingressClassName: contour-public
  virtualhost:
    fqdn: shop.example.com
  routes:
  - conditions:
    - prefix: /catalog
    services:
    - name: catalog
      port: 80
```

Neither `catalog.products` nor `catalog.products.svc.cluster.local` is a portable way to cross that boundary in this field. If the real Service is `products/catalog`, put the route in a non-root HTTPProxy in `products` and include it from the root:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: shop
  namespace: storefront
spec:
  ingressClassName: contour-public
  virtualhost:
    fqdn: shop.example.com
  includes:
  - name: catalog-routes
    namespace: products
    conditions:
    - prefix: /catalog
---
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: catalog-routes
  namespace: products
spec:
  ingressClassName: contour-public
  routes:
  - services:
    - name: catalog
      port: 80
```

The child must not define `virtualhost`; that field makes an HTTPProxy a root. Inclusion delegates route configuration, while Kubernetes RBAC continues to control who may change each namespace.

## Use the Service Port, Not the Pod Port

`spec.routes[].services[].port` selects a port on the Service. It is not the Deployment container port and not necessarily the Service `targetPort`.

For this Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: catalog
  namespace: storefront
spec:
  selector:
    app: catalog
  ports:
  - name: http
    port: 80
    targetPort: 8080
```

the HTTPProxy must use `port: 80`. Kubernetes resolves that to endpoint port `8080`. A route using `port: 8080` is unresolved unless the Service itself exposes 8080.

Print the mapping before editing anything:

```bash
kubectl -n storefront get service catalog -o json |
  jq '.spec.ports[] | {name, port, targetPort, protocol, appProtocol}'
```

Contour's HTTPProxy service field accepts a numeric Service port. If an Ingress migration used a named backend port, translate the name to its current numeric `.spec.ports[].port` value.

## Separate Resolution from Endpoint Health

A resolvable Service can still have no usable endpoints. That normally produces request-time failures such as a 503, rather than an unresolved service reference.

Check the Service selector, selected Pods, and every EndpointSlice:

```bash
kubectl -n storefront get service catalog -o yaml
kubectl -n storefront get pods -l app=catalog -o wide
kubectl -n storefront get endpointslice \
  -l kubernetes.io/service-name=catalog -o yaml
```

Look for selector mismatches, named `targetPort` values absent from the Pods, and endpoints whose `conditions.ready` is false. An empty EndpointSlice is worth fixing, but do not confuse it with the earlier reference-resolution failure.

The distinction gives a useful decision point:

- invalid HTTPProxy with an unresolved reference: fix the API objects;
- valid HTTPProxy with `UH` in the Envoy access log: find ready endpoints or active health-check failures;
- valid HTTPProxy with `UF`: investigate the connection from Envoy to the selected endpoint.

## Check Contour Scope and Ingress Class

If the Service clearly exists but Contour still reports it unresolved, make sure the Contour instance watches both namespaces. A deployment using `--watch-namespaces` only observes resources in its configured set. Cross-namespace inclusion and TLS delegation cannot refer to an unwatched namespace.

Also verify that the HTTPProxy belongs to this Contour instance:

```bash
kubectl -n storefront get httpproxy shop \
  -o jsonpath='{.spec.ingressClassName}{"\n"}'
```

`spec.ingressClassName` should match one of the class names configured for the instance. The deprecated `kubernetes.io/ingress.class` annotation takes precedence when both are present, so remove stale annotations during a migration.

## Apply and Wait for Reconciliation

Use server-side dry-run to catch schema errors, then apply the owner manifest:

```bash
kubectl apply --server-side --dry-run=server -f shop.yaml
kubectl apply -f shop.yaml
kubectl -n storefront wait httpproxy/shop \
  --for=condition=Valid --timeout=60s
```

Re-read the full condition after the wait. Then send a request with the intended authority and path:

```bash
curl -sv --resolve shop.example.com:443:203.0.113.20 \
  https://shop.example.com/catalog/health -o /dev/null
```

Do not use `-k` as the normal test. A valid TLS result verifies that the request reached the intended virtual host rather than an unrelated fallback.

## Conclusion

Treat `unresolved service reference` as a failed API join. Start with the HTTPProxy namespace, use the Service's exposed port, and use an included child HTTPProxy when a route must be owned beside a Service in another namespace. Only after the proxy becomes valid should you troubleshoot selectors, EndpointSlices, and network connectivity.

## Official Documentation

- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Contour 1.33 HTTPProxy inclusion and delegation](https://projectcontour.io/docs/1.33/config/inclusion-delegation/)
- [Contour 1.33 deployment options](https://projectcontour.io/docs/1.33/deploy-options/)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
