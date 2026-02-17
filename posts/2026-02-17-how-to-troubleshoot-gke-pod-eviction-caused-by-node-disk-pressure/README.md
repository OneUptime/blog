# How to Troubleshoot GKE Pod Eviction Caused by Node Disk Pressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Kubernetes, Troubleshooting, Disk Pressure, Pod Eviction, Node Management, GCP

Description: Step-by-step guide to diagnosing and resolving GKE pod evictions triggered by node disk pressure, including root cause analysis and prevention strategies.

---

Your pods were running fine, and then suddenly some of them got evicted. You check the events and see "The node was low on resource: ephemeral-storage." This is disk pressure eviction, and it happens more often than you would expect in GKE clusters, especially with workloads that write a lot of temporary data, pull large images, or generate verbose logs.

Let's figure out what is happening and how to fix it.

## How Disk Pressure Eviction Works

The kubelet on each GKE node monitors disk usage. When available disk drops below certain thresholds, the node enters a "DiskPressure" condition and the kubelet starts evicting pods to free space. The default thresholds in GKE are:

- **Soft eviction threshold**: 85% disk usage (with a grace period)
- **Hard eviction threshold**: 90% disk usage (immediate eviction)

When eviction kicks in, the kubelet selects pods based on their priority, whether they exceed their ephemeral storage requests, and how much disk they are consuming. The evicted pods get rescheduled on other nodes - which might also be low on disk, causing a cascade.

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

```
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
du -sh /var/lib/docker/* 2>/dev/null | sort -hr | head -10
du -sh /var/lib/containerd/* 2>/dev/null | sort -hr | head -10

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
kubectl logs your-pod-name --tail=1 2>&1 | wc -c
```

Fix this at the application level by reducing log verbosity. Also configure log rotation in your container runtime. In GKE, you can set log max size and file count through a logging configuration:

```yaml
# Use a logging sidecar with log rotation instead of direct stdout
apiVersion: v1
kind: Pod
metadata:
  name: app-with-log-rotation
spec:
  containers:
  - name: app
    image: your-app:latest
    # Write logs to a shared volume instead of stdout
    volumeMounts:
    - name: log-volume
      mountPath: /var/log/app
  - name: log-rotator
    image: busybox
    # Sidecar that periodically cleans old logs
    command: ["/bin/sh", "-c"]
    args:
    - |
      while true; do
        find /var/log/app -name '*.log' -mtime +1 -delete
        sleep 3600
      done
    volumeMounts:
    - name: log-volume
      mountPath: /var/log/app
  volumes:
  - name: log-volume
    emptyDir:
      sizeLimit: 500Mi  # cap the emptyDir size
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

You cannot resize the boot disk of existing nodes. You need to create a new pool, migrate workloads, and delete the old pool. The default GKE boot disk is 100GB, which can be tight for clusters running many large container images.

## Step 7 - Enable Image Streaming

GKE supports image streaming, which lets containers start before the full image is downloaded. This reduces the amount of disk space consumed by image layers:

```bash
# Enable image streaming on a node pool
gcloud container node-pools create streaming-pool \
  --cluster your-cluster \
  --image-type COS_CONTAINERD \
  --enable-image-streaming \
  --zone us-central1-a
```

Image streaming is particularly helpful if you use large images (1GB+) and the image cache is filling up your node disk.

## Step 8 - Configure Garbage Collection

The kubelet garbage collects unused container images, but the default thresholds might not be aggressive enough. In GKE, you can tune this with kubelet configuration:

```bash
# Check current image garbage collection settings on a node
# SSH into the node first, then:
ps aux | grep kubelet | grep -o 'image-gc[^ ]*'
```

The default settings are:
- `imageGCHighThresholdPercent`: 85%
- `imageGCLowThresholdPercent`: 80%

If you need more aggressive cleanup, you can set up a CronJob that prunes unused images:

```yaml
# CronJob that runs crictl to clean up unused images on each node
apiVersion: batch/v1
kind: CronJob
metadata:
  name: image-cleanup
spec:
  schedule: "0 */6 * * *"  # every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          hostPID: true
          nodeSelector:
            cloud.google.com/gke-nodepool: default-pool
          containers:
          - name: cleanup
            image: google/cloud-sdk:slim
            command: ["/bin/sh", "-c"]
            args:
            - "crictl rmi --prune"
            securityContext:
              privileged: true
          restartPolicy: OnFailure
```

## Monitoring and Alerting

Set up monitoring to catch disk pressure before it causes evictions. Create a Cloud Monitoring alert on the `kubernetes.io/node/ephemeral_storage/used_bytes` metric:

```bash
# Create an alerting policy for high node disk usage
gcloud alpha monitoring policies create \
  --display-name="GKE Node Disk Pressure Warning" \
  --condition-display-name="Node disk usage above 80%" \
  --condition-filter='metric.type="kubernetes.io/node/ephemeral_storage/used_bytes"' \
  --condition-threshold-value=0.8 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="CHANNEL_ID"
```

## Summary

Disk pressure evictions in GKE come down to something consuming more disk than expected. The fix depends on the root cause - application logs, missing ephemeral storage limits, large images, or simply undersized node disks. Set ephemeral storage limits on all your pods, keep your images lean, manage log rotation, and monitor disk usage proactively. That combination will prevent most disk pressure issues before they start.
