# How to Set Up GitHub Actions Runner on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GitHub Actions, CI/CD, Kubernetes, Self-Hosted Runners

Description: Learn how to deploy self-hosted GitHub Actions runners on Talos Linux using the Actions Runner Controller for scalable, secure CI/CD execution.

---

GitHub Actions is one of the most popular CI/CD platforms, deeply integrated with GitHub repositories. While GitHub provides hosted runners, many teams need self-hosted runners for compliance requirements, custom hardware, access to private networks, or simply to control costs. Running self-hosted GitHub Actions runners on Talos Linux gives you the security of an immutable operating system combined with the flexibility of running your own infrastructure.

This guide covers deploying the Actions Runner Controller (ARC) on Talos Linux, which manages self-hosted runners as Kubernetes pods that scale automatically based on workflow demand.

## Why Self-Hosted Runners on Talos Linux

Self-hosted runners give you control over the execution environment. On Talos Linux, this means:

- Builds run on an immutable, hardened OS with minimal attack surface
- Runners can access private container registries and internal services
- You control the hardware, so builds that need GPUs or specific architectures work seamlessly
- No per-minute billing for build time
- Network access to internal resources without exposing them to the internet

The Actions Runner Controller makes these runners ephemeral - each job gets a fresh runner pod, and the pod is destroyed after the job completes. This prevents state leakage between builds.

## Prerequisites

You will need:

- A Talos Linux cluster with kubectl configured
- Helm v3 installed
- A GitHub organization or repository
- A GitHub Personal Access Token or GitHub App for authentication
- Sufficient cluster resources for running builds

## Authentication Setup

ARC supports two authentication methods. GitHub App authentication is recommended for production use.

### Option 1: GitHub App (Recommended)

Create a GitHub App in your organization settings with the following permissions:

- Repository: Actions (read), Metadata (read)
- Organization: Self-hosted runners (read/write)

```bash
# Create a Kubernetes secret with the GitHub App credentials
kubectl create namespace arc-system

kubectl create secret generic github-app-secret \
  --namespace arc-system \
  --from-literal=github_app_id=YOUR_APP_ID \
  --from-literal=github_app_installation_id=YOUR_INSTALLATION_ID \
  --from-file=github_app_private_key=path/to/private-key.pem
```

### Option 2: Personal Access Token

```bash
kubectl create namespace arc-system

kubectl create secret generic github-pat-secret \
  --namespace arc-system \
  --from-literal=github_token=ghp_YOUR_TOKEN_HERE
```

## Installing Actions Runner Controller

```bash
# Add the ARC Helm repository
helm repo add actions-runner-controller \
  https://actions-runner-controller.github.io/actions-runner-controller

# Update the chart cache
helm repo update

# Install ARC with GitHub App authentication
helm install arc \
  actions-runner-controller/actions-runner-controller \
  --namespace arc-system \
  --set authSecret.create=false \
  --set authSecret.name=github-app-secret \
  --set image.actionsRunnerImagePullSecrets[0].name=ghcr-pull-secret
```

Verify the installation.

```bash
# Check the controller pods
kubectl get pods -n arc-system

# Verify the CRDs are installed
kubectl get crds | grep actions.summerwind.dev
```

## Creating Runner Deployments

### Repository-Level Runner

Create runners that serve a specific repository.

```yaml
# runner-deployment.yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: myorg-myapp-runner
  namespace: arc-system
spec:
  replicas: 2
  template:
    spec:
      repository: myorg/myapp
      labels:
        - self-hosted
        - talos-linux
        - x64
      # Ephemeral runners are destroyed after each job
      ephemeral: true
      # Container configuration
      dockerEnabled: false
      resources:
        requests:
          cpu: "500m"
          memory: "1Gi"
        limits:
          cpu: "4"
          memory: "8Gi"
```

### Organization-Level Runner

For runners shared across all repositories in an organization.

```yaml
# org-runner-deployment.yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: org-runner
  namespace: arc-system
spec:
  replicas: 3
  template:
    spec:
      organization: myorg
      labels:
        - self-hosted
        - talos-linux
        - x64
      ephemeral: true
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "4"
          memory: "8Gi"
```

