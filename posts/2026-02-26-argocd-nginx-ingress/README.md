# How to Expose ArgoCD with Nginx Ingress Controller

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, NGINX, Ingress

Description: Learn how to expose ArgoCD server through Nginx Ingress Controller with proper TLS, gRPC support, and authentication for production Kubernetes clusters.

---

Exposing ArgoCD to the outside world through an Nginx Ingress Controller is one of the most common networking setups in production Kubernetes environments. By default, ArgoCD runs inside your cluster and is only accessible through port-forwarding, which is fine for testing but impractical for teams. This guide walks you through configuring Nginx Ingress to serve the ArgoCD UI and API securely.

## Why Nginx Ingress for ArgoCD

Nginx Ingress Controller is the most widely adopted ingress controller in Kubernetes. It handles TLS termination, path-based routing, and load balancing. For ArgoCD, it provides a stable entry point that your team can access through a friendly URL instead of running `kubectl port-forward` every time.

ArgoCD serves both HTTPS and gRPC traffic on the same port (443 by default). This creates a unique challenge because the ingress needs to handle both protocols correctly. The ArgoCD UI uses HTTPS, while the ArgoCD CLI communicates over gRPC. Nginx Ingress handles this through specific annotations.

## Prerequisites

Before you start, make sure you have:

- A running Kubernetes cluster with ArgoCD installed
- Nginx Ingress Controller deployed in your cluster
- A DNS record pointing to your ingress controller's external IP
- (Optional) cert-manager for automatic TLS certificates

If you do not have Nginx Ingress Controller installed yet, deploy it with:

```bash
# Install Nginx Ingress Controller using Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

## Option 1: TLS Termination at the Ingress

This is the most common setup. The ingress terminates TLS and forwards plain HTTP to the ArgoCD server. For this to work, you need to configure the ArgoCD server to run in insecure mode (it still sits behind TLS at the ingress level).

First, configure the ArgoCD server to run without TLS:

```yaml
# argocd-cmd-params-cm ConfigMap patch
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Tell ArgoCD server to run without TLS
  server.insecure: "true"
```

Apply this change and restart the ArgoCD server:

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

Now create the Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Force HTTPS redirect
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    # Use the backend protocol as HTTPS if not running insecure
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    # Increase proxy buffer size for large ArgoCD responses
    nginx.ingress.kubernetes.io/proxy-buffer-size: "64k"
spec:
  ingressClassName: nginx
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

## Option 2: TLS Passthrough

With TLS passthrough, the ingress does not terminate TLS. Instead, it passes encrypted traffic directly to the ArgoCD server. This approach keeps ArgoCD's own TLS certificate in play and works better for gRPC CLI access.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Enable SSL passthrough - traffic goes encrypted to ArgoCD
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    # Required for gRPC to work properly
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
spec:
  ingressClassName: nginx
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
                  number: 443
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-server-tls
```

For SSL passthrough to work, you must enable it on the Nginx Ingress Controller itself:

```bash
# If installed with Helm, add this argument
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.extraArgs.enable-ssl-passthrough=""
```

## Option 3: Separate Ingresses for UI and gRPC

If you need both the UI (HTTPS) and CLI (gRPC) to work through the ingress, the cleanest approach is to create two separate ingress rules. This avoids conflicts between the protocols.

```yaml
# Ingress for the ArgoCD UI (HTTPS)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-http-ingress
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
spec:
  ingressClassName: nginx
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
---
# Ingress for the ArgoCD CLI (gRPC)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-grpc-ingress
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
spec:
  ingressClassName: nginx
  rules:
    - host: grpc.argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
  tls:
    - hosts:
        - grpc.argocd.example.com
      secretName: argocd-server-grpc-tls
```

Then configure the CLI to use the gRPC endpoint:

```bash
# Login using the gRPC-specific hostname
argocd login grpc.argocd.example.com --grpc-web
```

## Verifying the Setup

After applying your ingress configuration, verify everything works:

```bash
# Check that the ingress resource was created
kubectl get ingress -n argocd

# Check the ingress controller logs for any errors
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Test access to the ArgoCD UI
curl -I https://argocd.example.com

# Test CLI login
argocd login argocd.example.com
```

## Troubleshooting Common Issues

**502 Bad Gateway**: This usually means the ArgoCD server pod is not ready or the backend protocol annotation is wrong. Check that `server.insecure: "true"` is set in the ConfigMap if you are using HTTP backend protocol.

**Redirect Loop**: If you see a redirect loop, it is typically because the ArgoCD server is trying to redirect HTTP to HTTPS while the ingress is already doing the same. Set `server.insecure: "true"` to fix this.

**gRPC Connection Failures**: If the CLI cannot connect, make sure you are using the correct port and that SSL passthrough is enabled on the controller if you chose that option.

**Large Response Errors**: ArgoCD can return large responses, especially for applications with many resources. Add the `proxy-buffer-size` annotation to handle this:

```yaml
nginx.ingress.kubernetes.io/proxy-buffer-size: "64k"
nginx.ingress.kubernetes.io/proxy-buffers-number: "4"
```

## Production Recommendations

For production deployments, consider these additional configurations:

1. **Rate limiting** to protect the ArgoCD API from abuse
2. **IP whitelisting** to restrict access to known networks
3. **Custom timeouts** for long-running sync operations
4. **Health check paths** configured on the ingress

```yaml
annotations:
  # Rate limiting: 10 requests per second
  nginx.ingress.kubernetes.io/limit-rps: "10"
  # IP whitelist for your office/VPN
  nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,172.16.0.0/12"
  # Extended timeouts for sync operations
  nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
```

## Related Posts

If you are looking for other ways to expose ArgoCD, check out our guides on [exposing ArgoCD with Traefik](https://oneuptime.com/blog/post/2026-02-26-argocd-traefik-ingress/view) and [configuring TLS with cert-manager](https://oneuptime.com/blog/post/2026-02-26-argocd-cert-manager-ssl/view). For monitoring your ArgoCD deployment after setting up ingress, see [How to Monitor ArgoCD Deployments with OpenTelemetry](https://oneuptime.com/blog/post/2026-02-06-monitor-argocd-deployments-opentelemetry/view).
