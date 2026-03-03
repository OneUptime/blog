# How to Add DRBD Support to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DRBD, Storage, Replication, High Availability

Description: Learn how to add DRBD distributed block device support to Talos Linux for replicated storage and high availability persistent volumes in Kubernetes.

---

DRBD, which stands for Distributed Replicated Block Device, is a Linux kernel module that mirrors block devices between servers in real time. It is essentially network RAID 1 - every write to the local disk is replicated to a remote disk over the network. In a Kubernetes context, DRBD provides the foundation for replicated storage solutions like LINSTOR, giving your stateful workloads high availability without relying on external storage arrays.

This guide covers how to add DRBD support to Talos Linux, configure it for your cluster, and integrate it with Kubernetes storage.

## What DRBD Does

DRBD operates at the block device level, below the filesystem. It creates a virtual block device on each node that mirrors data to one or more peer nodes. If the primary node fails, a secondary node already has an exact copy of the data and can take over immediately.

Key characteristics of DRBD:

- Synchronous replication with zero data loss
- Works with any filesystem (ext4, XFS, etc.)
- Supports two-node and multi-node configurations
- Sub-millisecond failover when used with a proper cluster manager
- Operates at the kernel level for maximum performance

## Installing the DRBD Extension

Talos Linux provides DRBD as a system extension. The extension includes the DRBD kernel module compiled against the Talos kernel.

### Machine Configuration

Add the DRBD extension to your worker node configuration.

```yaml
# worker.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/drbd:9.2.6-v1.7.0
  kernel:
    modules:
      - name: drbd
        parameters:
          - usermode_helper=disabled
      - name: drbd_transport_tcp
```

The `usermode_helper=disabled` parameter is important for Talos because the OS does not have a standard userspace environment for DRBD helper scripts.

### Using Image Factory

```bash
# Create a schematic with DRBD
cat > drbd-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/drbd
EOF

# Submit to Image Factory
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @drbd-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

echo "Installer: factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"
```

## Applying the Configuration

Apply the DRBD extension to your nodes and upgrade.

```bash
# Apply config to worker nodes
for node in 10.0.0.20 10.0.0.21 10.0.0.22; do
  talosctl -n $node apply-config --file worker.yaml
done

# Upgrade each node to apply extensions
for node in 10.0.0.20 10.0.0.21 10.0.0.22; do
  talosctl -n $node upgrade \
    --image ghcr.io/siderolabs/installer:v1.7.0
  # Wait for node to be ready
  echo "Waiting for $node to come back..."
  sleep 60
  talosctl -n $node health
done
```

## Verifying DRBD Installation

Check that the DRBD module is loaded on your nodes.

```bash
# Check if DRBD module is loaded
talosctl -n 10.0.0.20 read /proc/modules | grep drbd

# Expected output:
# drbd 598016 0 - Live
# drbd_transport_tcp 28672 0 - Live

# Check DRBD version
talosctl -n 10.0.0.20 read /proc/drbd

# Check dmesg for DRBD initialization
talosctl -n 10.0.0.20 dmesg | grep -i drbd
```

## Using DRBD with LINSTOR

The most common way to use DRBD in Kubernetes is through LINSTOR, which is a storage management system built on top of DRBD. LINSTOR handles resource creation, replication, and provides a CSI driver for Kubernetes integration.

### Installing LINSTOR Operator

```bash
# Add the Piraeus (LINSTOR) Helm repository
helm repo add piraeus-charts https://piraeus.io/helm-charts/
helm repo update

# Install the LINSTOR operator
helm install linstor-operator piraeus-charts/piraeus-operator \
  --namespace piraeus-system \
  --create-namespace \
  --set operator.controller.enabled=true \
  --set operator.csi.enabled=true
```

### Configuring LINSTOR Satellite Nodes

LINSTOR satellite processes run on each storage node. Deploy them as a DaemonSet.

```yaml
# linstor-satellite.yaml
apiVersion: piraeus.io/v1
kind: LinstorSatelliteConfiguration
metadata:
  name: storage-nodes
spec:
  podTemplate:
    spec:
      initContainers:
        - name: drbd-shutdown-guard
          image: ghcr.io/siderolabs/drbd:9.2.6-v1.7.0
      containers:
        - name: linstor-satellite
          image: quay.io/piraeusdatastore/piraeus-server:v1.25.0
  storagePools:
    - name: pool1
      fileThinPool:
        directory: /var/lib/linstor-pools/pool1
```

