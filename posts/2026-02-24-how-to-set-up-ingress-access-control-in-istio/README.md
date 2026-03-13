# How to Set Up Ingress Access Control in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ingresses, Access Control, Gateway, Security, Kubernetes

Description: How to configure authorization policies at the Istio ingress gateway to control external access to your services before traffic enters the mesh.

---

The ingress gateway is the front door of your Istio service mesh. Every external request passes through it before reaching your internal services. Applying authorization policies at the ingress gateway gives you a single enforcement point for access control, which is both efficient and easier to manage than scattering policies across dozens of internal services.

## Why Control Access at the Ingress

Applying policies at the gateway has several advantages over doing it at individual services:

- Rejected traffic never enters your mesh, reducing load on internal services
- You have one place to manage IP allowlists, rate limits, and authentication requirements
- Changes to access rules don't require touching individual service configurations
- It's easier to audit - you just look at the gateway policies

## Understanding the Istio Ingress Gateway

The Istio ingress gateway is an Envoy proxy running at the edge of your mesh. It's typically deployed in the `istio-system` namespace and exposed through a Kubernetes LoadBalancer service.

Authorization policies applied to the gateway work exactly like policies on any other workload - you just target the gateway's labels:

```bash
# Find your gateway's labels
kubectl get pods -n istio-system -l istio=ingressgateway --show-labels
```

The default label is usually `istio: ingressgateway`.

## IP-Based Access Control

Allow traffic only from specific IP ranges:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ingress-ip-whitelist
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            ipBlocks:
              - "203.0.113.0/24"
              - "198.51.100.0/24"
              - "10.0.0.0/8"
```

This restricts all ingress traffic to requests from these IP ranges. Everything else gets a 403.

There's an important caveat: the source IP seen by the gateway depends on your cloud provider and load balancer configuration. If the load balancer does SNAT (source network address translation), the gateway sees the load balancer's IP, not the client's real IP.

To preserve the original client IP, configure your load balancer to use proxy protocol or X-Forwarded-For headers:

```yaml
# For the gateway deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  template:
    metadata:
      annotations:
        # For AWS NLB
        service.beta.kubernetes.io/aws-load-balancer-proxy-protocol: "*"
```

And configure Istio to use `remoteIpBlocks` instead of `ipBlocks` for XFF-based IP checking:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ingress-remote-ip
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            remoteIpBlocks:
              - "203.0.113.0/24"
```

`remoteIpBlocks` uses the X-Forwarded-For header to determine the client IP, which works correctly behind load balancers.

## Host-Based Access Control

Control access based on the Host header, which lets you apply different rules to different domains served by the same gateway:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: host-based-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    # Public website - open to all
    - to:
        - operation:
            hosts: ["www.example.com", "www.example.com:443"]
    # API - requires authentication
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            hosts: ["api.example.com", "api.example.com:443"]
    # Admin - restricted IPs only
    - from:
        - source:
            remoteIpBlocks: ["203.0.113.0/24"]
      to:
        - operation:
            hosts: ["admin.example.com", "admin.example.com:443"]
```

Include both the bare hostname and the hostname with port, since some clients include the port in the Host header.

## Path-Based Ingress Policies

Apply different rules to different URL paths at the gateway level:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ingress-path-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    # Health and status endpoints
    - to:
        - operation:
            paths: ["/healthz", "/status"]
    # Public APIs
    - to:
        - operation:
            methods: ["GET"]
            paths: ["/api/v1/public/*"]
    # Authenticated APIs
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/*"]
```

## JWT Authentication at the Ingress

Requiring JWT tokens at the gateway means unauthenticated requests never reach your services:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: ingress-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "my-api"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ingress-require-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    # Public paths without JWT
    - to:
        - operation:
            paths: ["/public/*", "/healthz"]
    # Everything else needs JWT
    - from:
        - source:
            requestPrincipals: ["*"]
```

## Blocking Known Bad Patterns

Block common attack patterns at the gateway:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-attack-patterns
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
    # Block common scanning paths
    - to:
        - operation:
            paths:
              - "/.env"
              - "/.git/*"
              - "/wp-login.php"
              - "/wp-admin*"
              - "/phpMyAdmin*"
              - "/admin/config*"
              - "/actuator/*"
    # Block dangerous methods
    - to:
        - operation:
            methods: ["TRACE", "CONNECT"]
```

## Combining Ingress and Service-Level Policies

Gateway policies and service-level policies work together as defense in depth:

```yaml
# Gateway: broad access control
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-policy
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
---
# Service: fine-grained access control
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: service-policy
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"]
      when:
        - key: request.auth.claims[role]
          values: ["customer", "admin"]
```

The gateway requires a valid JWT. The service additionally checks that the request came through the gateway and that the user has the right role.

## Geo-Based Access Control

If your cloud load balancer adds geo headers, you can use them for geographic access control:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: geo-restriction
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
    - when:
        - key: request.headers[x-country-code]
          values: ["CN", "RU", "KP"]
```

This only works if your infrastructure injects geographic headers before they reach the gateway.

## Testing Ingress Policies

```bash
# Get your gateway's external IP
GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test from your machine
curl -s -o /dev/null -w "%{http_code}" -H "Host: api.example.com" http://$GATEWAY_IP/api/v1/users

# Test with JWT
curl -s -o /dev/null -w "%{http_code}" -H "Host: api.example.com" -H "Authorization: Bearer $TOKEN" http://$GATEWAY_IP/api/v1/users

# Test blocked path
curl -s -o /dev/null -w "%{http_code}" -H "Host: api.example.com" http://$GATEWAY_IP/.env

# Check gateway logs
kubectl logs -n istio-system -l istio=ingressgateway | grep -E "403|rbac"
```

## Common Mistakes

1. **Wrong namespace.** Ingress gateway policies must be in the same namespace as the gateway (usually `istio-system`). A policy in `my-app` namespace targeting `istio: ingressgateway` won't work because the gateway pods aren't in that namespace.

2. **Wrong selector labels.** Double-check the gateway pod labels. Custom gateway deployments might use different labels than the default `istio: ingressgateway`.

3. **IP address confusion.** Behind a load balancer, the source IP might not be what you expect. Use `remoteIpBlocks` with X-Forwarded-For when operating behind L7 load balancers.

4. **Host header with port.** Some clients send `Host: example.com:443`. If your policy only matches `example.com`, these requests get denied. Include both variants.

Ingress access control is your first line of defense. Getting it right means bad traffic never reaches your internal services, reducing attack surface and saving resources for legitimate requests.
