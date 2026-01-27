# How to Use Kubecost for Kubernetes Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubecost, Cost Management, FinOps, Cloud Costs, DevOps, Cost Optimization

Description: A comprehensive guide to installing and using Kubecost to monitor, allocate, and optimize Kubernetes costs across namespaces, teams, and cloud providers.

---

> The most expensive Kubernetes cluster is the one where nobody knows what anything costs. Kubecost gives you visibility into every pod, namespace, and label - turning cloud chaos into actionable cost data.

## What is Kubecost?

Kubecost is an open-source cost monitoring tool for Kubernetes that provides real-time cost visibility and insights. It breaks down costs by namespace, deployment, service, label, and pod, helping teams understand exactly where their cloud spend goes.

Key capabilities include:
- Real-time cost allocation and monitoring
- Cost allocation by namespace, label, and deployment
- Efficiency scoring and right-sizing recommendations
- Budget alerts and anomaly detection
- Multi-cluster and multi-cloud support

## Installing Kubecost with Helm

The recommended way to install Kubecost is using Helm. Here is how to set it up on your cluster.

### Prerequisites

Ensure you have Helm 3.x installed and kubectl configured to access your cluster.

```bash
# Verify Helm is installed
helm version

# Verify kubectl can access your cluster
kubectl cluster-info
```

### Add the Kubecost Helm Repository

```bash
# Add the Kubecost Helm repository
helm repo add kubecost https://kubecost.github.io/cost-analyzer/

# Update your local Helm chart repository cache
helm repo update
```

### Basic Installation

```bash
# Create a dedicated namespace for Kubecost
kubectl create namespace kubecost

# Install Kubecost with default settings
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --set kubecostToken="YOUR_TOKEN_HERE"
```

### Production Installation with Custom Values

For production deployments, create a values file with your specific configuration.

```yaml
# kubecost-values.yaml
# Production-ready Kubecost configuration

# Kubecost token for premium features (optional for basic use)
kubecostToken: "YOUR_TOKEN_HERE"

# Enable persistent storage for cost data retention
persistentVolume:
  # Enable persistent storage to retain data across restarts
  enabled: true
  # Storage size for cost data (adjust based on cluster size)
  size: 32Gi
  # Use your cluster's default storage class or specify one
  storageClass: "standard"

# Resource requests and limits for the cost-analyzer pod
kubecostModel:
  resources:
    requests:
      # Minimum CPU required for cost calculations
      cpu: "100m"
      # Minimum memory for storing cost data
      memory: "256Mi"
    limits:
      # Maximum CPU allocation
      cpu: "1000m"
      # Maximum memory allocation
      memory: "2Gi"

# Prometheus configuration (Kubecost includes its own Prometheus)
prometheus:
  server:
    # Retain 15 days of metrics for cost analysis
    retention: 15d
    persistentVolume:
      # Enable persistent storage for Prometheus
      enabled: true
      size: 32Gi

# Network costs tracking (requires cloud provider integration)
networkCosts:
  # Enable network cost tracking
  enabled: true
  # Prometheus port for network metrics
  prometheusScrape: true

# Grafana dashboards for visualization
grafana:
  # Enable Grafana for additional dashboards
  enabled: true
  # Use persistent storage for Grafana dashboards
  persistence:
    enabled: true
    size: 5Gi
```

Install with the custom values:

```bash
# Install Kubecost with production configuration
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --values kubecost-values.yaml
```

### Verify Installation

```bash
# Check that all Kubecost pods are running
kubectl get pods -n kubecost

# Expected output shows pods in Running state:
# NAME                                          READY   STATUS    RESTARTS   AGE
# kubecost-cost-analyzer-xxx                    2/2     Running   0          5m
# kubecost-prometheus-server-xxx                1/1     Running   0          5m
# kubecost-grafana-xxx                          1/1     Running   0          5m

# Access the Kubecost UI via port-forward
kubectl port-forward -n kubecost deployment/kubecost-cost-analyzer 9090:9090
```

Open your browser to `http://localhost:9090` to access the Kubecost dashboard.

