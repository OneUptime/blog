# How to Configure Auto-Scaling in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Auto-Scaling, Performance, Cost Optimization

Description: Configure MongoDB Atlas auto-scaling to automatically adjust cluster tier and storage capacity based on workload demands, balancing performance and cost.

---

## What Is Atlas Auto-Scaling?

Atlas Auto-Scaling monitors your cluster metrics and automatically scales cluster tier (compute) and storage up or down based on configured thresholds. This prevents over-provisioning during quiet periods and avoids performance bottlenecks during traffic spikes.

Two types of auto-scaling:
- **Cluster Tier Scaling**: Scales compute (RAM, CPU) by changing cluster tier
- **Storage Scaling**: Increases disk size automatically when storage approaches capacity

## Cluster Tier Auto-Scaling

### How It Works

Atlas monitors CPU utilization and memory usage over a time window. When metrics exceed the scale-up threshold, Atlas moves the cluster to the next tier. When metrics fall below the scale-down threshold for a sustained period, Atlas downgrades to a smaller tier.

Scale-up is fast (typically under 5 minutes). Scale-down is more conservative (requires sustained low usage).

### Step 1: Enable Compute Auto-Scaling

In Atlas UI, go to your cluster and click **Edit Configuration**:

1. Scroll to **Cluster Tier**
2. Toggle **Compute Auto-Scaling** to ON
3. Set the minimum and maximum cluster tiers

```bash
# Using Atlas CLI
atlas clusters update myCluster \
  --autoScalingComputeEnabled true \
  --autoScalingComputeScaleDownEnabled true \
  --autoScalingComputeMinInstanceSize M10 \
  --autoScalingComputeMaxInstanceSize M60
```

### Step 2: Configure Tier Bounds

Define the range Atlas can scale within:

```text
Minimum Tier: M10  ($0.09/hr)
Maximum Tier: M60  ($1.04/hr)
```

Atlas will not scale below M10 or above M60 regardless of workload.

### Step 3: Understand Scale-Up Triggers

Atlas scales up when CPU utilization exceeds **~75%** over a 1-hour window. You cannot configure the exact threshold - Atlas uses its own algorithm.

Monitor CPU in Atlas Metrics:

```bash
atlas metrics processes myCluster-shard-00-00.ab1cd.mongodb.net:27017 \
  --period P1D \
  --granularity PT5M \
  --type SYSTEM_CPU_USER
```

### Step 4: Configure Scale-Down Behavior

Scale-down is optional and disabled by default:

```bash
atlas clusters update myCluster \
  --autoScalingComputeScaleDownEnabled true
```

Atlas scales down only after CPU consistently stays below ~50% for several hours, preventing premature downscaling during temporary lulls.

## Storage Auto-Scaling

### Step 1: Enable Storage Scaling

Storage auto-scaling is simpler - Atlas increases disk size when usage exceeds 90%:

```bash
atlas clusters update myCluster \
  --autoScalingDiskGBEnabled true
```

In the UI, check **Auto-Expand Storage** under Storage settings.

### Step 2: Set Maximum Storage

```text
Maximum Storage: 4096 GB
```

Atlas will not grow storage beyond this limit.

### Storage Scaling Behavior

- Triggered when disk usage exceeds 90%
- Atlas increases storage by approximately 25%
- Scale-up completes without downtime
- Storage can only increase, never decrease automatically

## Using the Atlas Administration API

Enable both compute and storage auto-scaling via API:

```bash
curl --user "publicKey:privateKey" --digest \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  --header "Content-Type: application/json" \
  --data '{
    "autoScaling": {
      "compute": {
        "enabled": true,
        "scaleDownEnabled": true,
        "minInstanceSize": "M10",
        "maxInstanceSize": "M60"
      },
      "diskGB": {
        "enabled": true
      }
    }
  }'
```

## Setting Up Alerts for Scaling Events

Get notified when auto-scaling fires:

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/alertConfigs" \
  --header "Content-Type: application/json" \
  --data '{
    "eventTypeName": "AUTO_SCALING_INITIATED",
    "enabled": true,
    "notifications": [
      {
        "typeName": "EMAIL",
        "emailAddress": "ops@example.com",
        "intervalMin": 0,
        "delayMin": 0
      }
    ]
  }'
```

## Monitor Scaling History

View past scaling events:

```bash
atlas events projects list \
  --limit 20 \
  --type AUTO_SCALING_INITIATED
```

## Best Practices

Set realistic min and max tiers. Too-wide ranges can lead to unexpected costs if workloads spike:

```text
Development: M10 to M20
Production (typical): M30 to M80
High-traffic production: M40 to M200
```

Enable scale-down only if your workload is predictable. Avoid it for workloads with sudden, frequent spikes where scale-down then scale-up cycles would cause unnecessary disruption.

## Summary

Atlas auto-scaling adjusts cluster tier based on CPU/memory usage and expands storage when disks fill up. Enable compute auto-scaling with min/max tier bounds via the UI, CLI, or API, and optionally enable scale-down for variable workloads. Storage auto-scaling is simpler and recommended for all production clusters. Set up alerts to track scaling events and review history to optimize your tier bounds over time.