```bash
# Deploy the runners
kubectl apply -f runner-deployment.yaml

# Check the runner pods
kubectl get runners -n arc-system

# Verify runners appear in GitHub
# Go to your repository Settings > Actions > Runners
```

## Autoscaling Runners

The real power of ARC is autoscaling. Runners scale up when workflows queue and scale down when idle.

```yaml
# runner-autoscaler.yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: myorg-runner-autoscaler
  namespace: arc-system
spec:
  scaleTargetRef:
    kind: RunnerDeployment
    name: org-runner
  # Minimum number of runners to keep warm
  minReplicas: 1
  # Maximum runners to scale to
  maxReplicas: 20
  # Scale based on the percentage of busy runners
  metrics:
    - type: PercentageRunnersBusy
      scaleUpThreshold: "0.75"
      scaleDownThreshold: "0.25"
      scaleUpFactor: "2"
      scaleDownFactor: "0.5"
  # How long to wait between scale operations
  scaleUpTriggers:
    - githubEvent:
        workflowJob: {}
      duration: "5m"
```

```bash
# Apply the autoscaler
kubectl apply -f runner-autoscaler.yaml

# Monitor the autoscaler
kubectl get horizontalrunnerautoscaler -n arc-system -w
```

## Custom Runner Images

Build custom runner images with your required tools pre-installed.

```dockerfile
# Dockerfile.runner
FROM ghcr.io/actions/actions-runner:latest

# Install additional tools
USER root
RUN apt-get update && apt-get install -y \
    docker-ce-cli \
    kubectl \
    helm \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Go
RUN curl -L https://go.dev/dl/go1.22.0.linux-amd64.tar.gz | tar -C /usr/local -xzf -
ENV PATH="/usr/local/go/bin:${PATH}"

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Switch back to runner user
USER runner
```

Reference the custom image in your runner deployment.

```yaml
spec:
  template:
    spec:
      image: registry.example.com/custom-runner:latest
```

## Using Self-Hosted Runners in Workflows

Reference your self-hosted runners in GitHub Actions workflows.

```yaml
# .github/workflows/ci.yaml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    # Run on self-hosted runners with the talos-linux label
    runs-on: [self-hosted, talos-linux]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: "1.22"

      - name: Run tests
        run: go test -v -race ./...

  build:
    runs-on: [self-hosted, talos-linux]
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build container image
        run: |
          docker build -t registry.example.com/myapp:${{ github.sha }} .
          docker push registry.example.com/myapp:${{ github.sha }}

  deploy:
    runs-on: [self-hosted, talos-linux]
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/myapp \
            app=registry.example.com/myapp:${{ github.sha }} \
            -n production
```

## Security Considerations on Talos Linux

### Network Policies

Restrict runner network access to only what is needed.

```yaml
# runner-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: runner-policy
  namespace: arc-system
spec:
  podSelector:
    matchLabels:
      app: runner
  policyTypes:
    - Egress
  egress:
    # Allow DNS
    - ports:
        - port: 53
          protocol: UDP
    # Allow HTTPS for GitHub API and container registries
    - ports:
        - port: 443
    # Allow SSH for Git operations
    - ports:
        - port: 22
```

### Resource Quotas

Prevent runners from consuming all cluster resources.

```yaml
# runner-resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: runner-quota
  namespace: arc-system
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "25"
```

## Monitoring Runners

```bash
# List all runners and their status
kubectl get runners -n arc-system

# Check runner logs
kubectl logs -n arc-system -l app=runner --tail=50

# Monitor autoscaler decisions
kubectl describe horizontalrunnerautoscaler -n arc-system
```

## Wrapping Up

Self-hosted GitHub Actions runners on Talos Linux give you the best of both worlds: the familiar GitHub Actions workflow syntax with the security and control of your own infrastructure. The Actions Runner Controller handles autoscaling so you only use resources when there are jobs to run, and ephemeral runners ensure each job starts with a clean environment. On Talos Linux, the immutable OS means your runner infrastructure is as secure and predictable as possible, making it ideal for teams with strict security or compliance requirements.
