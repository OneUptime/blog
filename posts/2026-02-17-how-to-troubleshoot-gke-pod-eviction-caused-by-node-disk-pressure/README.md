# How to Troubleshoot GKE Pod Eviction Caused by Node Disk Pressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Kubernetes, Troubleshooting, Disk Pressure, Pod Eviction, Node Management, GCP

Description: Step-by-step guide to diagnosing and resolving GKE pod evictions triggered by node disk pressure, including root cause analysis and prevention strategies.

---

Your pods were running fine, and then suddenly some of them got evicted. You check the events and see "The node was low on resource: ephemeral-storage." This is disk pressure eviction, and it happens more often than you would expect in GKE clusters, especially with workloads that write a lot of temporary data, pull large images, or generate verbose logs.

Let's figure out what is happening and how to fix it.

## How Disk Pressure Eviction Works

The kubelet on each GKE node monitors disk usage. When available disk drops below certain thresholds, the node enters a "DiskPressure" condition and the kubelet starts reclaiming node resources. If that is not enough, it starts evicting pods to free space. The default hard eviction thresholds include:

- **Node filesystem threshold**: `nodefs.available<10%`
- **Image filesystem threshold**: `imagefs.available<15%`

When eviction kicks in, the kubelet selects pods based on whether they exceed their ephemeral storage requests, their priority, and how much disk they are consuming relative to requests. If the evicted pods are managed by a Deployment, StatefulSet, or another controller, replacement pods get created and scheduled on nodes that might also be low on disk, causing a cascade.

## Step 1 - Confirm Disk Pressure

Check if any nodes are reporting the DiskPressure condition:

```bash
# Check all nodes for DiskPressure condition

kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
DISK_PRESSURE:.status.conditions[?@.type=='DiskPressure'].status
```

For a detailed look at a specific node:

```bash
# Get full condition details for a node with disk pressure
kubectl describe node gke-your-cluster-default-pool-abc123
```

Look for the Conditions section:

```text
Conditions:
  Type             Status  Reason
  ----             ------  ------
  DiskPressure     True    KubeletHasDiskPressure
```

## Step 2 - Find Out What Is Eating the Disk

SSH into the affected node to investigate:

```bash
# SSH into the GKE node
gcloud compute ssh gke-your-cluster-default-pool-abc123 \
  --zone us-central1-a
```

Once on the node, check disk usage:

```bash
# Check overall disk utilization on the node
df -h

# Find the biggest directories consuming disk space
du -sh /var/lib/containerd/* 2>/dev/null | sort -hr | head -10
du -sh /var/lib/docker/* 2>/dev/null | sort -hr | head -10  # legacy Docker-based nodes

# Check container logs size
du -sh /var/log/containers/* | sort -hr | head -10
```

The usual suspects are:

1. **Container images** - Large or numerous images in the local cache
2. **Container logs** - Applications writing massive amounts to stdout/stderr
3. **Ephemeral storage** - Pods writing temporary files to their writable layer or emptyDir volumes
4. **Unused images** - Old image layers that have not been garbage collected

## Step 3 - Check Pod Ephemeral Storage Usage

Back on your workstation, check which pods are using the most ephemeral storage:

```bash
# Get ephemeral storage usage stats from the kubelet
kubectl get --raw "/api/v1/nodes/NODE_NAME/proxy/stats/summary" | \
  python3 -m json.tool | grep -A 10 "ephemeral-storage"
```

You can also check if pods have ephemeral storage requests set:

```bash
# List pods with their ephemeral storage requests
kubectl get pods -n your-namespace -o custom-columns=\
NAME:.metadata.name,\
EPHEMERAL_REQ:.spec.containers[*].resources.requests.ephemeral-storage,\
EPHEMERAL_LIM:.spec.containers[*].resources.limits.ephemeral-storage
```

Pods without ephemeral storage limits are the most likely culprits. They can write as much as they want until the node runs out of disk.

## Step 4 - Set Ephemeral Storage Limits

Add ephemeral storage requests and limits to your pods. This way, the kubelet can track usage per pod and evict the right ones:

```yaml
# Set ephemeral storage limits so the kubelet can manage disk fairly
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            ephemeral-storage: "1Gi"  # scheduler accounts for this
          limits:
            ephemeral-storage: "2Gi"  # pod gets evicted if it exceeds this
```

