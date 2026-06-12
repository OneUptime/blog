# How to Implement GitHub Actions Self-Hosted Runners on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GitHub Action, CI/CD, DevOps, Self-Hosted Runners, Arc, Automation

Description: A complete guide to deploying and managing GitHub Actions self-hosted runners on Kubernetes using Actions Runner Controller (ARC), covering autoscaling, runner groups, ephemeral runners, security.

---

> Self-hosted runners give you full control over your CI/CD infrastructure. Running them on Kubernetes with ARC means automatic scaling, better resource utilization, and runners that spin up on demand and disappear when done.

## Why Self-Hosted Runners on Kubernetes?

GitHub-hosted runners are convenient but come with limitations:

- **Cost** - Minutes add up quickly for large teams
- **Customization** - Limited control over the runner environment
- **Network access** - Cannot reach private resources without complex tunneling
- **Performance** - Shared infrastructure means variable performance

Self-hosted runners on Kubernetes solve these problems:

```text
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

Actions Runner Controller is a Kubernetes operator that orchestrates and scales self-hosted runners. In the current GitHub-supported ARC architecture, you create runner scale sets that listen for matching GitHub Actions jobs and create ephemeral runner pods to execute them.

Key features:
- **Autoscaling** - Scale runners based on workflow demand
- **Ephemeral runners** - Fresh environment for each job
- **Runner groups** - Organize runners by team or workload type
- **Multi-repository support** - Deploy scale sets at repository, organization, or enterprise scope

## Prerequisites

Before installing ARC, ensure you have:

```bash
# Kubernetes cluster
kubectl version --client

# Helm 3.x
helm version

# GitHub Personal Access Token or GitHub App credentials
# Classic PAT scopes: repo for repository runners, admin:org for organization runners
```

## Installing Actions Runner Controller

### Step 1: Install the Controller Chart

```bash
# Install the ARC controller and CRDs from GitHub's OCI Helm chart
NAMESPACE="arc-systems"

helm install arc \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

### Step 2: Create the Runner Namespace

GitHub recommends creating runner pods in a different namespace from the operator pods.

```yaml
# namespace.yaml
# Create a dedicated namespace for ARC runner scale sets
apiVersion: v1
kind: Namespace
metadata:
  name: arc-runners
  labels:
    app.kubernetes.io/name: actions-runner-controller
    app.kubernetes.io/component: runners
```

Apply it:

```bash
kubectl apply -f namespace.yaml
```

### Step 3: Configure Authentication

You have three options for authentication: GitHub App, fine-grained PAT, or classic PAT. GitHub App is recommended for repository and organization runners. Enterprise-level runners require a classic PAT.

#### Option A: Personal Access Token

```bash
# Store a classic or fine-grained PAT in the same namespace as the runner scale set
kubectl create secret generic pre-defined-secret \
  --namespace=arc-runners \
  --from-literal=github_token='YOUR-PAT'
```

#### Option B: GitHub App (Recommended)

First, create a GitHub App in your organization settings with these permissions:
- **Repository permissions**: Administration (read/write, required for repository runners), Metadata (read)
- **Organization permissions**: Self-hosted runners (read/write, required for organization runners)

```bash
# Store GitHub App credentials in the same namespace as the runner scale set
kubectl create secret generic pre-defined-secret \
  --namespace=arc-runners \
  --from-literal=github_app_id=12345 \
  --from-literal=github_app_installation_id=67890 \
  --from-file=github_app_private_key=private-key.pem
```

### Step 4: Install a Runner Scale Set

```bash
# Install a runner scale set for a repository, organization, or enterprise
INSTALLATION_NAME="arc-runner-set"
NAMESPACE="arc-runners"
GITHUB_CONFIG_URL="https://github.com/myorg/myrepo"

helm install "${INSTALLATION_NAME}" \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  --set githubConfigUrl="${GITHUB_CONFIG_URL}" \
  --set githubConfigSecret=pre-defined-secret \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

Verify the installation:

```bash
# Check Helm releases
helm list -A

# Check that the controller pod and listener pod are running
kubectl get pods -n arc-systems
kubectl get pods -n arc-runners

# Expected output includes:
# arc-gha-runner-scale-set-controller-xyz             1/1     Running   0          1m
# arc-runner-set-xyz-listener                        1/1     Running   0          1m
```

## Deploying Runners

### Basic Runner Deployment

```yaml
# values.yaml
# Deploy a runner scale set for a specific repository
githubConfigUrl: "https://github.com/myorg/myrepo"
githubConfigSecret: pre-defined-secret

# Workflows can target this scale set with runs-on: arc-runner-set
runnerScaleSetName: "arc-runner-set"

# Keep two idle runners ready for jobs
minRunners: 2
maxRunners: 10
```

Apply and verify:

```bash
helm upgrade --install arc-runner-set \
  --namespace arc-runners \
  --create-namespace \
  -f values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set

