# How to Install Flux CD on Minikube for Local Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Minikube, Local Development, CI/CD

Description: Learn how to set up Flux CD on a Minikube cluster for local GitOps development, including configuration, bootstrapping, and deploying sample workloads.

---

Minikube is one of the most widely used tools for running Kubernetes locally. It supports multiple drivers (Docker, VirtualBox, HyperKit, and more), making it flexible for different development environments. Combining Minikube with Flux CD gives you a local GitOps workflow that closely mirrors production setups. This guide covers everything from installing Minikube and Flux CD to deploying your first application through GitOps.

## Prerequisites

Ensure you have the following installed:

- **Minikube** (v1.30 or later)
- **kubectl** (matching your Kubernetes version)
- **Docker** (or another supported Minikube driver)
- **Flux CLI** (v2.0 or later)
- **A GitHub account** with a personal access token

## Step 1: Install the Flux CLI

Install the Flux command-line tool to manage your Flux CD installation.

```bash
# Install the Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

## Step 2: Start a Minikube Cluster

Start a Minikube cluster with adequate resources for Flux CD. Flux controllers need memory and CPU to operate smoothly.

```bash
# Start Minikube with recommended resources
minikube start \
  --cpus=4 \
  --memory=8192 \
  --driver=docker \
  --kubernetes-version=v1.30.0 \
  --profile=flux-dev

# Verify the cluster is running
minikube status --profile=flux-dev

# Confirm kubectl is configured
kubectl get nodes
```

The `--profile` flag lets you run multiple Minikube clusters side by side. This is useful if you have other projects that use Minikube.

## Step 3: Enable Required Minikube Addons

Enable a few useful addons that complement Flux CD workflows.

```bash
# Enable the ingress controller for routing traffic
minikube addons enable ingress --profile=flux-dev

# Enable metrics-server for resource monitoring
minikube addons enable metrics-server --profile=flux-dev

# List all enabled addons
minikube addons list --profile=flux-dev
```

## Step 4: Run Flux Pre-flight Checks

Validate that your Minikube cluster is compatible with Flux CD.

```bash
# Run pre-flight checks
flux check --pre
```

All checks should pass. If you see warnings about the Kubernetes version, update Minikube or specify a newer version with `--kubernetes-version`.

## Step 5: Configure GitHub Credentials

Flux needs credentials to interact with your Git repository. Export the required environment variables.

```bash
# Set your GitHub personal access token (needs repo permissions)
export GITHUB_TOKEN=<your-github-token>

# Set your GitHub username
export GITHUB_USER=<your-github-username>
```

## Step 6: Bootstrap Flux CD on Minikube

Run the bootstrap command to install Flux CD and connect it to your Git repository.

```bash
# Bootstrap Flux CD with your GitHub repository
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-minikube-dev \
  --branch=main \
  --path=./clusters/minikube \
  --personal \
  --log-level=debug
```

The `--log-level=debug` flag provides detailed output during bootstrapping, which is helpful for troubleshooting on local clusters. The bootstrap process will:

1. Create the `flux-minikube-dev` repository in your GitHub account if it does not exist
2. Push Flux component manifests to the `./clusters/minikube` path
3. Deploy the Flux controllers to the `flux-system` namespace
4. Set up a `GitRepository` and `Kustomization` resource for continuous sync

## Step 7: Verify the Flux Installation

Confirm that all Flux components are healthy.

```bash
# Run the full health check
flux check

# List all pods in the flux-system namespace
kubectl get pods -n flux-system

# View the Git repository source status
flux get sources git

# View the kustomization status
flux get kustomizations
```

All four controllers should be running: source-controller, kustomize-controller, helm-controller, and notification-controller.

## Step 8: Create a GitOps-Managed Application

Add a sample application to your Git repository so Flux can deploy it automatically.

First, create a Kustomization file that tells Flux where to find your application manifests.

```yaml
# clusters/minikube/apps.yaml
# Kustomization resource pointing to the apps directory
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m0s
  path: ./apps/minikube
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 2m0s
```

Then create the application manifests in the `apps/minikube` directory.

```yaml
# apps/minikube/kustomization.yaml
# Kustomize configuration listing all resources
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
```

```yaml
# apps/minikube/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo-app
```

```yaml
# apps/minikube/deployment.yaml
# Simple nginx deployment managed by Flux
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-demo
  namespace: demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-demo
  template:
    metadata:
      labels:
        app: nginx-demo
    spec:
      containers:
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
```

```yaml
# apps/minikube/service.yaml
# ClusterIP service for the nginx deployment
apiVersion: v1
kind: Service
metadata:
  name: nginx-demo
  namespace: demo-app
spec:
  selector:
    app: nginx-demo
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

Commit and push all these files to your repository. Within the reconciliation interval (5 minutes by default), Flux will deploy the application.

```bash
# Force an immediate reconciliation
flux reconcile kustomization flux-system --with-source

# Watch the apps kustomization
flux get kustomizations --watch

# Verify the deployment
kubectl get all -n demo-app
```

## Step 9: Access the Application Locally

Use Minikube's built-in tunneling to access your application.

```bash
# Open a tunnel to the service
minikube service nginx-demo -n demo-app --profile=flux-dev

# Alternatively, use kubectl port-forward
kubectl port-forward svc/nginx-demo 8080:80 -n demo-app
```

## Monitoring and Debugging

Use these commands to monitor Flux activity on your Minikube cluster.

```bash
# View Flux logs in real-time
flux logs --follow

# Check for errors only
flux logs --level=error

# Inspect events in the flux-system namespace
kubectl events -n flux-system

# Suspend and resume reconciliation during development
flux suspend kustomization apps
flux resume kustomization apps
```

The suspend/resume commands are especially useful during local development when you want to make changes without Flux overwriting them.

## Cleaning Up

Remove Flux and the Minikube cluster when you are done.

```bash
# Uninstall Flux from the cluster
flux uninstall --silent

# Stop and delete the Minikube profile
minikube stop --profile=flux-dev
minikube delete --profile=flux-dev
```

## Summary

You now have Flux CD running on Minikube, providing a fully functional GitOps development environment. This setup lets you test configuration changes, experiment with Flux features like health checks and dependency management, and develop deployment pipelines locally before applying them to production clusters. Minikube's addon ecosystem also makes it easy to test integrations with ingress controllers, monitoring tools, and other Kubernetes extensions.
