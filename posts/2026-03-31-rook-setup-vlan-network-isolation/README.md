# How to Set Up VLAN-Based Network Isolation for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Networking, VLAN, Security, Architecture

Description: Configure VLAN-based network isolation for Ceph clusters to separate public, cluster, and management traffic on shared physical infrastructure for security and performance.

---

## Why Use VLANs for Ceph?

VLANs allow multiple logical networks to share physical switch infrastructure while remaining isolated. For Ceph, VLANs provide:

- **Security**: Replication traffic isolated from client-facing networks
- **Cost efficiency**: Fewer physical NICs needed (2 physical + VLAN subinterfaces)
- **QoS**: VLAN tagging enables switch-level traffic shaping per network type
- **Compliance**: Separation of storage, management, and production networks

## Recommended VLAN Layout

| VLAN | Network | Purpose |
|------|---------|---------|
| VLAN 10 | 10.0.1.0/24 | Ceph public (client I/O) |
| VLAN 20 | 192.168.10.0/24 | Ceph cluster (replication) |
| VLAN 30 | 10.0.2.0/24 | Management/OOB access |

## Switch Configuration

Configure trunk ports on the switch for Ceph nodes (Cisco IOS example):

```text
! Configure trunk port connecting to OSD node
interface GigabitEthernet1/0/1
 description OSD-NODE-1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
 spanning-tree portfast trunk
!
! Configure VLANs
vlan 10
 name CEPH-PUBLIC
!
vlan 20
 name CEPH-CLUSTER
 mtu 9000
!
vlan 30
 name MANAGEMENT
```

## Linux VLAN Interface Configuration

### NetworkManager

```bash
# Create VLAN subinterfaces on the physical NIC (eth0)
# Public network - VLAN 10
nmcli connection add type vlan ifname eth0.10 \
    con-name "ceph-public" dev eth0 id 10
nmcli connection modify "ceph-public" \
    ipv4.addresses "10.0.1.10/24" ipv4.method manual \
    802-3-ethernet.mtu 1500
nmcli connection up "ceph-public"

# Cluster network - VLAN 20 (with jumbo frames)
nmcli connection add type vlan ifname eth0.20 \
    con-name "ceph-cluster" dev eth0 id 20
nmcli connection modify "ceph-cluster" \
    ipv4.addresses "192.168.10.10/24" ipv4.method manual \
    802-3-ethernet.mtu 9000
nmcli connection up "ceph-cluster"

# Management network - VLAN 30
nmcli connection add type vlan ifname eth0.30 \
    con-name "management" dev eth0 id 30
nmcli connection modify "management" \
    ipv4.addresses "10.0.2.10/24" ipv4.method manual
nmcli connection up "management"
```

### systemd-networkd

```ini
# /etc/systemd/network/00-eth0.network
[Match]
Name=eth0

[Network]
VLAN=eth0.10
VLAN=eth0.20
VLAN=eth0.30
```

```ini
# /etc/systemd/network/10-vlan10.netdev
[NetDev]
Name=eth0.10
Kind=vlan

[VLAN]
Id=10
```

```ini
# /etc/systemd/network/10-vlan10.network
[Match]
Name=eth0.10

[Network]
Address=10.0.1.10/24

[Link]
MTUBytes=1500
```

```ini
# /etc/systemd/network/20-vlan20.netdev
[NetDev]
Name=eth0.20
Kind=vlan

[VLAN]
Id=20
```

```ini
# /etc/systemd/network/20-vlan20.network
[Match]
Name=eth0.20

[Network]
Address=192.168.10.10/24

[Link]
MTUBytes=9000
```

Apply configuration:

```bash
systemctl restart systemd-networkd
ip -d link show eth0.10
ip -d link show eth0.20
```

## Configuring Ceph to Use VLAN Interfaces

Set Ceph to use specific IP ranges for each network:

```bash
# Configure Ceph with VLAN-based networks
ceph config set global public_network 10.0.1.0/24
ceph config set global cluster_network 192.168.10.0/24
```

In Rook CephCluster:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: host
    addressRanges:
      public:
      - "10.0.1.0/24"
      cluster:
      - "192.168.10.0/24"
```

## Validating VLAN Isolation

Verify VLANs are properly isolated and routing is correct:

```bash
# Verify VLAN subinterfaces are up
ip link show | grep vlan

# Test connectivity within each VLAN
ping -I eth0.10 10.0.1.11  # Public VLAN to another node
ping -I eth0.20 192.168.10.11  # Cluster VLAN to another node

# Verify Ceph uses correct interfaces
ceph daemon osd.0 config get public_addr
ceph daemon osd.0 config get cluster_addr

# Check that OSD is listening on cluster VLAN IP
ss -tlnp | grep "192.168.10"
```

## VLAN-Based QoS for Ceph Traffic

On managed switches, apply DSCP markings per VLAN:

```bash
# On Linux nodes, mark Ceph traffic for QoS
# Mark cluster replication traffic (VLAN 20) with high priority DSCP
iptables -t mangle -A OUTPUT -o eth0.20 -j DSCP --set-dscp-class AF41
iptables -t mangle -A OUTPUT -o eth0.10 -j DSCP --set-dscp-class AF21
```

## Summary

VLAN-based network isolation allows multiple Ceph logical networks to share physical switch ports while maintaining traffic separation. Configure VLANs using NetworkManager or systemd-networkd on OSD nodes, then point Ceph's `public_network` and `cluster_network` to the appropriate VLAN subnet ranges. Enable jumbo frames only on the cluster VLAN (VLAN 20) since clients on the public VLAN may not support large MTUs. This approach reduces physical infrastructure costs while maintaining proper network isolation for security and performance.
