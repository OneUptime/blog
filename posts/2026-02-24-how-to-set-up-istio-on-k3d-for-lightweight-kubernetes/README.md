# How to Set Up Istio on k3d for Lightweight Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, K3d, K3s, Kubernetes, Lightweight, Service Mesh

Description: How to deploy Istio on k3d clusters for fast local development with k3s-based Kubernetes running inside Docker containers.

---

k3d is a tool that runs k3s (Rancher's lightweight Kubernetes) inside Docker containers. It gives you the speed of kind with the small footprint of k3s. Clusters start in seconds, use minimal resources, and work great for Istio testing and development.

There are a couple of quirks to be aware of since k3s strips out some Kubernetes components that Istio expects. But with the right configuration, everything works smoothly.

## Prerequisites

- Docker installed and running
- k3d installed (v5.x+)
- kubectl
- istioctl

Install k3d:

```bash
# macOS
brew install k3d

# Linux
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
```

## Step 1: Create a k3d Cluster

The key is disabling Traefik (k3s's built-in ingress controller) since Istio has its own ingress gateway:

```bash
k3d cluster create istio-dev \
  --servers 1 \
  --agents 2 \
  --port "80:80@loadbalancer" \
  --port "443:443@loadbalancer" \
  --k3s-arg "--disable=traefik@server:0"
```

This creates a cluster with:
- 1 server node (control plane)
- 2 agent nodes (workers)
- Port mappings for HTTP and HTTPS through k3d's built-in load balancer
- Traefik disabled so it doesn't conflict with Istio

Verify:

```bash
kubectl get nodes
kubectl cluster-info
```

## Step 2: Install Istio

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

Pre-check:

```bash
istioctl x precheck
```

For k3d, install with the demo profile. k3s includes its own ServiceLB (formerly Klipper), which handles LoadBalancer services:

```bash
istioctl install --set profile=demo -y
```

Check the installation:

```bash
kubectl get pods -n istio-system
```

The ingress gateway should get an external IP from k3s's ServiceLB:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

## Step 3: Enable Sidecar Injection

```bash
kubectl label namespace default istio-injection=enabled
```

## Step 4: Deploy and Test

```bash
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Since we mapped port 80 in the k3d cluster creation, you can access the app directly:

```bash
curl http://localhost/productpage
```

If that works, your Istio mesh is operational.

## Understanding k3s's ServiceLB

k3s includes its own load balancer called ServiceLB (previously called Klipper LB). When you create a LoadBalancer service, ServiceLB creates a DaemonSet that listens on the node's network. Combined with k3d's port mappings, this gives you a full path from your host machine to the Istio ingress gateway.

The flow looks like this:

```mermaid
graph LR
    A[localhost:80] --> B[k3d Load Balancer]
    B --> C[k3s ServiceLB]
    C --> D[Istio Ingress Gateway]
    D --> E[Your Service]
```

## Custom Istio Configuration for k3d

If you want to customize the installation, here's a configuration that works well with k3d:

```yaml
# istio-k3d.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: demo
  meshConfig:
    accessLogFile: /dev/stdout
    outboundTrafficPolicy:
      mode: ALLOW_ANY
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 10m
            memory: 40Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

```bash
istioctl install -f istio-k3d.yaml -y
```

## Loading Local Images

Like kind, k3d requires you to import local Docker images:

```bash
docker build -t my-app:latest .
k3d image import my-app:latest -c istio-dev
```

Then reference the image with `imagePullPolicy: Never` or `imagePullPolicy: IfNotPresent`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
```

## Multi-Cluster Setup with k3d

You can create multiple k3d clusters and set up Istio multi-cluster communication. This is great for testing multi-cluster service mesh scenarios locally:

```bash
# Cluster 1
k3d cluster create cluster1 \
  --port "8080:80@loadbalancer" \
  --k3s-arg "--disable=traefik@server:0"

# Cluster 2
k3d cluster create cluster2 \
  --port "8081:80@loadbalancer" \
  --k3s-arg "--disable=traefik@server:0"
```

Install Istio on both clusters, then set up cross-cluster communication using Istio's multi-cluster features.

## Using k3d for CI/CD

k3d's fast startup time makes it ideal for CI pipelines. Here's a GitLab CI example:

```yaml
stages:
  - test

istio-integration:
  stage: test
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - apk add --no-cache curl bash
    - curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
    - curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    - chmod +x kubectl && mv kubectl /usr/local/bin/
    - curl -L https://istio.io/downloadIstio | sh -
    - export PATH=$PWD/istio-*/bin:$PATH
  script:
    - k3d cluster create test --k3s-arg "--disable=traefik@server:0"
    - istioctl install --set profile=demo -y
    - kubectl label namespace default istio-injection=enabled
    - kubectl apply -f k8s/
    - kubectl wait --for=condition=ready pod -l app=my-app --timeout=180s
    - ./run-tests.sh
  after_script:
    - k3d cluster delete test
```

## Resource Comparison: k3d vs Alternatives

k3d is notably lighter than other options:

| Tool | Cluster Start Time | Base Memory | With Istio |
|------|-------------------|-------------|------------|
| k3d | ~15 seconds | ~300 MB | ~1.5 GB |
| kind | ~30 seconds | ~500 MB | ~2 GB |
| Minikube | ~2 minutes | ~1 GB | ~3 GB |

These numbers vary by configuration, but k3d consistently uses less memory because k3s is a stripped-down Kubernetes distribution.

## Troubleshooting k3d + Istio

If sidecar injection fails, check that the k3s API server can reach the istiod webhook. This sometimes fails if the cluster was created with non-default networking:

```bash
kubectl get events -n default --field-selector reason=FailedCreate
```

If port 80 isn't accessible on localhost, make sure nothing else is using the port and that the k3d load balancer is running:

```bash
docker ps | grep k3d
```

If pods are stuck in Init state, the init container might be failing. Check its logs:

```bash
kubectl logs <pod-name> -c istio-init
```

This usually means iptables rules can't be set, which can happen with certain Docker configurations. Make sure your Docker is running with the right permissions.

k3d with Istio is hard to beat for local development speed. You get a multi-node cluster with a full service mesh in under a minute, and cleanup is instant. If you're doing regular Istio development or testing, it's worth adding to your toolkit.
