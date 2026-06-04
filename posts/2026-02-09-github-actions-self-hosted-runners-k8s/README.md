# How to Set Up GitHub Actions Self-Hosted Runners with Auto-Scaling on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Action, Kubernetes, CI/CD, Auto-Scaling, DevOps

Description: Set up self-hosted GitHub Actions runners on Kubernetes with automatic scaling based on workload demand using actions-runner-controller for cost-effective CI/CD.

---

GitHub Actions self-hosted runners give you control over your CI/CD infrastructure, allowing custom configurations and reducing costs for high-volume workflows. Running these runners on Kubernetes with auto-scaling provides elasticity and efficient resource usage. This guide demonstrates how to deploy self-hosted runners with the actions-runner-controller for dynamic scaling based on workflow demand.

## Understanding Actions Runner Controller

Actions Runner Controller (ARC) is a Kubernetes operator that manages self-hosted GitHub Actions runners. It automatically scales runner scale sets based on jobs assigned to the scale set, supports repository, organization, and enterprise runner destinations, and integrates with Kubernetes resource management. ARC handles runner lifecycle, authentication, and cleanup automatically.

## Prerequisites

You need a Kubernetes cluster, Helm 3, and a GitHub Personal Access Token (PAT) or GitHub App for authentication:

```bash
# Create a GitHub PAT with the permissions required for your runner destination.
# For repository and organization runners, GitHub recommends using a GitHub App.
# Enterprise-level runner scale sets require a classic PAT.

# Go to GitHub Settings > Developer settings > Personal access tokens
# Or print the token already authenticated in GitHub CLI
gh auth token
```

## Installing Actions Runner Controller

Install ARC using Helm:

```bash
# Install the ARC controller and CRDs
NAMESPACE="arc-systems"

helm install arc \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

Then create a runner scale set with PAT authentication:

```bash
INSTALLATION_NAME="repo-runners"
NAMESPACE="arc-runners"
GITHUB_CONFIG_URL="https://github.com/your-org/your-repo"
GITHUB_PAT="<PAT>"

helm install "${INSTALLATION_NAME}" \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  --set githubConfigUrl="${GITHUB_CONFIG_URL}" \
  --set githubConfigSecret.github_token="${GITHUB_PAT}" \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

For production environments, use a GitHub App instead of PAT:

```bash
# Create a GitHub App at https://github.com/settings/apps/new
# Download the private key

# Create secret with GitHub App credentials in the runner scale set namespace
kubectl create namespace arc-runners

kubectl create secret generic github-app-secret \
  -n arc-runners \
  --from-literal=github_app_id=123456 \
  --from-literal=github_app_installation_id=12345678 \
  --from-file=github_app_private_key=path/to/key.pem

# Install the runner scale set with the GitHub App secret
helm install repo-runners \
  --namespace arc-runners \
  --set githubConfigUrl="https://github.com/your-org/your-repo" \
  --set githubConfigSecret=github-app-secret \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

## Creating a Basic Runner Scale Set

Deploy runners for a specific repository by installing a runner scale set:

```yaml
# values.yaml
githubConfigUrl: "https://github.com/your-org/your-repo"
githubConfigSecret: github-app-secret
minRunners: 2
maxRunners: 10
runnerScaleSetName: repo-runners
scaleSetLabels:
  - linux
  - x64
template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
        resources:
          limits:
            cpu: "2"
            memory: "4Gi"
          requests:
            cpu: "1"
            memory: "2Gi"
```

Apply the scale set:

```bash
helm upgrade --install repo-runners \
  --namespace arc-runners \
  --create-namespace \
  -f values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set

# Check controller and listener pods
kubectl get pods -n arc-systems
kubectl get pods -n arc-runners

