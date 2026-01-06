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

```bash
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm repo update

helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set kubecostToken="YOUR_TOKEN"  # Get from kubecost.com
```

### With Prometheus Integration

```bash
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set prometheus.server.global.external_labels.cluster_id=my-cluster \
  --set prometheus.server.retention=30d
```

### Access the Dashboard

```bash
kubectl port-forward -n kubecost deployment/kubecost-cost-analyzer 9090:9090

# Open http://localhost:9090
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

```yaml
# values.yaml
kubecostProductConfigs:
  cloudIntegrationJSON: |
    {
      "aws": [{
        "athenaBucketName": "s3://kubecost-athena-results",
        "athenaRegion": "us-west-2",
        "athenaDatabase": "athenacurcfn_kubecost",
        "athenaTable": "kubecost",
        "projectID": "123456789012"
      }]
    }
```

### Custom Pricing

```yaml
# For bare metal or custom rates
kubecostProductConfigs:
  customPricesEnabled: true
  defaultModelPricing:
    CPU: 0.03  # Per CPU-hour
    RAM: 0.004 # Per GB-hour
    storage: 0.0003 # Per GB-hour
```

### Label-Based Allocation

```yaml
# Allocate costs to teams via labels
kubecostProductConfigs:
  labelMappingConfigs:
    enabled: true
    owner_label: team
    department_label: department
    product_label: product
```

Then label your resources:

```yaml
metadata:
  labels:
    team: platform
    department: engineering
    product: api-gateway
```

## Cost Analysis Queries

### Namespace Costs

```bash
# API query for namespace costs
curl "http://localhost:9090/model/allocation?window=7d&aggregate=namespace"
```

### Deployment Costs

```bash
curl "http://localhost:9090/model/allocation?window=7d&aggregate=deployment"
```

### Custom Aggregations

```bash
# By team label
curl "http://localhost:9090/model/allocation?window=7d&aggregate=label:team"

# By environment
curl "http://localhost:9090/model/allocation?window=7d&aggregate=label:env"
```

## Optimization Recommendations

### Right-Sizing Recommendations

Kubecost analyzes actual usage vs requests:

```bash
# Get recommendations via API
curl "http://localhost:9090/model/savings/requestSizing?window=7d"
```

Response includes:
- Current requests/limits
- Recommended requests/limits
- Potential savings

### Cluster Right-Sizing

```bash
curl "http://localhost:9090/model/savings/clusterSizing"
```

### Abandoned Workloads

Find resources with no traffic:

```bash
curl "http://localhost:9090/model/savings/abandonedWorkloads?window=7d"
```

## Setting Up Alerts

### Budget Alerts

```yaml
apiVersion: kubecost.io/v1alpha1
kind: Budget
metadata:
  name: production-budget
spec:
  namespace: production
  amount: 5000
  interval: month
  alerts:
    - type: forecast
      threshold: 0.8  # 80% of budget
      window: 7d
    - type: actual
      threshold: 1.0  # 100% of budget
```

### Cost Anomaly Alerts

```yaml
apiVersion: kubecost.io/v1alpha1
kind: Alert
metadata:
  name: cost-anomaly
spec:
  type: anomaly
  window: 24h
  threshold: 0.3  # 30% increase
  aggregation: namespace
  filter:
    namespace: production
```

### Efficiency Alerts

```yaml
apiVersion: kubecost.io/v1alpha1
kind: Alert
metadata:
  name: low-efficiency
spec:
  type: efficiency
  threshold: 0.5  # Below 50% efficiency
  window: 24h
  aggregation: deployment
```

## Implementing Cost Savings

### 1. Apply Right-Sizing Recommendations

```bash
# Export recommendations
curl "http://localhost:9090/model/savings/requestSizing?window=7d" > recommendations.json

# Parse and apply (example script)
jq -r '.[] | select(.monthlySavings > 100) | "\(.namespace)/\(.controller)"' recommendations.json
```

Apply to deployment:

```yaml
resources:
  requests:
    cpu: 100m     # Was 500m
    memory: 256Mi # Was 1Gi
  limits:
    cpu: 200m
    memory: 512Mi
```

### 2. Delete Abandoned Workloads

```bash
# Find workloads with no traffic
kubectl get deployments -A -o json | jq -r '
  .items[] |
  select(.status.replicas > 0) |
  "\(.metadata.namespace)/\(.metadata.name)"
' | while read deploy; do
  # Check if in abandoned list from Kubecost
  echo "Review: $deploy"
done
```

### 3. Use Spot Instances

```yaml
# Node selector for spot instances
spec:
  nodeSelector:
    lifecycle: spot
  tolerations:
    - key: spot
      value: "true"
      effect: NoSchedule
```

### 4. Implement Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Cost Allocation Reports

### Chargeback Report

```bash
# Monthly chargeback by team
curl "http://localhost:9090/model/allocation?window=lastmonth&aggregate=label:team" \
  | jq '.data[] | {team: .name, cost: .totalCost}'
```

### Export to CSV

```bash
curl "http://localhost:9090/model/allocation?window=lastmonth&aggregate=namespace&format=csv" \
  > monthly_costs.csv
```

### Scheduled Reports

```yaml
apiVersion: kubecost.io/v1alpha1
kind: Report
metadata:
  name: weekly-cost-report
spec:
  schedule: "0 9 * * 1"  # Monday 9 AM
  window: 7d
  aggregation: namespace
  recipients:
    - email: finance@example.com
    - email: engineering-leads@example.com
  format: pdf
```

## Integrating with Existing Tools

### Prometheus/Grafana

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

```yaml
# values.yaml
kubecostProductConfigs:
  datadog:
    enabled: true
    apiKey: "<DATADOG_API_KEY>"
```

### Slack

```yaml
# values.yaml
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
          - api_url: 'https://hooks.slack.com/services/...'
            channel: '#cost-alerts'
```

## Multi-Cluster Cost Monitoring

### Federated Setup

```yaml
# Primary cluster
kubecostProductConfigs:
  clusterName: primary
  federatedCluster:
    primaryClusterID: primary
    enabled: true

# Secondary cluster
kubecostProductConfigs:
  clusterName: secondary
  federatedCluster:
    primaryClusterID: primary
    enabled: true
    primaryClusterURL: http://kubecost.primary.example.com
```

### Aggregate View

Access the primary cluster dashboard to see costs across all clusters.

## Cost Governance Policies

### Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cost-quota
  namespace: development
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    persistentvolumeclaims: "10"
```

### Limit Ranges

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: development
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      type: Container
```

### OPA/Gatekeeper Policies

```yaml
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
    requireRequests: true
    requireLimits: true
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
