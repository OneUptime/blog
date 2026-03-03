# How to Set Up Contour Ingress on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Contour, Envoy, Ingress Controller, Kubernetes

Description: Deploy Contour ingress controller with Envoy proxy on Talos Linux for advanced HTTP routing and traffic management in Kubernetes.

---

Contour is an ingress controller for Kubernetes that uses Envoy as its data plane. It was originally created at VMware (now Broadcom) and has since become a CNCF incubating project. What makes Contour interesting is that it combines the simplicity of Kubernetes-native configuration with the power and performance of the Envoy proxy. On Talos Linux, Contour runs cleanly because the OS provides exactly what Kubernetes needs and nothing more.

This guide takes you through deploying Contour on a Talos Linux cluster, configuring routes with its HTTPProxy custom resource, and handling some common scenarios you will encounter in production.

## What Makes Contour Different

Most ingress controllers either use Nginx or their own custom proxy. Contour takes a different approach by sitting on top of Envoy, which is the same proxy that powers Istio's data plane. This means you get features like HTTP/2 support, gRPC load balancing, automatic retries, and circuit breaking - all without deploying a full service mesh.

Contour also introduces the HTTPProxy custom resource, which addresses several limitations of the standard Kubernetes Ingress resource. HTTPProxy supports route delegation across namespaces, weighted traffic splitting, and per-route timeout configuration.

## Prerequisites

Make sure you have:

- A Talos Linux cluster with healthy nodes
- `kubectl` configured for cluster access
- Helm 3 or the ability to apply YAML manifests

```bash
# Quick health check
kubectl get nodes
kubectl cluster-info
```

## Installing Contour

You can install Contour either through its official YAML manifests or through Helm. The YAML approach is straightforward:

```bash
# Install Contour and Envoy using the official manifests
kubectl apply -f https://projectcontour.io/quickstart/contour.yaml
```

This creates a `projectcontour` namespace and deploys both the Contour control plane and the Envoy data plane.

For more control over the installation, use Helm:

```bash
# Add the Bitnami repository (which hosts the Contour chart)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install Contour
helm install contour bitnami/contour \
  --namespace projectcontour \
  --create-namespace \
  --set envoy.service.type=NodePort \
  --set envoy.service.nodePorts.http=32080 \
  --set envoy.service.nodePorts.https=32443
```

## Checking the Installation

Verify that both Contour and Envoy are running:

```bash
# Check all pods in the Contour namespace
kubectl get pods -n projectcontour

# You should see:
# - contour pods (the control plane)
# - envoy pods (the data plane / proxy)

# Check services
kubectl get svc -n projectcontour

# Verify the HTTPProxy CRD is installed
kubectl get crd httpproxies.projectcontour.io
```

## Using the Standard Ingress Resource

Contour supports the standard Kubernetes Ingress resource. Here is a basic example:

```yaml
# standard-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: basic-ingress
  namespace: default
spec:
  ingressClassName: contour
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app
            port:
              number: 80
```

## Using HTTPProxy for Advanced Routing

The real power of Contour comes from its HTTPProxy custom resource. HTTPProxy supports features that the standard Ingress resource cannot handle:

```yaml
# httpproxy-example.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: app-proxy
  namespace: default
spec:
  virtualhost:
    fqdn: app.example.com
  routes:
  - conditions:
    - prefix: /api
    services:
    - name: api-service
      port: 80
    timeoutPolicy:
      response: "30s"
      idle: "60s"
    retryPolicy:
      count: 3
      perTryTimeout: "10s"
  - conditions:
    - prefix: /
    services:
    - name: frontend-service
      port: 80
```

This single HTTPProxy routes `/api` requests to one service with retry and timeout policies, and everything else to the frontend service.

## Traffic Splitting for Canary Deployments

One of the most practical features of HTTPProxy is weighted traffic splitting. This is essential for canary deployments:

```yaml
# canary-proxy.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: canary-deployment
  namespace: default
spec:
  virtualhost:
    fqdn: myapp.example.com
  routes:
  - services:
    - name: myapp-stable
      port: 80
      weight: 90
    - name: myapp-canary
      port: 80
      weight: 10
```

This sends 90% of traffic to the stable version and 10% to the canary. You can gradually increase the canary weight as you gain confidence.

## Route Delegation

HTTPProxy supports a concept called route delegation, which allows different teams to manage their own routes within a shared domain:

```yaml
# Root proxy in the infrastructure namespace
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: root-proxy
  namespace: infrastructure
spec:
  virtualhost:
    fqdn: platform.example.com
  includes:
  - name: team-a-routes
    namespace: team-a
    conditions:
    - prefix: /team-a
  - name: team-b-routes
    namespace: team-b
    conditions:
    - prefix: /team-b

---
# Team A manages their own routes
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: team-a-routes
  namespace: team-a
spec:
  routes:
  - conditions:
    - prefix: /api
    services:
    - name: team-a-api
      port: 80
```

## TLS Configuration

Contour makes TLS configuration straightforward:

```yaml
# tls-proxy.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: secure-app
  namespace: default
spec:
  virtualhost:
    fqdn: secure.example.com
    tls:
      secretName: secure-app-tls
      minimumProtocolVersion: "1.2"
  routes:
  - services:
    - name: secure-app
      port: 80
```

Create the TLS secret:

```bash
# Create a TLS secret from certificate files
kubectl create secret tls secure-app-tls \
  --cert=tls.crt \
  --key=tls.key \
  -n default
```

## Monitoring Contour on Talos

Both Contour and Envoy expose Prometheus metrics. You can check the status of your HTTPProxy resources easily:

```bash
# List all HTTPProxy resources and their status
kubectl get httpproxy --all-namespaces

# Describe a specific proxy for detailed status
kubectl describe httpproxy app-proxy -n default

# Check Contour logs
kubectl logs -n projectcontour -l app=contour

# Check Envoy logs
kubectl logs -n projectcontour -l app=envoy
```

## Talos-Specific Notes

Contour and Envoy work well on Talos Linux without special configuration. However, if you are on bare metal, make sure you have a solution for external IP assignment. MetalLB pairs well with Contour on bare-metal Talos clusters.

Since Talos is immutable, any debugging needs to happen through Kubernetes tooling. Use `talosctl` for node-level network checks:

```bash
# Verify network connectivity from nodes
talosctl get addresses -n <NODE_IP>
talosctl get routes -n <NODE_IP>
```

## Conclusion

Contour is an excellent ingress controller for Talos Linux clusters, especially when you need features beyond what the standard Ingress resource provides. The combination of Contour's control plane with Envoy's data plane gives you a production-grade proxy with advanced routing, traffic splitting, and delegation capabilities. Its HTTPProxy CRD is intuitive and addresses many of the pain points that teams run into with standard Ingress resources.
