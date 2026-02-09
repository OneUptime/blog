# How to Set Up GitHub Actions Self-Hosted Runners with Auto-Scaling on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Kubernetes, CI/CD, Auto-Scaling, DevOps

Description: Set up self-hosted GitHub Actions runners on Kubernetes with automatic scaling based on workload demand using actions-runner-controller for cost-effective CI/CD.

---

GitHub Actions self-hosted runners give you control over your CI/CD infrastructure, allowing custom configurations and reducing costs for high-volume workflows. Running these runners on Kubernetes with auto-scaling provides elasticity and efficient resource usage. This guide demonstrates how to deploy self-hosted runners with the actions-runner-controller for dynamic scaling based on workflow demand.

## Understanding Actions Runner Controller

Actions Runner Controller (ARC) is a Kubernetes operator that manages self-hosted GitHub Actions runners. It automatically scales runners based on pending jobs, supports multiple runner types, and integrates with Kubernetes resource management. ARC handles runner lifecycle, authentication, and cleanup automatically.

## Prerequisites

You need a Kubernetes cluster and a GitHub Personal Access Token (PAT) or GitHub App for authentication:

```bash
# Create a GitHub PAT with repo scope
# Go to GitHub Settings > Developer settings > Personal access tokens
# Or use GitHub CLI
gh auth token

# For organization-level runners, you need admin:org scope
```

## Installing Actions Runner Controller

Install ARC using Helm:

```bash
# Add the ARC Helm repository
helm repo add actions-runner-controller \
  https://actions-runner-controller.github.io/actions-runner-controller

helm repo update

# Create namespace
kubectl create namespace actions-runner-system

# Install with GitHub PAT authentication
helm install actions-runner-controller \
  actions-runner-controller/actions-runner-controller \
  --namespace actions-runner-system \
  --set authSecret.create=true \
  --set authSecret.github_token="ghp_your_token_here"
```

For production environments, use a GitHub App instead of PAT:

```bash
# Create a GitHub App at https://github.com/settings/apps/new
# Download the private key

# Create secret with GitHub App credentials
kubectl create secret generic controller-manager \
  -n actions-runner-system \
  --from-literal=github_app_id=123456 \
  --from-literal=github_app_installation_id=12345678 \
  --from-file=github_app_private_key=path/to/key.pem

# Install with GitHub App
helm install actions-runner-controller \
  actions-runner-controller/actions-runner-controller \
  --namespace actions-runner-system \
  --set authSecret.enabled=false
```

## Creating a Basic Runner Deployment

Deploy runners for a specific repository:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: repo-runners
  namespace: default
spec:
  replicas: 2
  template:
    spec:
      repository: your-org/your-repo
      labels:
        - self-hosted
        - linux
        - x64
      resources:
        limits:
          cpu: "2"
          memory: "4Gi"
        requests:
          cpu: "1"
          memory: "2Gi"
```

Apply the deployment:

```bash
kubectl apply -f runner-deployment.yaml

# Check runner pods
kubectl get pods -l app.kubernetes.io/component=runner

# Verify runners appear in GitHub
# Go to: https://github.com/your-org/your-repo/settings/actions/runners
```

## Configuring Horizontal Auto-Scaling

Set up auto-scaling based on pending workflow runs:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: repo-runner-autoscaler
  namespace: default
spec:
  scaleTargetRef:
    name: repo-runners
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: TotalNumberOfQueuedAndInProgressWorkflowRuns
      repositoryNames:
        - your-org/your-repo
  scaleDownDelaySecondsAfterScaleOut: 300
```

This scales runners based on GitHub workflow queue length:

```bash
kubectl apply -f autoscaler.yaml

# Monitor scaling events
kubectl get horizontalrunnerautoscaler -w

# Check current replicas
kubectl get runnerdeployment repo-runners
```

## Creating Organization-Level Runners

Deploy runners for an entire organization:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: org-runners
  namespace: default
spec:
  replicas: 5
  template:
    spec:
      organization: your-org
      labels:
        - self-hosted
        - org-wide
        - kubernetes
      resources:
        limits:
          cpu: "4"
          memory: "8Gi"
        requests:
          cpu: "2"
          memory: "4Gi"
      dockerdWithinRunnerContainer: true
```

Create corresponding autoscaler:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: org-runner-autoscaler
  namespace: default
spec:
  scaleTargetRef:
    name: org-runners
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: PercentageRunnersBusy
      scaleUpThreshold: "0.75"
      scaleDownThreshold: "0.25"
      scaleUpFactor: "2"
      scaleDownFactor: "0.5"
```

## Customizing Runner Images

Build a custom runner image with additional tools:

