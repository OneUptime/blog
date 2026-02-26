# How to Install ArgoCD on Kind Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kind, Local Development

Description: A complete guide to installing ArgoCD on Kind (Kubernetes in Docker) clusters for fast local development, CI testing, and multi-cluster GitOps experimentation.

---

Kind (Kubernetes in Docker) is a tool for running local Kubernetes clusters using Docker containers as nodes. It is faster to start than Minikube, uses fewer resources, and is the preferred choice for CI pipelines and quick testing. This guide shows you how to install ArgoCD on Kind and set up a local GitOps workflow.

## Why Kind for ArgoCD?

Kind has several advantages for ArgoCD development and testing:

- **Fast startup** - a Kind cluster starts in under 60 seconds
- **Lightweight** - uses Docker containers instead of VMs
- **Multi-node support** - you can create clusters with multiple nodes
- **CI-friendly** - designed to run in CI environments like GitHub Actions
- **Multi-cluster** - easy to create multiple clusters for testing multi-cluster ArgoCD setups

## Prerequisites

You need Docker and Kind installed:

```bash
# Install Kind (macOS)
brew install kind

# Install Kind (Linux)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Verify installations
docker version
kind version
kubectl version --client
```

## Step 1: Create a Kind Cluster

Create a Kind cluster with port mappings so you can access ArgoCD from your host machine:

```yaml
# Save as kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  # Map port 443 for ArgoCD HTTPS access
  - containerPort: 30443
    hostPort: 8443
    protocol: TCP
  # Map port 80 for HTTP (optional, for ingress)
  - containerPort: 30080
    hostPort: 8080
    protocol: TCP
```

```bash
# Create the cluster with the config
kind create cluster --name argocd-dev --config kind-config.yaml

# Verify the cluster is running
kubectl cluster-info --context kind-argocd-dev

# Check nodes
kubectl get nodes
# NAME                       STATUS   ROLES           AGE   VERSION
# argocd-dev-control-plane   Ready    control-plane   30s   v1.x.x
```

## Step 2: Install ArgoCD

Apply the ArgoCD installation manifests:

```bash
# Create the namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# Verify all components are running
kubectl get pods -n argocd
```

## Step 3: Expose ArgoCD

Kind does not support LoadBalancer services natively. You have two options:

### Option A: Port-Forward (Simplest)

```bash
# Port-forward the ArgoCD server
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Access at https://localhost:8080
```

### Option B: NodePort with Pre-configured Port Mapping

Since we configured port mappings in the Kind config, we can use a NodePort service:

```bash
# Patch the ArgoCD server to use NodePort
kubectl patch svc argocd-server -n argocd --type=json \
  -p='[
    {"op": "replace", "path": "/spec/type", "value": "NodePort"},
    {"op": "replace", "path": "/spec/ports/0/nodePort", "value": 30443}
  ]'

# Access ArgoCD at https://localhost:8443
```

### Option C: Ingress Controller

Install an Ingress controller and create an Ingress for ArgoCD:

```bash
# Install nginx ingress controller for Kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for the ingress controller to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

Then create an Ingress:

```yaml
# Save as argocd-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  ingressClassName: nginx
  rules:
  - host: argocd.localhost
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 443
```

```bash
kubectl apply -f argocd-ingress.yaml
# Access at https://argocd.localhost
```

## Step 4: Log In and Configure

Get the admin password and log in:

```bash
# Get the initial admin password
ARGOCD_PASSWORD=$(kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 -d)

echo "ArgoCD admin password: $ARGOCD_PASSWORD"

# Login with the CLI
argocd login localhost:8080 --insecure --username admin --password $ARGOCD_PASSWORD

# Change the admin password (recommended)
argocd account update-password \
  --current-password $ARGOCD_PASSWORD \
  --new-password MyNewPassword123

# Delete the initial admin secret
kubectl delete secret argocd-initial-admin-secret -n argocd
```

## Step 5: Deploy a Test Application

Deploy the example guestbook application to verify ArgoCD is working:

```bash
# Create and sync a test application
argocd app create guestbook \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated

# Watch the application sync
argocd app get guestbook --refresh

# Verify resources are deployed
kubectl get all -l app=guestbook
```

## Multi-Cluster Setup with Kind

One of Kind's biggest advantages is the ability to run multiple clusters simultaneously. This is perfect for testing ArgoCD's multi-cluster management.

```bash
# Create a second cluster
kind create cluster --name target-cluster

