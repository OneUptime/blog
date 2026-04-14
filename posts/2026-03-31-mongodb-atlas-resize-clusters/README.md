# How to Resize Atlas Clusters Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Cluster, Scaling, Availability

Description: Scale MongoDB Atlas clusters up or down without downtime by understanding the rolling restart process and using the Atlas CLI and Admin API for automation.

---

## Overview

MongoDB Atlas performs cluster resizes as rolling operations across replica set members. One node is updated at a time while the others continue serving traffic, so a resize does not require application downtime. Understanding the process helps you plan resizes for low-traffic periods and avoid performance impact.

## How Atlas Resizes Work

Atlas uses a rolling restart for tier changes:

```text
1. A new node is provisioned at the target tier.
2. Data is synced to the new node via initial sync.
3. The old node is removed from the replica set.
4. This process repeats for each member (PRIMARY last).
5. Traffic is briefly transferred to secondaries during PRIMARY switchover.
```

Connections may experience a brief reconnect during the PRIMARY step (typically under 30 seconds). Ensure your application uses a driver with automatic reconnection enabled.

## Resizing via the Atlas CLI

```bash
# Scale up from M30 to M50
atlas clusters update my-cluster \
  --tier M50 \
  --projectId <PROJECT_ID>

# Watch the cluster status until it's IDLE
watch -n 10 "atlas clusters describe my-cluster --projectId <PROJECT_ID> | grep stateName"
```

## Resizing via the Admin API

```bash
PUBLIC_KEY="your-public-key"
PRIVATE_KEY="your-private-key"
PROJECT_ID="your-project-id"
CLUSTER_NAME="my-cluster"

curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Content-Type: application/json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/clusters/${CLUSTER_NAME}" \
  --data '{
    "providerSettings": {
      "providerName": "AWS",
      "regionName": "US_EAST_1",
      "instanceSizeName": "M50"
    }
  }'
```

## Scaling Storage Independently

Storage can be increased without changing the compute tier.

```bash
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Content-Type: application/json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/clusters/${CLUSTER_NAME}" \
  --data '{
    "diskSizeGB": 500
  }'
```

Note: Storage increases are performed in place with zero downtime. Storage decreases require Atlas to provision new volumes and sync data, which causes downtime on each node during the process.

## Enabling Auto-Scaling

Auto-scaling allows Atlas to resize compute and storage automatically based on utilization.

```bash
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Content-Type: application/json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/clusters/${CLUSTER_NAME}" \
  --data '{
    "autoScaling": {
      "compute": {
        "enabled": true,
        "scaleDownEnabled": true,
        "minInstanceSize": "M30",
        "maxInstanceSize": "M80"
      },
      "diskGB": {
        "enabled": true
      }
    }
  }'
```

## Watching Resize Progress

```bash
#!/usr/bin/env bash
# Poll until cluster is idle
while true; do
  STATE=$(atlas clusters describe ${CLUSTER_NAME} \
    --projectId ${PROJECT_ID} \
    --output json | jq -r '.stateName')
  echo "$(date): ${STATE}"
  if [ "${STATE}" = "IDLE" ]; then
    echo "Resize complete"
    break
  fi
  sleep 30
done
```

## Pre-Resize Checklist

Before resizing, verify the following:
- Your application driver is configured with `retryWrites: true` and `retryReads: true`.
- Connection pool settings are appropriate for the new tier's connection limits.
- Alert thresholds are adjusted if you expect higher utilization post-resize.

## Summary

Atlas cluster resizes are rolling operations that do not require downtime. Use the Atlas CLI or Admin API to change the instance tier or disk size, enable auto-scaling to handle variable workloads automatically, and ensure your application driver is configured for automatic reconnection to handle the brief PRIMARY switchover during the resize process.