## Understanding Cost Allocation

Kubecost calculates costs by combining resource usage data from Prometheus with pricing information from your cloud provider.

### How Cost Calculation Works

```
Cost = (CPU_Usage * CPU_Price) + (Memory_Usage * Memory_Price) + (Storage_Usage * Storage_Price) + Network_Costs
```

Kubecost tracks:
- **CPU costs**: Based on actual CPU usage and node pricing
- **Memory costs**: Based on memory allocation and node pricing
- **Storage costs**: Persistent volume claims and their associated costs
- **Network costs**: Egress and cross-zone traffic (when enabled)

## Monitoring Namespace Costs

Namespaces are the primary unit of cost allocation in Kubernetes. Kubecost automatically tracks costs per namespace.

### Viewing Namespace Costs via API

```bash
# Query namespace costs for the last 7 days
curl -s "http://localhost:9090/model/allocation?window=7d&aggregate=namespace" | jq .

# Get costs for a specific namespace
curl -s "http://localhost:9090/model/allocation?window=7d&filterNamespaces=production" | jq .
```

### Creating a Namespace Cost Report ConfigMap

```yaml
# namespace-cost-config.yaml
# Configuration for namespace-based cost tracking
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-namespace-config
  namespace: kubecost
data:
  # Define namespace groupings for cost reports
  namespace-groups.yaml: |
    # Group namespaces by team or environment
    groups:
      # Production workloads
      - name: production
        namespaces:
          - production
          - prod-api
          - prod-workers
      # Development and staging
      - name: non-production
        namespaces:
          - development
          - staging
          - qa
      # Platform and infrastructure
      - name: platform
        namespaces:
          - kube-system
          - monitoring
          - logging
          - istio-system
```

### Namespace Cost Alerts

```yaml
# namespace-cost-alerts.yaml
# Alert when namespace costs exceed thresholds
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-alerts
  namespace: kubecost
data:
  alerts.yaml: |
    alerts:
      # Alert when production namespace exceeds daily budget
      - name: production-cost-alert
        type: budget
        # Target namespace to monitor
        filter:
          namespaces: ["production"]
        # Daily cost threshold in dollars
        threshold: 500
        window: 1d
        # Notification channels
        notifications:
          - type: slack
            webhook: "https://hooks.slack.com/services/xxx/yyy/zzz"
```

## Using Labels for Cost Tracking

Labels are powerful for cost allocation because they can span multiple namespaces and resources.

### Recommended Labels for Cost Tracking

Apply consistent labels across all your workloads:

```yaml
# deployment-with-cost-labels.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  labels:
    # Application identifier
    app: api-server
    # Team responsible for the workload
    team: platform
    # Environment classification
    environment: production
    # Cost center for chargeback
    cost-center: engineering
    # Project or product name
    project: main-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        # Repeat labels on pod template for accurate tracking
        app: api-server
        team: platform
        environment: production
        cost-center: engineering
        project: main-api
    spec:
      containers:
        - name: api
          image: myregistry/api:v1.0.0
          resources:
            # Always set resource requests for accurate cost calculation
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
```

### Querying Costs by Label

```bash
# Get costs aggregated by team label
curl -s "http://localhost:9090/model/allocation?window=7d&aggregate=label:team" | jq .

# Get costs for a specific team
curl -s "http://localhost:9090/model/allocation?window=7d&filterLabels=team:platform" | jq .

# Get costs by cost center
curl -s "http://localhost:9090/model/allocation?window=7d&aggregate=label:cost-center" | jq .
```

### Label-Based Cost Allocation Policy

```yaml
# cost-allocation-policy.yaml
# Define how costs should be attributed based on labels
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-allocation-policy
  namespace: kubecost
data:
  allocation.yaml: |
    # Primary allocation dimension
    primaryAggregation: label:team

    # Fallback allocation when primary label is missing
    fallbackAggregation: namespace

    # Shared cost distribution
    sharedCosts:
      # Distribute platform namespace costs across teams
      - namespace: kube-system
        # Distribute proportionally based on resource usage
        distribution: proportional
      - namespace: monitoring
        distribution: proportional

    # Label requirements for cost tracking
    requiredLabels:
      - team
      - environment
      - cost-center
```

