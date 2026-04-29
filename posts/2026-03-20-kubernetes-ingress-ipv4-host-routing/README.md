# How to Configure Kubernetes Ingress for IPv4 Host-Based Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ingress, IPv4, Host-Based Routing, Nginx, Networking

Description: Configure Kubernetes Ingress resources to route IPv4 HTTP traffic to different services based on the HTTP Host header (virtual hosting).

Host-based routing in Kubernetes Ingress allows multiple services to share a single external IPv4 address, differentiated by the HTTP Host header. This is analogous to Apache/Nginx virtual hosting.

## Prerequisites

```bash
# Ensure an Ingress Controller is installed

kubectl get ingressclass
# NAME    CONTROLLER
# nginx   k8s.io/ingress-nginx

# Ensure the controller has an external IP (via MetalLB or cloud LB)
kubectl get svc -n ingress-nginx
```

## Basic Host-Based Ingress

```yaml
# host-based-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  ingressClassName: nginx
  rules:
  # Route app.example.com to app-service
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
  # Route api.example.com to api-service
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
  # Route admin.example.com to admin-service
  - host: admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 3000
```

```bash
kubectl apply -f host-based-ingress.yaml

# Verify the ingress was created
kubectl describe ingress multi-host-ingress
```

## Adding TLS/HTTPS

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-host-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  # TLS certificate for app.example.com
  - hosts:
    - app.example.com
    secretName: app-tls-secret
  - hosts:
    - api.example.com
    secretName: api-tls-secret
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

## Testing Host-Based Routing

```bash
# Get the Ingress Controller's external IP
INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test routing with Host header (before DNS is set up)
curl -H "Host: app.example.com" http://$INGRESS_IP
curl -H "Host: api.example.com" http://$INGRESS_IP

# Add to /etc/hosts for local testing
echo "$INGRESS_IP app.example.com api.example.com admin.example.com" | \
  sudo tee -a /etc/hosts

# Test with actual hostnames
curl http://app.example.com
curl http://api.example.com
```

## Wildcard Host Matching

```yaml
# Match a single subdomain label under example.com
spec:
  rules:
  - host: "*.example.com"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wildcard-service
            port:
              number: 80
```

`*.example.com` matches hosts like `foo.example.com`, but not `example.com` or `bar.foo.example.com`.

## Checking Ingress Status

```bash
# View all ingresses and their addresses
kubectl get ingress --all-namespaces

# Check Nginx Ingress Controller access logs
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller | tail -20
```

Host-based routing is the most common Ingress pattern and allows dozens of services to share a single external IPv4 address.
