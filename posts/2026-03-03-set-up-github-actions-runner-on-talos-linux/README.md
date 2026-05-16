# How to Set Up GitHub Actions Runner on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GitHub Action, CI/CD, Kubernetes, Self-Hosted Runners

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

The Actions Runner Controller creates ephemeral runner pods - each job gets a fresh runner pod, and the pod is destroyed after the job completes. This prevents state leakage between builds.

## Prerequisites

You will need:

- A Talos Linux cluster with kubectl configured
- Helm v3 installed
- A GitHub organization or repository
- A GitHub Personal Access Token or GitHub App for authentication
- Sufficient cluster resources for running builds

## Authentication Setup

ARC supports GitHub App and personal access token authentication. GitHub App authentication is recommended for production use.

### Option 1: GitHub App (Recommended)

Create a GitHub App in your organization settings with the following permissions:

- Repository: Administration (read/write, required for repository-level runners), Metadata (read)
- Organization: Self-hosted runners (read/write)

```bash
# Create the runner namespace and a Kubernetes secret with the GitHub App credentials

kubectl create namespace arc-runners

kubectl create secret generic github-app-secret \
  --namespace arc-runners \
  --from-literal=github_app_id=YOUR_APP_ID \
  --from-literal=github_app_installation_id=YOUR_INSTALLATION_ID \
  --from-file=github_app_private_key=path/to/private-key.pem
```

### Option 2: Personal Access Token

For a classic PAT, use the `repo` scope for repository runners or `admin:org` for organization runners.

```bash
kubectl create namespace arc-runners

kubectl create secret generic github-pat-secret \
  --namespace arc-runners \
  --from-literal=github_token=ghp_YOUR_TOKEN_HERE
```

## Installing Actions Runner Controller

```bash
# Install the ARC controller and CRDs
helm install arc \
  --namespace arc-systems \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

Verify the installation.

```bash
# Check the controller pods
kubectl get pods -n arc-systems

# Verify the CRDs are installed
kubectl get crds | grep actions.github.com
```

## Creating Runner Scale Sets

### Repository-Level Runner

Create runners that serve a specific repository.

```yaml
# repo-runner-values.yaml
githubConfigUrl: "https://github.com/myorg/myapp"
githubConfigSecret: github-app-secret

minRunners: 2
maxRunners: 10

scaleSetLabels:
  - talos-linux
  - x64

template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
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
# org-runner-values.yaml
githubConfigUrl: "https://github.com/myorg"
githubConfigSecret: github-app-secret

minRunners: 3
maxRunners: 20

scaleSetLabels:
  - talos-linux
  - x64

template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
        resources:
          requests:
            cpu: "1"
            memory: "2Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
```

```bash
# Deploy the repository runner scale set
helm upgrade --install myapp-runner \
  --namespace arc-runners \
  --create-namespace \
  -f repo-runner-values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set

# Deploy the organization runner scale set
helm upgrade --install org-runner \
  --namespace arc-runners \
  --create-namespace \
  -f org-runner-values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set

# Check the runner scale sets
kubectl get autoscalingrunnersets.actions.github.com -n arc-runners

# Verify runners appear in GitHub
# Go to your repository or organization Settings > Actions > Runners
```

## Autoscaling Runners

The real power of ARC is autoscaling. Runner scale sets scale up when workflows queue and scale down when idle. The `minRunners` value keeps idle runners warm, and `maxRunners` caps the number of runners ARC can create.

```yaml
# runner-autoscaler-values.yaml
githubConfigUrl: "https://github.com/myorg"
githubConfigSecret: github-app-secret

# Minimum number of idle runners to keep warm
minRunners: 1

# Maximum runners to scale to
maxRunners: 20

runnerScaleSetName: "org-runner"

scaleSetLabels:
  - talos-linux
  - x64
```

```bash
# Apply the autoscaling settings
helm upgrade --install org-runner \
  --namespace arc-runners \
  -f runner-autoscaler-values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set

# Monitor the autoscaling runner set
kubectl get autoscalingrunnersets.actions.github.com -n arc-runners -w
```

## Custom Runner Images

Build custom runner images with your required tools pre-installed.

```dockerfile
# Dockerfile.runner
FROM ghcr.io/actions/actions-runner:latest

# Install additional tools
USER root
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI
RUN curl -fsSL https://get.docker.com | sh

# Install kubectl
RUN curl -fsSL -o /usr/local/bin/kubectl \
    "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x /usr/local/bin/kubectl

# Install Helm
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Go
ARG GO_VERSION=1.26.3
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" | tar -C /usr/local -xzf -
ENV PATH="/usr/local/go/bin:${PATH}"

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Switch back to runner user
USER runner
```

Reference the custom image in your runner scale set values.

```yaml
template:
  spec:
    containers:
      - name: runner
        image: registry.example.com/custom-runner:latest
        command: ["/home/runner/run.sh"]
```

If your workflows need Docker commands such as `docker build`, configure the runner scale set with Docker-in-Docker.

```yaml
containerMode:
  type: dind
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
    # Run on the ARC runner scale set labels
    runs-on: [talos-linux, x64]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: "1.26"

      - name: Run tests
        run: go test -v -race ./...

  build:
    runs-on: [talos-linux, x64]
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
    runs-on: [talos-linux, x64]
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
  namespace: arc-runners
spec:
  podSelector:
    matchLabels:
      actions.github.com/scale-set-name: org-runner
  policyTypes:
    - Egress
  egress:
    # Allow DNS
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
    # Allow HTTPS for GitHub API and container registries
    - ports:
        - port: 443
          protocol: TCP
    # Allow SSH for Git operations
    - ports:
        - port: 22
          protocol: TCP
```

Resource Quotas

Prevent runners from consuming all cluster resources.

```yaml
# runner-resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: runner-quota
  namespace: arc-runners
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
# List runner scale set resources and their status
kubectl get autoscalingrunnersets.actions.github.com -n arc-runners
kubectl get ephemeralrunnersets.actions.github.com -n arc-runners
kubectl get ephemeralrunners.actions.github.com -n arc-runners

# Check runner and listener pods
kubectl get pods -n arc-runners

# Check runner logs for one pod
kubectl logs -n arc-runners POD_NAME --tail=50

# Monitor autoscaling decisions
kubectl describe autoscalingrunnerset.actions.github.com org-runner -n arc-runners
```

## Wrapping Up

Self-hosted GitHub Actions runners on Talos Linux give you the best of both worlds: the familiar GitHub Actions workflow syntax with the security and control of your own infrastructure. The Actions Runner Controller handles autoscaling so you only use resources when there are jobs to run, and ephemeral runners ensure each job starts with a clean environment. On Talos Linux, the immutable OS means your runner infrastructure is as secure and predictable as possible, making it ideal for teams with strict security or compliance requirements.
