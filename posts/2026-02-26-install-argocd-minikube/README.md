# How to Install ArgoCD on Minikube for Local Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Minikube, Local Development

Description: Step-by-step guide to installing ArgoCD on Minikube for local development and testing, including cluster setup, configuration, and deploying your first application.

---

Minikube is the most popular tool for running Kubernetes locally. It gives you a single-node cluster on your laptop that is perfect for learning ArgoCD, testing GitOps workflows, and developing applications before pushing to production. This guide walks you through installing ArgoCD on Minikube from scratch.

## Prerequisites

Before starting, make sure you have these tools installed:

- **Minikube** - [install from the official docs](https://minikube.sigs.k8s.io/docs/start/)
- **kubectl** - Kubernetes CLI
- **ArgoCD CLI** - optional but recommended

Check your installations:

```bash
# Verify Minikube is installed
minikube version
# Expected: minikube version: v1.x.x

# Verify kubectl is installed
kubectl version --client
# Expected: Client Version: v1.x.x

# Install the ArgoCD CLI (macOS)
brew install argocd

# Install the ArgoCD CLI (Linux)
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/
```

## Step 1: Start Minikube

Start a Minikube cluster with enough resources for ArgoCD. The default resources are too small, so allocate more CPU and memory:

```bash
# Start Minikube with adequate resources for ArgoCD
minikube start \
  --cpus=4 \
  --memory=8192 \
  --driver=docker \
  --kubernetes-version=v1.28.0

# Verify the cluster is running
kubectl cluster-info
# Expected: Kubernetes control plane is running at https://...

# Check that all system pods are ready
kubectl get pods -n kube-system
```

The `--driver=docker` flag uses Docker as the VM driver. Other options include `hyperkit` (macOS), `hyperv` (Windows), and `virtualbox`.

Why 4 CPUs and 8GB RAM? ArgoCD runs several components (API server, repo server, controller, Redis, Dex) that collectively need around 2GB of memory. The remaining resources are for your applications.

## Step 2: Install ArgoCD

Create the ArgoCD namespace and apply the installation manifest:

```bash
# Create the argocd namespace
kubectl create namespace argocd

# Install ArgoCD using the official manifest
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for all ArgoCD pods to be ready
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

This installs the full ArgoCD with all components. For a minimal installation (no UI, no SSO), you could use the `core-install.yaml` manifest instead, but for local development the full installation is more useful.

Verify the installation:

```bash
# Check all ArgoCD pods
kubectl get pods -n argocd

# Expected output (all pods should be Running):
# NAME                                                READY   STATUS    RESTARTS   AGE
# argocd-application-controller-0                     1/1     Running   0          2m
# argocd-applicationset-controller-xxx                1/1     Running   0          2m
# argocd-dex-server-xxx                               1/1     Running   0          2m
# argocd-notifications-controller-xxx                 1/1     Running   0          2m
# argocd-redis-xxx                                    1/1     Running   0          2m
# argocd-repo-server-xxx                              1/1     Running   0          2m
# argocd-server-xxx                                   1/1     Running   0          2m
```

## Step 3: Access the ArgoCD UI

For local development, the easiest way to access ArgoCD is through port-forwarding:

```bash
# Port-forward the ArgoCD server to localhost
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Now access ArgoCD at https://localhost:8080
# Your browser will show a certificate warning - this is expected
```

Get the initial admin password:

```bash
# Retrieve the admin password
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 -d && echo

# Save this password - you will need it to log in
```

Log in through the CLI:

```bash
# Login via CLI (accept the self-signed cert with --insecure)
argocd login localhost:8080 --insecure --username admin --password <your-password>

# Verify the connection
argocd cluster list
# Should show the in-cluster connection
```

Alternatively, you can use Minikube's built-in service tunnel:

```bash
# Use Minikube tunnel for LoadBalancer services
# First, change the ArgoCD server service type to LoadBalancer
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Start the tunnel (requires sudo)
minikube tunnel

# Get the external IP
kubectl get svc argocd-server -n argocd
```

## Step 4: Deploy Your First Application

Let us deploy a sample application to verify everything works. We will use ArgoCD's example guestbook application:

```bash
# Create the application via CLI
argocd app create guestbook \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default

# Check the application status
argocd app get guestbook
# Status should show OutOfSync (not yet synced)

# Sync the application
argocd app sync guestbook

# Watch the sync progress
argocd app get guestbook --refresh
```

Or create the application using YAML:

```yaml
# Save as guestbook-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

```bash
# Apply the application
kubectl apply -f guestbook-app.yaml

# With auto-sync enabled, it will sync automatically
```

Verify the deployment:

```bash
# Check the application status
argocd app get guestbook

# Check the deployed resources
kubectl get all -n default

# Access the guestbook UI
kubectl port-forward svc/guestbook-ui 9090:80 -n default
# Open http://localhost:9090 in your browser
```

## Step 5: Set Up a Local GitOps Repository

For real development, you want to use your own Git repository. Create a simple GitOps repo structure:

```bash
# Create a local directory for your GitOps repo
mkdir -p ~/gitops-repo/apps/my-app
```

Create a simple application manifest:

```yaml
# ~/gitops-repo/apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 2
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
        image: nginx:1.25
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
---
# ~/gitops-repo/apps/my-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 80
```

Push it to a Git repository (GitHub, GitLab, etc.) and create an ArgoCD Application pointing to it:

```bash
# Create the ArgoCD application pointing to your repo
argocd app create my-app \
  --repo https://github.com/yourusername/gitops-repo.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated \
  --self-heal \
  --auto-prune

# Sync it
argocd app sync my-app
```

## Useful Minikube Add-ons

Enable these Minikube add-ons for a better local development experience:

```bash
# Enable the ingress controller for testing Ingress resources
minikube addons enable ingress

# Enable metrics-server for resource monitoring
minikube addons enable metrics-server

# Enable the dashboard for a generic Kubernetes UI
minikube addons enable dashboard
```

## Resource Optimization for Minikube

ArgoCD's default resource requests may be too generous for a local cluster. You can reduce them:

```bash
# Reduce resource requests for local development
kubectl patch deployment argocd-server -n argocd --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/cpu", "value": "50m"}]'

kubectl patch deployment argocd-repo-server -n argocd --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/cpu", "value": "50m"}]'

kubectl patch deployment argocd-redis -n argocd --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/cpu", "value": "25m"}]'
```

## Stopping and Restarting

When you are done for the day:

```bash
# Stop Minikube (preserves the cluster state)
minikube stop

# Start it again later
minikube start

# ArgoCD pods will restart automatically
# Wait for them to be ready
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

To completely reset:

```bash
# Delete the Minikube cluster entirely
minikube delete

# Start fresh
minikube start --cpus=4 --memory=8192 --driver=docker
```

## Troubleshooting

**Problem: ArgoCD pods are in Pending state**

Not enough resources. Increase Minikube's CPU and memory allocation:

```bash
minikube stop
minikube start --cpus=4 --memory=8192
```

**Problem: Port-forward keeps disconnecting**

This is a known issue with kubectl port-forward. Use a tool like `kubefwd` or set up an Ingress instead:

```bash
# Alternative: Use a NodePort service
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'
minikube service argocd-server -n argocd --url
```

**Problem: Slow manifest generation**

The Repo Server needs to clone Git repositories, which can be slow on limited bandwidth. For local testing, consider using a Git server running inside the cluster or using Minikube's caching.

**Problem: Cannot pull images**

If Minikube cannot pull images, check your Docker configuration and internet connectivity:

```bash
# Use Minikube's Docker daemon to build images locally
eval $(minikube docker-env)
docker build -t my-app:latest .
```

## The Bottom Line

Minikube with ArgoCD gives you a full GitOps development environment on your laptop. You can test sync policies, experiment with Helm charts and Kustomize overlays, practice rollbacks, and develop your GitOps repository structure - all without needing a remote cluster. The setup takes about 10 minutes, and you can stop and restart the cluster whenever you need it.
