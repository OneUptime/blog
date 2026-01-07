# How to Monitor and Reduce Kubernetes Costs with Kubecost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Kubecost, FinOps, DevOps, Cloud

Description: A practical guide to monitoring and reducing Kubernetes costs with Kubecost, including installation, cost allocation, optimization recommendations, and alerting.

---

Kubernetes makes it easy to deploy. It also makes it easy to overspend. Kubecost gives you visibility into exactly where your money goes and how to reduce waste.

## Why Kubernetes Cost Visibility Matters

Without cost visibility:
- Teams don't know what they're spending
- Over-provisioned resources go unnoticed
- Unused resources accumulate
- Chargebacks are impossible

## Installing Kubecost

### Helm Installation (Free Tier)

The basic installation provides cost visibility with 15 days of metrics retention. Get a free token from kubecost.com for extended retention.

```bash
# Add Kubecost Helm repository
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm repo update

# Install Kubecost with default configuration
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set kubecostToken="YOUR_TOKEN"  # Get free token from kubecost.com
```

### With Prometheus Integration

This configuration includes Prometheus for extended metrics retention. Customize retention based on your analysis needs.

```bash
# Install with integrated Prometheus for longer retention
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set prometheus.server.global.external_labels.cluster_id=my-cluster \
  --set prometheus.server.retention=30d  # 30 days of cost data
```

### Access the Dashboard

Port-forward to access the Kubecost web UI for exploring costs and recommendations.

```bash
# Forward local port to Kubecost dashboard
kubectl port-forward -n kubecost deployment/kubecost-cost-analyzer 9090:9090

# Open http://localhost:9090 in your browser
```

## Understanding Kubecost Metrics

### Cost Breakdown

Kubecost calculates costs based on:
- **CPU**: Cost per CPU-hour
- **Memory**: Cost per GB-hour
- **Storage**: Cost per GB-month
- **Network**: Egress costs

### Cost Allocation

Costs are allocated to:
- Namespaces
- Deployments
- Pods
- Labels (custom allocation)

## Configuring Cost Allocation

### Cloud Provider Integration

Integrate with your cloud provider's billing data for accurate costs including discounts and reserved instances.

```yaml
# values.yaml - AWS Athena integration for accurate billing data
kubecostProductConfigs:
  cloudIntegrationJSON: |
    {
      "aws": [{
        "athenaBucketName": "s3://kubecost-athena-results",  # S3 bucket for query results
        "athenaRegion": "us-west-2",                          # Region for Athena queries
        "athenaDatabase": "athenacurcfn_kubecost",            # Database with CUR data
        "athenaTable": "kubecost",                            # Table name
        "projectID": "123456789012"                           # AWS account ID
      }]
    }
```

### Custom Pricing

Configure custom pricing for on-premises clusters or when cloud billing integration is not available.

```yaml
# For bare metal or custom rates
kubecostProductConfigs:
  customPricesEnabled: true
  defaultModelPricing:
    CPU: 0.03    # Cost per CPU-hour in your currency
    RAM: 0.004   # Cost per GB-hour
    storage: 0.0003  # Cost per GB-hour for persistent storage
```

### Label-Based Allocation

Map Kubernetes labels to cost allocation categories for team or project chargebacks.

```yaml
# Allocate costs to teams via labels
kubecostProductConfigs:
  labelMappingConfigs:
    enabled: true
    owner_label: team        # Label used for team ownership
    department_label: department
    product_label: product   # Label for product/project allocation
```

Then label your resources:

Apply these labels to all resources for accurate cost tracking and allocation.

```yaml
metadata:
  labels:
    team: platform         # Team responsible for this resource
    department: engineering
    product: api-gateway   # Product or project for chargeback
```

## Cost Analysis Queries

### Namespace Costs

Query the Kubecost API to get cost breakdowns programmatically for automation or custom dashboards.

```bash
# API query for namespace costs over the last 7 days
curl "http://localhost:9090/model/allocation?window=7d&aggregate=namespace"
```

### Deployment Costs

Get per-deployment cost data to identify expensive workloads.

```bash
# Get costs broken down by deployment
curl "http://localhost:9090/model/allocation?window=7d&aggregate=deployment"
```

### Custom Aggregations

Aggregate costs by custom labels for team or environment breakdowns.

```bash
# Aggregate by team label for chargeback reports
curl "http://localhost:9090/model/allocation?window=7d&aggregate=label:team"

# Aggregate by environment label
curl "http://localhost:9090/model/allocation?window=7d&aggregate=label:env"
```

