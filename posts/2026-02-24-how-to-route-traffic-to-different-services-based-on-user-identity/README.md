# How to Route Traffic to Different Services Based on User Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, User Identity, Traffic Routing, Kubernetes

Description: Learn how to route traffic to different service versions or backends based on user identity using Istio VirtualService header matching.

---

Routing traffic based on who the user is opens up a lot of possibilities. You can give premium users a dedicated backend, send internal employees to a different version for testing, or route specific accounts to an upgraded service. Istio handles this at the proxy layer by matching on headers that carry user identity information.

## The General Approach

Istio does not have built-in user authentication. It works with whatever identity information is already in the request. Typically this comes from:

- A JWT token (decoded by Istio or an upstream gateway)
- A custom header set by your authentication middleware
- A cookie containing a session identifier
- An API key header

Your auth layer extracts the user identity and puts it in a header. Istio matches on that header and routes accordingly.

## Routing Based on a User ID Header

The simplest pattern is matching on a header that contains the user ID or a user group:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            x-user-group:
              exact: "enterprise"
      route:
        - destination:
            host: my-app
            subset: enterprise
    - match:
        - headers:
            x-user-group:
              exact: "premium"
      route:
        - destination:
            host: my-app
            subset: premium
    - route:
        - destination:
            host: my-app
            subset: standard
```

Your auth middleware sets the `x-user-group` header based on the user's subscription level, and Istio routes to the appropriate backend.

## Routing Specific Users for Testing

Want to test a new feature with specific users before rolling it out?

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            x-user-id:
              regex: "^(user-123|user-456|user-789)$"
      route:
        - destination:
            host: my-app
            subset: beta
    - route:
        - destination:
            host: my-app
            subset: stable
```

Users with IDs `user-123`, `user-456`, and `user-789` get the beta version. Everyone else gets stable.

## JWT Claims-Based Routing

If you use Istio's RequestAuthentication with JWT tokens, you can route based on JWT claims. First, set up the authentication policy:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      outputClaimToHeaders:
        - header: x-jwt-role
          claim: role
        - header: x-jwt-tenant
          claim: tenant_id
```

The `outputClaimToHeaders` field extracts JWT claims and puts them into request headers. Now you can route on them:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            x-jwt-role:
              exact: "admin"
      route:
        - destination:
            host: admin-service
            port:
              number: 80
    - match:
        - headers:
            x-jwt-tenant:
              regex: "^(tenant-a|tenant-b)$"
      route:
        - destination:
            host: my-app
            subset: v2
    - route:
        - destination:
            host: my-app
            subset: v1
```

Admin users go to the admin service. Specific tenants get v2. Everyone else gets v1.

## Multi-Tenant Routing

For multi-tenant applications, route each tenant to their own backend:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tenant-router
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - my-gateway
  http:
    - match:
        - headers:
            x-tenant-id:
              exact: "acme-corp"
      route:
        - destination:
            host: acme-corp-service.tenant-acme.svc.cluster.local
            port:
              number: 80
    - match:
        - headers:
            x-tenant-id:
              exact: "globex"
      route:
        - destination:
            host: globex-service.tenant-globex.svc.cluster.local
            port:
              number: 80
    - route:
        - destination:
            host: shared-service.default.svc.cluster.local
            port:
              number: 80
```

Each tenant can have their own namespace, their own deployment, and even their own database. The routing is transparent to the client.

## Routing Internal Users

A common need is routing internal company users to a staging or test version:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            x-user-email:
              regex: ".*@mycompany[.]com$"
      route:
        - destination:
            host: my-app
            subset: staging
    - route:
        - destination:
            host: my-app
            subset: production
```

Anyone with a `@mycompany.com` email gets the staging version. External users get production.

## Cookie-Based Identity Routing

If user identity is stored in a session cookie:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            cookie:
              regex: ".*user_tier=gold.*"
      route:
        - destination:
            host: my-app
            subset: gold
    - match:
        - headers:
            cookie:
              regex: ".*user_tier=silver.*"
      route:
        - destination:
            host: my-app
            subset: silver
    - route:
        - destination:
            host: my-app
            subset: standard
```

## Combining Identity with Other Conditions

You can combine user identity with path matching for fine-grained control:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    # Admin users accessing the admin panel
    - match:
        - headers:
            x-user-role:
              exact: "admin"
          uri:
            prefix: "/admin"
      route:
        - destination:
            host: admin-panel
            port:
              number: 80
    # Premium users accessing the API
    - match:
        - headers:
            x-user-tier:
              exact: "premium"
          uri:
            prefix: "/api"
      route:
        - destination:
            host: premium-api
            port:
              number: 80
          headers:
            request:
              set:
                x-rate-limit: "10000"
    # Standard users accessing the API
    - match:
        - uri:
            prefix: "/api"
      route:
        - destination:
            host: standard-api
            port:
              number: 80
          headers:
            request:
              set:
                x-rate-limit: "1000"
    # Default route
    - route:
        - destination:
            host: frontend
            port:
              number: 80
```

Premium API users get a higher rate limit header, while standard users get a lower one.

## Security Considerations

A few things to keep in mind:

1. **Do not trust client-set headers.** If the routing header can be set by the client, any user can impersonate another. Make sure the identity header is set by your auth middleware and stripped from incoming requests.

2. **Use AuthorizationPolicy** alongside VirtualService. Routing is not authorization. A user might be routed to the admin backend, but that does not mean they should have access. Add an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-only
  namespace: default
spec:
  selector:
    matchLabels:
      app: admin-panel
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.headers[x-user-role]
          values: ["admin"]
```

3. **Header propagation** - Make sure identity headers are propagated across service-to-service calls if downstream services need them.

Identity-based routing with Istio is a powerful pattern for multi-tenant platforms, gradual feature rollouts, and tiered service offerings. The key is having a reliable auth layer that sets the identity headers, and then Istio takes care of the rest.
