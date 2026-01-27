# How to Implement GitHub Actions Self-Hosted Runners on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GitHub Actions, CI/CD, DevOps, Self-Hosted Runners, ARC, Automation

Description: A complete guide to deploying and managing GitHub Actions self-hosted runners on Kubernetes using Actions Runner Controller (ARC), covering autoscaling, runner groups, ephemeral runners, security, and monitoring.

---

> Self-hosted runners give you full control over your CI/CD infrastructure. Running them on Kubernetes with ARC means automatic scaling, better resource utilization, and runners that spin up on demand and disappear when done.

## Why Self-Hosted Runners on Kubernetes?

GitHub-hosted runners are convenient but come with limitations:

- **Cost** - Minutes add up quickly for large teams
- **Customization** - Limited control over the runner environment
- **Network access** - Cannot reach private resources without complex tunneling
- **Performance** - Shared infrastructure means variable performance

Self-hosted runners on Kubernetes solve these problems:

```
+-------------------+     +-------------------+
|  GitHub Actions   |     |  Your Kubernetes  |
|     Workflow      |---->|     Cluster       |
+-------------------+     +-------------------+
                                   |
                          +--------+--------+
                          |        |        |
                       +--+--+  +--+--+  +--+--+
                       |Pod 1|  |Pod 2|  |Pod 3|
                       +-----+  +-----+  +-----+
                        Runner   Runner   Runner
```

## What Is Actions Runner Controller (ARC)?

Actions Runner Controller is a Kubernetes operator that manages self-hosted runners. It watches for GitHub Actions jobs and automatically creates runner pods to execute them.

Key features:
- **Autoscaling** - Scale runners based on workflow demand
- **Ephemeral runners** - Fresh environment for each job
- **Runner groups** - Organize runners by team or workload type
- **Multi-repository support** - Single controller for entire organization

## Prerequisites

Before installing ARC, ensure you have:

```bash
# Kubernetes cluster (1.23+)
kubectl version --client

# Helm 3.x
helm version

# GitHub Personal Access Token or GitHub App credentials
# Token needs: repo, workflow, admin:org (for org runners)
```

## Installing Actions Runner Controller

### Step 1: Add the Helm Repository

```bash
# Add the official ARC Helm repository
helm repo add actions-runner-controller \
  https://actions-runner-controller.github.io/actions-runner-controller

# Update Helm repositories to fetch latest charts
helm repo update
```

### Step 2: Create the Namespace

```yaml
# namespace.yaml
# Create a dedicated namespace for ARC components
apiVersion: v1
kind: Namespace
metadata:
  name: actions-runner-system
  labels:
    app.kubernetes.io/name: actions-runner-controller
    app.kubernetes.io/component: controller
```

Apply it:

```bash
kubectl apply -f namespace.yaml
```

### Step 3: Configure Authentication

You have two options for authentication: Personal Access Token (PAT) or GitHub App. GitHub App is recommended for production.

#### Option A: Personal Access Token

```yaml
# github-secret-pat.yaml
# Store GitHub PAT for runner authentication
# Required scopes: repo, workflow, admin:org (for org-level runners)
apiVersion: v1
kind: Secret
metadata:
  name: controller-manager
  namespace: actions-runner-system
type: Opaque
stringData:
  # Replace with your actual GitHub Personal Access Token
  github_token: ghp_your_token_here
```

#### Option B: GitHub App (Recommended)

First, create a GitHub App in your organization settings with these permissions:
- **Repository permissions**: Actions (read), Administration (read/write), Metadata (read)
- **Organization permissions**: Self-hosted runners (read/write)

```yaml
# github-secret-app.yaml
# Store GitHub App credentials for runner authentication
# More secure than PAT and supports fine-grained permissions
apiVersion: v1
kind: Secret
metadata:
  name: controller-manager
  namespace: actions-runner-system
type: Opaque
stringData:
  # Your GitHub App ID (found in app settings)
  github_app_id: "12345"
  # Your GitHub App Installation ID
  github_app_installation_id: "67890"
  # Private key downloaded when creating the app (PEM format)
  github_app_private_key: |
    -----BEGIN RSA PRIVATE KEY-----
    your-private-key-here
    -----END RSA PRIVATE KEY-----
```

Apply the secret:

```bash
kubectl apply -f github-secret-app.yaml
```

### Step 4: Install the Controller

```bash
# Install ARC with Helm
# This deploys the controller that manages runner pods
helm install actions-runner-controller \
  actions-runner-controller/actions-runner-controller \
  --namespace actions-runner-system \
  --set authSecret.create=false \
  --set authSecret.name=controller-manager \
  --wait
```

