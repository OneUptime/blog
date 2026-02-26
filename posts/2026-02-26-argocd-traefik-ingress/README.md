# How to Expose ArgoCD with Traefik Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Traefik, Ingress

Description: Step-by-step guide to exposing ArgoCD server through Traefik Ingress Controller with IngressRoute CRDs, TLS, and gRPC routing.

---

Traefik is a popular ingress controller that ships as the default in K3s and is widely used in lightweight Kubernetes setups. Configuring Traefik to work with ArgoCD requires some specific handling because ArgoCD serves both HTTPS web traffic and gRPC traffic for the CLI. This guide covers the complete setup using both standard Kubernetes Ingress resources and Traefik's native IngressRoute CRDs.

## Why Traefik for ArgoCD

Traefik brings automatic service discovery, middleware support, and native Let's Encrypt integration. If you are running K3s, Traefik is already there waiting for you. Its IngressRoute CRD gives you more flexibility than the standard Kubernetes Ingress resource, including better gRPC support and middleware chaining.

## Prerequisites

You need:

- A Kubernetes cluster with ArgoCD installed
- Traefik Ingress Controller deployed (included by default in K3s)
- A DNS record pointing to your Traefik load balancer IP

If you need to install Traefik manually:

```bash
# Install Traefik with Helm
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace
```

## Method 1: Using Traefik IngressRoute CRD

The IngressRoute CRD is the preferred way to configure Traefik routing. It gives you more control than the standard Kubernetes Ingress resource.

First, configure ArgoCD server to run in insecure mode so Traefik handles TLS:

```yaml
# Patch the argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

Now create the IngressRoute for the web UI:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: argocd-server
  namespace: argocd
spec:
  entryPoints:
    - websecure
  routes:
    - kind: Rule
      match: Host(`argocd.example.com`)
      priority: 10
      services:
        - name: argocd-server
          port: 80
    - kind: Rule
      # Route gRPC traffic based on content-type header
      match: Host(`argocd.example.com`) && Headers(`Content-Type`, `application/grpc`)
      priority: 11
      services:
        - name: argocd-server
          port: 80
          scheme: h2c
  tls:
    certResolver: letsencrypt
    # Or use a specific TLS secret:
    # secretName: argocd-server-tls
```

The key part here is the second route rule. It matches gRPC requests by checking the `Content-Type` header and routes them using `h2c` (HTTP/2 cleartext), which is how gRPC communicates with an insecure backend.

## Method 2: TLS Passthrough with IngressRouteTCP

If you want to keep ArgoCD's built-in TLS instead of terminating at Traefik, use an IngressRouteTCP with TLS passthrough:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRouteTCP
metadata:
  name: argocd-server
  namespace: argocd
spec:
  entryPoints:
    - websecure
  routes:
    - match: HostSNI(`argocd.example.com`)
      services:
        - name: argocd-server
          port: 443
  tls:
    passthrough: true
```

This approach passes all encrypted traffic directly to the ArgoCD server without Traefik inspecting or terminating TLS. It is simpler but has a trade-off: Traefik cannot apply middleware (rate limiting, headers, etc.) to passthrough traffic.

## Method 3: Standard Kubernetes Ingress

If you prefer to stick with standard Kubernetes Ingress resources (no Traefik CRDs), you can do that too:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Tell Traefik to use the websecure entrypoint
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    # Enable TLS
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-server-tls
```

## Adding Middleware

One of Traefik's strengths is its middleware system. You can add IP whitelisting, rate limiting, and basic auth on top of ArgoCD access:

```yaml
# IP Whitelist middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: argocd-ipwhitelist
  namespace: argocd
spec:
  ipAllowList:
    sourceRange:
      - 10.0.0.0/8
      - 192.168.1.0/24
---
# Rate limiting middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: argocd-ratelimit
  namespace: argocd
spec:
  rateLimit:
    average: 100
    burst: 50
---
# Apply middleware to the IngressRoute
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: argocd-server
  namespace: argocd
spec:
  entryPoints:
    - websecure
  routes:
    - kind: Rule
      match: Host(`argocd.example.com`)
      middlewares:
        - name: argocd-ipwhitelist
        - name: argocd-ratelimit
      services:
        - name: argocd-server
          port: 80
  tls:
    certResolver: letsencrypt
```

## HTTP to HTTPS Redirect

Configure Traefik to automatically redirect HTTP requests to HTTPS:

```yaml
# Redirect middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: argocd-redirect-https
  namespace: argocd
spec:
  redirectScheme:
    scheme: https
    permanent: true
---
# HTTP IngressRoute that redirects to HTTPS
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: argocd-server-http
  namespace: argocd
spec:
  entryPoints:
    - web
  routes:
    - kind: Rule
      match: Host(`argocd.example.com`)
      middlewares:
        - name: argocd-redirect-https
      services:
        - name: argocd-server
          port: 80
```

## Automatic TLS with Let's Encrypt

Traefik can automatically provision TLS certificates from Let's Encrypt. Configure the certificate resolver in your Traefik deployment:

```yaml
# Traefik Helm values
additionalArguments:
  - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
  - "--certificatesresolvers.letsencrypt.acme.storage=/data/acme.json"
  - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
```

Then reference it in your IngressRoute as shown in the examples above with `certResolver: letsencrypt`.

## Verifying the Setup

```bash
# Check IngressRoute resources
kubectl get ingressroute -n argocd

# Check Traefik logs for routing issues
kubectl logs -n traefik -l app.kubernetes.io/name=traefik

# Test HTTPS access
curl -I https://argocd.example.com

# Test CLI login with gRPC
argocd login argocd.example.com --grpc-web
```

## Troubleshooting

**404 Not Found**: Make sure the Host rule matches your DNS record exactly and the entrypoint is correct.

**gRPC Failures**: When using TLS termination, ensure `scheme: h2c` is set on the gRPC route service. Without it, Traefik will not use HTTP/2 to the backend.

**Certificate Errors**: If using Let's Encrypt, verify that the HTTP challenge entrypoint (port 80) is accessible from the internet.

**Redirect Loops**: This happens when ArgoCD is not running in insecure mode but Traefik is terminating TLS. Set `server.insecure: "true"` in the ArgoCD ConfigMap.

For more ingress options, see our guide on [exposing ArgoCD with Nginx Ingress](https://oneuptime.com/blog/post/2026-02-26-argocd-nginx-ingress/view) or [configuring ArgoCD with Istio](https://oneuptime.com/blog/post/2026-02-26-argocd-istio-virtual-service/view).
