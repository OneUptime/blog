# How to Set Up Kubecost on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubecost, Cost Monitoring, Kubernetes, FinOps, Cloud Cost

Description: Complete walkthrough of deploying and configuring Kubecost on Talos Linux for real-time Kubernetes cost monitoring and optimization recommendations.

---

Kubecost is the most popular open-source tool for monitoring Kubernetes costs. It provides real-time cost visibility, breaks down spending by namespace, deployment, label, and team, and gives actionable recommendations for reducing waste. On Talos Linux, Kubecost runs entirely as a Kubernetes workload, making installation straightforward since you do not need any host-level access.

This guide covers the full setup of Kubecost on a Talos Linux cluster, including cloud provider integration, custom pricing, and alerting.

## What Kubecost Provides

Before diving into installation, here is what Kubecost gives you:

- Real-time cost monitoring for every workload in your cluster
- Cost allocation by namespace, label, team, or any custom grouping
- Cloud provider billing integration for accurate pricing
- Savings recommendations based on actual usage patterns
- Budget alerts and reporting
- Multi-cluster cost aggregation

Kubecost Free and OpenCost provide core functionality. The commercial version adds features like enterprise multi-cluster management, SAML integration, and longer data retention options.

## Installing Kubecost with Helm

Start with the basic installation:

```bash
# Add the Kubecost Helm repository

helm repo add kubecost https://kubecost.github.io/kubecost/
helm repo update

# Install Kubecost
helm upgrade --install kubecost kubecost/kubecost \
  --namespace kubecost \
  --create-namespace \
  --set global.clusterId="talos-prod"
```

If you already have a product key for Kubecost Enterprise, pass it as Helm values:

```bash
# Install Kubecost with a product key
helm upgrade --install kubecost kubecost/kubecost \
  --namespace kubecost \
  --create-namespace \
  --set global.clusterId="talos-prod" \
  --set kubecostProductConfigs.productKey.enabled=true \
  --set kubecostProductConfigs.productKey.key="your-product-key-here"
```

## Custom Values for Talos Linux

Create a comprehensive values file for production deployment:

```yaml
# kubecost-values.yaml
# Kubecost configuration for Talos Linux clusters

global:
  # Use a descriptive name so this cluster is easy to identify
  clusterId: "talos-prod"

# Local agent storage for collected Kubernetes metrics
finopsagent:
  persistence:
    enabled: true
    size: 32Gi
    storageClass: "standard"

# Frontend resources
frontend:
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  service:
    type: ClusterIP

# Network costs tracking
networkCosts:
  enabled: true
  config:
    services:
      # Track traffic to cloud provider services
      amazon-web-services: true
      google-cloud-services: true

# Savings recommendations
kubecostProductConfigs:
  clusterProfile: production

# Ingress for external access
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: kubecost.internal.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: kubecost-tls
      hosts:
        - kubecost.internal.example.com
```

Deploy with the custom values:

```bash
# Install Kubecost with production configuration
helm upgrade --install kubecost kubecost/kubecost \
  --namespace kubecost \
  --create-namespace \
  -f kubecost-values.yaml
```

## Configuring Cloud Provider Integration

For accurate pricing, Kubecost needs access to your cloud provider's billing data.

### AWS Integration

Create an IAM policy and role for Kubecost:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "athena:StartQueryExecution",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "glue:GetDatabase",
        "glue:GetTable",
        "glue:GetPartitions",
        "s3:GetObject",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:PutObject",
        "cur:DescribeReportDefinitions"
      ],
      "Resource": "*"
    }
  ]
}
```

Configure Kubecost to use the AWS billing integration:

```yaml
# kubecost-aws-values.yaml
cloudCost:
  cloudIntegrationJSON: |-
    {
      "aws": {
        "athena": [
          {
            "bucket": "s3://your-athena-results-bucket",
            "region": "us-east-1",
            "database": "your_cur_database",
            "table": "your_cur_table",
            "workgroup": "primary",
            "account": "your-aws-account-id",
            "authorizer": {
              "authorizerType": "AWSAccessKey",
              "id": "your-access-key-id",
              "secret": "your-secret-access-key"
            }
          }
        ]
      }
    }
