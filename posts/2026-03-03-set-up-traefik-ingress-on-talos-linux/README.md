# How to Set Up Traefik Ingress on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Traefik, Ingress, Kubernetes, Reverse Proxy

Description: Learn how to deploy Traefik as an ingress controller on Talos Linux with automatic service discovery and routing capabilities.

---

Traefik is a modern reverse proxy and ingress controller that was built with cloud-native environments in mind. It integrates natively with Kubernetes and can automatically discover services, configure routes, and even handle TLS certificate management. On Talos Linux, Traefik runs smoothly because the OS provides a clean, minimal Kubernetes environment without any of the overhead that comes with traditional Linux distributions.

This guide walks you through deploying Traefik on a Talos Linux cluster, configuring it for common use cases, and getting traffic flowing to your applications.

## Why Traefik on Talos Linux?

Traefik has some distinct advantages that make it appealing for Talos Linux deployments. First, it has built-in automatic service discovery. When you deploy a new service with the right annotations or IngressRoute definitions, Traefik picks it up automatically without needing a reload or restart. Second, Traefik supports both the standard Kubernetes Ingress resource and its own custom resource definitions (IngressRoute), giving you flexibility in how you define routes. Third, it has a built-in dashboard that provides visibility into your routing configuration.

Talos Linux pairs well with Traefik because both follow the same philosophy of being simple, secure, and automated. You do not need to worry about package managers, SSH access, or OS-level configuration when running Traefik on Talos.

## Prerequisites

You will need:

- A Talos Linux cluster that is up and running
- `kubectl` access to the cluster
- Helm 3 installed locally
- Basic familiarity with Kubernetes networking concepts

Verify your cluster is ready:

```bash
# Confirm all nodes are in Ready state
kubectl get nodes -o wide

# Check that CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

## Installing Traefik with Helm

The easiest way to get Traefik running is through the official Helm chart:

```bash
# Add the Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts

# Update repositories
helm repo update

# Create a namespace for Traefik
kubectl create namespace traefik
```

Now install Traefik with some sensible defaults:

```bash
# Install Traefik with the dashboard enabled
helm install traefik traefik/traefik \
  --namespace traefik \
  --set dashboard.enabled=true \
  --set ports.web.nodePort=30080 \
  --set ports.websecure.nodePort=30443 \
  --set service.type=NodePort
```

For bare metal Talos clusters without an external load balancer, NodePort is the simplest approach. If you have MetalLB or another load balancer solution configured, you can use `LoadBalancer` instead:

```bash
# Install with LoadBalancer service type
helm install traefik traefik/traefik \
  --namespace traefik \
  --set dashboard.enabled=true \
  --set service.type=LoadBalancer
```

## Verifying the Installation

Check that Traefik is running:

```bash
# Look at the Traefik pods
kubectl get pods -n traefik

# Check the service and its endpoints
kubectl get svc -n traefik

# View the Traefik deployment details
kubectl describe deployment traefik -n traefik
```

You should see a single Traefik pod running and a service exposing ports 80 (web) and 443 (websecure).

## Accessing the Traefik Dashboard

Traefik comes with a built-in dashboard that shows all discovered routes, services, and middleware. To access it securely, create a port forward:

```bash
# Forward the dashboard port to your local machine
kubectl port-forward -n traefik svc/traefik 9000:9000
```

Then open `http://localhost:9000/dashboard/` in your browser. Note the trailing slash - it is required.

For production environments, you should expose the dashboard through an IngressRoute with authentication:

```yaml
# dashboard-ingress.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: traefik-dashboard
  namespace: traefik
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`traefik.example.com`)
      kind: Rule
      services:
        - name: api@internal
          kind: TraefikService
      middlewares:
        - name: dashboard-auth
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: dashboard-auth
  namespace: traefik
spec:
  basicAuth:
    secret: dashboard-auth-secret
```

## Routing Traffic with IngressRoute

Traefik supports the standard Kubernetes Ingress resource, but its custom IngressRoute CRD offers more power and flexibility. Here is how to set up routing for an application:

```yaml
# Deploy a sample application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whoami
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: whoami
  template:
    metadata:
      labels:
        app: whoami
    spec:
      containers:
      - name: whoami
        image: traefik/whoami
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: whoami
  namespace: default
spec:
  selector:
    app: whoami
  ports:
  - port: 80
    targetPort: 80
```

Now create an IngressRoute to expose it:

```yaml
# whoami-ingress.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: whoami-route
  namespace: default
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`whoami.example.com`)
      kind: Rule
      services:
        - name: whoami
          port: 80
```

Apply and test:

```bash
# Apply all manifests
kubectl apply -f whoami-deployment.yaml
kubectl apply -f whoami-ingress.yaml

# Test the route
curl -H "Host: whoami.example.com" http://<NODE_IP>:30080
```

## Configuring Middleware

One of Traefik's strengths is its middleware system. Middleware lets you modify requests and responses as they pass through the proxy. Here are some practical examples:

```yaml
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
# Rate limiting middleware
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
# Redirect HTTP to HTTPS
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-to-https
  namespace: default
spec:
  redirectScheme:
    scheme: https
    permanent: true
```

You attach middleware to routes in your IngressRoute:

```yaml
spec:
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      middlewares:
        - name: rate-limit
        - name: strip-api-prefix
      services:
        - name: my-app
          port: 80
```

## Talos-Specific Tips

Since Talos Linux does not allow direct node access, all debugging and troubleshooting happens through `kubectl` and `talosctl`. Here are some useful commands:

```bash
# Check Traefik logs for routing issues
kubectl logs -n traefik -l app.kubernetes.io/name=traefik --tail=100

# Check if Traefik CRDs are installed
kubectl get crd | grep traefik

# Verify IngressRoute resources
kubectl get ingressroute --all-namespaces
```

If you are running into network issues, check the Talos network configuration:

```bash
# Verify node network interfaces
talosctl get addresses -n <NODE_IP>

# Check CNI is working
kubectl get pods -n kube-system -l k8s-app=cilium
```

## Scaling Traefik

For production workloads, you may want to run multiple Traefik replicas:

```bash
# Scale Traefik to 3 replicas
helm upgrade traefik traefik/traefik \
  --namespace traefik \
  --set replicas=3
```

When running multiple replicas, make sure your service type distributes traffic evenly across all instances. With NodePort on Talos, this happens automatically through kube-proxy.

## Conclusion

Traefik is an excellent ingress controller choice for Talos Linux clusters. Its automatic service discovery, powerful middleware system, and support for custom resource definitions make it flexible enough for most use cases. The built-in dashboard gives you quick visibility into your routing configuration, and the Helm chart makes installation a matter of running a single command. Combined with the security and immutability of Talos Linux, you get a solid foundation for running production workloads.
