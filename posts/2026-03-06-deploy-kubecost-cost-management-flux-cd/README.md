# How to Deploy Kubecost for Cost Management with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kubecost, cost management, kubernetes, gitops, helm, monitoring

Description: A practical guide to deploying Kubecost for Kubernetes cost management using Flux CD and GitOps principles.

---

## Introduction

Kubecost provides real-time cost monitoring, allocation, and optimization for Kubernetes clusters. When combined with Flux CD, you get a fully automated, GitOps-driven deployment that keeps your cost management infrastructure in sync with your Git repository.

This guide walks through deploying Kubecost with Flux CD, configuring cost allocation, setting up alerts, and integrating with cloud billing APIs.

## Prerequisites

Before getting started, ensure you have the following:

- A running Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on your cluster
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Repository Structure

Organize your GitOps repository with the following structure:

```
clusters/
  production/
    kubecost/
      namespace.yaml
      source.yaml
      release.yaml
      config/
        cost-analyzer-values.yaml
```

## Step 1: Create the Namespace

Define a dedicated namespace for Kubecost.

```yaml
# clusters/production/kubecost/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kubecost
  labels:
    # Label for Flux CD tracking
    toolkit.fluxcd.io/tenant: platform-team
```

## Step 2: Add the Kubecost Helm Repository

Create a HelmRepository source so Flux CD can pull the Kubecost chart.

```yaml
# clusters/production/kubecost/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kubecost
  namespace: flux-system
spec:
  # Official Kubecost Helm chart repository
  url: https://kubecost.github.io/cost-analyzer/
  interval: 1h
  # Flux will check for new chart versions every hour
```

## Step 3: Configure Kubecost Values

Create a values file that configures Kubecost for your environment.

```yaml
# clusters/production/kubecost/config/cost-analyzer-values.yaml
# Kubecost cost-analyzer Helm values
kubecostProductConfigs:
  # Your cluster name for identification
  clusterName: "production-cluster"
  # Currency code for cost display
  currencyCode: "USD"
  # Enable shared cost allocation
  sharedNamespaces: "kube-system,flux-system,monitoring"
  # Discount percentage for reserved instances
  discount: "30"

# Prometheus configuration
prometheus:
  server:
    # Retain metrics for 15 days
    retention: 15d
  nodeExporter:
    enabled: true

# Grafana bundled with Kubecost
grafana:
  # Enable built-in Grafana dashboards
  enabled: true
  sidecar:
    dashboards:
      enabled: true

# Resource requests and limits for cost-analyzer
costAnalyzer:
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

# Persistent storage for cost data
persistentVolume:
  enabled: true
  size: 32Gi
  storageClass: "standard"

# Network costs tracking
networkCosts:
  enabled: true
  # Track costs per pod for network traffic
  podMonitor:
    enabled: true

# Savings recommendations
savings:
  enabled: true
```

## Step 4: Create the HelmRelease

Define the HelmRelease resource that tells Flux CD how to deploy Kubecost.

```yaml
# clusters/production/kubecost/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: kubecost
  namespace: kubecost
spec:
  interval: 30m
  # Chart reference from the HelmRepository
  chart:
    spec:
      chart: cost-analyzer
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: kubecost
        namespace: flux-system
      interval: 12h
  # Install configuration
  install:
    # Create namespace if it does not exist
    createNamespace: true
    remediation:
      retries: 3
  # Upgrade configuration
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
  # Reference the values file
  valuesFrom:
    - kind: ConfigMap
      name: kubecost-values
      valuesKey: values.yaml
  # Inline values that override the ConfigMap
  values:
    # Global settings applied at deploy time
    global:
      prometheus:
        enabled: true
```

## Step 5: Create the Values ConfigMap

Package the values file as a ConfigMap for Flux CD to reference.

