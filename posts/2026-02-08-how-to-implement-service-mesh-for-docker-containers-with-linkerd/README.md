# How to Implement Service Mesh for Docker Containers with Linkerd

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Linkerd, Service Mesh, Networking, Observability, DevOps, Microservice

Description: Set up Linkerd as a service mesh for Docker containers to get automatic mTLS, traffic observability, and reliability features.

---

A service mesh adds a layer of infrastructure between your services that handles the hard parts of service-to-service communication: encryption, retries, load balancing, and observability. Linkerd is a lightweight service mesh that consumes fewer resources than alternatives like Istio and is simpler to operate. This guide walks through installing and using Linkerd with container workloads running on Kubernetes.

## What Linkerd Gives You

Before diving into setup, here is what Linkerd adds to your container networking:

- **Automatic mutual TLS (mTLS)** between all services, with no application code changes
- **Request-level metrics** including success rates, latencies, and throughput
- **Automatic retries and timeouts** for failed requests
- **Load balancing** that is smarter than round-robin (uses latency-aware algorithms)
- **Traffic splitting** for canary deployments

All of this happens transparently through a sidecar proxy injected alongside each application container in a Kubernetes pod.

## Prerequisites

Linkerd runs on Kubernetes, so you need a lightweight Kubernetes setup. For Docker-focused teams, the easiest path is k3s, a minimal Kubernetes distribution that runs container workloads from Docker or OCI images.

Install k3s on your server:

```bash
# Install k3s - a lightweight Kubernetes distribution

# This gives you Kubernetes without the heavy overhead
curl -sfL https://get.k3s.io | sh -

# Verify k3s is running
sudo k3s kubectl get nodes
```

Set up kubectl access:

```bash
# Configure kubectl to use the k3s kubeconfig
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
sudo chmod 644 /etc/rancher/k3s/k3s.yaml

# Verify cluster access
kubectl get nodes
```

## Installing the Linkerd CLI

Download and install the Linkerd command-line tool:

```bash
# Install the Linkerd CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install-edge | sh

# Add Linkerd to your PATH
export PATH=$HOME/.linkerd2/bin:$PATH

# Verify the CLI installation
linkerd version --client
```

## Pre-Installation Checks

Linkerd has a built-in validation tool that checks if your cluster is ready:

```bash
# Install the Gateway API CRDs if they are not already present
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml

# Run pre-installation checks
# This verifies cluster prerequisites like RBAC and version compatibility
linkerd check --pre
```

Fix any issues the check reports before proceeding.

## Installing Linkerd on the Cluster

Install the Linkerd control plane:

```bash
# Generate the Linkerd control plane manifest and apply it
linkerd install --crds | kubectl apply -f -

# Install the control plane components
linkerd install | kubectl apply -f -

# Wait for the installation to complete
linkerd check
```

The `linkerd check` command validates that all control plane components are running and healthy. Wait until all checks pass.

## Installing the Viz Extension

Linkerd's observability dashboard is provided by the viz extension:

```bash
# Install the Linkerd viz extension for dashboards and metrics
linkerd viz install | kubectl apply -f -

# Verify the viz extension
linkerd viz check
```

## Deploying a Sample Application

Create a simple microservices application to demonstrate Linkerd's capabilities.

Define the application manifests:

```yaml
# sample-app.yaml - A simple multi-service application
apiVersion: v1
kind: Namespace
metadata:
  name: sample-app
  annotations:
    # This annotation tells Linkerd to automatically inject sidecar proxies
    linkerd.io/inject: enabled
---
# Frontend service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: sample-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          limits:
            memory: "128Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: sample-app
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
---
# Backend API service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: sample-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
      - name: api
        image: hashicorp/http-echo:latest
        args:
        - "-text=Hello from backend API"
        - "-listen=:8080"
        ports:
        - containerPort: 8080
        resources:
          limits:
            memory: "64Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: sample-app
spec:
  selector:
    app: backend-api
  ports:
  - port: 8080
    targetPort: 8080
---
# Traffic generator that calls the backend API so Linkerd has traffic to observe
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traffic-generator
  namespace: sample-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: traffic-generator
  template:
    metadata:
      labels:
        app: traffic-generator
    spec:
      containers:
      - name: slow-cooker
        image: buoyantio/slow_cooker:1.3.0
        command:
        - /bin/sh
        args:
        - -c
        - |
          sleep 5
          /slow_cooker/slow_cooker --qps 1 http://backend-api:8080
        resources:
          limits:
            memory: "64Mi"
            cpu: "100m"
```

