# How to Configure K3s Traefik IngressRoute

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Traefik, Ingress, Networking, DevOps

Description: Learn how to use Traefik's IngressRoute CRD in K3s for advanced routing configurations beyond what standard Kubernetes Ingress supports.

## Introduction

K3s ships with Traefik as its default ingress controller, which supports not only the standard Kubernetes `Ingress` resource but also its own powerful `IngressRoute` custom resource. `IngressRoute` gives you access to Traefik-specific features like advanced routing rules, middleware chains, priority-based routing, and gRPC support. This guide covers using `IngressRoute` for real-world routing scenarios.

## Prerequisites

- K3s cluster with Traefik running (default K3s installation)
- `kubectl` configured
- Basic understanding of Traefik concepts

## Verify Traefik is Running

```bash
# Check Traefik pods and services

kubectl get pods -n kube-system | grep traefik
kubectl get svc -n kube-system | grep traefik

# Check Traefik CRDs are installed
kubectl get crd | grep traefik

# Expected CRDs:
# ingressroutes.traefik.io
# middlewares.traefik.io
# traefikservices.traefik.io
# ...
```

## Step 1: Basic IngressRoute

A simple IngressRoute for HTTP routing:

```yaml
# basic-ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: my-app-route
  namespace: default
spec:
  # Route HTTP traffic (port 80)
  entryPoints:
    - web
  routes:
    - match: Host(`myapp.example.com`)
      kind: Rule
      services:
        - name: my-app-service
          port: 80
```

## Step 2: HTTPS IngressRoute with TLS

```yaml
# https-ingressroute.yaml
---
# Secret containing TLS certificate
apiVersion: v1
kind: Secret
metadata:
  name: myapp-tls-cert
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
---
# HTTPS IngressRoute
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: my-app-https-route
  namespace: default
spec:
  entryPoints:
    - websecure  # Port 443
  routes:
    - match: Host(`myapp.example.com`)
      kind: Rule
      services:
        - name: my-app-service
          port: 80
  tls:
    secretName: myapp-tls-cert
```

## Step 3: Path-Based Routing

Route different paths to different services:

```yaml
# path-routing.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: multi-service-route
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    # Route /api/* to the API service
    - match: Host(`example.com`) && PathPrefix(`/api`)
      kind: Rule
      priority: 20
      services:
        - name: api-service
          port: 8080

    # Route /static/* to the CDN service
    - match: Host(`example.com`) && PathPrefix(`/static`)
      kind: Rule
      priority: 15
      services:
        - name: static-service
          port: 8080

    # Default: route everything else to the frontend
    - match: Host(`example.com`)
      kind: Rule
      priority: 10
      services:
        - name: frontend-service
          port: 80
  tls:
    secretName: example-tls-cert
```

## Step 4: Using Middleware

Traefik Middleware objects can be chained onto routes:

```yaml
# middleware-examples.yaml
---
# Rate limiting middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: default
spec:
  rateLimit:
    average: 100   # requests per period
    period: 1m
    burst: 50

---
# Basic authentication middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: basic-auth
  namespace: default
spec:
  basicAuth:
    secret: auth-secret  # Kubernetes secret with htpasswd format

---
# HTTPS redirect middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: https-redirect
  namespace: default
spec:
  redirectScheme:
    scheme: https
    permanent: true

---
# Strip prefix middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-api-prefix
  namespace: default
spec:
  stripPrefix:
    prefixes:
      - /api

---
# Add security headers
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: security-headers
  namespace: default
spec:
  headers:
    customResponseHeaders:
      X-Frame-Options: "SAMEORIGIN"
      X-Content-Type-Options: "nosniff"
      X-XSS-Protection: "1; mode=block"
```

## Step 5: Apply Middleware to Routes

```yaml
# route-with-middleware.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: secure-api-route
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`) && PathPrefix(`/v1`)
      kind: Rule
      # Apply multiple middleware
      middlewares:
        - name: rate-limit
        - name: security-headers
        - name: strip-api-prefix
      services:
        - name: api-service
          port: 8080
  tls:
    certResolver: letsencrypt  # Use a certResolver already configured in Traefik
```

## Step 6: Load Balancing with Weighted Services

```yaml
# weighted-routing.yaml
---
apiVersion: traefik.io/v1alpha1
kind: TraefikService
metadata:
  name: app-canary-wrr
  namespace: default
spec:
  weighted:
    services:
      # 90% traffic to stable version
      - name: app-stable
        kind: Service
        port: 80
        weight: 90
      # 10% traffic to canary version (blue-green/canary)
      - name: app-canary
        kind: Service
        port: 80
        weight: 10
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: canary-route
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: app-canary-wrr
          kind: TraefikService
  tls:
    secretName: app-tls-cert
```

## Step 7: gRPC Routing

```yaml
# grpc-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: grpc-service-route
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`grpc.example.com`)
      kind: Rule
      services:
        - name: grpc-service
          port: 9090
          # gRPC uses HTTP/2
          scheme: h2c
  tls:
    secretName: grpc-tls-cert
```

## Step 8: TCP Routing (Non-HTTP)

Traefik also supports TCP routing for databases and other protocols:

```yaml
# tcp-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRouteTCP
metadata:
  name: postgres-route
  namespace: default
spec:
  entryPoints:
    - postgres  # Custom entrypoint configured and exposed by Traefik
  routes:
    - match: HostSNI(`db.example.com`)
      services:
        - name: postgres-service
          port: 5432
  tls:
    passthrough: true  # Pass TLS through to the backend
```

## Step 9: Create a Basic Auth Secret

```bash
# Install apache2-utils for htpasswd
apt-get install -y apache2-utils

# Create credentials
htpasswd -nb admin securep@ssword > auth.txt

# Create Kubernetes secret from htpasswd file
kubectl create secret generic auth-secret \
  --from-file=users=auth.txt \
  -n default
```

## Conclusion

Traefik's `IngressRoute` CRD provides significantly more flexibility than standard Kubernetes `Ingress` resources. Features like middleware chains, weighted routing for canary deployments, TCP routing, and gRPC support make it powerful for complex microservices architectures. Since K3s includes Traefik by default, you can use these features immediately without any additional installation in your K3s cluster.
