# How to Configure FinOps Practices with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, FinOps, Cost Optimization, Cloud, Kubernetes, Chargeback

Description: Implement FinOps practices with Rancher including cost allocation, chargeback/showback reporting, rightsizing automation, budget enforcement, and building a culture of cost awareness across...

## Introduction

FinOps (Financial Operations) for Kubernetes applies financial accountability principles to cloud infrastructure. In Rancher environments, FinOps means measuring where money is spent (cost allocation), attributing costs to responsible teams (chargeback/showback), optimizing spending (rightsizing), and creating incentives for cost-conscious engineering. This guide covers implementing the FinOps framework for Rancher multi-cluster deployments.

## FinOps Maturity Levels for Kubernetes

| Level | Capability |
|---|---|
| Crawl | Visibility: see costs per cluster |
| Walk | Allocation: costs per namespace/team + showback |
| Run | Optimization: automated rightsizing + quota-based guard rails |

## Step 1: Cost Allocation Labels

Consistent labels are the foundation of cost allocation:

```yaml
# Labeling standard - enforce via admission webhook

# Put allocation labels on the Pod template so workload costs can be attributed correctly:

spec:
  template:
    metadata:
      labels:
        team: "payments"              # Team responsible
        cost-center: "CC-1042"        # Finance cost center
        environment: "production"     # prod/staging/dev
        product: "checkout-service"   # Business product
        application: "api"            # Technical component

# LimitRange to set default requests when workloads omit them
apiVersion: v1
kind: LimitRange
metadata:
  name: cost-allocation-requirements
  namespace: payments-prod
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
```

## Step 2: Chargeback Reports with OpenCost

```python
# generate_chargeback_report.py

import requests
import pandas as pd
from datetime import datetime, timedelta

OPENCOST_URL = "http://opencost.opencost.svc:9003"

def get_team_costs(window: str = "lastmonth") -> pd.DataFrame:
    """Get costs aggregated by the team label."""
    resp = requests.get(
        f"{OPENCOST_URL}/allocation",
        params={
            "window": window,
            "aggregate": "label:team",
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    rows = []
    for team, allocation in (data.get("data") or [{}])[0].items():
        rows.append({
            "team": team,
            "cpu_cost": round(allocation.get("cpuCost", 0), 2),
            "memory_cost": round(allocation.get("ramCost", 0), 2),
            "storage_cost": round(allocation.get("pvCost", 0), 2),
            "network_cost": round(allocation.get("networkCost", 0), 2),
            "total_cost": round(allocation.get("totalCost", 0), 2),
            "avg_cpu_cores": round(allocation.get("cpuCoreUsageAverage", 0), 3),
            "avg_memory_gib": round(allocation.get("ramByteUsageAverage", 0) / (1024 ** 3), 2),
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return df
    return df.sort_values("total_cost", ascending=False)

# Generate the previous calendar month's chargeback report
df = get_team_costs("lastmonth")
print(df.to_string(index=False))

report_month = (datetime.now().replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
df.to_csv(f"chargeback-{report_month}.csv", index=False)
```

## Step 3: Budget Guard Rails

```yaml
# ResourceQuota as budget guard rail
# Translate a team's budget into conservative CPU and memory ceilings
# using your own provider's rates. ResourceQuota enforces resources, not dollars.

apiVersion: v1
kind: ResourceQuota
metadata:
  name: budget-500-monthly
  namespace: team-frontend
  annotations:
    monthly-budget-usd: "500"
    cost-center: "CC-2024"
spec:
  hard:
    requests.cpu: "16"        # Example conservative CPU reservation ceiling
    requests.memory: "32Gi"   # Example conservative memory reservation ceiling
```

```yaml
# Rancher Project-level resource quotas
# Configure via Rancher UI: Cluster > Projects > {Project} > Resource Quotas

# Or via Rancher API:
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  name: frontend-team
  namespace: c-m-abcde
spec:
  clusterName: c-m-abcde
  displayName: "Frontend Team"
  resourceQuota:
    limit:
      limitsCpu: "32"
      limitsMemory: "64Gi"
      requestsStorage: "500Gi"
```