# Get the kubeconfig for the target cluster
kind get kubeconfig --name target-cluster > /tmp/target-kubeconfig

# Switch back to the ArgoCD cluster
kubectl config use-context kind-argocd-dev

# Register the target cluster with ArgoCD
# First, get the target cluster's API server address
# Kind clusters communicate through the Docker network
TARGET_SERVER=$(docker inspect target-cluster-control-plane \
  --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

echo "Target cluster API: https://$TARGET_SERVER:6443"

# Add the cluster to ArgoCD
argocd cluster add kind-target-cluster --name target-cluster

# Verify the cluster is registered
argocd cluster list
```

Now you can deploy applications to either cluster:

```yaml
# Deploy to the target cluster
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: remote-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    path: guestbook
  destination:
    name: target-cluster  # Deploy to the remote cluster
    namespace: default
  syncPolicy:
    automated:
      prune: true
```

## Using Kind in CI Pipelines

Kind is excellent for testing ArgoCD configurations in CI. Here is an example GitHub Actions workflow:

```yaml
# .github/workflows/test-argocd.yaml
name: Test ArgoCD Configuration
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Create Kind cluster
      uses: helm/kind-action@v1
      with:
        cluster_name: argocd-test

    - name: Install ArgoCD
      run: |
        kubectl create namespace argocd
        kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
        kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

    - name: Install ArgoCD CLI
      run: |
        curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
        chmod +x argocd
        sudo mv argocd /usr/local/bin/

    - name: Login to ArgoCD
      run: |
        kubectl port-forward svc/argocd-server -n argocd 8080:443 &
        sleep 5
        ARGOCD_PASSWORD=$(kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 -d)
        argocd login localhost:8080 --insecure --username admin --password $ARGOCD_PASSWORD

    - name: Apply and test applications
      run: |
        kubectl apply -f my-argocd-apps/
        # Wait for sync
        argocd app wait my-app --sync --timeout 120
```

## Loading Local Docker Images

Kind can load locally built Docker images directly into the cluster, which is useful for testing your applications:

```bash
# Build an image locally
docker build -t my-app:latest .

# Load it into the Kind cluster
kind load docker-image my-app:latest --name argocd-dev

# Now you can reference my-app:latest in your manifests
# without needing to push to a registry
```

Update your deployment to use the local image:

```yaml
spec:
  containers:
  - name: my-app
    image: my-app:latest
    imagePullPolicy: Never  # Important: use the locally loaded image
```

## Cleanup

When you are done:

```bash
# Delete the ArgoCD cluster
kind delete cluster --name argocd-dev

# Delete the target cluster (if created)
kind delete cluster --name target-cluster

# Delete all Kind clusters
kind delete clusters --all
```

## Kind vs Minikube for ArgoCD

| Feature | Kind | Minikube |
|---------|------|----------|
| Startup time | 30 to 60 seconds | 2 to 5 minutes |
| Resource usage | Lower (containers) | Higher (VM) |
| Multi-cluster | Easy | More complex |
| CI support | Excellent | Good |
| Add-ons | Manual setup | Built-in add-ons |
| LoadBalancer | Needs workaround | `minikube tunnel` |
| Persistent storage | Limited by default | Built-in |
| GPU support | No | Yes |

Kind is better for quick testing, CI pipelines, and multi-cluster experiments. Minikube is better for long-running local development with add-ons and persistent storage.

## Troubleshooting

**Problem: "too many open files" error**

Kind can hit file descriptor limits on Linux. Increase the limits:

```bash
sudo sysctl -w fs.inotify.max_user_watches=524288
sudo sysctl -w fs.inotify.max_user_instances=512
```

**Problem: ArgoCD pods crash with OOM**

Kind nodes have limited memory. Reduce ArgoCD resource requests or create the cluster with more memory:

```yaml
# kind-config.yaml with resource limits
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  # Kind inherits Docker's resource limits
```

Ensure Docker has enough memory allocated (at least 6GB for a comfortable ArgoCD setup).

**Problem: Cannot reach ArgoCD from host**

Make sure port mappings are configured in the Kind cluster config (Step 1) and the ArgoCD service type matches (NodePort or use port-forward).

## The Bottom Line

Kind provides the fastest way to get ArgoCD running locally. It starts in under a minute, uses minimal resources, and supports multi-cluster setups out of the box. For CI pipelines and quick testing, Kind is the best choice. For extended local development sessions, consider the tradeoffs with Minikube and choose based on your needs.
