# How to Configure LACP/802.3ad Bonding (Mode 4) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bonding, LACP, 802.3ad, Link Aggregation, Mode 4, Networking

Description: Configure Linux 802.3ad LACP bonding (mode 4) for dynamic link aggregation with automatic negotiation and load balancing across multiple interfaces.

## Introduction

802.3ad LACP (Link Aggregation Control Protocol) bonding is the industry-standard method for link aggregation. It negotiates link aggregation automatically with the switch using LACP PDUs, providing both redundancy and bandwidth aggregation. LACP requires switch support but offers better interoperability than static aggregation.

## Prerequisites

- Two or more physical interfaces connected to a LACP-capable switch
- Switch configured with a LACP port-channel on the connected ports
- Root access

## Configure LACP with ip link

```bash
# Load bonding module

modprobe bonding

# Create bond in 802.3ad mode
ip link add bond0 type bond mode 802.3ad

# Set LACP rate (request partner LACPDUs every 1s or 30s)
ip link set bond0 type bond lacp_rate fast

# Set hash policy for load distribution
ip link set bond0 type bond xmit_hash_policy layer3+4

# Set MII monitoring
ip link set bond0 type bond miimon 100

# Add slave interfaces
ip link set eth0 down
ip link set eth1 down
ip link set eth0 master bond0
ip link set eth1 master bond0

# Bring up the bond
ip link set bond0 up
ip addr add 192.168.1.100/24 dev bond0
ip route add default via 192.168.1.1
```

## Verify LACP Negotiation

```bash
cat /proc/net/bonding/bond0

# Key fields to verify:
# Bonding Mode: IEEE 802.3ad Dynamic link aggregation
# Transmit Hash Policy: layer3+4 (3)
# MII Status: up
# LACP rate: fast
# Aggregator ID: 1 (or higher if negotiated)
```

## Transmit Hash Policies

The hash policy determines how traffic is distributed:

| Policy | Description | Best For |
|---|---|---|
| `layer2` | Uses MAC addresses | General use |
| `layer2+3` | MAC + IP addresses | Multi-server environments |
| `layer3+4` | IP + port numbers | Multiple TCP/UDP flows |
| `encap2+3` | Encapsulated packet L2+L3 | Overlay networks |

```bash
# Change hash policy
ip link set bond0 type bond xmit_hash_policy layer3+4
```

`layer2` and `layer2+3` are 802.3ad-compliant policies. `layer3+4` can improve distribution for multiple TCP/UDP flows, but the Linux bonding documentation notes it is not fully 802.3ad compliant.

## Persistent Configuration with Netplan

```yaml
# /etc/netplan/01-bond-lacp.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false

  bonds:
    bond0:
      interfaces: [eth0, eth1]
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      parameters:
        mode: 802.3ad
        lacp-rate: fast
        mii-monitor-interval: 100
        transmit-hash-policy: layer3+4
```

## Persistent Configuration with nmcli (RHEL)

```bash
nmcli connection add \
    type bond \
    con-name bond-lacp \
    ifname bond0 \
    ip4 192.168.1.100/24 \
    gw4 192.168.1.1 \
    -- \
    bond.options "mode=802.3ad,lacp_rate=fast,miimon=100,xmit_hash_policy=layer3+4" \
    connection.autoconnect-ports 1

nmcli connection add type ethernet con-name bond-lacp-eth0 ifname eth0 controller bond-lacp port-type bond
nmcli connection add type ethernet con-name bond-lacp-eth1 ifname eth1 controller bond-lacp port-type bond

nmcli connection up bond-lacp
```

## Conclusion

LACP bonding provides dynamic, standards-based link aggregation with both redundancy and bandwidth increase. The switch must have LACP configured on the port-channel connecting to your Linux host. Choose the transmit hash policy based on your traffic pattern: `layer2+3` is 802.3ad compliant, while `layer3+4` can improve distribution for multiple TCP/UDP flows but is not fully 802.3ad compliant. Verify LACP is negotiating with `cat /proc/net/bonding/bond0` and look for the Aggregator ID being assigned.