# Verify the scale set appears in GitHub
# Go to: https://github.com/your-org/your-repo/settings/actions/runners
```

## Configuring Horizontal Auto-Scaling

Set up auto-scaling by configuring the runner scale set limits:

```yaml
# values.yaml
githubConfigUrl: "https://github.com/your-org/your-repo"
githubConfigSecret: github-app-secret
minRunners: 1
maxRunners: 10
runnerScaleSetName: repo-runners
```

ARC calculates the target runner count from the configured idle runner minimum plus the jobs assigned to the runner scale set:

```bash
helm upgrade --install repo-runners \
  --namespace arc-runners \
  -f values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set

# Monitor scale set resources
kubectl get autoscalingrunnersets -n arc-runners
kubectl get pods -n arc-runners -w
```

## Creating Organization-Level Runners

Deploy runners for an entire organization:

```yaml
# values.yaml
githubConfigUrl: "https://github.com/your-org"
githubConfigSecret: github-app-secret
runnerScaleSetName: org-runners
minRunners: 5
maxRunners: 20
runnerGroup: "Default"
scaleSetLabels:
  - org-wide
  - kubernetes
containerMode:
  type: "dind"
template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
        resources:
          limits:
            cpu: "4"
            memory: "8Gi"
          requests:
            cpu: "2"
            memory: "4Gi"
```

Apply the organization runner scale set:

```bash
helm upgrade --install org-runners \
  --namespace arc-org-runners \
  --create-namespace \
  -f values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

## Customizing Runner Images

Build a custom runner image with additional tools:

```dockerfile
FROM ghcr.io/actions/actions-runner:latest

# Install additional dependencies
USER root

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    nodejs \
    npm \
    python3 \
    python3-pip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN curl -fsSL -o /usr/local/bin/kubectl \
    "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x /usr/local/bin/kubectl

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

USER runner
```

Build and push the image:

```bash
docker build -t registry.example.com/custom-runner:latest .
docker push registry.example.com/custom-runner:latest
```

Use the custom image in your runner scale set:

```yaml
# values.yaml
githubConfigUrl: "https://github.com/your-org/your-repo"
githubConfigSecret: github-app-secret
runnerScaleSetName: custom-runners
scaleSetLabels:
  - custom-tools
  - kubernetes
template:
  spec:
    containers:
      - name: runner
        image: registry.example.com/custom-runner:latest
        imagePullPolicy: Always
        command: ["/home/runner/run.sh"]
    imagePullSecrets:
      - name: registry-credentials
```

## Implementing Runner Pools with Different Resources

Create separate runner scale sets for different workload types:

```yaml
# cpu-values.yaml
githubConfigUrl: "https://github.com/your-org/your-repo"
githubConfigSecret: github-app-secret
runnerScaleSetName: cpu-intensive-runners
minRunners: 0
maxRunners: 10
scaleSetLabels:
  - cpu-intensive
template:
  spec:
    nodeSelector:
      workload-type: cpu-optimized
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
        resources:
          limits:
            cpu: "8"
            memory: "8Gi"
          requests:
            cpu: "4"
            memory: "4Gi"
```

```yaml
# memory-values.yaml
githubConfigUrl: "https://github.com/your-org/your-repo"
githubConfigSecret: github-app-secret
runnerScaleSetName: memory-intensive-runners
minRunners: 0
maxRunners: 10
scaleSetLabels:
  - memory-intensive
template:
  spec:
    nodeSelector:
      workload-type: memory-optimized
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
        resources:
          limits:
            cpu: "4"
            memory: "32Gi"
          requests:
            cpu: "2"
            memory: "16Gi"
```

Use specific runner pools in workflows:

```yaml
name: Build Application
on: [push]

jobs:
  compile:
    runs-on: cpu-intensive-runners
    steps:
      - uses: actions/checkout@v5
      - name: Build
        run: make -j8

  test:
    runs-on: memory-intensive-runners
    steps:
      - uses: actions/checkout@v5
      - name: Run tests
        run: npm test
```

## Configuring Docker-in-Docker Support

Enable Docker for workflows that build containers:

