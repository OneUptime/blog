# How to Configure Bonding (NIC Teaming) with IPv4 on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Bonding, NIC Teaming, IPv4, High Availability

Description: Configure Linux NIC bonding to aggregate or failover multiple physical interfaces into a single logical bond interface with an IPv4 address for redundancy or increased throughput.

## Introduction

Linux bonding combines multiple physical NICs into a single logical interface. Common modes include `active-backup` (failover) and `802.3ad` (LACP, for redundancy and higher aggregate throughput across multiple flows). The bond interface holds the IP address while member NICs operate at Layer 2.

## Common Bonding Modes

| Mode | Name | Behavior |
|---|---|---|
| 0 | balance-rr | Round-robin (requires switch config) |
| 1 | active-backup | Only one slave active, failover |
| 2 | balance-xor | XOR hashing |
| 4 | 802.3ad | LACP (requires switch support) |
| 5 | balance-tlb | Adaptive transmit load balancing |
| 6 | balance-alb | Adaptive load balancing (no switch config needed) |

## Creating a Bond Interface (Runtime)

```bash
# Load the bonding module without pre-creating bond devices

sudo modprobe bonding max_bonds=0

# Create bond0 in active-backup mode
sudo ip link add bond0 type bond mode active-backup

# Set MII monitor interval (milliseconds) for link failure detection
echo 100 | sudo tee /sys/class/net/bond0/bonding/miimon

# Take member NICs down, remove their IPs
sudo ip link set eth0 down
sudo ip link set eth1 down
sudo ip addr flush dev eth0
sudo ip addr flush dev eth1

# Add eth0 and eth1 as bond slaves
sudo ip link set eth0 master bond0
sudo ip link set eth1 master bond0

# Bring the bond up
sudo ip link set bond0 up
sudo ip link set eth0 up
sudo ip link set eth1 up

# Assign IP to the bond
sudo ip addr add 192.168.1.100/24 dev bond0
sudo ip route replace default via 192.168.1.1 dev bond0
```

## Verifying Bond Status

```bash
# Show active slave and bond state
cat /proc/net/bonding/bond0
```

Expected output for active-backup:

```text
Bonding Mode: fault-tolerance (active-backup)
Primary Slave: None
Currently Active Slave: eth0
MII Status: up
...
Slave Interface: eth0
  MII Status: up
Slave Interface: eth1
  MII Status: up
```

## Persistent Configuration with Netplan (Ubuntu)

```yaml
# /etc/netplan/01-netcfg.yaml
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
      dhcp4: false
      interfaces: [eth0, eth1]
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      parameters:
        mode: active-backup
        mii-monitor-interval: 100
```

```bash
sudo netplan apply
```

## LACP (802.3ad) Configuration

For LACP, the switch must also have LACP configured on the port-channel:

```yaml
bonds:
  bond0:
    interfaces: [eth0, eth1]
    parameters:
      mode: 802.3ad
      lacp-rate: fast
      mii-monitor-interval: 100
      transmit-hash-policy: layer2+3
```

## Conclusion

Linux bonding provides redundancy (active-backup) or higher aggregate throughput across multiple flows (LACP) by combining multiple NICs. Assign the IP to the bond interface, not the member NICs, and use Netplan for persistent configuration on Ubuntu.
