# How to Configure AKS Image Cleaner to Auto Remove Stale Container Images from

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, Image Cleaner, Disk Management, Azure, Container Image, Node Maintenance

Description: Learn how to configure the AKS Image Cleaner feature to automatically remove unused and vulnerable container images from nodes to free disk space.

---

AKS nodes accumulate container images over time. Every deployment, every rollback, every version bump leaves behind old image layers on the node's local disk. On a busy cluster with frequent deployments, a node can easily fill up its OS disk with hundreds of stale images. When the disk fills up, kubelet starts evicting pods, new pods fail to schedule, and you end up with a cascading failure that could have been easily prevented.

The AKS Image Cleaner feature (powered by Eraser) automatically identifies and removes vulnerable unused container images from your nodes on a schedule, giving you both disk hygiene and security benefits in one package.

## How Image Accumulation Happens

Every time kubelet pulls a container image, it stores the image layers on the node's local disk. Kubernetes has a built-in garbage collector that removes images when disk pressure reaches a threshold (typically 85% by default), but it is reactive rather than proactive. By the time the garbage collector kicks in, you may already be experiencing pod evictions.

The default behavior also does not consider image vulnerability status. A node might be holding onto an image with a critical CVE because some pod referenced it recently, even if that pod has been deleted.

## Enabling the Image Cleaner

The Image Cleaner is an AKS feature that you enable at the cluster level.

```bash
# Enable Image Cleaner on a new cluster with a 7-day interval

az aks create \
  --resource-group myRG \
  --name myAKS \
  --node-count 3 \
  --enable-image-cleaner \
  --image-cleaner-interval-hours 168

# Enable on an existing cluster
az aks update \
  --resource-group myRG \
  --name myAKS \
  --enable-image-cleaner \
  --image-cleaner-interval-hours 48
```

The `--image-cleaner-interval-hours` parameter controls how often the cleaner runs. The minimum supported interval is 24 hours. For production clusters with frequent deployments, I recommend 24-48 hours. For more stable environments, 168 hours (weekly) works fine.

## Verifying the Deployment

After enabling, check that the Image Cleaner components are running.

```bash
# Check for the eraser controller manager
kubectl get pods -n kube-system | grep eraser-controller-manager

# Check for eraser worker pods (these run during cleanup)
kubectl get pods -n kube-system | grep eraser-aks

# View the Image Cleaner CRD
kubectl get imagelist -A
```

The controller manager runs continuously, while the worker pods are created on each node during the cleanup cycle and terminate when done.

## Understanding What Gets Cleaned

In automatic mode, the Image Cleaner removes images that meet all of these criteria:

1. The image is not currently being used by any running pod on the node.
2. The image is detected as unused by the collector.
3. The image has vulnerabilities found by the built-in Trivy scanner.

Images that are actively in use are not removed. The cleaner is conservative by design - it would rather leave an unused image on disk than accidentally remove one that is still needed.

## Customizing Image Cleaner Behavior

You can manually trigger cleanup of specific unused images using an ImageList resource. In AKS, the ImageList must be named `imagelist`.

```yaml
# imagelist-remove.yaml
# Request removal of a specific image if it is unused
apiVersion: eraser.sh/v1
kind: ImageList
metadata:
  name: imagelist
spec:
  images:
    - myacr.azurecr.io/app:v0.9.0-deprecated
```

You can also create an exclusion list using a ConfigMap in the `kube-system` namespace. This is useful for base images you always want cached on nodes.

```bash
cat > sample.json <<EOF
{"excluded": ["docker.io/library/nginx:1.25", "docker.io/library/redis:7", "mcr.microsoft.com/dotnet/aspnet:8.0"]}
EOF

kubectl create configmap excluded --from-file=sample.json --namespace=kube-system
kubectl label configmap excluded eraser.sh/exclude.list=true -n kube-system
```

## Enabling Vulnerability-Based Cleanup

The Image Cleaner includes Trivy (a container vulnerability scanner) in the automatic cleanup workflow. You don't enable it with a separate flag; it runs as part of the Image Cleaner worker pod.

```bash
# Enable the Image Cleaner
az aks update \
  --resource-group myRG \
  --name myAKS \
  --enable-image-cleaner \
  --image-cleaner-interval-hours 24
```

When Image Cleaner runs, it scans unused cached images and removes images with vulnerabilities. AKS doesn't currently let you customize the vulnerability severities used by Image Cleaner. This is a useful defense-in-depth measure.

## Monitoring Disk Usage Before and After

