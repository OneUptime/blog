# How to Transform Request Headers with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Headers, Request Transformation, VirtualService, Envoy

Description: Learn how to add, set, and remove HTTP request headers using Istio VirtualService and EnvoyFilter configurations.

---

Transforming request headers is one of those everyday tasks in service mesh operations. Maybe you need to inject a tenant ID before requests hit your backend, strip out headers that should not make it past the gateway, or normalize header values across different clients. Istio gives you multiple ways to handle this, from the straightforward VirtualService approach to the more powerful EnvoyFilter.

## VirtualService Header Manipulation

The simplest way to transform request headers is through VirtualService. The `headers` field in the route configuration lets you add, set, and remove headers on incoming requests before they reach the destination service.

Here is a basic example:

```yaml
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
            port:
              number: 8080
          headers:
            request:
              add:
                x-custom-header: "added-by-istio"
                x-request-source: "mesh"
              set:
                x-forwarded-proto: "https"
              remove:
                - x-internal-debug
```

The difference between `add` and `set` matters. `add` appends the header value even if the header already exists, resulting in multiple values. `set` replaces the header entirely, so there is only ever one value.

## Adding Headers Based on Route Match

You can apply different header transformations depending on which route matches:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api-service
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            request:
              set:
                x-api-version: "v1"
    - match:
        - uri:
            prefix: /api/v2
      route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            request:
              set:
                x-api-version: "v2"
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            request:
              set:
                x-api-version: "unknown"
```

This sets the `x-api-version` header based on the URL path, so the backend service can use it without parsing the URI itself.

## Using Dynamic Values

Istio supports a limited set of dynamic values you can use in header transformations. These come from the Envoy proxy's metadata:

```yaml
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
            port:
              number: 8080
          headers:
            request:
              set:
                x-envoy-downstream-service-cluster: "%DOWNSTREAM_REMOTE_ADDRESS%"
```

However, the VirtualService header manipulation does not support many Envoy variables directly. For more advanced dynamic header injection, you need EnvoyFilter.

## EnvoyFilter for Advanced Transformations

When VirtualService is not enough, EnvoyFilter gives you direct access to Envoy's Lua scripting or header manipulation filters. Here is an example that adds a timestamp header to every request:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-timestamp-header
  namespace: istio-system
spec:
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
            inlineCode: |
              function envoy_on_request(request_handle)
                request_handle:headers():add("x-request-timestamp", os.time())
              end
```

This filter runs on every inbound request to any sidecar in the `istio-system` scope. You can limit it to specific workloads:

```yaml
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
```

## Transforming Headers at the Gateway

To modify request headers at the ingress gateway before they reach any backend:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: frontend
spec:
  hosts:
    - "app.example.com"
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: frontend-service
            port:
              number: 80
          headers:
            request:
              add:
                x-gateway-processed: "true"
              set:
                x-real-ip: "%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%"
              remove:
                - x-powered-by
                - server
```

## Header Transformation for Multi-Tenant Services

A common pattern is injecting tenant context into requests. If your routing already identifies the tenant, you can pass that information along:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: multi-tenant-api
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - headers:
            x-tenant-id:
              exact: "tenant-a"
      route:
        - destination:
            host: api-service
            subset: tenant-a
          headers:
            request:
              set:
                x-tenant-db: "db-tenant-a"
                x-tenant-tier: "premium"
    - match:
        - headers:
            x-tenant-id:
              exact: "tenant-b"
      route:
        - destination:
            host: api-service
            subset: tenant-b
          headers:
            request:
              set:
                x-tenant-db: "db-tenant-b"
                x-tenant-tier: "standard"
```

## Combining with Destination Rules

Header transformations work alongside DestinationRules. The header manipulation happens before the destination rule's traffic policy is applied:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service
  subsets:
    - name: tenant-a
      labels:
        tenant: a
    - name: tenant-b
      labels:
        tenant: b
```

## Verifying Header Transformations

To check if your header transformations are working, deploy a simple echo service:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/httpbin.yaml
```

Then make a request and check the headers:

```bash
kubectl exec deploy/sleep -- curl -s httpbin:8000/headers | python3 -m json.tool
```

You can also use `istioctl proxy-config` to inspect the Envoy configuration:

```bash
istioctl proxy-config routes deploy/my-service -o json
```

Look for the `requestHeadersToAdd`, `requestHeadersToRemove` fields in the route configuration.

## Gotchas and Tips

**Header names are case-insensitive in HTTP/2**: Envoy normalizes headers to lowercase. If your backend expects a specific case, you might run into issues.

**Order of operations**: Headers are modified after route matching but before the request is sent to the upstream. So you cannot match on a header and then remove it in the same rule and expect the match to fail.

**Performance**: Each header manipulation adds a tiny bit of latency. For a few headers this is negligible, but if you are doing dozens of header operations per request, consider whether some of that logic belongs in the application instead.

**EnvoyFilter stability**: EnvoyFilter configurations are tied to specific Envoy internal APIs. They can break when you upgrade Istio. VirtualService header manipulation is much more stable across versions.

Header transformation in Istio is powerful enough for most use cases without touching your application code. Start with VirtualService for simple add/set/remove operations, and reach for EnvoyFilter only when you need dynamic values or conditional logic that VirtualService cannot express.