## Getting Efficiency Recommendations

Kubecost analyzes your resource usage patterns and provides recommendations for right-sizing.

### Viewing Recommendations via API

```bash
# Get container right-sizing recommendations
curl -s "http://localhost:9090/model/savings/containerSizing?window=7d" | jq .

# Get cluster sizing recommendations
curl -s "http://localhost:9090/model/savings/clusterSizing" | jq .

# Get abandoned workload recommendations
curl -s "http://localhost:9090/model/savings/abandonedWorkloads?window=7d" | jq .
```

### Understanding Efficiency Scores

Kubecost calculates an efficiency score for each workload:

```
Efficiency = (Resource Usage / Resource Requests) * 100
```

- **90-100%**: Excellent - resources well utilized
- **70-89%**: Good - minor optimization possible
- **50-69%**: Fair - consider right-sizing
- **Below 50%**: Poor - significant over-provisioning

### Applying Recommendations

Based on Kubecost recommendations, update your deployments:

```yaml
# optimized-deployment.yaml
# Deployment with right-sized resources based on Kubecost recommendations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  annotations:
    # Document the optimization source
    kubecost.io/last-optimized: "2026-01-27"
    kubecost.io/previous-cpu-request: "1000m"
    kubecost.io/previous-memory-request: "2Gi"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    spec:
      containers:
        - name: api
          image: myregistry/api:v1.0.0
          resources:
            # Optimized based on actual usage patterns
            requests:
              # Reduced from 1000m based on p95 usage of 400m
              cpu: "500m"
              # Reduced from 2Gi based on p95 usage of 800Mi
              memory: "1Gi"
            limits:
              # Set limit at 2x request for burst capacity
              cpu: "1000m"
              memory: "2Gi"
```

## Configuring Cost Alerts

Alerts help you catch cost anomalies before they become expensive problems.

### Alert Types in Kubecost

```yaml
# kubecost-alerts.yaml
# Comprehensive alert configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-alert-config
  namespace: kubecost
data:
  alerts.yaml: |
    alerts:
      # Budget alert: triggers when spend exceeds threshold
      - name: daily-budget-exceeded
        type: budget
        threshold: 1000  # Daily spend in dollars
        window: 1d
        filter:
          namespaces: ["production", "staging"]
        notifications:
          - type: slack
            webhook: "${SLACK_WEBHOOK_URL}"
          - type: email
            recipients: ["platform-team@company.com"]

      # Efficiency alert: triggers when efficiency drops
      - name: low-efficiency-alert
        type: efficiency
        # Alert when efficiency drops below 50%
        threshold: 50
        window: 24h
        filter:
          namespaces: ["production"]
        notifications:
          - type: slack
            webhook: "${SLACK_WEBHOOK_URL}"

      # Anomaly alert: triggers on unusual spending patterns
      - name: cost-anomaly-alert
        type: anomaly
        # Alert when costs are 30% higher than baseline
        threshold: 30
        # Use 7-day baseline for comparison
        baselineWindow: 7d
        notifications:
          - type: pagerduty
            integrationKey: "${PAGERDUTY_KEY}"

      # Recurring report: daily cost summary
      - name: daily-cost-report
        type: report
        schedule: "0 9 * * *"  # Daily at 9 AM
        window: 1d
        aggregate: namespace
        notifications:
          - type: email
            recipients: ["finance@company.com"]
```

### Setting Up Slack Notifications

```yaml
# slack-integration.yaml
# Configure Slack notifications for cost alerts
apiVersion: v1
kind: Secret
metadata:
  name: kubecost-slack-config
  namespace: kubecost
type: Opaque
stringData:
  # Slack webhook URL for notifications
  webhook-url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-notifications
  namespace: kubecost
data:
  notifications.yaml: |
    slack:
      # Enable Slack notifications
      enabled: true
      # Reference to webhook secret
      webhookSecretName: kubecost-slack-config
      webhookSecretKey: webhook-url
      # Default channel for alerts
      channel: "#kubernetes-costs"
      # Include cost breakdown in messages
      includeBreakdown: true
```

