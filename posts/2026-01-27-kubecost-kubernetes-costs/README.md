# How to Use Kubecost for Kubernetes Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubecost, Cost Management, FinOps, Cloud Cost, DevOps, Cost Optimization

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
helm repo add kubecost https://kubecost.github.io/kubecost/

# Update your local Helm chart repository cache
helm repo update
```

### Basic Installation

```bash
# Install Kubecost with default settings
helm install kubecost kubecost/kubecost \
  --namespace kubecost \
  --create-namespace \
  --set global.clusterId="production-cluster"
```

### Production Installation with Custom Values

For production deployments, create a values file with your specific configuration.

```yaml
# kubecost-values.yaml
# Production-ready Kubecost configuration

# Unique identifier for this cluster
global:
  clusterId: "production-cluster"

# Enable persistent storage for cost data retention
localStore:
  persistentVolume:
    # Enable persistent storage to retain data across restarts
    enabled: true
    # Storage size for cost data (adjust based on cluster size)
    size: 32Gi
    # Use your cluster's default storage class or specify one
    storageClass: "standard"

# Resource requests and limits for the local store pod
  resources:
    requests:
      # Minimum CPU required for local storage
      cpu: "500m"
      # Minimum memory for storing cost data
      memory: "1Gi"
    limits:
      # Maximum CPU allocation
      cpu: "1000m"
      # Maximum memory allocation
      memory: "3Gi"

# Resource requests and limits for the FinOps agent
finopsagent:
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

# Network costs tracking (requires cloud provider integration)
networkCosts:
  # Enable network cost tracking
  enabled: true
  # Set to true only if you want Prometheus scrape annotations
  prometheusScrape: false
```

Install with the custom values:

```bash
# Install Kubecost with production configuration
helm install kubecost kubecost/kubecost \
  --namespace kubecost \
  --create-namespace \
  --values kubecost-values.yaml
```

### Verify Installation

```bash
# Check that all Kubecost pods are running
kubectl get pods -n kubecost

# Check the installed Kubecost workloads
kubectl get deployments,statefulsets,daemonsets -n kubecost

# Access the Kubecost UI via port-forward
kubectl port-forward -n kubecost svc/kubecost-frontend 9090:9090
```

Open your browser to `http://localhost:9090` to access the Kubecost dashboard.

## Understanding Cost Allocation

Kubecost calculates costs by combining Kubernetes resource metrics collected by the FinOps agent with pricing information from your cloud provider.

### How Cost Calculation Works

```text
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

### Creating a Namespace Cost Report

```yaml
# kubecost-values.yaml
# Saved report for namespace-based cost tracking
global:
  savedReports:
    enabled: true
    reports:
      - title: "Production namespace costs"
        window: "7d"
        aggregateBy: "namespace"
        chartDisplay: "category"
        idle: "separate"
        rate: "cumulative"
        accumulate: false
        filters:
          - key: "namespace"
            operator: ":"
            value: "production"
```

### Namespace Cost Alerts

```yaml
# kubecost-values.yaml
# Alert when namespace costs exceed thresholds
global:
  notifications:
    alertConfigs:
      frontendUrl: http://localhost:9090
      globalSlackWebhookUrl: "https://hooks.slack.com/services/xxx/yyy/zzz"
      alerts:
        # Alert when production namespace exceeds daily budget
        - type: budget
          # Daily cost threshold in dollars
          threshold: 500
          window: 1d
          # Target namespace to monitor
          aggregation: namespace
          filter: production
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
curl -G "http://localhost:9090/model/allocation" \
  --data-urlencode "window=7d" \
  --data-urlencode "filter=label[team]:\"platform\"" | jq .

# Get costs by cost center
curl -s "http://localhost:9090/model/allocation?window=7d&aggregate=label:cost-center" | jq .
```

### Label-Based Shared Cost Allocation

```bash
# Example Allocation API query
# Attribute costs by the team label and share platform namespaces proportionally
curl -G "http://localhost:9090/model/allocation" \
  --data-urlencode "window=7d" \
  --data-urlencode "aggregate=label:team" \
  --data-urlencode "shareNamespaces=kube-system,monitoring" \
  --data-urlencode "shareIdle=true" | jq .
```

## Getting Efficiency Recommendations

Kubecost analyzes your resource usage patterns and provides recommendations for right-sizing.

### Viewing Recommendations via API

```bash
# Get container right-sizing recommendations
curl -s "http://localhost:9090/model/savings/requestSizingV2?window=7d" | jq .
```

### Understanding Efficiency Scores

Kubecost calculates an efficiency score for each workload:

```text
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
    metadata:
      labels:
        app: api-server
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
global:
  notifications:
    alertConfigs:
      frontendUrl: http://localhost:9090
      globalSlackWebhookUrl: "${SLACK_WEBHOOK_URL}"
      globalAlertEmails:
        - platform-team@company.com
      alerts:
        # Budget alert: triggers when spend exceeds threshold
        - type: budget
          threshold: 1000  # Daily spend in dollars
          window: 1d
          aggregation: namespace
          filter: production,staging

        # Efficiency alert: triggers when efficiency drops
        - type: efficiency
          # Alert when efficiency drops below 50%
          efficiencyThreshold: 0.5
          spendThreshold: 100
          window: 24h
          aggregation: namespace
          filter: production

        # Spend change alert: triggers on unusual spending patterns
        - type: spendChange
          window: 1d
          relativeThreshold: 0.3
          baselineWindow: 7d
          aggregation: namespace
          filter: production

        # Recurring report: daily cost summary
        - type: recurringUpdate
          window: 1d
          aggregation: namespace
