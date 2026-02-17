# How to Deploy Applications to AKS Using Helm Charts with Automated Rollbacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Helm, Kubernetes, Deployment, Rollback, CI/CD, Azure

Description: Learn how to deploy applications on AKS using Helm charts with automated rollback strategies to recover from failed deployments quickly.

---

Deploying applications to Kubernetes without a package manager quickly becomes tedious. You end up managing dozens of YAML files, templating values manually, and tracking which version of what is running where. Helm solves this by packaging Kubernetes resources into charts and managing releases with versioned history. Combined with automated rollbacks, you get deployments that recover from failures without manual intervention.

## Why Helm for AKS Deployments

Helm brings three things to the table that raw kubectl does not:

1. **Templating**: Define your Kubernetes manifests once with variables and render them for different environments.
2. **Release management**: Every deployment creates a release with a version number. You can list, inspect, and roll back releases.
3. **Dependency management**: Charts can depend on other charts. Need Redis alongside your app? Declare it as a dependency.

For AKS specifically, Helm integrates well with Azure DevOps, GitHub Actions, and other CI/CD tools that have native Helm support.

## Prerequisites

- An AKS cluster with kubectl configured
- Helm 3 installed (Helm 2 is deprecated and should not be used)
- A container image in Azure Container Registry (ACR) or another registry

## Step 1: Create a Helm Chart

Start with the Helm scaffold command to generate a chart structure.

```bash
# Create a new Helm chart named my-app
# This generates a directory with templates, values, and Chart.yaml
helm create my-app
```

This creates a directory structure like this:

```
my-app/
  Chart.yaml          # Chart metadata (name, version, description)
  values.yaml         # Default configuration values
  templates/          # Kubernetes manifest templates
    deployment.yaml
    service.yaml
    ingress.yaml
    hpa.yaml
    serviceaccount.yaml
    _helpers.tpl      # Template helper functions
```

## Step 2: Customize the Values File

The `values.yaml` file is where you define configuration that varies between environments.

```yaml
# values.yaml
# Default values for the my-app Helm chart
# Override these per environment with -f or --set

replicaCount: 3

image:
  repository: myacr.azurecr.io/my-app
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: myapp-tls
      hosts:
        - myapp.example.com

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

# Readiness and liveness probe configuration
probes:
  readiness:
    path: /health
    initialDelaySeconds: 10
    periodSeconds: 5
  liveness:
    path: /health
    initialDelaySeconds: 30
    periodSeconds: 10

# Rollback configuration
rollback:
  maxHistory: 10
```

Create environment-specific overrides.

```yaml
# values-production.yaml
# Production overrides - higher replica count and resource limits
replicaCount: 5

resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi

image:
  tag: "1.2.3"
```

## Step 3: Configure the Deployment Template for Rollbacks

Edit the deployment template to include proper rollout strategy and health checks that Helm can use to detect failed deployments.

```yaml
# templates/deployment.yaml
# Deployment with rolling update strategy and health checks
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  # Keep revision history for rollbacks
  revisionHistoryLimit: {{ .Values.rollback.maxHistory | default 10 }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # Allow one extra pod during updates
      maxSurge: 1
      # Keep all existing pods running during updates
      maxUnavailable: 0
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - containerPort: 80
        # Readiness probe - pod must pass this to receive traffic
        readinessProbe:
          httpGet:
            path: {{ .Values.probes.readiness.path }}
            port: 80
          initialDelaySeconds: {{ .Values.probes.readiness.initialDelaySeconds }}
          periodSeconds: {{ .Values.probes.readiness.periodSeconds }}
        # Liveness probe - pod gets restarted if this fails
        livenessProbe:
          httpGet:
            path: {{ .Values.probes.liveness.path }}
            port: 80
          initialDelaySeconds: {{ .Values.probes.liveness.initialDelaySeconds }}
          periodSeconds: {{ .Values.probes.liveness.periodSeconds }}
        resources:
          {{- toYaml .Values.resources | nindent 12 }}
```

The key settings for rollback-friendly deployments are `maxSurge: 1` and `maxUnavailable: 0`. This ensures that during an update, Kubernetes creates new pods before removing old ones. If the new pods fail their readiness probes, the old pods keep serving traffic.

## Step 4: Deploy with Helm

Install the chart for the first time.

```bash
# Install the chart as a release named "my-app" in the production namespace
# --wait makes Helm wait for pods to be ready before marking the release as successful
# --timeout sets how long to wait before considering the deployment failed
helm install my-app ./my-app \
  --namespace production \
  --create-namespace \
  --values values-production.yaml \
  --wait \
  --timeout 5m
```

