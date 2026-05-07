# How to Set Up Traefik Ingress in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Ingress, Traefik

Description: A practical guide to deploying and configuring Traefik as an ingress controller in Rancher-managed Kubernetes clusters.

---

Traefik is a modern, cloud-native reverse proxy and ingress controller that integrates natively with Kubernetes. It is the default ingress controller for K3s clusters managed by Rancher. This guide covers how to set up, configure, and use Traefik for routing traffic in your Rancher environment.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster (K3s clusters include Traefik by default)
- kubectl access to your cluster
- Helm installed (for manual installations)

## Step 1: Check If Traefik Is Already Installed

K3s clusters deployed through Rancher include Traefik by default unless it has been disabled. Verify its status:

```bash
kubectl get pods -n kube-system | grep traefik
kubectl get svc -n kube-system | grep traefik
```

If Traefik is running, you can skip to Step 4 to start configuring ingress routes.

## Step 2: Install Traefik via Helm

If Traefik is not installed, deploy it using Helm:

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update

helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set ports.web.port=8000 \
  --set ports.websecure.port=8443 \
  --set service.spec.type=LoadBalancer
```

For bare-metal setups:

```bash
helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set service.spec.type=NodePort \
  --set ports.web.nodePort=30080 \
  --set ports.websecure.nodePort=30443
```

## Step 3: Verify the Installation

```bash
kubectl get pods -n traefik
kubectl get svc -n traefik
kubectl get ingressclass
```

Confirm that the Traefik pod is running and the `traefik` IngressClass is available.

## Step 4: Create an Ingress Using Standard Kubernetes Resources

Traefik supports standard Kubernetes Ingress resources:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  ingressClassName: traefik
  rules:
  - host: myapp.example.com
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

Apply the manifest:

```bash
kubectl apply -f my-app-ingress.yaml
```

## Step 5: Use Traefik IngressRoute CRD

Traefik provides its own Custom Resource Definition (CRD) called IngressRoute, which offers more advanced features. These examples use the current `traefik.io/v1alpha1` API group used by Traefik v3:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: my-app-route
  namespace: default
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`myapp.example.com`)
    kind: Rule
    services:
    - name: my-app-service
      port: 80
```

Apply it:

```bash
kubectl apply -f my-app-ingressroute.yaml
```

## Step 6: Configure Path-Based Routing with IngressRoute

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: multi-path-route
  namespace: default
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`myapp.example.com`) && PathPrefix(`/api`)
    kind: Rule
    services:
    - name: api-service
      port: 8080
  - match: Host(`myapp.example.com`) && PathPrefix(`/web`)
    kind: Rule
    services:
    - name: web-service
      port: 80
```

## Step 7: Add Middleware for Request Modification

Traefik middleware lets you modify requests before they reach your services:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-prefix
  namespace: default
spec:
  stripPrefix:
    prefixes:
      - /api
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: default
spec:
  rateLimit:
    average: 100
    burst: 50
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api-route
  namespace: default
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`myapp.example.com`) && PathPrefix(`/api`)
    kind: Rule
    middlewares:
    - name: strip-prefix
    - name: rate-limit
    services:
    - name: api-service
      port: 8080
```

## Step 8: Configure Weighted Round Robin

Distribute traffic across multiple services for canary deployments:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: canary-route
  namespace: default
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`myapp.example.com`)
    kind: Rule
    services:
    - name: app-v1
      port: 80
      weight: 80
    - name: app-v2
      port: 80
      weight: 20
```

## Step 9: Access the Traefik Dashboard

The Traefik dashboard provides a visual overview of routes and services. The Helm chart does not expose it by default, so for quick local access use port forwarding:

```bash
kubectl port-forward -n traefik $(kubectl get pods -n traefik -l app.kubernetes.io/name=traefik -o name) 9000:9000
```

Then open `http://localhost:9000/dashboard/` in your browser.

## Step 10: Configure HTTPS Redirect

Redirect HTTP traffic for a route to HTTPS:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-https
  namespace: default
spec:
  redirectScheme:
    scheme: https
    port: "443"
    permanent: true
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: http-redirect
  namespace: default
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`myapp.example.com`)
    kind: Rule
    middlewares:
    - name: redirect-https
    services:
    - name: my-app-service
      port: 80
```

## Troubleshooting

- Check Traefik logs: `kubectl logs -n traefik -l app.kubernetes.io/name=traefik`
- Verify IngressRoute resources: `kubectl get ingressroute --all-namespaces`
- Check middleware: `kubectl get middleware --all-namespaces`
- Validate CRDs are installed: `kubectl get crd | grep traefik`
- Test routing: `curl -v -H "Host: myapp.example.com" http://<TRAEFIK_IP>/`

## Summary

Traefik is an excellent ingress controller for Rancher-managed clusters, particularly K3s deployments where it comes pre-installed. Its IngressRoute CRD provides more flexibility than standard Kubernetes Ingress resources, including middleware for request manipulation, weighted routing for canary deployments, and a built-in dashboard for monitoring your routes.