## Optimization Recommendations

### Right-Sizing Recommendations

Kubecost analyzes actual usage vs requests:

Query the savings API to get actionable right-sizing recommendations with potential savings.

```bash
# Get container right-sizing recommendations
curl "http://localhost:9090/model/savings/requestSizing?window=7d"
```

Response includes:
- Current requests/limits
- Recommended requests/limits
- Potential savings

### Cluster Right-Sizing

Get recommendations for optimizing overall cluster size.

```bash
# Get cluster-level sizing recommendations
curl "http://localhost:9090/model/savings/clusterSizing"
```

### Abandoned Workloads

Find resources with no traffic:

Identify workloads that may be forgotten or unused.

```bash
# Find workloads with no network traffic (likely unused)
curl "http://localhost:9090/model/savings/abandonedWorkloads?window=7d"
```

## Setting Up Alerts

### Budget Alerts

Configure budget alerts to prevent cost overruns. Alerts trigger when spending approaches or exceeds thresholds.

```yaml
apiVersion: kubecost.io/v1alpha1
kind: Budget
metadata:
  name: production-budget
spec:
  namespace: production
  amount: 5000            # Monthly budget in dollars
  interval: month
  alerts:
    - type: forecast
      threshold: 0.8      # Alert when forecasted to hit 80% of budget
      window: 7d          # Forecast window
    - type: actual
      threshold: 1.0      # Alert when actually hitting 100% of budget
```

### Cost Anomaly Alerts

Detect unusual spending patterns that may indicate issues or misconfigurations.

```yaml
apiVersion: kubecost.io/v1alpha1
kind: Alert
metadata:
  name: cost-anomaly
spec:
  type: anomaly
  window: 24h             # Look for anomalies in the last 24 hours
  threshold: 0.3          # Alert on 30% or greater cost increase
  aggregation: namespace
  filter:
    namespace: production  # Monitor production namespace
```

### Efficiency Alerts

Alert when resource efficiency drops below acceptable levels.

```yaml
apiVersion: kubecost.io/v1alpha1
kind: Alert
metadata:
  name: low-efficiency
spec:
  type: efficiency
  threshold: 0.5          # Alert when efficiency drops below 50%
  window: 24h
  aggregation: deployment
```

## Implementing Cost Savings

### 1. Apply Right-Sizing Recommendations

Export and analyze recommendations, then apply changes to reduce waste.

```bash
# Export recommendations with significant savings potential
curl "http://localhost:9090/model/savings/requestSizing?window=7d" > recommendations.json

# Parse to find deployments with >$100/month potential savings
jq -r '.[] | select(.monthlySavings > 100) | "\(.namespace)/\(.controller)"' recommendations.json
```

Apply to deployment:

Update resource requests based on recommendations to reduce over-provisioning.

```yaml
resources:
  requests:
    cpu: 100m     # Reduced from 500m based on actual usage
    memory: 256Mi # Reduced from 1Gi based on actual usage
  limits:
    cpu: 200m     # Set limits to 2x requests
    memory: 512Mi
```

### 2. Delete Abandoned Workloads

Identify and review workloads that may no longer be needed.

```bash
# Find deployments with replicas but no traffic
kubectl get deployments -A -o json | jq -r '
  .items[] |
  select(.status.replicas > 0) |
  "\(.metadata.namespace)/\(.metadata.name)"
' | while read deploy; do
  # Compare against Kubecost abandoned workloads list
  echo "Review: $deploy"
done
```

### 3. Use Spot Instances

Run non-critical workloads on spot instances for significant cost savings.

```yaml
# Configure pods to run on spot instances
spec:
  nodeSelector:
    lifecycle: spot        # Select spot instance nodes
  tolerations:
    - key: spot
      value: "true"
      effect: NoSchedule   # Tolerate spot taint
```

### 4. Implement Pod Autoscaling

HPA scales pods based on demand, reducing costs during low-traffic periods.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2          # Minimum pods during low traffic
  maxReplicas: 10         # Maximum pods during peak
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale when CPU exceeds 70%
```

## Cost Allocation Reports

### Chargeback Report

Generate reports for team or department chargebacks.

```bash
# Monthly chargeback report by team label
curl "http://localhost:9090/model/allocation?window=lastmonth&aggregate=label:team" \
  | jq '.data[] | {team: .name, cost: .totalCost}'
```

### Export to CSV

Export cost data to CSV for spreadsheet analysis or finance systems.

```bash
# Export monthly costs to CSV format
curl "http://localhost:9090/model/allocation?window=lastmonth&aggregate=namespace&format=csv" \
  > monthly_costs.csv
