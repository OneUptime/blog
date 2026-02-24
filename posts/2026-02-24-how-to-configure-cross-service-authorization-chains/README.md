# How to Configure Cross-Service Authorization Chains

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization Chains, Microservices, Security, Kubernetes

Description: How to build cross-service authorization chains in Istio that enforce access control across multi-hop microservice request flows.

---

When a request flows through multiple services (frontend -> API -> orders -> inventory -> warehouse), you need authorization at every hop. But you also need to reason about the entire chain. Maybe the warehouse service should only accept requests that originated from the API gateway and went through the orders service. Skipping any hop in the chain should be denied.

Cross-service authorization chains enforce this kind of path-based security. Istio gives you the tools to implement these chains using service identity, custom headers, and layered policies.

## Why Chain Authorization Matters

Without chain authorization, a compromised service can call any other service directly. If the inventory service is compromised, it could call the warehouse service directly, bypassing the orders service and any business logic validation that happens there.

With chain authorization, the warehouse service verifies not just who is calling (inventory service) but also who called the caller (orders service, called by the API gateway). This defense-in-depth approach limits the blast radius of a compromise.

## Setting Up Service Identities

First, make sure each service has its own service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-gateway
  namespace: frontend
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: backend
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: inventory-service
  namespace: backend
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: warehouse-service
  namespace: backend
```

Each deployment should reference its service account:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      serviceAccountName: order-service
      containers:
      - name: order-service
        image: my-registry/order-service:v1
        ports:
        - containerPort: 8080
```

## Basic Chain: Direct Caller Verification

The simplest chain authorization verifies the immediate caller at each hop:

```yaml
# Order service: only accepts calls from the API gateway
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/api-gateway"]
---
# Inventory service: only accepts calls from the order service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: inventory-service-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: inventory-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/order-service"]
---
# Warehouse service: only accepts calls from the inventory service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: warehouse-service-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: warehouse-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/inventory-service"]
```

This creates a chain: gateway -> orders -> inventory -> warehouse. Each link only accepts calls from the previous link. If the inventory service tries to call the warehouse directly (bypassing orders), it still works because inventory is the allowed caller. But if a random service tries to call warehouse, it gets denied.

## Full Chain Verification with Headers

To verify the entire chain (not just the immediate caller), propagate chain information through headers:

Set up an EnvoyFilter at the API gateway to start the chain:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: start-auth-chain
  namespace: frontend
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_OUTBOUND
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
              request_handle:headers():replace("x-call-chain", "api-gateway")
            end
```

Each downstream service appends its identity:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: extend-auth-chain
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: order-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_OUTBOUND
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
              local chain = request_handle:headers():get("x-call-chain") or ""
              request_handle:headers():replace("x-call-chain", chain .. ">order-service")
            end
```

Now verify the full chain at the destination:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: warehouse-chain-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: warehouse-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/inventory-service"]
    when:
    - key: request.headers[x-call-chain]
      values: ["api-gateway>order-service>inventory-service"]
```

## Preventing Chain Spoofing

The chain header approach has a weakness: a compromised service could forge the chain header. To mitigate this:

1. Strip the chain header at the ingress gateway so external clients can't inject it:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: strip-chain-header
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
              request_handle:headers():remove("x-call-chain")
            end
```

2. Combine chain verification with service identity at every hop. Even if the header is forged, the mTLS identity can't be:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: inventory-chain-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: inventory-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/order-service"]
    when:
    - key: request.headers[x-call-chain]
      values: ["api-gateway>order-service"]
```

This way, even if someone spoofs the header, they also need the correct mTLS identity, which they can't forge.

## Using JWT Token Propagation for Chain Verification

A more secure approach uses JWT tokens that each service mints and passes along:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: chain-token-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: warehouse-service
  jwtRules:
  - issuer: "https://auth.example.com/"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
```

Your application code at each service validates the incoming token and adds its own claim to the token (or creates a new scoped token) before calling the next service. The final service can check that the token contains claims from all expected intermediaries.

## Monitoring Chain Violations

Set up alerts for authorization denials in the chain:

```yaml
groups:
- name: chain-auth-alerts
  rules:
  - alert: UnauthorizedChainAccess
    expr: |
      sum(rate(istio_requests_total{
        response_code="403",
        destination_workload=~"warehouse-service|inventory-service"
      }[5m])) by (source_workload, destination_workload) > 0
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Unauthorized access attempt in service chain"
      description: "{{ $labels.source_workload }} was denied access to {{ $labels.destination_workload }}"
```

Check the authorization logs:

```bash
# Enable RBAC debug logging
istioctl proxy-config log deployment/warehouse-service -n backend --level rbac:debug

# Watch for denied requests
kubectl logs deployment/warehouse-service -n backend -c istio-proxy --tail=100 | grep "rbac"
```

## Visualizing the Chain

Use Kiali to visualize the service graph and verify that traffic flows through the expected chain:

```bash
kubectl port-forward svc/kiali -n istio-system 20001:20001
```

In the Kiali dashboard, look at the service graph for your namespace. You should see edges only between adjacent services in your chain. Any unexpected edges indicate potential bypass attempts.

Cross-service authorization chains add a strong layer of defense to your microservices architecture. By combining Istio's mTLS identities with chain headers and layered policies, you can enforce that requests follow the expected path through your system. Start with basic direct-caller verification and add full chain validation for your most sensitive service paths.
