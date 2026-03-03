# How to Configure Image Garbage Collection in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Garbage Collection, Kubernetes, Disk Management, Node Maintenance

Description: Learn how to configure image garbage collection in Talos Linux to manage disk space and prevent node failures from full disks.

---

Container images accumulate on Kubernetes nodes over time. Every deployment update, every new version, every test image leaves layers cached on disk. Without garbage collection, nodes eventually run out of disk space, which causes all sorts of problems - pods get evicted, new pods cannot start, and nodes may become unresponsive. In Talos Linux, image garbage collection is handled by the kubelet, and you configure it through the machine configuration.

This guide explains how image garbage collection works in Talos Linux and how to tune it for your environment.

## How Image Garbage Collection Works

The kubelet periodically checks the disk usage of the image filesystem (where container images are stored). When disk usage exceeds a high threshold, the kubelet starts deleting unused images until usage drops below a low threshold.

An image is considered "unused" if no running container references it. The kubelet also respects a minimum age - images must be older than a certain duration before they are eligible for garbage collection.

The process works like this:
1. Kubelet checks disk usage periodically
2. If usage exceeds the high threshold, garbage collection triggers
3. Images are sorted by last used time (oldest first)
4. Images older than the minimum age and not in use are deleted
5. Deletion continues until usage drops below the low threshold

## Default Settings

Talos Linux uses Kubernetes defaults for image garbage collection:

- High threshold: 85% disk usage
- Low threshold: 80% disk usage
- Minimum image age: 2 minutes

These defaults work reasonably well for many environments, but you may need to adjust them based on your disk sizes and image usage patterns.

## Configuring Garbage Collection Thresholds

Configure image garbage collection through kubelet extra config:

```yaml
machine:
  kubelet:
    extraConfig:
      # Start collecting when disk is 85% full
      imageGCHighThresholdPercent: 85
      # Stop collecting when disk drops to 80%
      imageGCLowThresholdPercent: 80
      # Only collect images older than 2 minutes
      imageMinimumGCAge: "2m"
```

For nodes with smaller disks, you might want more aggressive collection:

```yaml
machine:
  kubelet:
    extraConfig:
      # More aggressive - start at 70%
      imageGCHighThresholdPercent: 70
      # Stop at 60%
      imageGCLowThresholdPercent: 60
      # Minimum age of 5 minutes
      imageMinimumGCAge: "5m"
```

For nodes with large disks or where you want to maximize cache hits, be less aggressive:

```yaml
machine:
  kubelet:
    extraConfig:
      # Less aggressive - start at 90%
      imageGCHighThresholdPercent: 90
      # Stop at 85%
      imageGCLowThresholdPercent: 85
      # Keep images for at least 30 minutes
      imageMinimumGCAge: "30m"
```

## Understanding the Threshold Behavior

The gap between the high and low thresholds determines how much space is freed in each garbage collection cycle. A larger gap means more images are deleted per cycle, which reduces the frequency of garbage collection runs but temporarily frees more space.

```yaml
# Large gap - aggressive cleanup when triggered
machine:
  kubelet:
    extraConfig:
      imageGCHighThresholdPercent: 85
      imageGCLowThresholdPercent: 60  # 25% gap

# Small gap - gentle cleanup, more frequent
machine:
  kubelet:
    extraConfig:
      imageGCHighThresholdPercent: 85
      imageGCLowThresholdPercent: 80  # 5% gap
```

On a node with 100GB of image storage:
- A 25% gap means about 25GB of images are freed per cycle
- A 5% gap means about 5GB of images are freed per cycle

## Container Garbage Collection

In addition to image garbage collection, the kubelet also cleans up dead containers. This is separate from image GC:

```yaml
machine:
  kubelet:
    extraConfig:
      # Maximum number of dead containers to retain per container
      maxPerPodContainerCount: 2
      # Maximum total number of dead containers to retain
      maxContainerCount: -1  # -1 means no limit
      # Minimum age of dead containers before cleanup
      minimumContainerTTLDuration: "1m"
```

Dead containers are containers that have exited (successfully or with an error). Keeping some around is useful for debugging - you can inspect their logs and exit codes. But too many wastes disk space.

## Eviction-Based Disk Management

The kubelet also has eviction settings that work alongside garbage collection. When disk pressure is critical, the kubelet evicts pods:

