# How to Create a Bond with ip link add type bond

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bonding, Linux, Networking, Ip-command, High-Availability, IPv4

Description: Create a network bond using the ip link command to aggregate multiple NICs for redundancy or increased throughput on Linux systems.

## Introduction

Network bonding combines multiple physical NICs into a single logical interface, providing either fault tolerance (active-backup) or load balancing (802.3ad LACP). The `ip link add type bond` command creates bonds without requiring persistent configuration files - useful for testing or scripting.

## Creating a Bond Interface

```bash
# Create a bond interface named bond0

sudo ip link add bond0 type bond

# Set the bonding mode (4 = 802.3ad LACP, 1 = active-backup)
sudo ip link set bond0 type bond mode 802.3ad
```

Available bonding modes:

| Mode | Name | Description |
|------|------|-------------|
| 0 | balance-rr | Round-robin load balancing |
| 1 | active-backup | One active, others standby |
| 2 | balance-xor | XOR-based load balancing |
| 3 | broadcast | Transmits everything on all slave interfaces |
| 4 | 802.3ad | IEEE 802.3ad LACP |
| 5 | balance-tlb | Adaptive transmit load balancing |
| 6 | balance-alb | Adaptive load balancing |

## Adding Slave Interfaces

Bring the physical NICs down before enslaving them:

```bash
# Bring down the physical NICs
sudo ip link set eth0 down
sudo ip link set eth1 down

# Enslave eth0 and eth1 to bond0
sudo ip link set eth0 master bond0
sudo ip link set eth1 master bond0
```

## Configuring the Bond

```bash
# Bring up the bond interface
sudo ip link set bond0 up

# Assign an IPv4 address
sudo ip addr add 192.168.1.100/24 dev bond0

# Add a default route
sudo ip route add default via 192.168.1.1 dev bond0
```

## Verifying Bond Status

```bash
# Check bond state and slave details
cat /proc/net/bonding/bond0

# Show interface state
ip link show bond0
ip addr show bond0
```

The `/proc/net/bonding/bond0` output shows the active slave, link status, and which slave is currently transmitting.

## Setting LACP Parameters

For 802.3ad mode, configure the LACP rate:

```bash
# Set LACP rate to fast (1-second PDU interval)
sudo ip link set bond0 type bond lacp_rate fast

# Set MII monitoring interval (milliseconds)
sudo ip link set bond0 type bond miimon 100
```

## Removing the Bond

```bash
# Remove slaves from the bond
sudo ip link set eth0 nomaster
sudo ip link set eth1 nomaster

# Delete the bond interface
sudo ip link del bond0
```

## Making the Bond Persistent

For persistent bonds, add the configuration to Netplan or `/etc/network/interfaces`. The `ip link` approach is transient and does not survive reboots.

## Conclusion

The `ip link add type bond` command gives you immediate bonding without editing configuration files. It is ideal for testing bonding configurations before committing them to a persistent network manager.
