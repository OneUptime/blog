# How to Set Up Traefik as a Kubernetes Ingress Controller on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Traefik, Kubernetes, Ingress Controller, Load Balancing

Description: Learn how to deploy Traefik as an Ingress controller on a Kubernetes cluster running on RHEL nodes.

---

Traefik can serve as a Kubernetes Ingress controller, automatically discovering services and routing traffic based on Ingress resources or its own IngressRoute CRD.

## Prerequisites

Ensure you have a running Kubernetes cluster on RHEL and Helm installed:

```bash
# Verify cluster is running
kubectl get nodes

# Install Helm if not already installed
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Installing Traefik with Helm

```bash
# Add the Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Install Traefik in a dedicated namespace
kubectl create namespace traefik
helm install traefik traefik/traefik \
  --namespace traefik \
  --set ports.web.nodePort=30080 \
  --set ports.websecure.nodePort=30443 \
  --set service.type=NodePort
```

## Verifying the Installation

```bash
# Check Traefik pods
kubectl get pods -n traefik

# Check the service
kubectl get svc -n traefik

# Access the Traefik dashboard (port-forward for testing)
kubectl port-forward -n traefik deploy/traefik 9000:9000
# Visit http://localhost:9000/dashboard/
```

## Creating an Ingress Resource

```yaml
# Save as myapp-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-service
                port:
                  number: 80
```

```bash
kubectl apply -f myapp-ingress.yaml
```

## Using Traefik IngressRoute CRD

```yaml
# Save as myapp-ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: myapp-route
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`myapp.example.com`)
      kind: Rule
      services:
        - name: myapp-service
          port: 80
      middlewares:
        - name: rate-limit
  tls:
    certResolver: letsencrypt
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
spec:
  rateLimit:
    average: 100
    burst: 200
```

```bash
kubectl apply -f myapp-ingressroute.yaml
```

## Firewall on RHEL Nodes

```bash
# Open NodePort range on each RHEL worker node
sudo firewall-cmd --add-port=30080/tcp --permanent
sudo firewall-cmd --add-port=30443/tcp --permanent
sudo firewall-cmd --reload
```

Traefik's IngressRoute CRD provides more features than the standard Kubernetes Ingress resource, including middleware chains, weighted routing, and TCP/UDP routing.