Verify the installation:

```bash
# Check that the controller pod is running
kubectl get pods -n actions-runner-system

# Expected output:
# NAME                                          READY   STATUS    RESTARTS   AGE
# actions-runner-controller-xyz-abc             2/2     Running   0          1m
```

## Deploying Runners

### Basic Runner Deployment

```yaml
# runner-deployment.yaml
# Deploy a static set of runners for a specific repository
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: my-runners
  namespace: actions-runner-system
spec:
  # Number of runner pods to maintain
  replicas: 2
  template:
    spec:
      # Target repository in format: owner/repo
      repository: myorg/myrepo
      # Labels that workflows can target with runs-on
      labels:
        - self-hosted
        - linux
        - x64
      # Runner group (optional, for organization runners)
      # group: my-runner-group
```

Apply and verify:

```bash
kubectl apply -f runner-deployment.yaml

# Check runner pods
kubectl get runners -n actions-runner-system

# Check in GitHub: Settings > Actions > Runners
```

### Organization-Level Runners

```yaml
# org-runner-deployment.yaml
# Deploy runners available to all repos in an organization
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: org-runners
  namespace: actions-runner-system
spec:
  replicas: 3
  template:
    spec:
      # Target organization instead of specific repository
      organization: myorg
      labels:
        - self-hosted
        - linux
        - x64
        - org-runner
```

## Autoscaling Runners

Static replicas waste resources. Use HorizontalRunnerAutoscaler to scale based on demand.

### Percentage-Based Autoscaling

```yaml
# runner-autoscaler-percentage.yaml
# Scale runners based on percentage of busy runners
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: autoscaled-runners
  namespace: actions-runner-system
spec:
  # Template defines the runner pod specification
  template:
    spec:
      repository: myorg/myrepo
      labels:
        - self-hosted
        - linux
---
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: autoscaled-runners-hra
  namespace: actions-runner-system
spec:
  # Reference to the RunnerDeployment to scale
  scaleTargetRef:
    kind: RunnerDeployment
    name: autoscaled-runners
  # Minimum number of runners to maintain
  minReplicas: 1
  # Maximum number of runners allowed
  maxReplicas: 10
  # Scaling metrics configuration
  metrics:
    - type: PercentageRunnersBusy
      # Scale up when 75% of runners are busy
      scaleUpThreshold: "0.75"
      # Scale down when only 25% are busy
      scaleDownThreshold: "0.25"
      # Scale up by 2 runners at a time
      scaleUpFactor: "2"
      # Scale down by 1 runner at a time (slower scale-down)
      scaleDownFactor: "1"
```

### Webhook-Based Autoscaling (Recommended)

Webhook-based scaling is more responsive as it reacts to workflow events in real-time.

```yaml
# runner-autoscaler-webhook.yaml
# Scale runners based on GitHub webhook events
# Reacts immediately when workflows are queued
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: webhook-runners
  namespace: actions-runner-system
spec:
  template:
    spec:
      repository: myorg/myrepo
      labels:
        - self-hosted
        - linux
---
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: webhook-runners-hra
  namespace: actions-runner-system
spec:
  scaleTargetRef:
    kind: RunnerDeployment
    name: webhook-runners
  minReplicas: 0
  maxReplicas: 20
  # Duration to wait before scaling down idle runners
  scaleDownDelaySecondsAfterScaleOut: 300
  # Webhook-driven scaling reacts to workflow_job events
  scaleUpTriggers:
    - githubEvent:
        workflowJob: {}
      # Scale up by 1 for each queued job
      amount: 1
      # How long to wait for job to be picked up
      duration: "10m"
```

Configure the webhook in GitHub:

1. Go to Organization Settings > Webhooks
2. Add webhook with URL: `https://your-controller/webhook`
3. Content type: `application/json`
4. Secret: Configure a webhook secret
5. Events: Select "Workflow jobs"

## Ephemeral Runners

Ephemeral runners are destroyed after each job, providing a clean environment every time.

```yaml
# ephemeral-runners.yaml
# Ephemeral runners are destroyed after completing one job
# Ensures clean environment and prevents state leakage between jobs
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: ephemeral-runners
  namespace: actions-runner-system
spec:
  template:
    spec:
      repository: myorg/myrepo
      # Enable ephemeral mode - runner exits after one job
      ephemeral: true
      labels:
        - self-hosted
        - linux
        - ephemeral
      # Container mode runs jobs in separate containers
      # Provides better isolation than default host mode
      dockerEnabled: false
      containerMode: kubernetes
      # Work directory configuration
      workDir: /runner/_work
```

