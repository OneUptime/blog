# How to Set Up Storage Networks in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Storage, Longhorn, Networking

Description: Configure dedicated storage networks in Harvester to separate Longhorn replication traffic from management and VM networks for optimal performance.

## Introduction

By default, Harvester uses the management network for all traffic, including Longhorn's storage replication between nodes. In production environments, storage replication traffic can consume significant bandwidth, potentially impacting management operations and VM performance. Setting up a dedicated storage network isolates this traffic, ensuring predictable performance for all workloads.

## Why a Dedicated Storage Network?

```text
Without dedicated storage network:
  Management traffic + Storage replication + API traffic = Congested management NIC

With dedicated storage network:
  Management network: API traffic, Kubernetes control plane (low bandwidth)
  Storage network:    Longhorn replication traffic (high bandwidth, sustained)
  VM network:         Guest VM traffic (variable)
```

## Prerequisites

- A storage uplink available on each Harvester node for a custom Harvester `ClusterNetwork`
- A dedicated VLAN ID for storage traffic
- A storage IP range in IPv4 CIDR format that does not overlap the reserved cluster networks (`10.42.0.0/16`, `10.43.0.0/16`, `10.52.0.0/16`, and `10.53.0.0/16`)
- The Whereabouts CNI CRDs must be present (`kubectl get crd ippools.whereabouts.cni.cncf.io`)
- All VMs must be shut down before changing the `storage-network` setting
- All pods attached to Longhorn volumes must be stopped
- Any ongoing image uploads or downloads should be completed or deleted
- Recommended: 10 GbE or 25 GbE for storage traffic

## Step 1: Plan the Storage Network

```text
Storage VLAN ID:      100
Cluster Network:      storage
Storage IP Range:     10.200.0.0/24
Exclude:              10.200.0.1/32
MTU:                  9000 (configured on the attached cluster network)
Uplink NIC:           eth2 on each node
```

Harvester assigns addresses from this range to Longhorn pods on the storage network. You do not configure these as static host IPs on each node.

## Step 2: Configure the Harvester Cluster Network

Use Harvester's cluster networking primitives for the storage uplink instead of assigning static IP addresses on the hosts.

1. Navigate to **Networks** → **ClusterNetworks/Configs** and create a custom cluster network named `storage`.
2. Create a **Network Config** for `storage` that selects all Harvester nodes and uses `eth2` as the storage uplink.
3. If you plan to use jumbo frames, set the MTU on this network configuration and on the connected switch ports before enabling the storage network.
4. Verify the network configuration is ready on all nodes before continuing.

## Step 3: Configure Harvester to Use the Storage Network

Harvester manages the underlying Longhorn `storage-network` setting for you. Configure the Harvester setting rather than editing Longhorn directly.

### Via the Harvester UI

1. Navigate to **Advanced** → **Settings** → **storage-network**
2. Select **Enabled**
3. Enter the storage VLAN ID (`100`), cluster network (`storage`), IP range (`10.200.0.0/24`), and any required exclude entries
4. Click **Save**

### Via kubectl

```yaml
# harvester-storage-network.yaml
# Configure Harvester to create and manage the Longhorn storage network

apiVersion: harvesterhci.io/v1beta1
kind: Setting
metadata:
  name: storage-network
value: '{"vlan":100,"clusterNetwork":"storage","range":"10.200.0.0/24","exclude":["10.200.0.1/32"]}'
```

```bash
kubectl apply -f harvester-storage-network.yaml

# Verify the setting was applied
kubectl get settings.harvesterhci.io storage-network \
    -o jsonpath='{.value}'
```

### Verify Longhorn Is Using the Storage Network

After applying the setting, Harvester stops pods attached to Longhorn volumes, recreates the Longhorn `instance-manager` and `backing-image-manager` pods, and leaves stopped VMs powered off. Verify the network is being used:

```bash
# Confirm the Harvester setting completed successfully
# Look for status.conditions[type=configured].status: "True"
kubectl get settings.harvesterhci.io storage-network -o yaml

# Pick an instance-manager pod, then inspect its network status
kubectl -n longhorn-system get pods -l longhorn.io/component=instance-manager
kubectl -n longhorn-system describe pod <instance-manager-pod>

# The storage-network interface should appear as lhnet1
kubectl -n longhorn-system exec <instance-manager-pod> -- ip addr show lhnet1
```

## Step 4: Configure MTU for Jumbo Frames

Jumbo frames (MTU 9000) can improve storage throughput, but in Harvester the storage-network interface inherits its MTU from the attached cluster network. If you need to change the MTU after enabling the storage network, disable the storage network first, update the cluster network MTU, and then re-enable the storage network.

```bash
# Verify the storage-network interface MTU from a Longhorn instance-manager pod
kubectl -n longhorn-system exec <instance-manager-pod> -- ip link show lhnet1
```

## Step 5: Understand the Isolation Boundary

Harvester isolates Longhorn replication traffic through the custom cluster network, VLAN, and the `storage-network` setting. Standard Kubernetes `NetworkPolicy` objects control Pod-to-Pod traffic on the Kubernetes network, but they do not replace Harvester's storage-network configuration and are not required to route Longhorn replication over the dedicated storage network.

## Step 6: Monitor Storage Network Performance

```bash
# Check interface counters on the storage uplink from a Harvester node
ip -s link show eth2

# Check counters on the storage-network interface inside an instance-manager pod
kubectl -n longhorn-system exec <instance-manager-pod> -- ip -s link show lhnet1
```

## Benchmarking Storage Throughput

After configuring the storage network, benchmark to verify improvement:

```bash
# Run a Longhorn disk benchmark
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: benchmark-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: harvester-longhorn
---
apiVersion: v1
kind: Pod
metadata:
  name: storage-benchmark
  namespace: default
spec:
  restartPolicy: Never
  containers:
    - name: fio
      image: nixery.dev/shell/fio
      command:
        - fio
        - --name=randwrite
        - --ioengine=libaio
        - --iodepth=16
        - --rw=randwrite
        - --bs=4k
        - --direct=1
        - --size=1G
        - --numjobs=4
        - --runtime=60
        - --time_based
        - --group_reporting
        - --filename=/mnt/test/testfile
      volumeMounts:
        - mountPath: /mnt/test
          name: test-vol
  volumes:
    - name: test-vol
      persistentVolumeClaim:
        claimName: benchmark-pvc
EOF

# Follow the benchmark output once the pod starts
kubectl logs -f pod/storage-benchmark
```

## Conclusion

A dedicated storage network is an essential optimization for production Harvester deployments. By directing Longhorn replication traffic to a separate high-bandwidth network - ideally with jumbo frames enabled on the attached cluster network - you eliminate a significant source of network contention. The result is more predictable latency for management operations, better VM network performance, and improved Longhorn replication throughput. Implement the storage network before adding significant VM workloads to avoid disruptive reconfigurations later.
