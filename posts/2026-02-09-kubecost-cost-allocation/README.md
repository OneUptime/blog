# How to Use Kubecost for Cluster Cost Allocation and Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubecost, Cost Management, FinOps, Resource Analysis, Multi-tenancy

Description: Deploy Kubecost to gain visibility into Kubernetes costs, implement showback and chargeback, and identify optimization opportunities across namespaces and teams.

---

Kubecost provides comprehensive cost visibility for Kubernetes clusters. It breaks down spending by namespace, deployment, service, and label, enabling accurate cost allocation and optimization. This visibility is essential for FinOps practices and multi-tenant cost accountability.

## Installing Kubecost

Deploy Kubecost using Helm:

```bash
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm repo update

helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set kubecostToken="your-token-here"
```

For free tier use, omit the token. The token unlocks enterprise features like multi-cluster visibility and custom alerts.

Verify installation:

```bash
kubectl get pods -n kubecost
kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090
```

Access the dashboard at http://localhost:9090.

## Configuring Cloud Provider Pricing

Kubecost needs cloud provider pricing data for accurate costs. Configure AWS billing integration:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kubecost-cloud-integration
  namespace: kubecost
stringData:
  cloud-integration.json: |
    {
      "aws": {
        "athena": {
          "bucketName": "my-cur-bucket",
          "region": "us-east-1",
          "database": "athenacurcfn_my_cur",
          "table": "my_cur",
          "projectID": "production-cluster"
        }
      }
    }
```

This connects Kubecost to your AWS Cost and Usage Report via Athena. Kubecost queries actual billing data rather than estimating from list prices.

For GCP:

```yaml
stringData:
  cloud-integration.json: |
    {
      "gcp": {
        "bigQuery": {
          "projectID": "my-project",
          "datasetName": "billing_export",
          "tableName": "gcp_billing_export_v1"
        }
      }
    }
```

For Azure:

```yaml
stringData:
  cloud-integration.json: |
    {
      "azure": {
        "subscriptionID": "subscription-id",
        "clientID": "client-id",
        "clientSecret": "client-secret",
        "tenantID": "tenant-id"
      }
    }
```

Update the Kubecost installation to use the secret:

```bash
helm upgrade kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --set kubecostProductConfigs.cloudIntegrationSecret=kubecost-cloud-integration
```

## Understanding Cost Allocation

Kubecost allocates costs across multiple dimensions:

**Namespace**: Total costs per namespace, useful for team-based chargeback.

**Deployment/StatefulSet**: Costs per workload, identifying expensive applications.

**Service**: Costs associated with Kubernetes services.

**Label**: Custom cost allocation using pod labels like cost-center or project.

**Controller**: Costs by controller type (Deployment, DaemonSet, Job).

View costs in the Allocations dashboard. Filter by time range, namespace, or custom labels to drill into specific cost drivers.

## Implementing Team-Based Chargeback

Label workloads with cost center information:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: backend
  labels:
    team: backend-team
    cost-center: CC-1234
    environment: production
spec:
  template:
    metadata:
      labels:
        team: backend-team
        cost-center: CC-1234
        environment: production
    spec:
      containers:
      - name: api
        image: user-service:v1
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
```

Query costs by team in Kubecost:

```bash
# Via API
curl http://localhost:9090/model/allocation \
  -d window=7d \
  -d aggregate=label:team \
  -G
```

Export monthly cost reports for chargeback:

```bash
curl "http://localhost:9090/model/allocation?window=month&aggregate=label:cost-center&accumulate=true" \
  -o monthly-costs.json
```

Process this data in your billing system to charge teams for their Kubernetes usage.

## Identifying Cost Savings Opportunities

Kubecost highlights optimization opportunities automatically. The Savings dashboard shows:

**Abandoned Workloads**: Deployments with zero pod replicas still consuming resources through PVCs or LoadBalancers.

**Underutilized Resources**: Pods with low CPU/memory utilization relative to requests.

**Overprovisioned Nodes**: Nodes with low allocation percentages.

**Unattached Volumes**: PVCs not mounted to any pod.

**Idle Load Balancers**: LoadBalancer services with no traffic.

Review these weekly to find quick wins:

```bash
# Get abandoned resources via API
curl http://localhost:9090/model/savings/abandonment -G
```

Many organizations find 20-30% waste in abandoned resources alone.

## Right-Sizing Recommendations

Kubecost provides container-level right-sizing recommendations:

```bash
curl http://localhost:9090/model/savings/requestSizing \
  -d window=7d \
  -d targetUtilization=0.8 \
  -G
```

This returns recommended CPU and memory requests based on actual P95 usage with 80% target utilization.

Apply recommendations gradually:

```yaml
# Current configuration
resources:
  requests:
    cpu: "1000m"
    memory: "2Gi"

# Kubecost recommendation
resources:
  requests:
    cpu: "400m"     # 60% reduction
    memory: "800Mi"  # 60% reduction
```

Test in staging first, monitoring performance metrics before production rollout.

## Shared Cost Allocation

Allocate shared cluster costs (system pods, node overhead) proportionally:

```yaml
# Configure shared cost allocation
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-shared-costs
  namespace: kubecost
data:
  sharedNamespaces: "kube-system,istio-system,monitoring"
  sharedLabelSelector: "app.kubernetes.io/component=infrastructure"
```

Kubecost distributes shared costs across tenant namespaces based on their resource consumption percentage. This ensures fair allocation of overhead.

## External Costs Integration

Track non-Kubernetes costs alongside cluster costs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: external-costs
  namespace: kubecost
data:
  external-costs.json: |
    [
      {
        "zone": "us-east-1",
        "account": "prod",
        "name": "rds-production",
        "cost": 1250.50,
        "resourceType": "database"
      },
      {
        "zone": "us-east-1",
        "account": "prod",
        "name": "s3-data-storage",
        "cost": 850.25,
        "resourceType": "storage"
      }
    ]
```

This surfaces RDS, S3, and other cloud service costs in the same dashboard as Kubernetes costs, providing complete infrastructure visibility.

## Budget Alerts

Configure budget alerts for proactive cost management:

```yaml
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
          "threshold": 10000,
          "window": "month",
          "filter": {
            "namespace": "production"
          },
          "ownerContact": ["ops-team@example.com"]
        },
        {
          "type": "efficiency",
          "threshold": 0.5,
          "window": "week",
          "filter": {
            "cluster": "*"
          },
          "ownerContact": ["platform-team@example.com"]
        }
      ]
    }
```

The budget alert triggers when monthly production namespace costs exceed $10,000. The efficiency alert fires when cluster efficiency drops below 50%.

## Multi-Cluster Visibility

For enterprise Kubecost, aggregate costs across multiple clusters:

```bash
# Install Kubecost primary in a management cluster
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --set kubecostAggregator.enabled=true \
  --set kubecostToken="your-token"

# Install agents in workload clusters
helm install kubecost-agent kubecost/cost-analyzer \
  --namespace kubecost \
  --set kubecostAggregator.enabled=false \
  --set federatedStorageConfigSecret=kubecost-federated-storage
```

The primary aggregates data from all agents, providing unified cost visibility.

## API Integration for Automation

Integrate Kubecost data into existing tools:

```python
import requests
import json

# Fetch namespace costs
response = requests.get(
    'http://kubecost:9090/model/allocation',
    params={
        'window': '7d',
        'aggregate': 'namespace',
        'accumulate': 'true'
    }
)

costs = response.json()

# Process costs
for item in costs['data']:
    namespace = item['name']
    total_cost = item['totalCost']
    cpu_cost = item['cpuCost']
    memory_cost = item['memoryCost']

    print(f"{namespace}: ${total_cost:.2f}")
    print(f"  CPU: ${cpu_cost:.2f}")
    print(f"  Memory: ${memory_cost:.2f}")
```

Export to spreadsheets, billing systems, or data warehouses for further analysis.

## Custom Cost Metrics

Export Kubecost data to Prometheus for custom alerting:

```promql
# Namespace cost in dollars
kubecost_namespace_cost_total{namespace="production"}

# Cost per pod
kubecost_pod_cost_hourly

# Cluster efficiency percentage
kubecost_cluster_efficiency_ratio * 100
```

Create custom alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubecost-alerts
spec:
  groups:
  - name: cost-alerts
    rules:
    - alert: HighNamespaceCost
      expr: increase(kubecost_namespace_cost_total[1h]) > 100
      annotations:
        summary: "Namespace cost increased by $100+ in the last hour"
```

## Troubleshooting

Missing cost data:

```bash
# Check Kubecost pod logs
kubectl logs -n kubecost deployment/kubecost-cost-analyzer

# Verify Prometheus connectivity
kubectl exec -n kubecost deployment/kubecost-cost-analyzer -- \
  wget -O- http://prometheus-server:80/api/v1/query?query=up
```

Kubecost requires Prometheus for metrics collection. Ensure Prometheus scrapes node-exporter and kube-state-metrics.

Inaccurate costs:

```bash
# Verify cloud integration
kubectl get secret -n kubecost kubecost-cloud-integration -o yaml

# Check pricing data
curl http://localhost:9090/model/pricing -G
```

Without cloud integration, Kubecost uses list prices which can be 20-40% higher than actual negotiated rates.

Kubecost transforms Kubernetes cost management from reactive to proactive. The combination of granular cost visibility, optimization recommendations, and automated alerting enables teams to control cloud spending while maintaining performance and reliability.