### Ephemeral Runners with Docker-in-Docker

```yaml
# ephemeral-runners-dind.yaml
# Ephemeral runners with Docker-in-Docker support
# Allows workflows to build and run Docker containers
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: ephemeral-dind-runners
  namespace: actions-runner-system
spec:
  template:
    spec:
      repository: myorg/myrepo
      ephemeral: true
      # Enable Docker support for container builds
      dockerEnabled: true
      # Mount Docker socket from DinD sidecar
      dockerdWithinRunnerContainer: true
      labels:
        - self-hosted
        - linux
        - dind
      # Resource limits for runner pod
      resources:
        limits:
          cpu: "4"
          memory: "8Gi"
        requests:
          cpu: "2"
          memory: "4Gi"
      # Docker daemon configuration
      dockerdContainerResources:
        limits:
          cpu: "2"
          memory: "4Gi"
        requests:
          cpu: "1"
          memory: "2Gi"
```

## Runner Groups

Runner groups let you control which repositories can use which runners.

### Creating Runner Groups in GitHub

1. Go to Organization Settings > Actions > Runner groups
2. Create a new group (e.g., "production-runners")
3. Configure repository access

### Deploying Runners to a Group

```yaml
# runner-group.yaml
# Deploy runners to a specific runner group
# Groups control which repositories can use these runners
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: production-runners
  namespace: actions-runner-system
spec:
  replicas: 5
  template:
    spec:
      organization: myorg
      # Assign runners to a specific group
      # Group must exist in GitHub organization settings
      group: production-runners
      labels:
        - self-hosted
        - linux
        - production
      # Use a custom runner image with additional tools
      image: myorg/custom-runner:latest
```

### Using Runner Groups in Workflows

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    # Target runners in the production group
    runs-on:
      group: production-runners
      labels: [self-hosted, linux, production]
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh
```

## Custom Runner Images

Create custom runner images with your tools pre-installed.

```dockerfile
# Dockerfile
# Custom GitHub Actions runner image with additional tools
FROM summerwind/actions-runner:latest

# Install additional tools as root
USER root

