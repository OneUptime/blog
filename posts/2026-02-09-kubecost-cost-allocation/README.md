# How to Use Kubecost for Cluster Cost Allocation and Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubecost, Cost Management, FinOps, Resource Analysis, Multi-Tenancy

Description: Deploy Kubecost to gain visibility into Kubernetes costs, implement showback and chargeback, and identify optimization opportunities across namespaces and teams.

---

Kubecost provides comprehensive cost visibility for Kubernetes clusters. It breaks down spending by namespace, deployment, service, and label, enabling accurate cost allocation and optimization. This visibility is essential for FinOps practices and multi-tenant cost accountability.

## Installing Kubecost

Deploy Kubecost using Helm:

```bash
helm repo add kubecost https://kubecost.github.io/kubecost/
helm repo update

helm install kubecost kubecost/kubecost \
  --namespace kubecost \
  --create-namespace \
  --set global.clusterId="production-cluster"
```

For enterprise use, add your product key through the Kubecost Helm values. The free installation does not require a key.

Verify installation:

```bash
kubectl get pods -n kubecost
kubectl port-forward deployment/kubecost-cost-analyzer -n kubecost 9090:9090
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
      "aws": [
        {
          "athenaBucketName": "s3://aws-athena-query-results-my-account",
          "athenaRegion": "us-east-1",
          "athenaDatabase": "athenacurcfn_my_cur",
          "athenaTable": "my_cur",
          "athenaWorkgroup": "primary",
          "projectID": "123456789012"
        }
      ]
    }
```

This connects Kubecost to your AWS Cost and Usage Report via Athena. Kubecost queries actual billing data rather than estimating from list prices.

For GCP:

```yaml
stringData:
  cloud-integration.json: |
    {
      "gcp": [
        {
          "projectID": "my-project",
          "billingDataDataset": "billing_export.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX"
        }
      ]
    }
```

For Azure:

```yaml
stringData:
  cloud-integration.json: |
    {
      "azure": {
        "storage": [
          {
            "subscriptionID": "subscription-id",
            "account": "storage-account",
            "container": "cost-exports",
            "path": "",
            "cloud": "public",
            "authorizer": {
              "authorizerType": "AzureDefaultCredential"
            }
          }
        ]
      }
    }
```

Update the Kubecost installation to use the secret:

```bash
helm upgrade kubecost kubecost/kubecost \
  --namespace kubecost \
  --set cloudCost.cloudIntegrationSecret=kubecost-cloud-integration
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

**Abandoned Workloads**: Workloads with little or no network traffic over a configurable window.

**Underutilized Resources**: Pods with low CPU/memory utilization relative to requests.

**Overprovisioned Nodes**: Nodes with low allocation percentages.

**Unattached Volumes**: PVCs not mounted to any pod.

**Idle Load Balancers**: LoadBalancer services with no traffic.

Review these weekly to find quick wins:

```bash
# Get abandoned resources via API
curl http://localhost:9090/model/savings/abandonedWorkloads -G
```

Abandoned workloads can reveal quick savings opportunities, especially in clusters with stale test or preview environments.

## Right-Sizing Recommendations

Kubecost provides container-level right-sizing recommendations:

```bash
curl http://localhost:9090/model/savings/requestSizingV2 \
  -d window=7d \
  -d targetCPUUtilization=0.8 \
  -d targetRAMUtilization=0.8 \
  -G
```

This returns recommended CPU and memory requests based on observed usage with 80% target utilization. To use percentile-based recommendations, set the CPU and RAM algorithms and quantiles, for example `algorithmCPU=quantileOfMaxes`, `algorithmRAM=quantileOfMaxes`, `qCPU=0.95`, and `qRAM=0.95`.

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

```bash
# Share infrastructure namespace costs in an allocation query
curl http://localhost:9090/model/allocation \
  -d window=7d \
  -d aggregate=namespace \
  -d accumulate=true \
  -d shareNamespaces=kube-system,istio-system,monitoring \
  -d shareLabels=app:infrastructure \
  -G