```

### Scheduled Reports

Automate weekly cost reports delivered to stakeholders via email.

```yaml
apiVersion: kubecost.io/v1alpha1
kind: Report
metadata:
  name: weekly-cost-report
spec:
  schedule: "0 9 * * 1"   # Every Monday at 9 AM
  window: 7d              # Report on last 7 days
  aggregation: namespace
  recipients:
    - email: finance@example.com
    - email: engineering-leads@example.com
  format: pdf
```

## Integrating with Existing Tools

### Prometheus/Grafana

Kubecost exposes Prometheus metrics for custom dashboards and alerting.

```yaml
# Kubecost exposes Prometheus metrics
# Add to Grafana data source:
# http://kubecost-cost-analyzer.kubecost.svc:9090/model/prometheusMetrics
```

Key metrics:
- `kubecost_cluster_cost_total`
- `kubecost_namespace_cost_total`
- `kubecost_pod_cpu_cost_hourly`
- `kubecost_pod_memory_cost_hourly`

### Datadog

Forward Kubecost metrics to Datadog for unified monitoring.

```yaml
# values.yaml - Enable Datadog integration
kubecostProductConfigs:
  datadog:
    enabled: true
    apiKey: "<DATADOG_API_KEY>"  # Your Datadog API key
```

### Slack

Configure Slack notifications for budget alerts and anomalies.

```yaml
# values.yaml - Slack integration via AlertManager
global:
  notifications:
    alertManager:
      enabled: true
      fqdn: "http://alertmanager.monitoring.svc:9093"

# AlertManager config for Slack
alertmanager:
  config:
    receivers:
      - name: slack-kubecost
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/...'  # Webhook URL
            channel: '#cost-alerts'  # Target channel
```

## Multi-Cluster Cost Monitoring

### Federated Setup

Aggregate costs across multiple clusters with federated Kubecost deployment.

```yaml
# Primary cluster configuration
kubecostProductConfigs:
  clusterName: primary
  federatedCluster:
    primaryClusterID: primary
    enabled: true

# Secondary cluster configuration - reports to primary
kubecostProductConfigs:
  clusterName: secondary
  federatedCluster:
    primaryClusterID: primary
    enabled: true
    primaryClusterURL: http://kubecost.primary.example.com  # Primary cluster endpoint
```

### Aggregate View

Access the primary cluster dashboard to see costs across all clusters.

## Cost Governance Policies

### Resource Quotas

Limit resource consumption per namespace to control costs.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cost-quota
  namespace: development
spec:
  hard:
    requests.cpu: "10"           # Max 10 CPU cores requested
    requests.memory: 20Gi        # Max 20Gi memory requested
    limits.cpu: "20"             # Max 20 CPU cores limit
    limits.memory: 40Gi          # Max 40Gi memory limit
    persistentvolumeclaims: "10" # Max 10 PVCs
```

### Limit Ranges

Set default and maximum resource requests to prevent over-provisioning.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: development
spec:
  limits:
    - default:              # Default limits if not specified
        cpu: 500m
        memory: 512Mi
      defaultRequest:       # Default requests if not specified
        cpu: 100m
        memory: 128Mi
      type: Container
```

### OPA/Gatekeeper Policies

Enforce resource request requirements to ensure accurate cost allocation.

```yaml
# Require all pods to specify resource requests and limits
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredResources
metadata:
  name: require-resources
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    requireRequests: true   # Reject pods without requests
    requireLimits: true     # Reject pods without limits
```

## Best Practices

1. **Label everything** - Cost allocation depends on good labeling
2. **Set resource requests** - Without requests, costs can't be accurately allocated
3. **Review weekly** - Regular cost reviews catch waste early
4. **Automate right-sizing** - Use VPA or scripts to apply recommendations
5. **Set budgets** - Teams should know their spend limits
6. **Enable showback first** - Build awareness before chargeback

## Quick Wins Checklist

- [ ] Delete unused PVCs
- [ ] Scale down dev/staging at night
- [ ] Apply right-sizing recommendations
- [ ] Use spot instances for non-critical workloads
- [ ] Enable HPA for variable workloads
- [ ] Delete abandoned namespaces
- [ ] Review oversized resource requests
- [ ] Consolidate small deployments

---

Kubecost turns invisible cloud spend into actionable insights. Install it today, review your costs weekly, and implement the recommendations. Most organizations find 20-30% savings within the first month of active cost management.
