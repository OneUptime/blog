# How to Configure Ceph Network Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Network, Configuration, Storage, Performance

Description: Learn how to configure Ceph public and cluster networks, bind addresses, and network-related tuning to separate client traffic from OSD replication traffic.

---

## Ceph Network Architecture

Ceph supports two separate networks for optimal performance and security:

- **Public network**: Used for communication between clients (RBD, CephFS, RGW) and monitors/OSDs. All client-facing traffic flows here.
- **Cluster network** (optional): Used exclusively for OSD-to-OSD replication and recovery traffic. Keeps replication off the public network.

Separating these networks prevents replication traffic from saturating the bandwidth available for client I/O - especially important during recovery events when large amounts of data move between OSDs.

## Configuring Networks in ceph.conf

```ini
[global]
; Public network for client traffic
public_network = 192.168.1.0/24

; Cluster network for OSD replication
cluster_network = 10.0.0.0/24
```

Multiple subnets are supported (comma-separated):

```ini
public_network = 192.168.1.0/24,192.168.2.0/24
```

## Runtime Network Configuration

```bash
# Set public network
ceph config set global public_network 192.168.1.0/24

# Set cluster network
ceph config set global cluster_network 10.0.0.0/24

# Verify
ceph config get mon public_network
ceph config get osd cluster_network
```

## Binding to Specific Addresses

For hosts with multiple interfaces, bind daemons to specific addresses:

```ini
[osd.0]
public_addr = 192.168.1.20
cluster_addr = 10.0.0.20

[mon.mon-a]
public_addr = 192.168.1.10
```

```bash
# Runtime binding
ceph config set osd.0 public_addr 192.168.1.20
ceph config set osd.0 cluster_addr 10.0.0.20
```

## Configuring Networks in Rook

In Rook, configure networks through the CephCluster CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: host        # Use host networking
    addressRanges:
      public:
        - "192.168.1.0/24"
      cluster:
        - "10.0.0.0/24"
```

For Multus-based network isolation:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/public-net
      cluster: rook-ceph/cluster-net
```

## IPv6 Configuration

Ceph supports IPv6 for both public and cluster networks:

```ini
[global]
public_network = fd00::/64
cluster_network = fd01::/64
ms_bind_ipv6 = true
ms_bind_ipv4 = false
```

## Network Performance Tuning

```bash
# Increase socket buffer sizes
ceph config set global ms_tcp_rcvbuf 0   # 0 = auto-tune

# Re-enable Nagle's algorithm to batch small writes (lower throughput latency trade-off)
ceph config set global ms_tcp_nodelay false
```

## Verifying Network Configuration

```bash
# Check which address each OSD is using
kubectl exec -it rook-ceph-tools -n rook-ceph -- ceph osd dump | grep addr

# Monitor network errors
ceph -w | grep network

# Check messenger stats
ceph daemon osd.0 perf dump | grep msgr
```

## Summary

Properly configured Ceph networks dramatically improve performance and stability. Separating client traffic on the public network from OSD replication on the cluster network prevents recovery operations from crowding out application I/O. In Rook deployments, network configuration is declarative through the CephCluster CRD, supporting both host networking and Multus-based network attachment for fine-grained interface selection. Always verify that OSD bind addresses are correct and that cluster network traffic stays on the intended interfaces.
