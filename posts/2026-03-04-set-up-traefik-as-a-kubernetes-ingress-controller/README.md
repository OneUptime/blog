# How to Set Up Traefik as a Kubernetes Ingress Controller on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Traefik, Proxy, Kubernetes, Containers, Ingresses, Linux

Description: Learn how to set Up Traefik as a Kubernetes Ingress Controller on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Traefik can serve as a Kubernetes Ingress controller, automatically discovering services and creating routes based on Ingress resources and IngressRoute custom resources.

## Prerequisites

- RHEL 9 with kubectl configured
- A running Kubernetes cluster
- Helm installed

## Step 1: Install Traefik with Helm

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update

helm install traefik traefik/traefik   --namespace traefik   --create-namespace   --set service.type=LoadBalancer
```

## Step 2: Verify Installation

```bash
kubectl -n traefik get pods
kubectl -n traefik get svc
```

## Step 3: Create an Ingress Resource

```yaml
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
kubectl apply -f ingress.yaml
```

## Step 4: Use Traefik IngressRoute (CRD)

```yaml
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
```

## Step 5: Add Middleware

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
spec:
  rateLimit:
    average: 100
    burst: 50
```

## Step 6: Access the Dashboard

```bash
kubectl -n traefik port-forward deployment/traefik 9000:9000
```

Open `http://localhost:9000/dashboard/`.

## Conclusion

Traefik as a Kubernetes Ingress controller on RHEL 9 provides automatic service discovery, Let's Encrypt TLS, and powerful middleware capabilities. Its CRD-based IngressRoute resources offer more flexibility than standard Kubernetes Ingress resources.
