# How to Optimize MongoDB Atlas Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Cost Optimization, Performance, Storage

Description: Learn practical strategies to reduce MongoDB Atlas costs including cluster right-sizing, auto-scaling, compression, Online Archive, and eliminating waste.

---

## Why Atlas Costs Can Grow Unexpectedly

MongoDB Atlas costs scale with cluster tier, storage, backup retention, data transfer, and optional features. Teams often overpay in three areas: over-provisioned cluster tiers, storing all data on hot storage, and large backup snapshots from uncompressed data. Optimization usually yields 30-60% cost reduction without sacrificing performance.

## Step 1: Audit Your Current Atlas Costs

Use the Atlas UI or API to understand current spend breakdown:

```bash
# Get invoices via Admin API
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/orgs/{orgId}/invoices/pending" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('lineItems', []):
    print(f\"{item.get('sku', '')}: \${item.get('totalPriceCents', 0)/100:.2f}\")
"
```

Common cost categories:
- Cluster instance hours (largest portion)
- NVMe storage
- Backup storage
- Data transfer (egress)
- Atlas Search, App Services

## Step 2: Right-Size the Cluster Tier

Monitor actual CPU and RAM utilization to identify over-provisioned clusters:

```bash
# Check metrics via Atlas API
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/processes/{host}:{port}/measurements?granularity=PT1H&period=P7D&m=PROCESS_CPU_USER&m=SYSTEM_MEMORY_USED" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for measurement in data.get('measurements', []):
    values = [p['value'] for p in measurement.get('dataPoints', []) if p['value'] is not None]
    if values:
        avg = sum(values) / len(values)
        peak = max(values)
        print(f\"{measurement['name']}: avg={avg:.1f}, peak={peak:.1f}\")
"
```

If average CPU is consistently below 20% and peak is below 40%, downgrade one tier.

## Step 3: Enable Auto-Scaling to Match Demand

Instead of over-provisioning for peak load, enable auto-scaling:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  -H "Content-Type: application/json" \
  -d '{
    "autoScaling": {
      "compute": {
        "enabled": true,
        "scaleDownEnabled": true,
        "minInstanceSize": "M20",
        "maxInstanceSize": "M60"
      },
      "diskGBEnabled": true
    }
  }'
```

Auto-scaling ensures you only pay for the capacity you actually use.

## Step 4: Enable Compression to Reduce Storage Costs

Compression directly reduces storage costs (billed per GB). Enable zstd compression when creating collections for maximum storage reduction:

```javascript
// Set zstd compression on new collections
db.createCollection("events", {
  storageEngine: { wiredTiger: { configString: "block_compressor=zstd" } }
});
```

For existing collections, set zstd as the default compressor and run `compact` to rewrite data with the new compression:

```javascript
// Compact an existing collection to apply the server default compressor
db.runCommand({ compact: "events" });
```

## Step 5: Use Online Archive for Cold Data

Move data older than your hot access window to Online Archive:

```bash
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/onlineArchives" \
  -H "Content-Type: application/json" \
  -d '{
    "collName": "events",
    "dbName": "myapp",
    "criteria": {
      "type": "DATE",
      "dateField": "createdAt",
      "dateFormat": "ISODATE",
      "expireAfterDays": 90
    }
  }'
```

Online Archive storage costs roughly 1/10th the cost of cluster storage.

## Step 6: Optimize Backup Retention

Review backup retention policies and remove unnecessary retention tiers:

```bash
# Check current backup schedule
curl -u "PUBLIC_KEY:PRIVATE_KEY" --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/schedule"
```

Reduce retention where compliance allows:

```text
Original retention:
- Hourly: 2 days (keep)
- Daily:  30 days -> 7 days (reduce if RPO allows)
- Weekly: 8 weeks -> 4 weeks (reduce)
- Monthly: 12 months -> 3 months (reduce)

Estimated savings: 40-60% of backup storage costs
```

## Step 7: Eliminate Unused Resources

Identify and remove resources that are no longer needed:

```bash
# List all clusters and their tier
curl -u "PUBLIC_KEY:PRIVATE_KEY" --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data.get('results', []):
    print(f\"{c['name']}: {c.get('providerSettings', {}).get('instanceSizeName', 'N/A')} - paused: {c.get('paused', False)}\")
"
```

Pause or terminate development clusters not in use. Paused clusters stop compute billing while preserving data.

## Summary

Optimizing MongoDB Atlas costs starts with auditing the cost breakdown, right-sizing cluster tiers based on actual CPU and memory metrics, enabling auto-scaling to match variable demand, using zstd compression to reduce storage billing, moving cold data to Online Archive at 1/10th the cost, reducing backup retention to match actual RPO requirements, and eliminating unused or paused clusters. Together these measures typically reduce Atlas bills by 30-60%.