# Install common build dependencies
RUN apt-get update && apt-get install -y \
    # Build tools
    build-essential \
    # Node.js for JavaScript projects
    nodejs \
    npm \
    # Python for scripting
    python3 \
    python3-pip \
    # Go for Go projects
    golang-go \
    # Docker CLI for container operations
    docker.io \
    # Kubernetes tools
    kubectl \
    && rm -rf /var/lib/apt/lists/*

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install additional tools via pip
RUN pip3 install awscli

# Switch back to runner user for security
USER runner

# Verify installations
RUN node --version && python3 --version && go version
```

Build and push:

```bash
# Build the custom runner image
docker build -t myregistry/custom-runner:latest .

# Push to your container registry
docker push myregistry/custom-runner:latest
```

Use in RunnerDeployment:

```yaml
# custom-image-runner.yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: custom-runners
  namespace: actions-runner-system
spec:
  template:
    spec:
      repository: myorg/myrepo
      # Use custom runner image with pre-installed tools
      image: myregistry/custom-runner:latest
      # Pull secret if using private registry
      imagePullSecrets:
        - name: registry-credentials
```

## Security Considerations

### Network Policies

```yaml
# network-policy.yaml
# Restrict network access for runner pods
# Limit egress to only necessary destinations
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: runner-network-policy
  namespace: actions-runner-system
spec:
  # Apply to all runner pods
  podSelector:
    matchLabels:
      app.kubernetes.io/component: runner
  policyTypes:
    - Egress
    - Ingress
  # Allow egress to specific destinations
  egress:
    # Allow DNS resolution
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
    # Allow GitHub API access
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
    # Allow internal cluster communication
    - to:
        - namespaceSelector:
            matchLabels:
              name: internal-services
  # Deny all ingress by default
  ingress: []
```

### Pod Security Standards

```yaml
# pod-security.yaml
# Apply Pod Security Standards to runner namespace
# Restricts container capabilities and privileges
apiVersion: v1
kind: Namespace
metadata:
  name: actions-runner-system
  labels:
    # Enforce restricted security standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### RBAC for Runners

```yaml
# runner-rbac.yaml
# Minimal RBAC permissions for runner service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: runner-sa
  namespace: actions-runner-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: runner-role
  namespace: actions-runner-system
rules:
  # Allow runners to read configmaps and secrets they need
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
    # Restrict to specific resource names if possible
    resourceNames: ["runner-config"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: runner-rolebinding
  namespace: actions-runner-system
subjects:
  - kind: ServiceAccount
    name: runner-sa
    namespace: actions-runner-system
roleRef:
  kind: Role
  name: runner-role
  apiGroup: rbac.authorization.k8s.io
```

### Secrets Management

```yaml
# runner-with-secrets.yaml
# Securely inject secrets into runner pods
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: secure-runners
  namespace: actions-runner-system
spec:
  template:
    spec:
      repository: myorg/myrepo
      # Use dedicated service account with limited permissions
      serviceAccountName: runner-sa
      # Environment variables from secrets
      env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-access-key
      # Mount secrets as files
      volumeMounts:
        - name: ssh-key
          mountPath: /home/runner/.ssh
          readOnly: true
      volumes:
        - name: ssh-key
          secret:
            secretName: deploy-ssh-key
            defaultMode: 0400
```

## Monitoring Runners

### Prometheus Metrics

ARC exposes Prometheus metrics for monitoring. Configure ServiceMonitor:

```yaml
# servicemonitor.yaml
# Prometheus ServiceMonitor for ARC metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: actions-runner-controller
  namespace: actions-runner-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: actions-runner-controller
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Key Metrics to Monitor

```yaml
# prometheus-rules.yaml
# Alerting rules for GitHub Actions runners
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: runner-alerts
  namespace: actions-runner-system
spec:
  groups:
    - name: github-actions-runners
      rules:
        # Alert when no runners are available
        - alert: NoRunnersAvailable
          expr: |
            actions_runner_controller_runners{status="online"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: No GitHub Actions runners available
            description: No runners are online to process jobs

        # Alert when runners are stuck
        - alert: RunnerStuck
          expr: |
            actions_runner_controller_runners{status="busy"} > 0
            and
            increase(actions_runner_controller_runner_jobs_completed_total[30m]) == 0
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: GitHub Actions runner appears stuck
            description: Runner has been busy for 30m without completing jobs

        # Alert on high queue time
        - alert: HighQueueTime
          expr: |
            actions_runner_controller_pending_runners > 5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: High number of pending runners
            description: Jobs are waiting for runners to become available
```

### Grafana Dashboard

Create a dashboard with these panels:

```json
{
  "title": "GitHub Actions Runners",
  "panels": [
    {
      "title": "Runners by Status",
      "type": "gauge",
      "targets": [
        {
          "expr": "actions_runner_controller_runners",
          "legendFormat": "{{status}}"
        }
      ]
    },
    {
      "title": "Jobs Completed",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(actions_runner_controller_runner_jobs_completed_total[5m])",
          "legendFormat": "Jobs/s"
        }
      ]
    },
    {
      "title": "Runner Pod CPU",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"actions-runner-system\"}[5m])) by (pod)",
          "legendFormat": "{{pod}}"
        }
      ]
    }
  ]
}
```

### Logging

Configure structured logging for troubleshooting:

```yaml
# controller-config.yaml
# ARC controller logging configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: controller-config
  namespace: actions-runner-system
data:
  # Controller configuration
  controller_config.yaml: |
    # Log level: debug, info, warn, error
    logLevel: info
    # Log format: json for production, text for development
    logFormat: json
    # Enable sync period logging
    syncPeriod: 10m
```

## Best Practices Summary

1. **Use GitHub App authentication** - More secure than PATs with fine-grained permissions

2. **Enable ephemeral runners** - Clean environment for each job prevents state leakage

3. **Implement webhook-based autoscaling** - Faster response to demand than polling

4. **Set resource limits** - Prevent runaway jobs from consuming cluster resources

5. **Use runner groups** - Isolate runners by environment (dev, staging, prod)

6. **Build custom images** - Pre-install tools to reduce job startup time

7. **Apply network policies** - Restrict runner network access to necessary endpoints

8. **Monitor with Prometheus** - Track runner availability, queue times, and job completion

9. **Use Pod Security Standards** - Enforce security best practices at the namespace level

10. **Rotate credentials regularly** - Automate GitHub App key and token rotation

---

Self-hosted runners on Kubernetes give you the best of both worlds: GitHub Actions workflow convenience with full control over your CI/CD infrastructure. Start with a simple deployment, add autoscaling based on your workload patterns, and iterate on security and monitoring as you scale.

For comprehensive monitoring of your self-hosted runners and Kubernetes infrastructure, check out [OneUptime](https://oneuptime.com). OneUptime provides unified observability for your CI/CD pipelines, alerting you before failed builds impact your team.
