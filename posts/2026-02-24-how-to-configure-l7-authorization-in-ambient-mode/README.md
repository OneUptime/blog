# How to Configure L7 Authorization in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Authorization, L7, Waypoint Proxy, Security

Description: Set up L7 authorization policies in Istio ambient mode using waypoint proxies to enforce HTTP-level access control based on methods, paths, and headers.

---

L4 authorization in ambient mode handles the basics: which service can connect to which other service. But sometimes you need more granularity. You want to allow a service to call GET on /api/v1/users but not DELETE. Or you want to restrict access to admin endpoints based on JWT claims. For this, you need L7 authorization, which requires a waypoint proxy.

This guide walks through setting up L7 authorization policies with waypoint proxies in Istio ambient mode.

## When You Need L7 Authorization

L7 authorization is necessary when your access control depends on HTTP-level information:

- **HTTP methods**: Allow GET but deny DELETE
- **URL paths**: Allow /api/public/* but deny /api/admin/*
- **HTTP headers**: Check for specific headers like authorization tokens
- **Request properties**: Match on host headers, ports, or other request attributes

ztunnel operates at L4 and cannot inspect HTTP content. It only sees TCP connections and SPIFFE identities. The waypoint proxy runs a full Envoy instance that can parse HTTP and enforce L7 policies.

## Setting Up a Waypoint Proxy

First, make sure your namespace is in ambient mode:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

Create a waypoint proxy for the namespace:

```bash
istioctl waypoint apply --namespace default
```

Verify it is running:

```bash
kubectl get gateways -n default
kubectl get pods -n default -l istio.io/gateway-name=waypoint
```

You should see a Gateway resource and a running waypoint pod.

## Basic L7 Authorization Policy

Here is a policy that restricts access based on HTTP methods and paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-access-control
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/web-frontend"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/v1/products", "/api/v1/products/*"]
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/admin-service"]
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
        paths: ["/api/v1/*"]
```

This policy:
- Allows the web frontend to only call GET on product endpoints
- Allows the admin service full access to all API endpoints
- Denies everything else

## Path-Based Authorization

Control access to different URL paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: path-based-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: user-service
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["default"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/v1/users", "/api/v1/users/*"]
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/user-admin"]
    to:
    - operation:
        methods: ["POST", "PUT", "DELETE"]
        paths: ["/api/v1/users", "/api/v1/users/*"]
  - from:
    - source:
        namespaces: ["monitoring"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/healthz", "/readyz", "/metrics"]
```

This setup gives read access to any service in the default namespace, write access only to the user-admin service, and health/metrics access to the monitoring namespace.

## Header-Based Authorization

You can match on specific HTTP headers:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: header-based-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: internal-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/api-gateway"]
    to:
    - operation:
        methods: ["GET", "POST"]
    when:
    - key: request.headers[x-api-version]
      values: ["v2", "v3"]
```

This only allows requests that include an `x-api-version` header with value `v2` or `v3`.

## Deny Specific Paths

Block access to sensitive endpoints while allowing everything else:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-admin-paths
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
  - to:
    - operation:
        paths: ["/admin", "/admin/*", "/internal/*"]
  - from:
    - source:
        notPrincipals: ["cluster.local/ns/default/sa/admin-service"]
    to:
    - operation:
        methods: ["DELETE"]
```

The first rule blocks all access to admin and internal paths. The second rule blocks DELETE requests from anyone except the admin service.

## Combining L4 and L7 Policies

You can have both L4 and L7 authorization policies. L4 policies are enforced by ztunnel, and L7 policies are enforced by the waypoint proxy. Both must allow the request for it to succeed:

```yaml
# L4 policy enforced by ztunnel
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: l4-network-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["default", "frontend"]
    to:
    - operation:
        ports: ["8080"]
---
# L7 policy enforced by waypoint
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: l7-http-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["default"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/*"]
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/v1/orders", "/api/v1/orders/*"]
```

The L4 policy ensures only the `default` and `frontend` namespaces can even establish a connection. The L7 policy then further restricts what HTTP requests are allowed.

## Service-Account-Scoped Waypoint

For fine-grained control, create waypoints for specific service accounts:

```bash
istioctl waypoint apply --namespace default --service-account my-api
```

Now only traffic destined for workloads using the `my-api` service account flows through this waypoint. Other traffic in the namespace goes directly through ztunnel.

This is useful when only certain services need L7 authorization:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: my-api-l7-policy
  namespace: default
spec:
  targetRefs:
  - kind: Service
    group: ""
    name: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/frontend"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/v1/*"]
```

Using `targetRefs` instead of `selector` is the preferred approach in ambient mode for targeting specific services.

## Testing L7 Authorization

Test your policies with different HTTP methods and paths:

```bash
# Should succeed (GET on allowed path)
kubectl exec deploy/frontend -- curl -s -o /dev/null -w "%{http_code}" http://my-api:8080/api/v1/products

# Should fail (DELETE not allowed for frontend)
kubectl exec deploy/frontend -- curl -s -o /dev/null -w "%{http_code}" -X DELETE http://my-api:8080/api/v1/products/123

# Should fail (admin path blocked)
kubectl exec deploy/frontend -- curl -s -o /dev/null -w "%{http_code}" http://my-api:8080/admin/settings
```

Expected responses:
- 200 for allowed requests
- 403 for denied requests (RBAC: access denied)

## Monitoring L7 Authorization

The waypoint proxy reports L7 authorization metrics:

```promql
sum(rate(istio_requests_total{
  app="waypoint",
  response_code="403"
}[5m])) by (source_workload, destination_workload)
```

This shows the rate of denied requests, grouped by source and destination.

For a breakdown by path:

```promql
sum(rate(istio_requests_total{
  app="waypoint",
  response_code="403"
}[5m])) by (destination_workload, request_path)
```

## Debugging L7 Authorization

If requests are being unexpectedly denied:

1. Check the waypoint proxy logs:

```bash
kubectl logs -n default deploy/waypoint --tail=30
```

Look for RBAC-related log entries that show which policy denied the request.

2. Verify the waypoint is receiving traffic:

```bash
kubectl logs -n default deploy/waypoint | grep "my-api"
```

3. Check the effective policies:

```bash
istioctl x authz check deploy/my-api
```

4. Verify the waypoint is associated with the target workload:

```bash
istioctl x describe pod my-api-pod
```

## Performance Considerations

L7 authorization adds latency because the waypoint proxy needs to parse HTTP and evaluate policies. The overhead depends on:

- Number of rules in the policy
- Complexity of path matching (regex vs prefix)
- Number of concurrent requests

For most workloads, the added latency is 1-3ms. If you have very strict latency requirements, benchmark with your actual policies and traffic patterns.

Prefer simple path matching (prefix `/api/v1/*`) over regex patterns. Regex evaluation is more expensive.

## Best Practices

**Only use L7 where needed**: If L4 authorization (identity-based) is sufficient, skip the waypoint. It reduces complexity and latency.

**Use targetRefs over selector**: In ambient mode, `targetRefs` provides clearer scoping of policies to specific services.

**Keep policies readable**: Split complex policies into multiple named resources rather than cramming everything into one policy.

**Test thoroughly**: L7 authorization interacts with L4 authorization. Test the complete chain to make sure both layers work together as expected.

**Monitor 403 rates**: A sudden increase in 403 responses usually means a policy change had unintended consequences. Set up alerts for this.

L7 authorization in ambient mode gives you HTTP-level access control without the overhead of running sidecars in every pod. The waypoint proxy architecture lets you add L7 processing only where you need it, keeping the rest of your mesh lightweight.
