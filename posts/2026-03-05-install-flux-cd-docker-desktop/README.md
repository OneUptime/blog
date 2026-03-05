# How to Install Flux CD on Docker Desktop Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Docker Desktop, Local Development, DevOps

Description: Step-by-step instructions for installing Flux CD on Docker Desktop's built-in Kubernetes cluster for local GitOps development.

---

Docker Desktop includes a built-in single-node Kubernetes cluster that you can enable with a single toggle. This makes it one of the simplest ways to get a local Kubernetes environment running on macOS or Windows. In this guide, you will learn how to enable Kubernetes in Docker Desktop, install Flux CD, and set up a working GitOps pipeline.

## Prerequisites

- Docker Desktop installed (version 4.x or later recommended)
- macOS or Windows operating system
- A GitHub personal access token with `repo` permissions
- At least 4 GB of RAM allocated to Docker Desktop

## Step 1: Enable Kubernetes in Docker Desktop

Docker Desktop ships with Kubernetes disabled by default. Enable it through the settings.

1. Open Docker Desktop
2. Click the **Settings** (gear) icon
3. Navigate to **Kubernetes**
4. Check **Enable Kubernetes**
5. Click **Apply & Restart**

Docker Desktop will download the Kubernetes components and start the cluster. This may take a few minutes on first run.

Verify the cluster is running.

```bash
# Check the Kubernetes node status
kubectl get nodes
```

You should see a single node named `docker-desktop` with `Ready` status.

## Step 2: Set the Correct kubectl Context

Docker Desktop creates its own kubectl context. Make sure it is active.

```bash
# View current context
kubectl config current-context

# Switch to docker-desktop context if needed
kubectl config use-context docker-desktop
```

## Step 3: Allocate Sufficient Resources

Flux CD runs four controllers that need adequate resources. Configure Docker Desktop resources.

1. Open Docker Desktop **Settings**
2. Navigate to **Resources** > **Advanced**
3. Set Memory to at least **4 GB** (6 GB recommended if running other workloads)
4. Set CPUs to at least **2**
5. Click **Apply & Restart**

## Step 4: Install the Flux CLI

Install the Flux CLI on your local machine.

```bash
# macOS - Install using Homebrew
brew install fluxcd/tap/flux
```

```bash
# Windows - Install using Chocolatey
choco install flux
```

```bash
# Linux or alternative - Install using the official script
curl -s https://fluxcd.io/install.sh | sudo bash
```

Verify the Flux CLI is installed.

```bash
# Confirm Flux CLI version
flux --version
```

## Step 5: Run Pre-Flight Checks

Validate your Docker Desktop Kubernetes cluster is compatible with Flux CD.

```bash
# Run Flux pre-flight validation
flux check --pre
```

You should see all checks passing. Docker Desktop Kubernetes includes all required components for Flux CD, including CoreDNS and the necessary RBAC API groups.

## Step 6: Set Up GitHub Credentials

Export your GitHub credentials as environment variables.

```bash
# Set GitHub token and username
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>
```

## Step 7: Bootstrap Flux CD

Run the bootstrap command to install Flux CD and link it to a Git repository.

```bash
# Bootstrap Flux CD on Docker Desktop Kubernetes
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/docker-desktop \
  --personal
```

The bootstrap command performs these actions:

1. Creates the `fleet-infra` repository on GitHub (if it does not exist)
2. Generates and commits the Flux component manifests
3. Installs the Flux controllers in the `flux-system` namespace
4. Creates a `GitRepository` and `Kustomization` resource for continuous sync

## Step 8: Verify the Installation

Confirm that Flux CD is operational.

```bash
# List Flux system pods
kubectl get pods -n flux-system
```

Expected output:

```
NAME                                       READY   STATUS    RESTARTS   AGE
helm-controller-xxxxxxxxxx-xxxxx           1/1     Running   0          60s
kustomize-controller-xxxxxxxxxx-xxxxx      1/1     Running   0          60s
notification-controller-xxxxxxxxxx-xxxxx   1/1     Running   0          60s
source-controller-xxxxxxxxxx-xxxxx         1/1     Running   0          60s
```

Run the full health check.

```bash
# Comprehensive Flux health check
flux check
```

## Step 9: Deploy a Sample Application

Test the GitOps workflow by deploying an application through Git. Add these manifests to your `fleet-infra` repository under `clusters/docker-desktop/`.

```yaml
# podinfo-source.yaml
# Define a Git source for the podinfo application
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/stefanprodan/podinfo
  ref:
    branch: master
```

```yaml
# podinfo-kustomization.yaml
# Deploy podinfo using Flux Kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: default
  sourceRef:
    kind: GitRepository
    name: podinfo
  path: ./kustomize
  prune: true
  timeout: 2m
```

Commit and push these files, then trigger a reconciliation.

```bash
# Trigger immediate reconciliation
flux reconcile kustomization flux-system --with-source

# Watch the kustomization status
flux get kustomizations
```

Once reconciled, access the application.

```bash
# Port-forward to the podinfo service
kubectl port-forward svc/podinfo 9898:9898
```

Visit http://localhost:9898 in your browser.

## Docker Desktop-Specific Considerations

- **Cluster persistence**: Docker Desktop Kubernetes state persists across Docker restarts. Flux CD and your workloads survive Docker Desktop restarts without needing to re-bootstrap.
- **Reset Kubernetes cluster**: If you use the "Reset Kubernetes Cluster" button in Docker Desktop settings, all Flux components and workloads are deleted. You will need to run `flux bootstrap` again.
- **Docker image builds**: Since Docker Desktop shares the Docker daemon between the host and Kubernetes, images you build locally with `docker build` are immediately available to Kubernetes pods without pushing to a registry. This is useful for testing with Flux image automation.
- **Port conflicts**: Docker Desktop Kubernetes uses the host network for `NodePort` and `LoadBalancer` services. Be aware of port conflicts with other services running on your machine.
- **Storage**: Docker Desktop provides a default `StorageClass` called `hostpath`. This works for testing persistent volumes with Flux-managed Helm releases.
- **WSL 2 backend (Windows)**: On Windows with the WSL 2 backend, Kubernetes performance is generally better. Ensure WSL 2 is configured if you are on Windows.

## Using Flux with Local Docker Images

A common development workflow is building images locally and deploying them through Flux. Here is how to reference a locally built image in a Flux-managed deployment.

```yaml
# local-app-deployment.yaml
# Deploy a locally built image (no registry push needed on Docker Desktop)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
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
          # Always use Never with local images to prevent pull attempts
          imagePullPolicy: Never
          ports:
            - containerPort: 8080
```

## Uninstalling Flux CD

To remove Flux CD from Docker Desktop Kubernetes, run the following.

```bash
# Remove Flux components from the cluster
flux uninstall --silent
```

## Conclusion

Docker Desktop provides the most straightforward path to running a local Kubernetes cluster on macOS and Windows. Combined with Flux CD, it gives you a complete GitOps development environment where you can test configurations, validate Helm releases, and develop Kustomization overlays before promoting changes to remote clusters. The shared Docker daemon makes it particularly convenient for building and testing container images as part of your GitOps workflow.