Deploy the application:

```bash
# Deploy the sample application with Linkerd injection
kubectl apply -f sample-app.yaml

# Verify pods are running with Linkerd sidecar proxies
kubectl get pods -n sample-app
```

Each pod should show 2/2 containers - your application container plus the Linkerd proxy sidecar.

## Verifying mTLS

Linkerd automatically encrypts all traffic between meshed services. Verify this:

```bash
# Check that mTLS is active for the sample-app namespace
linkerd viz edges deployment -n sample-app
```

You will see output showing the secured connections between your services, including the source and destination proxy identities.

For more detail on the TLS status:

```bash
# Show detailed mTLS information
linkerd viz tap deployment/traffic-generator -n sample-app --to deployment/backend-api
```

This shows live traffic from the traffic generator to the backend.

## Observing Traffic

Linkerd provides several ways to observe service-to-service traffic.

View real-time traffic statistics:

```bash
# Show request statistics for all deployments in the namespace
linkerd viz stat deployment -n sample-app
```

Output includes success rate, requests per second, and latency percentiles (p50, p95, p99) for each service.

Watch live requests flowing through the mesh:

```bash
# Tap into live traffic to the backend-api service
linkerd viz tap deployment/backend-api -n sample-app
```

Open the dashboard for a visual overview:

```bash
# Open the Linkerd dashboard in your browser
linkerd viz dashboard
```

## Configuring Retries

Linkerd can automatically retry failed requests. Add retry annotations to an HTTPRoute to enable retries for GET requests that receive HTTP 5xx responses:

```yaml
# backend-api-retries.yaml - HTTPRoute retry configuration
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: backend-api-retries
  namespace: sample-app
  annotations:
    # Retry failed HTTP responses automatically
    retry.linkerd.io/http: "5xx"
    retry.linkerd.io/limit: "2"
spec:
  parentRefs:
  - name: backend-api
    kind: Service
    group: core
    port: 8080
  rules:
  - matches:
    - method: GET
      path:
        type: PathPrefix
        value: "/"
```

Apply the retry configuration:

```bash
# Apply the retry configuration
kubectl apply -f backend-api-retries.yaml
```

## Configuring Timeouts

Add timeout settings to prevent slow services from cascading failures:

```yaml
# backend-api-timeout.yaml - Service timeout configuration
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: sample-app
  annotations:
    # Timeout after 5 seconds
    timeout.linkerd.io/request: "5s"
spec:
  selector:
    app: backend-api
  ports:
  - port: 8080
    targetPort: 8080
```

## Traffic Splitting for Canary Deployments

Linkerd supports traffic splitting, which is useful for gradually rolling out new versions. After creating separate `backend-api-v1` and `backend-api-v2` Services, define an HTTPRoute:

```yaml
# traffic-split.yaml - Send 90% of traffic to v1 and 10% to v2
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: backend-api-route
  namespace: sample-app
spec:
  parentRefs:
  - name: backend-api
    kind: Service
    group: core
    port: 8080
  rules:
  - backendRefs:
    - name: backend-api-v1
      port: 8080
      weight: 90
    - name: backend-api-v2
      port: 8080
      weight: 10
```

This sends 90% of requests to the stable version and 10% to the canary. Monitor error rates through the viz dashboard and increase the canary weight gradually.

## Resource Usage

One concern with service meshes is overhead. Linkerd's proxy is written in Rust and is lightweight. Check the resource consumption:

```bash
# Show resource usage of Linkerd sidecar proxies
kubectl top pods -n sample-app --containers
```

Typically, each Linkerd proxy uses 10-20MB of memory and minimal CPU. This is significantly less than Envoy-based meshes.

## Meshing Existing Kubernetes Deployments

If you already have Kubernetes deployments running on k3s, inject Linkerd into existing deployments:

```bash
# Inject Linkerd sidecar into an existing deployment
kubectl get deployment my-existing-app -n default -o yaml | \
  linkerd inject - | \
  kubectl apply -f -

# Verify the injection
kubectl get pods -n default -l app=my-existing-app
```

The pods will restart with the Linkerd proxy sidecar added automatically.

## Summary

Linkerd adds enterprise-grade networking features to your Kubernetes container workloads with minimal overhead. You get encrypted communication, detailed observability, and automatic reliability features without changing a single line of application code. For teams that need service mesh capabilities without the complexity of Istio, Linkerd is the practical choice. Start by meshing your most critical services and expand from there as you gain confidence in the setup.