```yaml
machine:
  kubelet:
    extraArgs:
      # Hard eviction - immediate pod eviction
      eviction-hard: "imagefs.available<5%,nodefs.available<5%"
      # Soft eviction - graceful pod eviction
      eviction-soft: "imagefs.available<10%,nodefs.available<10%"
      eviction-soft-grace-period: "imagefs.available=2m,nodefs.available=2m"
```

The relationship between these settings is:
1. Image GC triggers first (at high threshold)
2. Soft eviction triggers next (when available space is low)
3. Hard eviction is the last resort (when space is critically low)

Configure them in order of increasing severity:

```yaml
machine:
  kubelet:
    extraConfig:
      # Image GC triggers at 85% usage (15% free)
      imageGCHighThresholdPercent: 85
      imageGCLowThresholdPercent: 80
    extraArgs:
      # Soft eviction at 10% free
      eviction-soft: "imagefs.available<10%"
      eviction-soft-grace-period: "imagefs.available=2m"
      # Hard eviction at 5% free
      eviction-hard: "imagefs.available<5%"
```

## Monitoring Disk Usage

Keep track of disk usage on your nodes:

```bash
# Check disk usage on a node
talosctl df --nodes 10.0.0.5

# List all images and their sizes
talosctl images --nodes 10.0.0.5

# Check node conditions for disk pressure
kubectl describe node <node-name> | grep -A 5 Conditions

# Get detailed node status
kubectl get node <node-name> -o json | jq '.status.conditions[] | select(.type=="DiskPressure")'
```

## Disabling Image Garbage Collection

In some rare cases, you might want to disable image garbage collection entirely. This is useful in air-gapped environments where every image was carefully pre-loaded and you never want them removed:

```yaml
machine:
  kubelet:
    extraConfig:
      # Set threshold to 100% to effectively disable GC
      imageGCHighThresholdPercent: 100
```

Only do this if you are confident about your disk capacity and image management strategy. Without garbage collection, disk usage will grow monotonically until you run out of space.

## Practical Example: Production Configuration

Here is a well-balanced configuration for a production Talos Linux cluster:

```yaml
machine:
  kubelet:
    extraConfig:
      # Image garbage collection
      imageGCHighThresholdPercent: 80
      imageGCLowThresholdPercent: 70
      imageMinimumGCAge: "5m"
      # Container garbage collection
      maxPerPodContainerCount: 2
      minimumContainerTTLDuration: "1m"
      # Container log management
      containerLogMaxSize: "50Mi"
      containerLogMaxFiles: 3
    extraArgs:
      # Eviction thresholds
      eviction-hard: "imagefs.available<10%,nodefs.available<10%,memory.available<256Mi"
      eviction-soft: "imagefs.available<15%,nodefs.available<15%,memory.available<512Mi"
      eviction-soft-grace-period: "imagefs.available=2m,nodefs.available=2m,memory.available=1m"
```

## Applying the Configuration

```bash
# Apply to worker nodes
talosctl apply-config --nodes 10.0.0.5 --file worker.yaml

# Verify kubelet picked up the settings
talosctl service kubelet --nodes 10.0.0.5

# Check kubelet logs for GC activity
talosctl logs kubelet --nodes 10.0.0.5 | grep -i "image.*gc\|garbage"
```

## Troubleshooting

If nodes are running out of disk space despite garbage collection being configured:

```bash
# Check if GC is actually running
talosctl logs kubelet --nodes 10.0.0.5 | grep -i "garbage\|image.*removed\|image.*deleted"

# Verify the settings are applied
talosctl get machineconfig --nodes 10.0.0.5 -o yaml | grep -A 5 imageGC

# Check what is using disk space
talosctl df --nodes 10.0.0.5
```

Common issues include the minimum age being too high (images are not old enough to collect), all images being in use by running containers, and disk usage being driven by container logs rather than images.

## Conclusion

Image garbage collection is a critical maintenance function in Talos Linux clusters. The kubelet handles it automatically, but the default thresholds may not fit every environment. Size your thresholds based on your disk capacity, set eviction rules as a safety net, and monitor disk usage to catch problems before they cause outages. The combination of image GC, container GC, and eviction thresholds gives you a layered defense against disk space exhaustion.