The `--wait` flag is critical for automated rollbacks. Without it, Helm marks the release as successful immediately after submitting the resources to Kubernetes, even if pods never become ready. With `--wait`, Helm watches until all pods pass their readiness probes or the timeout expires.

## Step 5: Upgrade with Automatic Rollback

For subsequent deployments, use `helm upgrade` with the `--atomic` flag.

```bash
# Upgrade the release with a new image tag
# --atomic automatically rolls back if the upgrade fails
# --install creates the release if it does not exist
helm upgrade my-app ./my-app \
  --namespace production \
  --values values-production.yaml \
  --set image.tag="1.3.0" \
  --atomic \
  --timeout 5m
```

The `--atomic` flag is the key to automated rollbacks. Here is what happens:

1. Helm creates a new release revision with the updated resources.
2. Kubernetes starts rolling out the new pods.
3. Helm waits for all pods to pass readiness probes.
4. If pods become ready within the timeout, the release is marked as successful.
5. If pods fail to become ready (or the timeout expires), Helm automatically rolls back to the previous working revision.

## Step 6: Manual Rollback When Needed

Sometimes an issue surfaces after the deployment completes - maybe the health checks pass but the application has a logic bug. In that case, roll back manually.

```bash
# List release history to find the revision to roll back to
helm history my-app --namespace production

# Roll back to a specific revision (e.g., revision 3)
helm rollback my-app 3 --namespace production --wait

# Roll back to the previous revision
helm rollback my-app --namespace production --wait
```

## Step 7: Integrate with CI/CD

Here is a GitHub Actions workflow that deploys to AKS with automated rollback.

```yaml
# .github/workflows/deploy.yaml
# GitHub Actions workflow for deploying to AKS with Helm
name: Deploy to AKS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Azure Login
      uses: azure/login@v2
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Get AKS Credentials
      run: |
        # Configure kubectl to talk to the AKS cluster
        az aks get-credentials \
          --resource-group myResourceGroup \
          --name myAKSCluster

    - name: Install Helm
      uses: azure/setup-helm@v4

    - name: Deploy with Helm
      run: |
        # Deploy with atomic flag for automatic rollback on failure
        helm upgrade my-app ./helm/my-app \
          --namespace production \
          --values ./helm/values-production.yaml \
          --set image.tag=${{ github.sha }} \
          --atomic \
          --timeout 10m \
          --install
```

## Monitoring Deployment Health

After deployment, verify the release status and watch pod rollout.

```bash
# Check the current release status
helm status my-app --namespace production

# Watch the deployment rollout progress
kubectl rollout status deployment/my-app --namespace production

# View events related to the deployment
kubectl get events --namespace production --sort-by='.lastTimestamp'
```

## Helm Hooks for Pre and Post Deployment

Helm hooks let you run Jobs before or after a deployment. A common pattern is running database migrations before the new version starts.

```yaml
# templates/migration-job.yaml
# Pre-upgrade hook that runs database migrations before deploying new pods
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-app.fullname" . }}-migration
  annotations:
    # Run before the upgrade
    "helm.sh/hook": pre-upgrade,pre-install
    # Delete the Job after it completes
    "helm.sh/hook-delete-policy": hook-succeeded
    # If migration fails, the upgrade does not proceed
    "helm.sh/hook-weight": "0"
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        command: ["python", "manage.py", "migrate"]
```

If the migration Job fails, Helm aborts the upgrade before any pods are replaced. Combined with `--atomic`, this means a failed migration triggers a full rollback.

## Best Practices

- Always use `--atomic` in CI/CD pipelines. Manual deployments can use `--wait` without `--atomic` if you want to investigate failures before deciding to roll back.
- Set realistic timeouts. If your pods take 3 minutes to start, a 5-minute timeout is too tight when deploying multiple replicas.
- Keep the release history manageable. Set `--history-max 10` to prevent accumulating hundreds of old revisions.
- Use separate values files per environment rather than relying on `--set` flags. Values files are version-controlled and reviewable.
- Pin chart dependencies to specific versions in `Chart.lock` to ensure reproducible deployments.

## Summary

Helm charts combined with the `--atomic` flag give you deployments that self-heal on failure. The deployment flow is straightforward: package your Kubernetes resources as a chart, configure environment-specific values, and deploy with `helm upgrade --atomic`. If anything goes wrong - pods crash, health checks fail, or the timeout expires - Helm rolls back automatically. This pattern works with any CI/CD tool and keeps your AKS deployments reliable without requiring manual intervention during failures.