```yaml
# values.yaml
githubConfigUrl: "https://github.com/your-org/your-repo"
githubConfigSecret: github-app-secret
runnerScaleSetName: docker-runners
scaleSetLabels:
  - docker-enabled
containerMode:
  type: "dind"
template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
        resources:
          limits:
            cpu: "4"
            memory: "8Gi"
```

Alternative approach using Kubernetes mode for container jobs and services:

```yaml
# values.yaml
githubConfigUrl: "https://github.com/your-org/your-repo"
githubConfigSecret: github-app-secret
runnerScaleSetName: kubernetes-mode-runners
scaleSetLabels:
  - kubernetes-mode
containerMode:
  type: "kubernetes"
  kubernetesModeWorkVolumeClaim:
    accessModes: ["ReadWriteOnce"]
    storageClassName: "dynamic-storage"
    resources:
      requests:
        storage: 1Gi
```

## Scaling Based on Webhook Events

Runner scale sets use a listener pod to receive job assignments from GitHub Actions, so you do not create a separate webhook autoscaler in the current ARC scale set mode. Configure the minimum and maximum runner counts instead:

```yaml
# values.yaml
githubConfigUrl: "https://github.com/your-org/your-repo"
githubConfigSecret: github-app-secret
runnerScaleSetName: repo-runners
minRunners: 1
maxRunners: 15
```

Apply the scale set:

```bash
helm upgrade --install repo-runners \
  --namespace arc-runners \
  -f values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

## Monitoring Runner Health

Check runner status and metrics:

```bash
# View controller pods
kubectl get pods -n arc-systems

# View runner scale set listener and runner pods
kubectl get pods -n arc-runners

# Check logs for the controller
kubectl logs -n arc-systems \
  -l app.kubernetes.io/name=gha-runner-scale-set-controller

# Check scale set resources
kubectl get autoscalingrunnersets -n arc-runners

# Check runner registration in GitHub
gh api repos/your-org/your-repo/actions/runners
```

Enable Prometheus-format metrics in the controller chart values:

```yaml
# controller-values.yaml
metrics:
  controllerManagerAddr: ":8080"
  listenerAddr: ":8080"
  listenerEndpoint: "/metrics"
```

Apply the controller values:

```bash
helm upgrade --install arc \
  --namespace arc-systems \
  -f controller-values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

## Implementing Runner Cleanup

Runner scale set runners are ephemeral by default, and ARC removes runner pods after jobs complete. Configure the runner scale set bounds to control how many idle runners ARC keeps available:

```yaml
# values.yaml
githubConfigUrl: "https://github.com/your-org/your-repo"
githubConfigSecret: github-app-secret
runnerScaleSetName: ephemeral-runners
minRunners: 0
maxRunners: 10
template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
        resources:
          limits:
            cpu: "2"
            memory: "4Gi"
```

Ephemeral runners automatically terminate after completing one job, ensuring clean state for each workflow.

## Troubleshooting Common Issues

Debug runner registration problems:

```bash
# Check controller logs
kubectl logs -n arc-systems \
  -l app.kubernetes.io/name=gha-runner-scale-set-controller

# Verify GitHub authentication secret
kubectl get secret github-app-secret -n arc-runners -o yaml

# Test runner connectivity
kubectl exec -n arc-runners -it <runner-pod> -- curl https://api.github.com

# Check runner and controller events
kubectl get events -n arc-runners --sort-by=.metadata.creationTimestamp
kubectl get events -n arc-systems --sort-by=.metadata.creationTimestamp
```

## Conclusion

Self-hosted GitHub Actions runners on Kubernetes with auto-scaling provide a powerful, cost-effective CI/CD infrastructure. The actions-runner-controller handles the complexity of runner lifecycle management while Kubernetes provides the scalability and resource efficiency. This setup allows you to customize runner environments, control costs through efficient scaling, and maintain full control over your CI/CD infrastructure while seamlessly integrating with GitHub Actions workflows.