```

### Setting Up Slack Notifications

```yaml
# slack-integration.yaml
# Configure Slack notifications for cost alerts through Helm values
global:
  notifications:
    alertConfigs:
      frontendUrl: http://localhost:9090
      globalSlackWebhookUrl: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
      alerts:
        - type: budget
          threshold: 500
          window: 1d
          aggregation: namespace
          filter: production
```

## Setting Up Budgets

Budgets help teams stay accountable for their cloud spending.

### Namespace Budgets

```bash
# Create a monthly budget for the production namespace
curl -X POST "http://localhost:9090/model/budget" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-monthly",
    "budgetType": "allocations",
    "values": {
      "namespace": ["production"]
    },
    "kind": "soft",
    "interval": "monthly",
    "intervalDay": 1,
    "spendLimit": 15000,
    "actions": [
      {
        "percentage": 80,
        "emails": ["platform-team@company.com"]
      }
    ]
  }'

# Create a monthly budget for workloads with team=platform
curl -X POST "http://localhost:9090/model/budget" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "platform-team-monthly",
    "budgetType": "allocations",
    "values": {
      "label": ["team:platform"]
    },
    "kind": "soft",
    "interval": "monthly",
    "intervalDay": 1,
    "spendLimit": 8000,
    "actions": [
      {
        "percentage": 75,
        "emails": ["platform-team@company.com"]
      }
    ]
  }'
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
cloudCost:
  cloudIntegrationJSON: |-
    {
      "aws": {
        "athena": [
          {
            "bucket": "your-athena-query-results-bucket",
            "region": "us-east-1",
            "database": "athenacurcfn_cur_report",
            "table": "cur_report",
            "workgroup": "primary",
            "account": "123456789012",
            "authorizer": {
              "authorizerType": "AWSAccessKey",
              "id": "YOUR_ACCESS_KEY",
              "secret": "YOUR_SECRET_KEY"
            }
          }
        ]
      }
    }
```

### GCP Integration

```yaml
# gcp-integration.yaml
# Configure Google Cloud billing integration
cloudCost:
  cloudIntegrationJSON: |-
    {
      "gcp": {
        "bigQuery": [
          {
            "projectID": "your-billing-project",
            "dataset": "billing_dataset",
            "table": "gcp_billing_export_v1_XXXXXX",
            "authorizer": {
              "authorizerType": "GCPServiceAccountKey",
              "key": {
                "type": "service_account",
                "project_id": "your-project-id",
                "private_key_id": "xxx",
                "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
                "client_email": "kubecost@your-project.iam.gserviceaccount.com",
                "client_id": "123456789",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": ""
              }
            }
          }
        ]
      }
    }
```

### Azure Integration

```yaml
# azure-integration.yaml
# Configure Azure cost management integration
cloudCost:
  cloudIntegrationJSON: |-
    {
      "azure": {
        "storage": [
          {
            "subscriptionID": "your-subscription-id",
            "account": "yourstorageaccount",
            "container": "billing-exports",
            "path": "",
            "cloud": "public",
            "authorizer": {
              "authorizerType": "AzureAccessKey",
              "account": "yourstorageaccount",
              "accessKey": "YOUR_STORAGE_ACCOUNT_ACCESS_KEY"
            }
          }
        ]
      }
    }
```

### Multi-Cloud Helm Values

Multi-cloud and unified multi-cluster views are Kubecost Enterprise features. For those environments, configure cloud integrations and federated storage together.

```yaml
# multi-cloud-values.yaml
# Kubecost configuration for multi-cloud environments
cloudCost:
  # Enable cloud provider integrations
  cloudIntegrationJSON: |-
    {
      "aws": {
        "athena": [
          {
            "bucket": "your-athena-query-results-bucket",
            "region": "us-east-1",
            "database": "athenacurcfn_cur",
            "table": "cur",
            "workgroup": "primary",
            "account": "123456789012",
            "authorizer": {
              "authorizerType": "AWSAccessKey",
              "id": "YOUR_ACCESS_KEY",
              "secret": "YOUR_SECRET_KEY"
            }
          }
        ]
      },
      "gcp": {
        "bigQuery": [
          {
            "projectID": "your-gcp-project",
            "dataset": "billing",
            "table": "gcp_billing",
            "authorizer": {
              "authorizerType": "GCPServiceAccountKey",
              "key": {
                "type": "service_account",
                "project_id": "your-gcp-project",
                "private_key_id": "xxx",
                "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
                "client_email": "kubecost@your-project.iam.gserviceaccount.com",
                "client_id": "123456789",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": ""
              }
            }
          }
        ]
      },
      "azure": {
        "storage": [
          {
            "subscriptionID": "your-azure-subscription",
            "account": "yourstorageaccount",
            "container": "billing-exports",
            "path": "",
            "cloud": "public",
            "authorizer": {
              "authorizerType": "AzureAccessKey",
              "account": "yourstorageaccount",
              "accessKey": "YOUR_STORAGE_ACCOUNT_ACCESS_KEY"
            }
          }
        ]
      }
    }

# Enable multi-cluster support
global:
  # Primary cluster identifier
  clusterId: "primary-cluster"
  # Configure federated object storage for multi-cluster deployments
  federatedStorage:
    existingSecret: "kubecost-federated-storage"
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
