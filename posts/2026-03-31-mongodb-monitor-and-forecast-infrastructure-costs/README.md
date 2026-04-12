# How to Monitor and Forecast MongoDB Infrastructure Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Cost Optimization, Monitoring, Forecasting

Description: Learn how to monitor MongoDB Atlas infrastructure costs using the billing API, track usage trends, and forecast future spend to avoid budget surprises.

---

## Why Cost Monitoring Matters for MongoDB Deployments

MongoDB Atlas costs are usage-based and can grow unexpectedly as data volumes increase, teams add clusters, or features like Atlas Search are enabled. Regular cost monitoring and forecasting prevents budget overruns and identifies optimization opportunities before costs compound.

## Step 1: Query the Atlas Billing API

Retrieve current pending invoice and line items:

```bash
# Get pending invoice
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/orgs/{orgId}/invoices/pending" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
total_cents = data.get('amountBilledCents', 0)
print(f'Current month (pending): \${total_cents/100:.2f}')

# Group by SKU type
costs = {}
for item in data.get('lineItems', []):
    sku = item.get('sku', 'unknown')
    cents = item.get('totalPriceCents', 0)
    costs[sku] = costs.get(sku, 0) + cents

for sku, cents in sorted(costs.items(), key=lambda x: -x[1])[:10]:
    print(f'  {sku}: \${cents/100:.2f}')
"
```

## Step 2: Fetch Historical Invoices for Trend Analysis

Pull the last 6 months of invoices:

```python
import requests
from requests.auth import HTTPDigestAuth

API_BASE = "https://cloud.mongodb.com/api/atlas/v1.0"
ORG_ID = "your-org-id"
AUTH = HTTPDigestAuth("PUBLIC_KEY", "PRIVATE_KEY")

def get_invoices(org_id: str, limit: int = 6):
    resp = requests.get(
        f"{API_BASE}/orgs/{org_id}/invoices",
        auth=AUTH,
        params={"itemsPerPage": limit}
    )
    resp.raise_for_status()
    return resp.json().get("results", [])

invoices = get_invoices(ORG_ID)
print("Month           | Total Cost")
print("-" * 35)
for inv in invoices:
    period = inv.get("startDate", "")[:7]
    total = inv.get("amountBilledCents", 0) / 100
    print(f"{period:15s} | ${total:.2f}")
```

## Step 3: Break Down Costs by Cluster

Attribute costs to specific clusters:

```python
def get_cluster_costs(invoice_data: dict) -> dict:
    """Extract costs per cluster from an invoice."""
    cluster_costs = {}
    for item in invoice_data.get("lineItems", []):
        cluster = item.get("clusterName", "shared")
        cents = item.get("totalPriceCents", 0)
        cluster_costs[cluster] = cluster_costs.get(cluster, 0) + cents

    return {k: v/100 for k, v in sorted(cluster_costs.items(), key=lambda x: -x[1])}

resp = requests.get(
    f"{API_BASE}/orgs/{ORG_ID}/invoices/pending",
    auth=AUTH
)
cluster_breakdown = get_cluster_costs(resp.json())

for cluster, cost in cluster_breakdown.items():
    print(f"{cluster}: ${cost:.2f}")
```

## Step 4: Track Storage Growth Rate

Monitor storage growth to forecast when you will need to increase provisioned storage:

```javascript
// Run this monthly and store results
db.cost_metrics.insertOne({
  timestamp: new Date(),
  metric: "storage",
  data: db.getCollectionNames().map(coll => {
    const stats = db[coll].stats();
    return {
      collection: coll,
      storageSizeBytes: stats.storageSize,
      count: stats.count
    };
  })
});

// Calculate growth rate
const snapshots = db.cost_metrics.find(
  { metric: "storage" },
  { timestamp: 1, "data.storageSizeBytes": 1 }
).sort({ timestamp: -1 }).limit(3).toArray();

if (snapshots.length >= 2) {
  const latest = snapshots[0];
  const previous = snapshots[1];
  const daysDiff = (latest.timestamp - previous.timestamp) / (1000 * 86400);
  const totalLatest = latest.data.reduce((sum, c) => sum + c.storageSizeBytes, 0);
  const totalPrev = previous.data.reduce((sum, c) => sum + c.storageSizeBytes, 0);
  const growthPerDayGB = ((totalLatest - totalPrev) / daysDiff) / 1024**3;
  print(`Storage growth: ${growthPerDayGB.toFixed(3)} GB/day`);
}
```

## Step 5: Build a Cost Forecast

Project costs 3, 6, and 12 months out:

```python
def forecast_costs(monthly_cost: float, monthly_growth_rate: float, months: int) -> float:
    """
    Forecast future monthly cost given growth rate.
    monthly_growth_rate: e.g., 0.05 for 5% monthly growth
    """
    return monthly_cost * ((1 + monthly_growth_rate) ** months)

current_monthly = 1200.00
growth_rate = 0.08  # 8% monthly growth (data volume)

print("Cost Forecast:")
for months in [3, 6, 12]:
    forecasted = forecast_costs(current_monthly, growth_rate, months)
    print(f"  +{months} months: ${forecasted:.2f}/month")

# Annual total
annual_total = sum(
    forecast_costs(current_monthly, growth_rate, m) for m in range(1, 13)
)
print(f"  Annual total: ${annual_total:.2f}")
```

## Step 6: Set Budget Alerts

Configure Atlas billing alerts before costs exceed your budget:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/orgs/{orgId}/alertConfigs" \
  -H "Content-Type: application/json" \
  -d '{
    "eventTypeName": "PENDING_INVOICE_OVER_THRESHOLD",
    "enabled": true,
    "threshold": {
      "operator": "GREATER_THAN",
      "threshold": 1500,
      "units": "RAW"
    },
    "notifications": [{
      "typeName": "EMAIL",
      "emailEnabled": true,
      "emailAddress": "billing@example.com",
      "intervalMin": 1440,
      "delayMin": 0
    }]
  }'
```

## Step 7: Create a Cost Dashboard

Export key metrics to a spreadsheet or Grafana for visualization:

```python
import csv
import io

def export_monthly_costs_csv(invoices: list) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Month", "Cluster", "SKU", "Cost_USD"])

    for inv in invoices:
        month = inv.get("startDate", "")[:7]
        for item in inv.get("lineItems", []):
            writer.writerow([
                month,
                item.get("clusterName", "shared"),
                item.get("sku", "unknown"),
                item.get("totalPriceCents", 0) / 100
            ])

    return output.getvalue()
```

## Summary

Monitoring and forecasting MongoDB Atlas costs requires querying the billing API for pending invoices and historical data, breaking down costs by cluster and SKU type, tracking storage growth rates to project future usage, building cost forecasts using compound growth models, setting budget alert thresholds via Atlas alerting, and exporting data to dashboards for team visibility. Review costs monthly and after any significant workload changes.