```

Kubecost distributes shared costs across non-idle, unshared allocations. By default, the split is weighted proportionally by allocation cost; use `shareSplit=even` when you want an equal split.

## Cloud Costs Integration

Track non-Kubernetes cloud costs alongside cluster costs by enabling cloud billing integration and querying Cloud Costs:

```bash
curl http://localhost:9090/model/cloudCost \
  -d window=7d \
  -d aggregate=service \
  -d accumulate=true \
  -G
```

This surfaces RDS, S3, and other cloud service costs from your cloud bill, providing broader infrastructure visibility.

## Budget Alerts

Configure budget alerts for proactive cost management:

```yaml
notifications:
  alertConfigs:
    frontendUrl: http://localhost:9090
    globalAlertEmails:
      - ops-team@example.com
    alerts:
      - type: budget
        threshold: 10000
        window: 7d
        aggregation: namespace
        filter: production
      - type: efficiency
        efficiencyThreshold: 0.5
        spendThreshold: 100
        window: 7d
        aggregation: cluster
        ownerContact:
          - platform-team@example.com
```

The budget alert triggers when production namespace costs exceed $10,000 over seven days. The efficiency alert fires when cluster efficiency drops below 50% for clusters that spent more than $100 during the window.

## Multi-Cluster Visibility

For enterprise Kubecost, aggregate costs across multiple clusters:

For Kubecost 3.x, Aggregator is enabled by default and multi-cluster visibility uses Federated ETL. Configure every cluster to push ETL data to the shared object store, then install or upgrade the primary with the federated storage secret:

```bash
helm upgrade --install kubecost \
  --repo https://kubecost.github.io/kubecost/ kubecost \
  --namespace kubecost \
  --set global.clusterId=management \
  --set global.federatedStorage.existingSecret=federated-store
```

The primary reads data from the federated store, providing unified cost visibility.

## API Integration for Automation

Integrate Kubecost data into existing tools:

```python
import requests
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
for allocation_set in costs['data']:
    for namespace, item in allocation_set.items():
        total_cost = item['totalCost']
        cpu_cost = item['cpuCost']
        ram_cost = item['ramCost']

        print(f"{namespace}: ${total_cost:.2f}")
        print(f"  CPU: ${cpu_cost:.2f}")
        print(f"  RAM: ${ram_cost:.2f}")
```

Export to spreadsheets, billing systems, or data warehouses for further analysis.

## Custom Cost Metrics

Export Kubecost data to Prometheus for custom alerting:

```promql
# Hourly CPU cost per node
node_cpu_hourly_cost

# Hourly persistent volume cost per GiB
pv_hourly_cost

# Pod-level network egress bytes
kubecost_pod_network_egress_bytes_total
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
    - alert: HighProductionEgress
      expr: sum(kubecost_pod_network_egress_bytes_total{namespace="production"}) > 10737418240
      annotations:
        summary: "Production namespace network egress exceeded 10 GiB"
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

Kubecost 2.x uses Prometheus for metrics collection. If you are running a 2.x deployment, ensure Prometheus scrapes node-exporter and kube-state-metrics. Kubecost 3.x uses the IBM FinOps agent and Aggregator architecture instead.

Inaccurate costs:

```bash
# Verify cloud integration
kubectl get secret -n kubecost kubecost-cloud-integration -o yaml

# Check pricing data
curl http://localhost:9090/model/pricing -G
```

Without cloud integration, Kubecost uses public on-demand pricing by default, which can differ significantly from actual billing for accounts with discounts, reservations, Savings Plans, Spot usage, or other negotiated rates.

Kubecost transforms Kubernetes cost management from reactive to proactive. The combination of granular cost visibility, optimization recommendations, and automated alerting enables teams to control cloud spending while maintaining performance and reliability.
