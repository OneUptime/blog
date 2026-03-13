# How to Set Up a Local Flux Test Environment with Minikube

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, Minikube, Local Development

Description: Learn how to set up a local Kubernetes cluster using Minikube for testing Flux CD configurations with persistent storage and addon support.

---

## Introduction

Minikube is a popular tool for running a single-node Kubernetes cluster locally. It supports multiple drivers (Docker, VirtualBox, HyperKit) and includes a rich addon ecosystem. For Flux testing, Minikube offers built-in features like persistent storage, ingress, and metrics-server that make it easy to test realistic deployment scenarios.

## Prerequisites

- A hypervisor or container runtime (Docker, VirtualBox, or HyperKit)
- kubectl installed
- Flux CLI installed (v2.0 or later)
- A GitHub personal access token
- At least 4GB of available RAM

## Step 1: Install Minikube

```bash
# macOS (Homebrew)
brew install minikube

# Linux (binary download)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Verify installation
minikube version
```

## Step 2: Start a Minikube Cluster

Configure Minikube with sufficient resources for Flux.

```bash
# Start with Docker driver (recommended)
minikube start \
  --driver=docker \
  --cpus=4 \
  --memory=8192 \
  --disk-size=40g \
  --kubernetes-version=v1.30.0 \
  --profile=flux-test

# Verify the cluster is running
kubectl get nodes
minikube status --profile=flux-test
```

## Step 3: Enable Useful Addons

Minikube addons provide additional functionality useful for Flux testing.

```bash
# Enable ingress for testing ingress resources
minikube addons enable ingress --profile=flux-test

# Enable metrics-server for HPA testing
minikube addons enable metrics-server --profile=flux-test

# Enable storage provisioner for PVC testing
minikube addons enable default-storageclass --profile=flux-test
minikube addons enable storage-provisioner --profile=flux-test

# List enabled addons
minikube addons list --profile=flux-test | grep enabled
```

## Step 4: Bootstrap Flux

```bash
# Set your GitHub credentials
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-minikube-test \
  --path=clusters/minikube \
  --personal \
  --branch=main

# Wait for all Flux components to be ready
flux check
kubectl get pods -n flux-system
```

## Step 5: Deploy a Test Application

Create a test application that uses Minikube features.

```yaml
# apps/demo/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo

---
# apps/demo/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: demo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web
          image: nginx:1.27-alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi

---
# apps/demo/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: demo
spec:
  selector:
    app: web-app
  ports:
    - port: 80
      targetPort: 80

---
# apps/demo/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  namespace: demo
spec:
  rules:
    - host: web-app.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/minikube/demo-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: demo-app
  namespace: flux-system
spec:
  interval: 2m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/demo
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: web-app
      namespace: demo
```

## Step 7: Access the Application

```bash
# Get the Minikube IP
minikube ip --profile=flux-test

# Add to /etc/hosts
echo "$(minikube ip --profile=flux-test) web-app.local" | sudo tee -a /etc/hosts

# Or use minikube tunnel for LoadBalancer services
minikube tunnel --profile=flux-test

# Open the application in a browser
minikube service web-app -n demo --profile=flux-test
```

## Step 8: Test Flux Features

Test key Flux features in your Minikube environment.

```bash
# Test reconciliation
flux reconcile kustomization demo-app --with-source

# Test suspension
flux suspend kustomization demo-app
kubectl scale deployment web-app -n demo --replicas=1
# Verify Flux does not revert the change while suspended
kubectl get deployment web-app -n demo

# Resume and verify Flux reverts the drift
flux resume kustomization demo-app
kubectl get deployment web-app -n demo --watch

# Test with a HelmRelease
flux create source helm bitnami \
  --url=https://charts.bitnami.com/bitnami \
  --interval=30m

flux create helmrelease redis \
  --source=HelmRepository/bitnami \
  --chart=redis \
  --target-namespace=demo \
  --create-target-namespace
```

## Using Minikube with Local Docker Images

```bash
# Point your shell to Minikube's Docker daemon
eval $(minikube docker-env --profile=flux-test)

# Build images directly in Minikube's Docker
docker build -t my-app:latest .

# Use the image in deployments with imagePullPolicy: Never
# This avoids pulling from a registry
```

## Minikube Dashboard for Debugging

```bash
# Launch the Kubernetes dashboard
minikube dashboard --profile=flux-test

# This opens a browser with the Kubernetes dashboard
# showing all resources including Flux CRDs
```

## Resource Management

Monitor Minikube resource usage to ensure Flux has enough capacity.

```bash
# Check node resource usage
kubectl top nodes

# Check Flux controller resource usage
kubectl top pods -n flux-system

# If running low on resources, stop and restart with more
minikube stop --profile=flux-test
minikube start --cpus=6 --memory=12288 --profile=flux-test
```

## Cleanup

```bash
# Stop the cluster (preserves state)
minikube stop --profile=flux-test

# Delete the cluster entirely
minikube delete --profile=flux-test
```

## Best Practices

- Use Minikube profiles to keep test environments separate
- Allocate at least 4 CPUs and 8GB RAM for Flux testing
- Enable the metrics-server addon if testing HPA-related deployments
- Use `minikube tunnel` for testing LoadBalancer services
- Take advantage of Minikube's built-in persistent storage for testing StatefulSets
- Stop the cluster when not in use to free system resources

## Conclusion

Minikube provides a full-featured local Kubernetes environment for testing Flux configurations. Its addon ecosystem, persistent storage support, and easy access to the Kubernetes dashboard make it a practical choice for thorough testing. While slightly heavier than Kind, Minikube's built-in features reduce the setup needed for realistic test scenarios.
