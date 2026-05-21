# How to Configure Security Policy Examples in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Authorization Policy, PeerAuthentication, Kubernetes

Description: Practical security policy examples for Istio covering authentication, authorization, deny patterns, and workload-level security configurations.

---

Istio security policies let you control who can access what in your service mesh. Common policy types include PeerAuthentication (controlling mTLS between services), RequestAuthentication (validating request-level credentials such as JWTs), and AuthorizationPolicy (controlling who can call what). Together, they provide the building blocks for a zero-trust security model where service calls can be authenticated and authorized.

Rather than explaining theory, this post is a collection of practical security policy examples you can adapt for your own mesh.

## Default Deny-All Policy

Start with a deny-all policy at the namespace level. Then allow specific traffic explicitly. This follows the principle of least privilege.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
```

An AuthorizationPolicy with an empty spec (no rules) denies all traffic. Apply this to your production namespace, then add allow policies for each service.

## Allow Specific Service-to-Service Communication

After the deny-all, allow specific services to communicate:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/frontend
      to:
        - operation:
            methods:
              - GET
              - POST
            paths:
              - /api/*
```

This allows only the `frontend` service account to call `api-service`, and only for GET and POST methods on paths starting with `/api/`.

## Allow Health Checks from Kubernetes

If you deny all traffic, remember to allow any health endpoints that are reached through the mesh, such as checks from an in-mesh monitor or an ingress gateway:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  rules:
    - to:
        - operation:
            paths:
              - /healthz
              - /readyz
            methods:
              - GET
```

A rule without a `from` clause allows traffic from any source. Combined with the specific paths, this lets callers reach your health endpoints without opening the rest of the service. Kubernetes HTTP, TCP, and gRPC probes are usually rewritten by Istio to the sidecar agent by default; if you disable probe rewriting, account for kubelet probes separately.

## Strict mTLS for a Namespace

Enforce mutual TLS for all services in a namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT
```

With `STRICT` mode, only mTLS connections are accepted. Any service without a sidecar (or outside the mesh) cannot communicate with services in this namespace.

## Permissive mTLS During Migration

When migrating services to the mesh, use permissive mode to accept both mTLS and plaintext:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: permissive-mtls
  namespace: production
spec:
  mtls:
    mode: PERMISSIVE
```

Once all services have sidecars, switch to `STRICT`.

## Port-Level mTLS Configuration

Some ports might need different mTLS settings. A common case is a service that accepts external traffic on one port and mesh traffic on another:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mixed-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: STRICT
    9090:
      mode: PERMISSIVE
```

Port 8080 requires mTLS while port 9090 accepts both. The keys under `portLevelMtls` are workload ports, not Kubernetes Service ports.

## JWT Authentication

Require JWT tokens for external requests:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
      outputPayloadToHeader: "x-jwt-payload"
```

This validates JWT tokens but doesn't deny requests without tokens. To deny unauthenticated requests, pair it with an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  rules:
    - from:
        - source:
            requestPrincipals:
              - "https://auth.example.com/*"
      to:
        - operation:
            paths:
              - /api/*
    - to:
        - operation:
            paths:
              - /healthz
            methods:
              - GET
```

This requires a valid JWT (with issuer matching `https://auth.example.com`) for all `/api/*` paths, while allowing unauthenticated health checks.

## IP-Based Allow Lists

Restrict access to specific IP ranges:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ip-allowlist
  namespace: production
spec:
  selector:
    matchLabels:
      app: admin-panel
  rules:
    - from:
        - source:
            ipBlocks:
              - 10.0.0.0/8
              - 192.168.1.0/24
      to:
        - operation:
            ports:
              - "8080"
```

Only traffic from the specified source IP ranges can access the admin panel. If you are matching the original client IP behind an ingress proxy or load balancer, use `remoteIpBlocks` and configure trusted proxy handling instead.

## Deny Specific Paths

Instead of allow-listing everything, sometimes you want to deny specific sensitive paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-admin-paths
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  action: DENY
  rules:
    - to:
        - operation:
            paths:
              - /admin/*
              - /internal/*
      from:
        - source:
            notPrincipals:
              - cluster.local/ns/production/sa/admin-service
```

This denies access to `/admin/*` and `/internal/*` paths for everyone except the `admin-service` service account. `DENY` policies are evaluated before `ALLOW` policies, so this takes precedence.

## Namespace-Based Access Control

Allow traffic only from specific namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: namespace-access
  namespace: backend
spec:
  rules:
    - from:
        - source:
            namespaces:
              - frontend
              - backend
```

Only services from the `frontend` and `backend` namespaces can communicate with services in the `backend` namespace.

## Custom Deny Response

By default, denied requests get a minimal 403 response. AuthorizationPolicy does not expose a response body setting directly. If you need custom local replies, you can use an EnvoyFilter carefully. For example, this formats local Envoy replies, including RBAC denials, as JSON for the selected workload:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-deny-response
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-service
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            local_reply_config:
              body_format:
                json_format:
                  status: "%RESPONSE_CODE%"
                  message: "%LOCAL_REPLY_BODY%"
                content_type: application/json
```

## Dry-Run Mode for Testing Policies

Before enforcing a new policy, test it in dry-run mode. It logs what would be denied without actually blocking anything:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: test-policy
  namespace: production
  annotations:
    istio.io/dry-run: "true"
spec:
  selector:
    matchLabels:
      app: api-service
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/frontend
```

Check the dry-run results in the sidecar logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n production | grep "shadow"
```

## Complete Example: Multi-Tier Application

Here's a full security configuration for a three-tier application:

```yaml
# Deny all by default

apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
---
# Frontend can be accessed from the gateway
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: frontend-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: frontend
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account
    - to:
        - operation:
            paths:
              - /healthz
            methods:
              - GET
---
# API can be called by frontend
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: api
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/frontend
      to:
        - operation:
            methods:
              - GET
              - POST
              - PUT
              - DELETE
    - to:
        - operation:
            paths:
              - /healthz
            methods:
              - GET
---
# Database can only be accessed by API
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: db-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: database
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/api
      to:
        - operation:
            ports:
              - "5432"
```

This creates a clear security boundary: gateway -> frontend -> api -> database. No service can bypass its tier to access services in other tiers directly.

These examples cover the most common security policy patterns in Istio. Start with deny-all, add specific allow rules, and test with dry-run mode before enforcing. Layer PeerAuthentication for transport security with AuthorizationPolicy for access control, and you have a solid security foundation for your mesh.