# Check runner pods while jobs are running
kubectl get pods -n arc-runners

# Check in GitHub: Settings > Actions > Runners
```

### Organization-Level Runners

```yaml
# org-runner-values.yaml
# Deploy runners available to repositories in an organization
githubConfigUrl: "https://github.com/myorg"
githubConfigSecret: pre-defined-secret
runnerScaleSetName: "org-runners"

minRunners: 3
maxRunners: 20
```

## Autoscaling Runners

Static replicas waste resources. ARC runner scale sets use `minRunners` and `maxRunners` to keep idle capacity available and scale up when jobs are assigned to the scale set.

### Minimum and Maximum Autoscaling

```yaml
# runner-autoscaler-values.yaml
# Scale runners between 1 idle runner and 10 total runners
githubConfigUrl: "https://github.com/myorg/myrepo"
githubConfigSecret: pre-defined-secret
runnerScaleSetName: "autoscaled-runners"

# Minimum number of idle runners to maintain
minRunners: 1

# Maximum number of runners allowed
maxRunners: 10
```

### Scale-to-Zero Autoscaling (Recommended)

ARC runner scale sets listen for matching jobs from GitHub Actions and can scale down to zero runner pods when no jobs are assigned.

```yaml
# runner-autoscaler-scale-to-zero.yaml
# Scale from zero idle runners up to 20 total runners
githubConfigUrl: "https://github.com/myorg/myrepo"
githubConfigSecret: pre-defined-secret
runnerScaleSetName: "webhook-runners"

# No idle runners when the queue is empty
minRunners: 0

# Maximum number of runners allowed
maxRunners: 20
```

No separate GitHub webhook is required for the current ARC scale set listener. Jobs are assigned when a workflow's `runs-on` value matches the runner scale set name or configured scale set labels.

## Ephemeral Runners

Runner scale set runners are ephemeral. ARC creates runner pods for assigned jobs and removes them after the jobs complete, providing a clean environment every time.

```yaml
# ephemeral-runners.yaml
# Ephemeral scale set runners with Kubernetes container mode
githubConfigUrl: "https://github.com/myorg/myrepo"
githubConfigSecret: pre-defined-secret
runnerScaleSetName: "ephemeral-runners"

minRunners: 0
maxRunners: 10

# Container mode runs container jobs and services in Kubernetes pods
containerMode:
  type: "kubernetes"
  kubernetesModeWorkVolumeClaim:
    accessModes: ["ReadWriteOnce"]
    resources:
      requests:
        storage: 1Gi
```

### Ephemeral Runners with Docker-in-Docker

```yaml
# ephemeral-runners-dind.yaml
# Ephemeral runners with Docker-in-Docker support
githubConfigUrl: "https://github.com/myorg/myrepo"
githubConfigSecret: pre-defined-secret
runnerScaleSetName: "ephemeral-dind-runners"

minRunners: 0
maxRunners: 10

# Docker-in-Docker mode requires a privileged Docker daemon sidecar
containerMode:
  type: "dind"

# Resource limits for the runner container
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
githubConfigUrl: "https://github.com/myorg"
githubConfigSecret: pre-defined-secret
runnerScaleSetName: "production-runners"

# Group must exist in GitHub organization settings
runnerGroup: "production-runners"

minRunners: 2
maxRunners: 20

# Use a custom runner image with additional tools
template:
  spec:
    containers:
      - name: runner
        image: myorg/custom-runner:latest
        command: ["/home/runner/run.sh"]
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
    # Target the runner scale set by name
    runs-on: production-runners
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
FROM ghcr.io/actions/actions-runner:latest

# Install additional tools as root
USER root

# Install common build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    ca-certificates \
    curl \
    gnupg \
    python3 \
    python3-pip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN curl -fsSL -o /usr/local/bin/kubectl \
    "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x /usr/local/bin/kubectl

# Install Helm
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install AWS CLI v2
RUN curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip -q awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip

# Switch back to runner user for security
USER runner

# Verify installations
RUN python3 --version && kubectl version --client=true && helm version && aws --version
```

Build and push:

```bash
# Build the custom runner image
docker build -t myregistry/custom-runner:latest .

# Push to your container registry
docker push myregistry/custom-runner:latest
```

Use in the runner scale set:

```yaml
# custom-image-runner.yaml
githubConfigUrl: "https://github.com/myorg/myrepo"
githubConfigSecret: pre-defined-secret
runnerScaleSetName: "custom-runners"

template:
  spec:
    containers:
      - name: runner
        image: myregistry/custom-runner:latest
        imagePullPolicy: Always
        command: ["/home/runner/run.sh"]
    imagePullSecrets:
      - name: registry-credentials
