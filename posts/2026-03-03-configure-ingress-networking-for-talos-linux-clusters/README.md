# How to Configure Ingress Networking for Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ingress, Networking, Kubernetes, NGINX, Traefik

Description: Complete guide to setting up ingress controllers and configuring external traffic routing for Talos Linux Kubernetes clusters on bare metal.

---

Ingress networking is how external traffic reaches your applications running inside a Kubernetes cluster. On cloud providers, this is usually handled automatically by cloud load balancers. On Talos Linux, especially when running on bare metal, you need to set up ingress yourself. This means choosing an ingress controller, figuring out how to expose it to the outside world, and configuring routing rules for your services.

This guide covers the practical steps to get ingress networking working on a Talos Linux cluster.

## The Ingress Problem on Bare Metal

In cloud Kubernetes, when you create a Service of type LoadBalancer, the cloud provider automatically provisions an external load balancer and assigns a public IP. On bare metal, there is no cloud provider to do this. You need to solve two problems:

1. **Getting an external IP**: Something needs to assign and advertise external IPs for your services
2. **Routing traffic**: An ingress controller needs to route incoming HTTP/HTTPS traffic to the correct backend services

The typical bare metal stack looks like this:
- MetalLB (or Talos VIP) provides external IPs
- An ingress controller (Nginx, Traefik, or similar) handles HTTP routing
- DNS points your domains to the external IPs

## Prerequisites

Before setting up ingress, make sure you have:

- A running Talos Linux cluster with at least one control plane and one worker node
- kubectl configured and working
- Helm installed (for installing ingress controllers)
- Available IP addresses on your network for service exposure
- MetalLB or another external IP solution (unless using NodePort)

## Step 1: Install MetalLB for External IP Assignment

MetalLB is the most common solution for assigning external IPs on bare metal:

```bash
# Install MetalLB
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml

# Wait for MetalLB pods to be ready
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=120s
```

Configure an IP address pool for MetalLB:

```yaml
# metallb-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ingress-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.210    # Range of IPs for ingress
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: ingress-l2
  namespace: metallb-system
spec:
  ipAddressPools:
    - ingress-pool
```

```bash
kubectl apply -f metallb-config.yaml
```

## Step 2: Choose and Install an Ingress Controller

### Option A: Nginx Ingress Controller

Nginx is the most widely used ingress controller:

```bash
# Add the ingress-nginx Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install the Nginx ingress controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.externalTrafficPolicy=Local
```

Verify the installation:

```bash
# Check that the ingress controller pods are running
kubectl get pods -n ingress-nginx

# Check that MetalLB assigned an external IP
kubectl get svc -n ingress-nginx ingress-nginx-controller
# Should show an EXTERNAL-IP from your MetalLB pool
```

### Option B: Traefik Ingress Controller

Traefik is another popular choice, especially if you want a built-in dashboard:

```bash
# Add Traefik Helm repo
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Install Traefik
helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set service.type=LoadBalancer \
  --set ports.web.port=8000 \
  --set ports.websecure.port=8443
```

## Step 3: Create Ingress Resources

With your ingress controller running and exposed via an external IP, create Ingress resources to route traffic to your services.

### Basic HTTP Ingress

```yaml
# basic-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

### Ingress with TLS

```yaml
# tls-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress-tls
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls-secret
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

Create the TLS secret:

```bash
# Create TLS secret from certificate files
kubectl create secret tls app-tls-secret \
  --cert=tls.crt \
  --key=tls.key
```

### Multiple Hosts and Paths

```yaml
# multi-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-app-ingress
  namespace: default
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-v1-service
                port:
                  number: 8080
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: api-v2-service
                port:
                  number: 8080
    - host: dashboard.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dashboard-service
                port:
                  number: 3000
```

## Step 4: Set Up Automatic TLS with cert-manager

For production environments, use cert-manager to automatically provision and renew TLS certificates:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=120s
```

Create a ClusterIssuer for Let's Encrypt:

```yaml
# letsencrypt-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

Now your ingress resources can automatically get TLS certificates:

```yaml
# auto-tls-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auto-tls-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-auto-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

## Step 5: Configure External Traffic Policy

The `externalTrafficPolicy` setting on your ingress controller's service affects how traffic is routed and whether client source IPs are preserved:

```yaml
# Local policy - preserves source IP but may cause uneven distribution
spec:
  externalTrafficPolicy: Local

# Cluster policy - better distribution but loses source IP
spec:
  externalTrafficPolicy: Cluster
```

For most setups on Talos Linux, `Local` is preferred because:
- It preserves client source IPs (important for logging and rate limiting)
- It avoids an extra network hop
- MetalLB's L2 mode works well with Local policy

## Troubleshooting Ingress Issues

### No External IP Assigned

```bash
# Check MetalLB speaker pods
kubectl get pods -n metallb-system

# Check MetalLB controller logs
kubectl logs -n metallb-system -l component=controller

# Verify IP pool has available addresses
kubectl get ipaddresspool -n metallb-system -o yaml
```

### 502 Bad Gateway Errors

```bash
# Check if backend pods are running
kubectl get pods -l app=my-app

# Verify the backend service has endpoints
kubectl get endpoints my-app-service

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=50
```

### TLS Certificate Issues

```bash
# Check certificate status
kubectl get certificates
kubectl describe certificate app-auto-tls

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager --tail=50

# Verify the challenge is completing
kubectl get challenges
```

## Conclusion

Setting up ingress networking on a Talos Linux bare metal cluster takes more work than on cloud providers, but the result is a fully functional, production-ready setup. The combination of MetalLB for external IP assignment and an ingress controller like Nginx or Traefik for HTTP routing gives you the same capabilities as cloud-based ingress. Add cert-manager for automatic TLS and you have a complete solution. The key is getting MetalLB configured correctly first, since everything else depends on having external IPs available for your ingress controller service.
