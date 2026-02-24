# How to Route Traffic by HTTP Method in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, HTTP Methods, Kubernetes, Service Mesh

Description: A practical guide to routing traffic based on HTTP methods like GET, POST, PUT, and DELETE using Istio VirtualService match conditions.

---

Sometimes you want different versions of your service to handle different types of HTTP requests. Maybe your read-heavy GET requests should go to a horizontally scaled deployment optimized for throughput, while your write-heavy POST and PUT requests go to a version with stronger consistency guarantees. Istio makes this possible through HTTP method matching in VirtualService resources.

## How HTTP Method Matching Works

Istio's VirtualService allows you to define match conditions on incoming HTTP requests. One of the fields you can match on is the HTTP method. When a request comes in, the Envoy sidecar proxy checks the method against your rules and routes accordingly.

The match is done through the `method` field inside the `match` block of an HTTP route. You can use `exact`, `prefix`, or `regex` matching, though for HTTP methods, `exact` is almost always what you want.

## Prerequisites

You will need:

- A running Kubernetes cluster with Istio installed
- Two or more versions of a service deployed
- A DestinationRule defining subsets for those versions
- Sidecar injection enabled in your namespace

## Setting Up the DestinationRule

Start with a DestinationRule that defines your service versions:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-api-dr
  namespace: default
spec:
  host: my-api
  subsets:
    - name: read-optimized
      labels:
        version: v1-read
    - name: write-optimized
      labels:
        version: v1-write
```

Apply it:

```bash
kubectl apply -f destination-rule.yaml
```

## Routing GET Requests to One Version

Here is a VirtualService that sends GET requests to the read-optimized subset and everything else to the write-optimized subset:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api-vs
  namespace: default
spec:
  hosts:
    - my-api
  http:
    - match:
        - method:
            exact: GET
      route:
        - destination:
            host: my-api
            subset: read-optimized
    - route:
        - destination:
            host: my-api
            subset: write-optimized
```

The first rule matches GET requests and routes them to the `read-optimized` subset. The second rule has no match condition, so it acts as a catch-all for everything else (POST, PUT, DELETE, PATCH, etc.).

Apply it:

```bash
kubectl apply -f virtual-service.yaml
```

## Routing Multiple Methods

If you want to be more explicit about which methods go where, you can add multiple match blocks. For example, routing GET and HEAD to one place, and POST and PUT to another:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api-vs
  namespace: default
spec:
  hosts:
    - my-api
  http:
    - match:
        - method:
            exact: GET
        - method:
            exact: HEAD
      route:
        - destination:
            host: my-api
            subset: read-optimized
    - match:
        - method:
            exact: POST
        - method:
            exact: PUT
      route:
        - destination:
            host: my-api
            subset: write-optimized
    - route:
        - destination:
            host: my-api
            subset: read-optimized
```

Note that when you list multiple items under `match`, they are OR conditions. So the first rule matches if the method is GET OR HEAD.

## Combining Method Match with Path Match

A more realistic scenario involves matching on both the method and the path. For instance, you might want POST requests to `/api/orders` to go to a specific version:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api-vs
  namespace: default
spec:
  hosts:
    - my-api
  http:
    - match:
        - method:
            exact: POST
          uri:
            prefix: /api/orders
      route:
        - destination:
            host: my-api
            subset: write-optimized
    - route:
        - destination:
            host: my-api
            subset: read-optimized
```

When you put `method` and `uri` under the same match item (same dash), they are AND conditions. So this matches requests that are both POST and have a URI starting with `/api/orders`.

## Practical Use Cases

**Read/write splitting.** This is the most common scenario. Your read path and write path might have very different performance profiles. Read requests can often be served from caches or read replicas, while writes need to go through the primary datastore. By routing at the mesh level, you can deploy and scale these independently.

**Method-based rate limiting.** While Istio has dedicated rate limiting features, routing by method lets you apply different policies per method. You could route DELETE requests through a version that has stricter rate limiting applied at the application level.

**Audit logging for mutations.** If you want detailed audit logging for all write operations but not for reads (to avoid log volume), you can route mutating methods to a version of your service that has enhanced logging enabled.

**Migration scenarios.** When migrating to a new API implementation, you might want to migrate read operations first (since they are generally safer) and keep writes on the old implementation until you are confident the new one is correct.

## Adding Retry and Timeout Policies per Method

You can also set different retry and timeout policies for different methods. GET requests are usually safe to retry, while POST requests might not be idempotent:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api-vs
  namespace: default
spec:
  hosts:
    - my-api
  http:
    - match:
        - method:
            exact: GET
      route:
        - destination:
            host: my-api
            subset: read-optimized
      retries:
        attempts: 3
        perTryTimeout: 2s
      timeout: 10s
    - route:
        - destination:
            host: my-api
            subset: write-optimized
      retries:
        attempts: 0
      timeout: 30s
```

GET requests get 3 retry attempts with a 2-second per-try timeout. Write requests get no retries and a longer overall timeout.

## Testing the Configuration

Send requests with different methods and verify routing:

```bash
# Test GET routing
kubectl exec deploy/sleep -c sleep -- curl -s -X GET http://my-api.default.svc.cluster.local/api/data

# Test POST routing
kubectl exec deploy/sleep -c sleep -- curl -s -X POST http://my-api.default.svc.cluster.local/api/data -d '{"key":"value"}'

# Test DELETE routing
kubectl exec deploy/sleep -c sleep -- curl -s -X DELETE http://my-api.default.svc.cluster.local/api/data/123
```

Check the access logs on each version's pods to confirm requests are landing where you expect:

```bash
kubectl logs deploy/my-api-read -c istio-proxy | tail -20
kubectl logs deploy/my-api-write -c istio-proxy | tail -20
```

## Validation

Run the Istio configuration analyzer to make sure everything is correct:

```bash
istioctl analyze -n default
```

If you see warnings about missing destination rules or unreachable routes, fix those before moving on. The analyzer is good at catching configuration mistakes that would otherwise show up as 503 errors at runtime.

## Common Mistakes

**Forgetting the catch-all route.** If your match rules do not cover all HTTP methods and you do not have a default route at the bottom, unmatched requests will get a 404 from the mesh. Always add a route without match conditions as the last entry.

**Using regex when exact works.** For HTTP methods, there is no reason to use regex matching. Methods are a fixed set of strings, and exact matching is both simpler and more efficient.

**Case sensitivity.** HTTP methods in Istio matching are case-sensitive. Use uppercase (GET, POST, PUT) as that is what the HTTP spec defines. Lowercase "get" will not match a standard HTTP GET request.

## Summary

Routing by HTTP method in Istio is a clean way to split traffic between service versions based on the type of operation. It works well for read/write splitting, applying different reliability policies per method, and gradual migration strategies. The combination of method matching with path matching and retry policies gives you a lot of control over how different types of requests flow through your service mesh.