```dockerfile
FROM summerwind/actions-runner:latest

# Install additional dependencies
USER root

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    nodejs \
    npm \
    docker.io \
    kubectl \
    && rm -rf /var/lib/apt/lists/*

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install AWS CLI
RUN pip3 install awscli

USER runner
```

Build and push the image:

```bash
docker build -t registry.example.com/custom-runner:latest .
docker push registry.example.com/custom-runner:latest
```

Use the custom image in your runner deployment:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: custom-runners
spec:
  template:
    spec:
      repository: your-org/your-repo
      image: registry.example.com/custom-runner:latest
      imagePullSecrets:
        - name: registry-credentials
      labels:
        - custom-tools
        - kubernetes
```

## Implementing Runner Pools with Different Resources

Create separate runner pools for different workload types:

```yaml
# CPU-intensive runners
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: cpu-intensive-runners
spec:
  template:
    spec:
      repository: your-org/your-repo
      labels:
        - cpu-intensive
      resources:
        limits:
          cpu: "8"
          memory: "8Gi"
        requests:
          cpu: "4"
          memory: "4Gi"
      nodeSelector:
        workload-type: cpu-optimized

---
# Memory-intensive runners
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: memory-intensive-runners
spec:
  template:
    spec:
      repository: your-org/your-repo
      labels:
        - memory-intensive
      resources:
        limits:
          cpu: "4"
          memory: "32Gi"
        requests:
          cpu: "2"
          memory: "16Gi"
      nodeSelector:
        workload-type: memory-optimized
```

Use specific runner pools in workflows:

```yaml
name: Build Application
on: [push]

jobs:
  compile:
    runs-on: [self-hosted, cpu-intensive]
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: make -j8

  test:
    runs-on: [self-hosted, memory-intensive]
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
```

## Configuring Docker-in-Docker Support

Enable Docker for workflows that build containers:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: docker-runners
spec:
  template:
    spec:
      repository: your-org/your-repo
      labels:
        - docker-enabled
      dockerdWithinRunnerContainer: true
      dockerMTU: 1450
      dockerRegistryMirror: https://mirror.gcr.io
      resources:
        limits:
          cpu: "4"
          memory: "8Gi"
```

Alternative approach using Kaniko for rootless builds:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: kaniko-runners
spec:
  template:
    spec:
      repository: your-org/your-repo
      labels:
        - kaniko-enabled
      securityContext:
        runAsUser: 1000
        fsGroup: 1000
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
      volumes:
        - name: docker-config
          secret:
            secretName: docker-credentials
```

## Scaling Based on Webhook Events

Use webhook-based scaling for faster response:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: webhook-autoscaler
spec:
  scaleTargetRef:
    name: repo-runners
  minReplicas: 1
  maxReplicas: 15
  scaleUpTriggers:
    - githubEvent:
        workflowJob:
          types: ["queued"]
      amount: 1
      duration: "10m"
```

Configure GitHub webhook to send events to ARC:

```bash
# Get the webhook endpoint
kubectl get service -n actions-runner-system

# Add webhook in GitHub repository settings
# Payload URL: https://your-cluster/webhook
# Content type: application/json
# Events: Workflow jobs
```

## Monitoring Runner Health

Check runner status and metrics:

```bash
# View runner pods
kubectl get pods -l app.kubernetes.io/component=runner

# Check logs for a specific runner
kubectl logs <runner-pod-name>

# View autoscaler status
kubectl describe horizontalrunnerautoscaler repo-runner-autoscaler

# Check runner registration in GitHub
gh api repos/your-org/your-repo/actions/runners
```

Create a monitoring dashboard using Prometheus metrics:

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: actions-runner-controller
  namespace: actions-runner-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: actions-runner-controller
  endpoints:
    - port: metrics
      interval: 30s
```

## Implementing Runner Cleanup

Configure automatic cleanup of completed runners:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: ephemeral-runners
spec:
  template:
    spec:
      repository: your-org/your-repo
      ephemeral: true
      labels:
        - ephemeral
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
kubectl logs -n actions-runner-system \
  -l app.kubernetes.io/name=actions-runner-controller

# Verify GitHub authentication
kubectl get secret controller-manager -n actions-runner-system -o yaml

# Test runner connectivity
kubectl exec -it <runner-pod> -- curl https://api.github.com

# Check runner events
kubectl get events --sort-by=.metadata.creationTimestamp
```

## Conclusion

Self-hosted GitHub Actions runners on Kubernetes with auto-scaling provide a powerful, cost-effective CI/CD infrastructure. The actions-runner-controller handles the complexity of runner lifecycle management while Kubernetes provides the scalability and resource efficiency. This setup allows you to customize runner environments, control costs through efficient scaling, and maintain full control over your CI/CD infrastructure while seamlessly integrating with GitHub Actions workflows.