## Setting Up Budgets

Budgets help teams stay accountable for their cloud spending.

### Namespace Budgets

```yaml
# namespace-budgets.yaml
# Define spending budgets per namespace
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-budgets
  namespace: kubecost
data:
  budgets.yaml: |
    budgets:
      # Production namespace budget
      - name: production-monthly
        # Monthly budget in dollars
        amount: 15000
        window: month
        filter:
          namespaces: ["production"]
        # Alert thresholds as percentage of budget
        alerts:
          - threshold: 50
            message: "Production at 50% of monthly budget"
          - threshold: 80
            message: "Production at 80% of monthly budget - review spending"
          - threshold: 100
            message: "Production exceeded monthly budget!"

      # Development environment budget
      - name: development-monthly
        amount: 3000
        window: month
        filter:
          namespaces: ["development", "staging"]
        alerts:
          - threshold: 80
            message: "Dev/Staging approaching budget limit"

      # Team-based budget using labels
      - name: platform-team-monthly
        amount: 8000
        window: month
        filter:
          labels:
            team: platform
        alerts:
          - threshold: 75
            message: "Platform team at 75% of monthly budget"
```

### Budget Enforcement with Resource Quotas

Combine Kubecost budgets with Kubernetes Resource Quotas for hard limits:

```yaml
# resource-quota.yaml
# Enforce resource limits that align with cost budgets
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    # CPU limits based on budget allocation
    # Approximately $5000/month in CPU costs
    requests.cpu: "50"
    limits.cpu: "100"
    # Memory limits based on budget allocation
    # Approximately $3000/month in memory costs
    requests.memory: "100Gi"
    limits.memory: "200Gi"
    # Storage limits
    # Approximately $500/month in storage costs
    requests.storage: "500Gi"
    # Pod count to prevent runaway scaling
    pods: "200"
    # PVC count
    persistentvolumeclaims: "50"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
    # Default resource requests if not specified
    - default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      type: Container
    # Minimum and maximum per container
    - min:
        cpu: "50m"
        memory: "64Mi"
      max:
        cpu: "4"
        memory: "8Gi"
      type: Container
```

## Cloud Provider Integration

Kubecost integrates with cloud providers for accurate pricing data.

### AWS Integration

```yaml
# aws-integration.yaml
# Configure AWS Cost and Usage Report integration
apiVersion: v1
kind: Secret
metadata:
  name: kubecost-aws-credentials
  namespace: kubecost
type: Opaque
stringData:
  # AWS credentials for accessing Cost and Usage Reports
  # Use IAM roles for service accounts in production
  AWS_ACCESS_KEY_ID: "YOUR_ACCESS_KEY"
  AWS_SECRET_ACCESS_KEY: "YOUR_SECRET_KEY"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-aws-config
  namespace: kubecost
data:
  aws.yaml: |
    aws:
      # Enable AWS integration
      enabled: true
      # S3 bucket containing Cost and Usage Reports
      athenaBucketName: "your-cur-bucket"
      # Athena database name
      athenaDatabase: "athenacurcfn_cur_report"
      # Athena table name
      athenaTable: "cur_report"
      # AWS region for Athena queries
      athenaRegion: "us-east-1"
      # Workgroup for Athena queries
      athenaWorkgroup: "primary"
      # S3 bucket for Athena query results
      athenaResultsBucket: "your-athena-results-bucket"
```

### GCP Integration

```yaml
# gcp-integration.yaml
# Configure Google Cloud billing integration
apiVersion: v1
kind: Secret
metadata:
  name: kubecost-gcp-credentials
  namespace: kubecost
type: Opaque
stringData:
  # GCP service account key JSON
  key.json: |
    {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "xxx",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "kubecost@your-project.iam.gserviceaccount.com",
      "client_id": "123456789",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-gcp-config
  namespace: kubecost
data:
  gcp.yaml: |
    gcp:
      # Enable GCP billing integration
      enabled: true
      # BigQuery dataset for billing export
      bigQueryBillingDataDataset: "billing_dataset"
      # BigQuery table name
      bigQueryBillingDataTable: "gcp_billing_export_v1_XXXXXX"
      # GCP project containing billing data
      projectID: "your-billing-project"
```