Setting limits gives the kubelet granular control. Without limits, eviction decisions become less predictable.

## Step 5 - Fix Container Log Bloat

One of the most common causes of disk pressure in GKE is container log volume. Applications that log every request at debug level can fill up a node disk in hours.

Check log sizes for the heaviest offenders:

```bash
# Find containers producing the most log data
du -sh /var/log/pods/*/*/*.log 2>/dev/null | sort -hr | head -20
```

Fix this at the application level by reducing log verbosity. Also configure log rotation in your container runtime. In GKE, you can set log max size and file count through a logging configuration:

```yaml
# node-system-config.yaml
kubeletConfig:
  containerLogMaxSize: "50Mi"
  containerLogMaxFiles: 5
```

Apply the configuration to a Standard node pool:

```bash
gcloud container node-pools update default-pool \
  --cluster your-cluster \
  --location us-central1-a \
  --system-config-from-file=node-system-config.yaml
```

## Step 6 - Increase Node Disk Size

If your workloads legitimately need more disk space, increase the boot disk size of your node pool:

```bash
# Create a new node pool with a larger boot disk
gcloud container node-pools create large-disk-pool \
  --cluster your-cluster \
  --disk-size 200 \
  --disk-type pd-ssd \
  --machine-type e2-standard-4 \
  --num-nodes 3 \
  --zone us-central1-a
```

You can also update the disk size of a node pool, but GKE applies the new machine attributes by updating or recreating the nodes. Creating a new pool, migrating workloads, and deleting the old pool gives you more control over that disruption. The default GKE boot disk is 100GB, which can be tight for clusters running many large container images.

## Step 7 - Enable Image Streaming

GKE supports image streaming, which lets containers start before the full image is downloaded:

```bash
# Enable image streaming on a node pool
gcloud container node-pools create streaming-pool \
  --cluster your-cluster \
  --image-type COS_CONTAINERD \
  --enable-image-streaming \
  --zone us-central1-a
```

Image streaming is particularly helpful if you use large images (1GB+) and image pull time is slowing down startup. It is not a replacement for image garbage collection, because GKE still downloads and caches the full image on local disk in the background.

## Step 8 - Configure Garbage Collection

The kubelet garbage collects unused container images, but the default thresholds might not be aggressive enough. In GKE, you can tune this with kubelet configuration:

```bash
# Check custom image garbage collection settings on a node pool
gcloud container node-pools describe default-pool \
  --cluster your-cluster \
  --location us-central1-a
```

The default settings are:
- `imageGCHighThresholdPercent`: 85%
- `imageGCLowThresholdPercent`: 80%

If you need more aggressive cleanup, configure image garbage collection on the node pool:

```yaml
# node-system-config.yaml
kubeletConfig:
  imageGCHighThresholdPercent: 80
  imageGCLowThresholdPercent: 70
```

Apply it to the node pool:

```bash
gcloud container node-pools update default-pool \
  --cluster your-cluster \
  --location us-central1-a \
  --system-config-from-file=node-system-config.yaml
```

## Monitoring and Alerting

Set up monitoring to catch disk pressure before it causes evictions. Create a Cloud Monitoring alert on the `kubernetes.io/node/ephemeral_storage/used_bytes` metric. This metric is measured in bytes, so set a byte threshold that matches your node size:

```bash
# Create an alerting policy for high node ephemeral storage usage
gcloud alpha monitoring policies create \
  --display-name="GKE Node Disk Pressure Warning" \
  --condition-display-name="Node ephemeral storage above 80GB" \
  --condition-filter='resource.type="k8s_node" AND metric.type="kubernetes.io/node/ephemeral_storage/used_bytes"' \
  --if='> 80000000000' \
  --duration=300s \
  --notification-channels="CHANNEL_ID"
```

## Summary

Disk pressure evictions in GKE come down to something consuming more disk than expected. The fix depends on the root cause - application logs, missing ephemeral storage limits, large images, or simply undersized node disks. Set ephemeral storage limits on all your pods, keep your images lean, manage log rotation, and monitor disk usage proactively. That combination will prevent most disk pressure issues before they start.
