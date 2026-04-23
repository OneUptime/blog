# How to Configure Round-Robin Bonding (Mode 0) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bonding, Round-Robin, Mode 0, Load Balancing, Link Aggregation, Networking

Description: Configure Linux round-robin bonding (mode 0) to distribute outgoing packets across all slave interfaces for increased aggregate throughput.

## Introduction

Round-robin bonding (balance-rr, mode 0) sends packets to each slave interface in sequence: packet 1 via eth0, packet 2 via eth1, packet 3 via eth0, and so on. This provides rudimentary load balancing and fault tolerance. Note: round-robin can cause out-of-order packet delivery, which may impact TCP performance. Switch-side static aggregation is usually needed; LACP is used with 802.3ad mode, not balance-rr.

## Prerequisites

- Two or more physical interfaces
- Switch configured for static link aggregation (port channel/EtherChannel, not LACP) on the same port-channel
- Root access

## Configure Round-Robin with ip link

```bash
# Load the bonding module

modprobe bonding

# Create a bond in balance-rr (mode 0)
ip link add bond0 type bond mode balance-rr

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

## Verify Round-Robin Mode

```bash
cat /proc/net/bonding/bond0
# Bonding Mode: load balancing (round-robin)
# Slave Interface: eth0
# Slave Interface: eth1
```

## Persistent Configuration with Netplan

```yaml
# /etc/netplan/01-bond-rr.yaml
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
        mode: balance-rr
        mii-monitor-interval: 100
```

## Monitor Traffic Distribution

```bash
# Watch packet counters per slave interface
watch -n 1 "cat /proc/net/bonding/bond0 | grep -A5 'Slave Interface'"

# Check interface statistics
ip -s link show bond0
ip -s link show eth0
ip -s link show eth1
```

## Limitations and Considerations

- Round-robin can cause out-of-order packets, which TCP handles but with reduced efficiency
- Requires switch-side static port-channel/EtherChannel configuration to avoid MAC flapping
- Not suitable for connections to switches that don't support aggregation
- LACP (mode 4) is generally preferred over round-robin for better compatibility

## Conclusion

Round-robin bonding distributes packets evenly across all slave interfaces, providing theoretical N×bandwidth throughput. In practice, it works best with switch-side static aggregation configured. For environments with LACP-capable switches, mode 4 (802.3ad) is a better choice. Use round-robin when you need simple multi-interface distribution and your switch supports static aggregation but not LACP.
