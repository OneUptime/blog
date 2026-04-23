# How to Configure Istio Authorization Policies in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Istio, Authorization, Security, Service Mesh

Description: Learn how to configure Istio AuthorizationPolicies to implement fine-grained access control for services in Rancher-managed Kubernetes clusters.

Istio AuthorizationPolicies provide access control for workloads in the mesh. A common zero-trust pattern is to start with an allow-nothing policy and then explicitly allow only the traffic your services require. Unlike Kubernetes RBAC, which controls access to Kubernetes API resources, Istio AuthorizationPolicies control traffic within the mesh based on service identity, HTTP attributes, and other conditions. This guide covers how to implement authorization policies in a Rancher environment.

## Prerequisites

- Istio installed with mTLS enabled in your Rancher cluster
- Applications deployed with sidecar injection
- Basic understanding of Istio service identities (SPIFFE/X.509)
- `kubectl` access to the cluster
- `istioctl` installed for proxy-level debugging

## Understanding Authorization Policy Actions

Istio AuthorizationPolicies support four actions:

- **ALLOW**: Explicitly allow matching requests
- **DENY**: Explicitly deny matching requests
- **AUDIT**: Mark matching requests for audit logging
- **CUSTOM**: Delegate to an external authorization system

## Step 1: Enable Default-Deny Policy (Zero Trust)

Start with an allow-nothing policy and explicitly allow required traffic:

```yaml
# allow-nothing.yaml - Block all traffic in a namespace by default

apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nothing
  namespace: my-app
spec:
  # Empty spec means this ALLOW policy matches nothing,
  # creating default-deny behavior for the namespace
  {}
```

```bash
kubectl apply -f allow-nothing.yaml

# Verify traffic is now blocked
# Try to access an HTTP service and confirm you get a 403 Forbidden response
```

## Step 2: Allow Traffic from Specific Services

```yaml
# allow-frontend-to-backend.yaml - Allow frontend to call backend
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: my-app
spec:
  selector:
    matchLabels:
      # Apply this policy to the backend workload
      app: backend
  action: ALLOW
  rules:
  - from:
    # Allow requests from the frontend service account
    - source:
        principals:
        - "cluster.local/ns/my-app/sa/frontend-service-account"
    to:
    - operation:
        # Only allow GET and POST methods
        methods: ["GET", "POST"]
        # Only allow access to /api/* paths
        paths: ["/api/*"]
```

## Step 3: Namespace-Level Access Control

```yaml
# allow-namespace.yaml - Allow all traffic from a specific namespace
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-from-frontend-namespace
  namespace: backend-ns
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        # Allow any service from the frontend namespace
        namespaces: ["frontend-ns"]
```

## Step 4: HTTP Attribute-Based Access Control

```yaml
# http-attribute-policy.yaml - Control access based on HTTP attributes
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: http-headers-policy
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/my-app/sa/trusted-service"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/public/*"]
    when:
    # Additional condition: require a specific header
    - key: request.headers[x-api-version]
      values: ["v2"]
```

## Step 5: JWT-Based Authorization

Control access using JWT token claims:

```yaml
# jwt-policy.yaml - Require valid JWT and check claims
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-api
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: jwt-authorization
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        # Require a valid JWT token
        requestPrincipals: ["*"]
    when:
    # Only allow users with the admin role
    - key: request.auth.claims[role]
      values: ["admin"]
```

## Step 6: Ingress Gateway Authorization

Control what external traffic can reach your services:

```yaml
# ingress-policy.yaml - Control traffic from the ingress gateway
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-ingress-gateway
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-frontend
  action: ALLOW
  rules:
  - from:
    - source:
        # Only allow traffic from the ingress gateway
        principals:
        - "cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"
```

## Step 7: Deny Specific Operations

For ingress traffic, when your load balancer or proxy preserves the original client IP, deny admin endpoints for client IPs outside trusted ranges:

```yaml
# deny-admin-from-external.yaml - Deny admin endpoints from client IPs outside trusted ranges
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external-admin-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: istio-ingressgateway
  action: DENY
  rules:
  - from:
    - source:
        # Match the original client IP address
        notRemoteIpBlocks: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
    to:
    - operation:
        # Deny access to admin paths for untrusted client IP ranges
        paths: ["/admin/*"]
```

## Step 8: Verify Authorization Policies

```bash
# List all authorization policies
kubectl get authorizationpolicy -A

# Describe a specific policy
kubectl describe authorizationpolicy allow-frontend-to-backend -n my-app

# Enable debug logging for authorization
istioctl proxy-config log \
  $(kubectl get pod -n my-app -l app=backend -o jsonpath='{.items[0].metadata.name}').my-app \
  --level "rbac:debug"

# Check Envoy proxy logs for authorization decisions
kubectl logs -n my-app -c istio-proxy \
  $(kubectl get pod -n my-app -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  | grep -E "enforced (allowed|denied)|rbac"
```

## Conclusion

Istio AuthorizationPolicies implement a powerful zero-trust security model for your service mesh. By combining service identity (via mTLS), namespace-based controls, HTTP attribute matching, and JWT authentication, you can build a comprehensive access control system that protects your microservices at the network layer without requiring any changes to your application code. When deployed through Rancher, these policies can be consistently applied and monitored across multiple clusters.