```yaml
# clusters/production/kubecost/config/values-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-values
  namespace: kubecost
data:
  values.yaml: |
    kubecostProductConfigs:
      clusterName: "production-cluster"
      currencyCode: "USD"
      sharedNamespaces: "kube-system,flux-system,monitoring"
    prometheus:
      server:
        retention: 15d
    grafana:
      enabled: true
    persistentVolume:
      enabled: true
      size: 32Gi
    networkCosts:
      enabled: true
```

## Step 6: Configure Cloud Integration

For accurate billing data, integrate Kubecost with your cloud provider.

```yaml
# clusters/production/kubecost/config/cloud-integration.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloud-integration
  namespace: kubecost
type: Opaque
stringData:
  # AWS cloud integration configuration
  cloud-integration.json: |
    {
      "aws": {
        "athena": [
          {
            "bucket": "s3://your-cur-bucket",
            "region": "us-east-1",
            "database": "athenacurcfn_cost_report",
            "table": "cost_report",
            "workgroup": "primary",
            "account": "123456789012"
          }
        ]
      }
    }
```

## Step 7: Set Up Cost Alerts

Configure alerts to notify your team when spending exceeds thresholds.

```yaml
# clusters/production/kubecost/config/alerts-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-alerts
  namespace: kubecost
data:
  alerts.json: |
    {
      "alerts": [
        {
          "type": "budget",
          "threshold": 1000,
          "window": "7d",
          "aggregation": "namespace",
          "filter": "default",
          "slackWebhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        },
        {
          "type": "efficiency",
          "threshold": 0.3,
          "window": "48h",
          "aggregation": "cluster",
          "slackWebhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        },
        {
          "type": "recurringUpdate",
          "window": "weekly",
          "aggregation": "namespace",
          "filter": "",
          "slackWebhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        }
      ]
    }
```

## Step 8: Add a Kustomization

Tie everything together with a Flux Kustomization resource.

```yaml
# clusters/production/kubecost/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubecost
  namespace: flux-system
spec:
  interval: 10m
  # Path in the Git repository
  path: ./clusters/production/kubecost
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Health checks to verify deployment
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kubecost-cost-analyzer
      namespace: kubecost
  # Timeout for health checks
  timeout: 5m
```

## Step 9: Verify the Deployment

After committing and pushing the manifests, verify that Flux has reconciled everything.

```bash
# Check the HelmRelease status
flux get helmreleases -n kubecost

# Check that all pods are running
kubectl get pods -n kubecost

# Verify the Kubecost service is available
kubectl get svc -n kubecost

# Port-forward to access the Kubecost UI locally
kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090
```

## Step 10: Access Cost Data via API

Kubecost exposes a REST API for programmatic access to cost data.

```bash
# Get allocation data for the last 7 days grouped by namespace
curl http://localhost:9090/model/allocation \
  -d window=7d \
  -d aggregate=namespace \
  -d accumulate=true

# Get savings recommendations
curl http://localhost:9090/model/savings/requestSizing \
  -d window=48h \
  -d targetCPUUtilization=0.65 \
  -d targetRAMUtilization=0.65
```

## Troubleshooting

Common issues and their solutions:

```bash
# If the HelmRelease fails to reconcile
flux reconcile helmrelease kubecost -n kubecost --with-source

# Check Flux events for errors
kubectl get events -n kubecost --sort-by='.lastTimestamp'

# View Kubecost logs for startup issues
kubectl logs -n kubecost deployment/kubecost-cost-analyzer -c cost-analyzer-frontend

# Verify Prometheus is scraping metrics
kubectl port-forward -n kubecost svc/kubecost-prometheus-server 9091:80
```

## Summary

You now have a fully GitOps-managed Kubecost deployment that provides cost visibility across your Kubernetes cluster. Any changes to cost configuration, alert thresholds, or cloud integrations can be made through Git commits, and Flux CD will automatically reconcile the desired state. This approach ensures that your cost management infrastructure is version-controlled, auditable, and reproducible across environments.
