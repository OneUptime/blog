# How to Use Atlas Auto-Scaling to Reduce Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Auto-Scaling, Cost Optimization, Cloud

Description: Learn how to configure MongoDB Atlas Auto-Scaling to automatically adjust cluster tier and storage based on demand, reducing costs during low-usage periods.

---

## What Is Atlas Auto-Scaling

Atlas Auto-Scaling automatically scales your cluster tier (CPU/memory) and storage capacity based on actual usage. It scales up during peaks and down during off-hours, optimizing costs without manual intervention.

## Two Types of Auto-Scaling

1. **Cluster Tier Auto-Scaling** - scales the instance type (e.g., M20 to M40)
2. **Storage Auto-Scaling** - increases disk size as data grows

## Enabling Cluster Tier Auto-Scaling

Via Atlas UI:
1. Click "..." on your cluster
2. Select "Edit Configuration"
3. Expand "Cluster Tier" section
4. Enable "Auto-Scale Cluster Tier"

Via Atlas API:

```bash
curl -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  --digest -u "{publicKey}:{privateKey}" \
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

## Setting Min and Max Bounds

Always set bounds to control costs and prevent runaway scaling:

```json
{
  "compute": {
    "enabled": true,
    "scaleDownEnabled": true,
    "minInstanceSize": "M20",
    "maxInstanceSize": "M60"
  }
}
```

`minInstanceSize` prevents over-scaling down (which would hurt performance). `maxInstanceSize` prevents over-scaling up (which would blow the budget).

## Enabling Storage Auto-Scaling

```json
{
  "autoScaling": {
    "diskGBEnabled": true
  },
  "diskSizeGB": 10
}
```

Atlas automatically increases disk when utilization exceeds 90%. Storage does not scale down automatically.

## Scaling Triggers

Atlas scales up compute when:
- Average CPU utilization exceeds 75% for 1 hour
- Memory pressure is consistently high

Atlas scales down compute when:
- Average CPU utilization stays below 50% for 24 hours

## Monitoring Scaling Events

```bash
curl -X GET \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/events?eventTypeName=AUTO_SCALING_INITIATED" \
  --digest -u "{publicKey}:{privateKey}"
```

## Cost Optimization Tips

1. Set `minInstanceSize` to your base traffic tier, not your peak tier
2. Use `scaleDownEnabled: true` to reclaim cost after traffic drops
3. Combine with Atlas Online Archive to reduce storage growth
4. Review the "Cluster Metrics" in Atlas to confirm scale-down is occurring
5. Set billing alerts to catch unexpected scaling events

## Checking Current Tier

```bash
curl -X GET \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  --digest -u "{publicKey}:{privateKey}" | jq '.providerSettings.instanceSizeName'
```

## Summary

Atlas Auto-Scaling adjusts cluster tier and storage based on usage metrics, reducing costs during quiet periods while handling traffic spikes automatically. Set appropriate min/max bounds to control your budget. Enable scale-down to recover costs after peaks. Monitor scaling events in the Atlas event log to understand your cost patterns.