```

### Custom Pricing

If you are running on bare metal or a provider without billing integration, set custom pricing:

```yaml
# kubecost-custom-pricing.yaml
# Custom pricing for self-hosted or bare metal Talos clusters
finopsagent:
  agent:
    kubecost:
      customPrices:
        enabled: true
        CPU: "0.031611"      # Cost per CPU core per hour
        RAM: "0.004237"      # Cost per GB RAM per hour
        GPU: "0.95"          # Cost per GPU per hour
        storage: "0.00005479" # Cost per GB storage per hour
```

## Accessing the Kubecost Dashboard

After installation, access the dashboard:

```bash
# Port-forward to access Kubecost locally
kubectl port-forward -n kubecost svc/kubecost-frontend 9090:9090

# Open http://localhost:9090 in your browser
```

Or use the API to query costs programmatically:

```bash
# Get cost allocation by namespace for the last 7 days
curl -s "http://localhost:9090/model/allocation?window=7d&aggregate=namespace" \
  | jq '.data[] | to_entries[] | {
    namespace: .key,
    totalCost: .value.totalCost,
    cpuCost: .value.cpuCost,
    ramCost: .value.ramCost
  }' | head -40

# Get savings recommendations
curl -s "http://localhost:9090/model/savings" | jq '.'
```

## Setting Up Cost Alerts

Configure Kubecost to alert when spending exceeds thresholds:

```yaml
# kubecost-alerts.yaml
# Alert configuration for cost monitoring
global:
  notifications:
    alertConfigs:
      alerts:
        # Alert when daily cluster cost exceeds threshold
        - type: budget
          threshold: 100
          window: daily
          aggregation: cluster
          filter: ""
          ownerContact:
            - "platform-team@example.com"

        # Alert when a namespace exceeds weekly budget
        - type: budget
          threshold: 500
          window: weekly
          aggregation: namespace
          filter: "production"
          ownerContact:
            - "engineering@example.com"

        # Alert on significant cost increase
        - type: recurringUpdate
          window: weekly
          aggregation: namespace
          filter: ""
          ownerContact:
            - "finops@example.com"

        # Alert on efficiency drops
        - type: efficiency
          threshold: 0.3
          window: daily
          aggregation: namespace
          filter: ""
          ownerContact:
            - "platform-team@example.com"
```

## Integrating Kubecost with Slack

Send cost alerts to Slack for better visibility:

```yaml
# Enable Slack notifications
global:
  notifications:
    alertConfigs:
      globalSlackWebhookUrl: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
      globalAlertEmails:
        - "finops@example.com"
```

## Using Kubecost API for Custom Reports

Build custom cost reports using the Kubecost API:

```bash
#!/bin/bash
# weekly-cost-report.sh
# Generate a weekly cost report by team

KUBECOST_URL="http://kubecost-frontend.kubecost.svc.cluster.local:9090"

echo "Weekly Cost Report - $(date)"
echo "================================"

# Get costs aggregated by team label
curl -s "${KUBECOST_URL}/model/allocation?window=7d&aggregate=label:team" \
  | jq -r '
    .data[0] | to_entries[] |
    "\(.key)\t$\(.value.totalCost | . * 100 | round / 100)"
  ' | sort -t$'\t' -k2 -rn | column -t -s$'\t'

echo ""
echo "Top Savings Recommendations:"
echo "================================"

# Get top savings opportunities
curl -s "${KUBECOST_URL}/model/savings/requestSizingV2?window=7d" \
  | jq -r '
    .[0:5][] |
    "  \(.namespace)/\(.controllerName): Save $\(((.monthlySavings.cpu + .monthlySavings.memory) * 100 | round) / 100)/month"
  '
```

## Kubecost with Network Cost Monitoring

Enable detailed network cost tracking:

```yaml
# Network cost monitoring for cross-zone traffic
networkCosts:
  enabled: true
  serviceMonitor:
    enabled: true
  config:
    services:
      amazon-web-services: true
    destinations:
      # Track cross-zone traffic specifically
      in-region:
        - "10.0.0.0/16"
```

## Summary

Kubecost transforms Kubernetes cost management from guesswork into a data-driven process. On Talos Linux, the installation is clean because everything runs as standard Kubernetes workloads. Start with the basic installation to get immediate visibility into your spending, then add cloud provider integration for accurate pricing and set up alerts to catch budget overruns early. The savings recommendations alone often identify enough waste to pay for the time invested in setting up Kubecost many times over. For Talos Linux clusters, Kubecost's low overhead aligns well with the minimal design philosophy, giving you cost visibility without adding significant resource consumption to your cluster.
