# How to Scale Filestore Instance Capacity Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, Scaling, NFS, Storage Management

Description: Learn how to increase and decrease Google Cloud Filestore instance capacity without disrupting connected clients, including automation strategies for dynamic scaling.

---

One of the best features of managed storage services is the ability to resize on the fly. Google Cloud Filestore supports capacity scaling without downtime for most tiers. You can grow your file share when you need more space and, in some cases, shrink it when you are overprovisioned. Connected NFS clients see the new capacity automatically without needing to remount.

In this post, I will cover how scaling works for each tier, walk through the commands, and share some strategies for automating capacity management.

## How Online Scaling Works

When you increase the capacity of a Filestore instance, the underlying storage infrastructure allocates additional space and makes it available to the NFS file share. This happens while the instance remains online and accessible. Connected clients do not need to unmount or remount - they see the new capacity the next time they check available space (typically within a few minutes).

For Zonal and Regional tiers, performance also scales with capacity. So increasing capacity from 2 TB to 5 TB not only gives you more space but also higher throughput and IOPS limits.

## Scaling Up - Increasing Capacity

Scaling up is supported on all tiers and is the most common operation.

### Basic HDD and Basic SSD

For Basic tiers, you can increase capacity in 1 GB increments:

```bash
# Scale up a Basic HDD instance from 1TB to 2TB
gcloud filestore instances update my-filestore \
  --zone=us-central1-a \
  --file-share=name=vol1,capacity=2TB
```

The operation is immediate and the instance stays online. Connected clients see the new capacity within a few minutes.

### Zonal, Regional, and Enterprise

The higher tiers also support online scaling:

```bash
# Scale up a Zonal instance from 1TB to 5TB
gcloud filestore instances update my-zonal-filestore \
  --zone=us-central1-a \
  --file-share=name=data,capacity=5TB
```

For these tiers, remember that throughput and IOPS scale with capacity. After scaling up, you automatically get higher performance limits.

## Verifying the New Capacity

After scaling, verify that the instance reflects the new size:

```bash
# Check the current capacity of the instance
gcloud filestore instances describe my-filestore \
  --zone=us-central1-a \
  --format="yaml(fileShares[0].name,fileShares[0].capacityGb)"
```

On connected clients, verify with:

```bash
# Check available space from a mounted client
df -h /mnt/filestore
```

If the client still shows the old capacity, wait a few minutes. The NFS client caches filesystem metadata and may need a short time to pick up the change.

## Scaling Down - Decreasing Capacity

Scaling down is more restrictive than scaling up. Not all tiers support it, and there are minimum capacity requirements.

**Basic HDD:** Supports scale-down. Minimum capacity is 1 TB.

**Basic SSD:** Supports scale-down. Minimum capacity is 2.5 TB.

**Zonal and Regional:** Supports scale-down with restrictions. You cannot scale below the amount of data currently stored on the instance.

**Enterprise:** Supports scale-down. Minimum capacity is 1 TB.

```bash
# Scale down a Basic HDD instance from 2TB to 1TB
gcloud filestore instances update my-filestore \
  --zone=us-central1-a \
  --file-share=name=vol1,capacity=1TB
```

Before scaling down, always check how much data is on the instance:

```bash
# Check current data usage from a mounted client
df -h /mnt/filestore
```

If you try to scale below the amount of data stored, the operation will fail. You need to delete files first to free up space.

## Automating Capacity Management

For workloads with variable storage needs, you can automate scaling using Cloud Monitoring alerts and Cloud Functions.

Here is the approach:

1. Set up a Cloud Monitoring alert that fires when the Filestore usage exceeds 80% capacity
2. The alert triggers a Cloud Function that increases capacity by a predefined amount
3. Optionally, set up a second alert for when usage drops below 30% to scale down

The monitoring alert uses the `file.googleapis.com/nfs/server/used_bytes_percent` metric:

```bash
# Create an alerting policy that triggers when usage exceeds 80%
gcloud alpha monitoring policies create \
  --display-name="Filestore High Usage" \
  --condition-display-name="Usage above 80%" \
  --condition-filter='resource.type="filestore.googleapis.com/Instance" AND metric.type="file.googleapis.com/nfs/server/used_bytes_percent"' \
  --condition-threshold-value=80 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=CHANNEL_ID
```

The Cloud Function that handles the scaling:

```python
# Cloud Function to scale up a Filestore instance
# Triggered by a Cloud Monitoring alert via Pub/Sub
import json
from google.cloud import filestore_v1

def scale_filestore(event, context):
    """Increases Filestore capacity by 25% when triggered."""
    client = filestore_v1.CloudFilestoreManagerClient()

    instance_name = 'projects/my-project/locations/us-central1-a/instances/my-filestore'

    # Get current instance details
    instance = client.get_instance(name=instance_name)
    current_capacity_gb = instance.file_shares[0].capacity_gb

    # Calculate new capacity (25% increase, rounded to nearest TB)
    new_capacity_gb = int(current_capacity_gb * 1.25)
    # Round up to nearest 256 GB for cleaner sizing
    new_capacity_gb = ((new_capacity_gb + 255) // 256) * 256

    print(f'Scaling from {current_capacity_gb}GB to {new_capacity_gb}GB')

    # Update the instance capacity
    instance.file_shares[0].capacity_gb = new_capacity_gb

    update_mask = {'paths': ['file_shares']}
    operation = client.update_instance(
        instance=instance,
        update_mask=update_mask,
    )

    result = operation.result()
    print(f'Scale operation completed: {result.file_shares[0].capacity_gb}GB')
```

## Scaling Considerations

### Performance Impact

Scaling operations do not cause downtime, but there can be a brief period of slightly reduced performance during the resize. For most workloads, this is not noticeable. If you are running a performance-sensitive workload, consider scheduling the resize during a low-traffic window.

### Cost Impact

Filestore pricing is based on provisioned capacity, not used capacity. When you scale up, you start paying for the new capacity immediately. When you scale down, the cost reduction is also immediate.

### Capacity Planning

Rather than scaling reactively, it is often better to plan capacity ahead of time. Look at your historical usage trends and estimate growth. If you know a big data load is coming (like a batch processing job that generates lots of files), scale up before the job starts.

```bash
# Check historical usage with Cloud Monitoring
gcloud monitoring time-series list \
  --filter='resource.type="filestore.googleapis.com/Instance" AND metric.type="file.googleapis.com/nfs/server/used_bytes_percent"' \
  --interval-start-time=$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

### Minimum Step Sizes

Each tier has minimum capacity increments for scaling:

- Basic HDD: 1 GB increments, minimum 1 TB
- Basic SSD: 1 GB increments, minimum 2.5 TB
- Zonal: 256 GB increments, minimum 1 TB
- Regional: 256 GB increments, minimum 1 TB
- Enterprise: 256 GB increments, minimum 1 TB

### The Client Side

When Filestore capacity changes, NFS clients automatically see the new capacity. However, some applications cache filesystem metadata and might not immediately reflect the change. If your application caches disk space information, you may need to restart it or clear the cache.

## Summary

Online scaling is one of the strongest operational features of Filestore. You can grow capacity without any disruption to connected clients, and the performance improvements that come with larger instances on higher tiers are automatic. Combine monitoring-based alerts with automated scaling functions and you have a storage layer that grows and shrinks with your workload without manual intervention.