## Step 4: Rightsizing Automation

```bash
#!/bin/bash
# rightsize_report.sh - Identify overprovisioned workloads
# Requires the autoscaling.k8s.io/v1 VPA CRD and recommender to be installed

echo "=== Rightsizing Report ==="
echo "Generated: $(date)"
echo ""

kubectl get namespaces -o name | while read ns; do
  NS=${ns#namespace/}
  # Skip system namespaces
  [[ "$NS" == kube-* || "$NS" == cattle-* || "$NS" == rancher-* ]] && continue

  # Get VPA recommendations
  vpas=$(kubectl get vpa -n "$NS" -o json 2>/dev/null) || continue

  echo "$vpas" | jq -r --arg ns "$NS" '
    .items[] |
    .metadata.name as $name |
    .status.recommendation.containerRecommendations[]? |
    "Namespace: \($ns) | Workload: \($name) | Container: \(.containerName) | Recommended CPU: \(.target.cpu) | Recommended Memory: \(.target.memory)"
  '
done
```

## Step 5: Spot/Preemptible Instances for Non-Prod

```yaml
# Machine pools reference provider-specific machine configs.
# For the non-prod EC2 machine config, enable Request Spot Instance
# and set the maximum hourly price.
apiVersion: provisioning.cattle.io/v1
kind: Cluster
spec:
  rkeConfig:
    machinePools:
      - name: prod-workers
        quantity: 5
        workerRole: true
        machineConfigRef:
          kind: Amazonec2Config
          name: prod-ondemand-workers

      - name: dev-spot-workers
        quantity: 10
        workerRole: true
        machineConfigRef:
          kind: Amazonec2Config
          name: dev-spot-workers
```

## Step 6: FinOps Dashboard

```yaml
# Grafana dashboard panels for FinOps visibility
panels:
  - title: "Monthly CPU + Memory Cost by Namespace"
    type: barchart
    targets:
      - expr: |
          sum by (namespace) (
            container_cpu_allocation * on (node) group_left() node_cpu_hourly_cost
            +
            container_memory_allocation_bytes * on (node) group_left() node_ram_hourly_cost / (1024 * 1024 * 1024)
          ) * 730

  - title: "CPU Request Utilization by Namespace"
    type: table
    # Shows actual CPU usage as a percentage of requested CPU
    targets:
      - expr: |
          (
            sum by (namespace) (rate(container_cpu_usage_seconds_total[1h]))
            /
            sum by (namespace) (kube_pod_container_resource_requests{resource="cpu"})
          ) * 100
        legendFormat: "CPU Request Utilization %"

  - title: "Approx. Idle Requested CPU Cores"
    type: stat
    targets:
      - expr: |
          clamp_min(
            sum(container_cpu_allocation)
            - sum(rate(container_cpu_usage_seconds_total[1h])),
            0
          )
```

## FinOps Maturity Checklist

- Labels: team, cost-center, environment on all resources
- OpenCost deployed with cloud provider pricing
- Monthly chargeback report delivered to finance
- Quota-based budget guard rails in place
- VPA recommendations reviewed and applied quarterly
- Spot instances for dev/test (target: 50% of non-prod on spot)
- Idle resources reviewed and cleaned up monthly
- FinOps review meeting with team leads monthly
- Cost metrics in namespace-level Grafana dashboards

## Conclusion

FinOps with Rancher transforms Kubernetes cost management from invisible to accountable. The key steps are consistent labeling for allocation, OpenCost for measurement, chargeback reports for team accountability, and quota-based guard rails with ResourceQuotas and Rancher project quotas. The biggest cultural shift is making teams see their own costs-once teams see that a forgotten development deployment costs $500/month, they clean it up. Monthly FinOps review meetings with cost data create the organizational feedback loop that drives continuous optimization.