Track the impact of the Image Cleaner by monitoring node disk usage.

```bash
# Check current disk usage on all nodes
kubectl get nodes -o json | jq -r '.items[] | "\(.metadata.name): \(.status.conditions[] | select(.type=="DiskPressure") | .status)"'

# Get detailed disk information from a specific node
kubectl debug node/<node-name> -it --image=busybox -- df -h /host

# List cached images reported for a specific node
kubectl describe node <node-name> | sed -n '/Images:/,/Non-terminated Pods:/p'
```

You can also set up Prometheus metrics to track image count and disk usage over time.

```promql
# Node filesystem usage percentage
(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100

# Alert when disk usage exceeds 75%
(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 > 75
```

## Adjusting the Cleanup Schedule

Different clusters need different cleanup frequencies. Here are the settings I use for various scenarios.

### High-Deployment Clusters

For clusters with dozens of deployments per day.

```bash
# Clean daily
az aks update \
  --resource-group myRG \
  --name myAKS \
  --image-cleaner-interval-hours 24
```

### Stable Production Clusters

For clusters with weekly or bi-weekly deployments.

```bash
# Clean weekly
az aks update \
  --resource-group myRG \
  --name myAKS \
  --image-cleaner-interval-hours 168
```

### Development Clusters

For dev clusters with frequent image builds and tests.

```bash
# Clean daily - dev clusters accumulate images fast
az aks update \
  --resource-group myRG \
  --name myAKS \
  --image-cleaner-interval-hours 24
```

## Handling Edge Cases

### Pre-Pulled Images

If you use DaemonSets to pre-pull images onto nodes for faster pod startup, the Image Cleaner might remove them between cleanup cycles if no pods are currently using them. Use an exclusion ConfigMap to prevent this.

```bash
# Exclude pre-pulled images from cleanup
cat > sample.json <<EOF
{"excluded": ["myacr.azurecr.io/heavy-app:v3.0", "myacr.azurecr.io/ml-model:latest"]}
EOF

kubectl create configmap prepulled-exclusions --from-file=sample.json --namespace=kube-system
kubectl label configmap prepulled-exclusions eraser.sh/exclude.list=true -n kube-system
```

### Init Container Images

Init container images are only used during pod startup and might be flagged as unused after the pod is running. The Image Cleaner handles this correctly - it checks all container specs (including init containers) in running pods before removing images.

### Large Image Layers

If your images share base layers (which they should), the Image Cleaner only removes layers that are not referenced by any remaining image. This means removing one image might free very little disk space if its layers are shared with other images.

## Combining with Image Pull Policy

The Image Cleaner works best when combined with proper image pull policies.

```yaml
# deployment-with-pull-policy.yaml
# Use specific tags and IfNotPresent to balance cache usage and freshness
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: app
          # Always use specific tags, never "latest" in production
          image: myacr.azurecr.io/web-app:v2.3.1
          # IfNotPresent uses the cached image when available
          # This works well with Image Cleaner because frequently-used
          # images stay cached, and old versions get cleaned up
          imagePullPolicy: IfNotPresent
```

## Disabling the Image Cleaner

If you need to disable the feature.

```bash
# Disable Image Cleaner
az aks update \
  --resource-group myRG \
  --name myAKS \
  --disable-image-cleaner
```

This stops the cleanup cycles but does not remove any images. The Eraser components are cleaned up from the cluster.

## Sizing Node OS Disks

Even with the Image Cleaner, you should size your node OS disks appropriately. A 30 GB OS disk will fill up quickly on a busy cluster even with regular cleanup.

```bash
# Create a node pool with a larger OS disk
az aks nodepool add \
  --resource-group myRG \
  --cluster-name myAKS \
  --name largedisk \
  --node-count 3 \
  --node-osdisk-size 128 \
  --node-osdisk-type Ephemeral
```

Ephemeral OS disks use the VM's local storage, which can provide better I/O performance for image pulls and container operations. Make sure the selected VM size has enough local cache or temporary storage for the requested OS disk size.

## Wrapping Up

The AKS Image Cleaner is a set-it-and-forget-it feature that helps prevent disk pressure issues from stale container images. Enable it on every supported cluster, set the interval based on your deployment frequency, and exclude any images you want permanently cached. Combined with proper OS disk sizing and image pull policies, it keeps your nodes healthy and your disk usage predictable. The built-in vulnerability scanning adds a security bonus - automatically removing unused images with known CVEs from your nodes reduces your attack surface without any manual intervention.