### Azure Integration

```yaml
# azure-integration.yaml
# Configure Azure cost management integration
apiVersion: v1
kind: Secret
metadata:
  name: kubecost-azure-credentials
  namespace: kubecost
type: Opaque
stringData:
  # Azure service principal credentials
  AZURE_CLIENT_ID: "your-client-id"
  AZURE_CLIENT_SECRET: "your-client-secret"
  AZURE_TENANT_ID: "your-tenant-id"
  AZURE_SUBSCRIPTION_ID: "your-subscription-id"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-azure-config
  namespace: kubecost
data:
  azure.yaml: |
    azure:
      # Enable Azure integration
      enabled: true
      # Subscription ID to monitor
      subscriptionID: "your-subscription-id"
      # Storage account for billing exports
      storageAccount: "yourstorageaccount"
      # Container with billing data
      storageContainer: "billing-exports"
      # Enable Azure rate card API for accurate pricing
      useRateCard: true
```

### Multi-Cloud Helm Values

```yaml
# multi-cloud-values.yaml
# Kubecost configuration for multi-cloud environments
kubecostProductConfigs:
  # Enable cloud provider integrations
  cloudIntegrationJSON: |
    {
      "aws": [
        {
          "athenaBucketName": "your-aws-cur-bucket",
          "athenaRegion": "us-east-1",
          "athenaDatabase": "athenacurcfn_cur",
          "athenaTable": "cur"
        }
      ],
      "gcp": [
        {
          "projectID": "your-gcp-project",
          "bigQueryBillingDataDataset": "billing",
          "bigQueryBillingDataTable": "gcp_billing"
        }
      ],
      "azure": [
        {
          "subscriptionID": "your-azure-subscription",
          "storageAccount": "yourstorageaccount"
        }
      ]
    }

# Enable multi-cluster support
federatedETL:
  # Enable federated metrics collection
  enabled: true
  # Primary cluster identifier
  primaryClusterID: "primary-cluster"
```

## Best Practices Summary

Here are the key best practices for using Kubecost effectively:

### 1. Label Everything

Apply consistent labels to all workloads for accurate cost attribution:

```yaml
labels:
  team: <team-name>
  environment: <prod|staging|dev>
  cost-center: <cost-center-code>
  project: <project-name>
```

### 2. Set Resource Requests

Always define resource requests - Kubecost uses these for cost calculation:

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
```

### 3. Configure Alerts Early

Set up budget alerts before costs become a problem:

- Daily budget alerts at 80% threshold
- Weekly anomaly detection
- Monthly cost reports for stakeholders

### 4. Review Recommendations Regularly

Schedule weekly reviews of Kubecost efficiency recommendations:

- Right-size over-provisioned workloads
- Identify abandoned resources
- Optimize node pool sizing

### 5. Integrate with Cloud Billing

Connect to your cloud provider's billing API for accurate pricing:

- AWS Cost and Usage Reports
- GCP BigQuery billing export
- Azure Cost Management

### 6. Implement Showback or Chargeback

Use Kubecost data to create accountability:

- Share cost reports with team leads
- Include costs in sprint reviews
- Set team-level budgets

### 7. Automate Cost Governance

Combine Kubecost with Kubernetes policies:

- Resource quotas per namespace
- Limit ranges for containers
- Admission controllers for required labels

---

Understanding your Kubernetes costs is the first step to optimizing them. Kubecost provides the visibility you need to make informed decisions about resource allocation, identify waste, and hold teams accountable for their cloud spending. Start with basic installation, add labels to your workloads, and gradually implement budgets and alerts as your FinOps practice matures.

For comprehensive monitoring of your Kubernetes clusters alongside cost tracking, check out [OneUptime](https://oneuptime.com) - the open-source observability platform that helps you monitor uptime, performance, and incidents across your entire infrastructure.