```

## Security Considerations

### Network Policies

```yaml
# network-policy.yaml
# Restrict network access for runner pods
# Add the matching label in template.metadata.labels for your runner scale set
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: runner-network-policy
  namespace: arc-runners
spec:
  podSelector:
    matchLabels:
      app: arc-runner
  policyTypes:
    - Egress
    - Ingress
  egress:
    # Allow DNS resolution
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow required outbound HTTPS access
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
# Apply Pod Security Standards to the runner namespace
# Use baseline if you need Docker-in-Docker, because DinD requires privileged containers
apiVersion: v1
kind: Namespace
metadata:
  name: arc-runners
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
```

### RBAC for Runners

```yaml
# runner-rbac.yaml
# Minimal RBAC permissions for a runner service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: runner-sa
  namespace: arc-runners
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: runner-role
  namespace: arc-runners
rules:
  # Allow runners to read only the configmap they need
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["runner-config"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: runner-rolebinding
  namespace: arc-runners
subjects:
  - kind: ServiceAccount
    name: runner-sa
    namespace: arc-runners
roleRef:
  kind: Role
  name: runner-role
  apiGroup: rbac.authorization.k8s.io
```

### Secrets Management

```yaml
# runner-with-secrets.yaml
# Securely inject secrets into runner pods
githubConfigUrl: "https://github.com/myorg/myrepo"
githubConfigSecret: pre-defined-secret
runnerScaleSetName: "secure-runners"

template:
  spec:
    serviceAccountName: runner-sa
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
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

ARC exposes Prometheus metrics for monitoring. Enable metrics in the `gha-runner-scale-set-controller` chart values:

```yaml
# controller-values.yaml
# ARC controller metrics configuration
metrics:
  controllerManagerAddr: ":8080"
  listenerAddr: ":8080"
  listenerEndpoint: "/metrics"
```

Configure ServiceMonitor labels to match the Services created by your Helm release:

```yaml
# servicemonitor.yaml
# Prometheus ServiceMonitor for ARC metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: actions-runner-controller
  namespace: arc-systems
  labels:
    release: prometheus
spec:
  namespaceSelector:
    matchNames:
      - arc-systems
      - arc-runners
  selector:
    matchExpressions:
      - key: app.kubernetes.io/instance
        operator: In
        values:
          - arc
          - arc-runner-set
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Key Metrics to Monitor

```yaml
# prometheus-rules.yaml
# Alerting rules for GitHub Actions runner scale sets
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: runner-alerts
  namespace: arc-systems
spec:
  groups:
    - name: github-actions-runners
      rules:
        # Alert when assigned jobs are not being picked up
        - alert: RunnerJobsQueued
          expr: |
            gha_assigned_jobs > 0 and gha_running_jobs == 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: GitHub Actions jobs are assigned but not running
            description: Jobs are waiting for runner scale set capacity

        # Alert when runners are stuck
        - alert: RunnerStuck
          expr: |
            gha_busy_runners > 0
            and
            increase(gha_completed_jobs_total[30m]) == 0
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: GitHub Actions runner appears stuck
            description: Runner has been busy for 30m without completing jobs

        # Alert on high startup time
        - alert: HighRunnerStartupTime
          expr: |
            histogram_quantile(0.95, rate(gha_job_startup_duration_seconds_bucket[10m])) > 300
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: High runner startup time
            description: Jobs are waiting more than five minutes for runner startup
```

### Grafana Dashboard

Create a dashboard with these panels:

```json
{
  "title": "GitHub Actions Runners",
  "panels": [
    {
      "title": "Runners by State",
      "type": "gauge",
      "targets": [
        {
          "expr": "gha_registered_runners",
          "legendFormat": "registered"
        },
        {
          "expr": "gha_busy_runners",
          "legendFormat": "busy"
        },
        {
          "expr": "gha_idle_runners",
          "legendFormat": "idle"
        }
      ]
    },
    {
      "title": "Jobs Completed",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(gha_completed_jobs_total[5m])",
          "legendFormat": "Jobs/s"
        }
      ]
    },
    {
      "title": "Runner Pod CPU",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"arc-runners\"}[5m])) by (pod)",
          "legendFormat": "{{pod}}"
        }
      ]
    }
  ]
}
```

### Logging

Collect and retain logs from the controller, listener, and ephemeral runner pods for troubleshooting:

```bash
# Controller logs
kubectl logs -n arc-systems deployment/arc-gha-runner-scale-set-controller

# Find listener and runner pod names
kubectl get pods -n arc-runners

# Listener or runner pod logs
kubectl logs -n arc-runners <pod-name>
```

## Best Practices Summary

1. **Use GitHub App authentication** - More secure than PATs with fine-grained permissions

2. **Use ephemeral runner scale sets** - Clean environment for each job prevents state leakage

3. **Set minRunners and maxRunners** - Balance fast job pickup with cost and capacity limits

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
