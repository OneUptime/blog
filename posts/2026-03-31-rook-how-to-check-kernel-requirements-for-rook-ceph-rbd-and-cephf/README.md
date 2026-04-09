# How to Check Kernel Requirements for Rook-Ceph (RBD and CephFS Modules)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kernel, RBD, CephFS, Prerequisites

Description: Learn how to verify that Linux kernel modules required for Rook-Ceph (rbd, ceph, cephfs) are available on your Kubernetes nodes before deploying.

---

## Why Kernel Modules Matter

Rook-Ceph uses kernel-space modules to mount storage on nodes:
- **rbd**: Required for RBD (RADOS Block Device) volumes - used for ReadWriteOnce block storage
- **ceph** (and **libceph** loaded as a dependency): Required for CephFS volumes - used for ReadWriteMany shared filesystem

If these modules are missing or unavailable, CSI driver pods will fail to mount volumes, and pods requiring storage will remain in Pending state.

## Checking the Kernel Version

```bash
# Check kernel version on a node
uname -r
# Output: 5.15.0-91-generic

# Minimum recommended: Linux 5.4+ for full Ceph feature support
# Minimum for basic operation: Linux 4.17+
```

```bash
# Check all nodes' kernel versions
kubectl get nodes -o custom-columns=NAME:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion
```

## Checking for Required Kernel Modules

### Method 1: From the Node Directly

```bash
# SSH to a node and check loaded modules
lsmod | grep -E "rbd|ceph"

# Check if modules are available (even if not loaded)
modprobe --dry-run rbd && echo "rbd module available"
modprobe --dry-run ceph && echo "ceph module available"
```

### Method 2: Using kubectl debug

```bash
# Without SSH access, use kubectl debug
kubectl debug node/<node-name> -it --image=busybox -- sh

# Inside the debug pod:
chroot /host lsmod | grep -E "rbd|ceph"
chroot /host modprobe --dry-run rbd
```

### Method 3: Automated Check Across All Nodes

```bash
# Check all nodes for RBD module
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  echo -n "Node $node: "
  kubectl debug node/$node --image=busybox -q -- sh -c \
    "chroot /host sh -c 'lsmod | grep -c rbd || echo 0'" 2>/dev/null
done
```

## Loading Modules Manually

If modules are available but not loaded:

```bash
# Load the RBD module
sudo modprobe rbd

# Load CephFS module (also loads libceph as a dependency)
sudo modprobe ceph

# Verify they are loaded
lsmod | grep rbd
lsmod | grep ceph
```

## Making Module Loading Persistent

```bash
# Add to /etc/modules-load.d/ for persistence across reboots
echo "rbd" | sudo tee /etc/modules-load.d/rook-rbd.conf
echo "ceph" | sudo tee /etc/modules-load.d/rook-ceph.conf

# Apply immediately
sudo systemctl restart systemd-modules-load.service
```

## Distributions and Module Availability

```text
Ubuntu 20.04+    - rbd and ceph modules available by default
Debian 11+       - modules available, may need to install linux-modules-extra
RHEL/CentOS 8+   - modules available in kernel-modules-extra package
Flatcar Linux    - modules available (designed for containers)
Bottlerocket     - rbd available; CephFS may require configuration

# For Ubuntu: install extra kernel modules if needed
sudo apt-get install linux-modules-extra-$(uname -r)

# For RHEL/CentOS
sudo dnf install kernel-modules-extra
```

## Checking RBD Features Support

Modern RBD features require specific kernel support:

```bash
# Check supported RBD features (kernel 4.11+)
cat /sys/bus/rbd/supported_features 2>/dev/null || \
  dmesg | grep rbd | grep features
```

```yaml
# In StorageClass, disable newer features if on older kernels
parameters:
  imageFeatures: layering     # Works on kernel 3.10+
  # Avoid: object-map, fast-diff, deep-flatten (require newer kernels)
```

## Using the Rook Toolbox

After deploying Rook, you can use the Rook toolbox to verify cluster health:

```bash
# Deploy the Rook toolbox
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml

# Check cluster status from the toolbox
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd tree
```

## Diagnosing Module Load Failures

If RBD or CephFS volumes fail to mount, check the CSI node plugin logs:

```bash
# Check RBD CSI node plugin logs
kubectl -n rook-ceph logs -l app=csi-rbdplugin --container=csi-rbdplugin | tail -50

# Check CephFS CSI node plugin logs
kubectl -n rook-ceph logs -l app=csi-cephfsplugin --container=csi-cephfsplugin | tail -50

# Check dmesg on the node for module errors
kubectl debug node/<node> -- chroot /host dmesg | grep -E "rbd|ceph" | tail -20
```

Common error: `failed to load kernel module rbd` indicates the module binary is missing.

## Summary

Rook-Ceph requires the `rbd` kernel module for block storage and the `ceph` module (with `libceph` as a dependency) for shared filesystem storage. Verify module availability across all nodes before deployment using `modprobe --dry-run rbd` or kubectl debug sessions. Load modules persistently via `/etc/modules-load.d/`. On older kernels, restrict RBD image features to `layering` only. Always check CSI node plugin logs when volumes fail to mount to distinguish module issues from authentication or network problems.