```bash
kubectl apply -f linstor-satellite.yaml
```

### Creating a Storage Pool

Configure the storage pool that LINSTOR will use for volumes.

```bash
# Using the LINSTOR client
kubectl exec -it -n piraeus-system deploy/linstor-controller -- \
  linstor storage-pool create lvmthin \
  node1 pool1 lvm-thin/thinpool

# Or create a file-based pool for testing
kubectl exec -it -n piraeus-system deploy/linstor-controller -- \
  linstor storage-pool create file \
  node1 pool1 /var/lib/linstor-pools/pool1
```

### Creating a StorageClass

```yaml
# drbd-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: linstor-drbd
provisioner: linstor.csi.linbit.com
parameters:
  linstor.csi.linbit.com/storagePool: pool1
  linstor.csi.linbit.com/placementCount: "2"  # Replicate to 2 nodes
  linstor.csi.linbit.com/autoPlace: "2"
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

```bash
kubectl apply -f drbd-storage-class.yaml
```

## Testing DRBD Storage

Create a PVC and pod to test the DRBD-backed storage.

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: drbd-test-pvc
spec:
  storageClassName: linstor-drbd
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: drbd-test-pod
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "echo 'DRBD storage works!' > /data/test.txt && cat /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: drbd-test-pvc
```

```bash
# Deploy the test
kubectl apply -f test-pvc.yaml

# Check the PVC is bound
kubectl get pvc drbd-test-pvc

# Check the pod is running
kubectl get pod drbd-test-pod

# Verify the data
kubectl logs drbd-test-pod
```

## Monitoring DRBD Replication

Monitor the replication status of your DRBD resources.

```bash
# Check DRBD resource status via LINSTOR
kubectl exec -it -n piraeus-system deploy/linstor-controller -- \
  linstor resource list

# Check DRBD connection status on a node
talosctl -n 10.0.0.20 read /proc/drbd

# The output shows connection state and sync progress
# version: 9.2.6
#  0: cs:Connected ro:Primary/Secondary ds:UpToDate/UpToDate
```

## DRBD Performance Tuning

DRBD performance depends on network latency and bandwidth between nodes. Here are some tuning options.

### Network Configuration

For best DRBD performance, use a dedicated network for replication traffic.

```yaml
# In LINSTOR configuration, specify the replication network
apiVersion: piraeus.io/v1
kind: LinstorSatelliteConfiguration
metadata:
  name: storage-nodes
spec:
  properties:
    # Use a specific network interface for DRBD traffic
    DrbdOptions/Net/ping-timeout: "50"
    DrbdOptions/Net/max-buffers: "8192"
    DrbdOptions/Net/sndbuf-size: "1048576"
    DrbdOptions/Net/rcvbuf-size: "1048576"
```

### Disk Configuration

```yaml
# DRBD disk options for better performance
DrbdOptions/Disk/disk-barrier: "no"
DrbdOptions/Disk/disk-flushes: "no"
DrbdOptions/Disk/md-flushes: "no"
DrbdOptions/Disk/c-max-rate: "700M"
```

Be careful with disabling barriers and flushes - they improve performance but can lead to data loss on power failure if your disks do not have battery-backed caches.

## Handling Node Failures

DRBD handles node failures by promoting a secondary node to primary.

```bash
# Check current primary/secondary status
kubectl exec -it -n piraeus-system deploy/linstor-controller -- \
  linstor resource list

# LINSTOR/CSI handles automatic failover
# When a node goes down, Kubernetes reschedules the pod
# and LINSTOR promotes the secondary replica to primary
```

For the failover to work smoothly, make sure your PodDisruptionBudgets and node failure detection settings are properly configured.

```bash
# Check Kubernetes node status
kubectl get nodes

# If a node is NotReady, pods will be rescheduled
# DRBD secondary becomes primary on the new node
```

## Conclusion

Adding DRBD support to Talos Linux gives your Kubernetes cluster a robust, kernel-level storage replication solution. Through LINSTOR and its CSI driver, DRBD integrates naturally with Kubernetes persistent volume claims, providing synchronous replication without any changes to your application code. The combination of Talos Linux's immutability and DRBD's data protection creates a solid foundation for running stateful workloads that need high availability and data durability. While the initial setup requires some effort, the result is a storage layer that handles node failures gracefully and keeps your data safe.
