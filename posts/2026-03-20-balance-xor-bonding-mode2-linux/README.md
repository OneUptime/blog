# How to Configure Balance-XOR Bonding (Mode 2) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bonding, Balance-XOR, Mode 2, Load Balancing, Networking

Description: Configure Linux balance-XOR bonding (mode 2) to distribute traffic across slave interfaces using a hashing algorithm for consistent per-flow load balancing.

## Introduction

Balance-XOR (mode 2) uses a transmit hash policy to select which slave interface transmits each packet. Depending on the selected hash policy, traffic for a given peer or connection is kept on a consistent slave instead of being striped per-packet. This mode provides both load balancing and fault tolerance without requiring switch-side LACP.

## How Balance-XOR Works

The transmit slave is selected according to the configured `xmit_hash_policy`. By default (`layer2`):
```text
slave = (src_MAC[5] XOR dst_MAC[5] XOR EtherType) % num_slaves
```

With `layer3+4` policy:
```text
slave = hash(src_IP, dst_IP, src_port, dst_port) % num_slaves
```

For fragmented TCP/UDP packets and other traffic types, the port values are omitted from the `layer3+4` hash.

## Configure Balance-XOR

```bash
# Load the bonding module

modprobe bonding

# Create bond in balance-xor mode
ip link add bond0 type bond mode balance-xor

# Set hash policy (layer3+4 is recommended for IP traffic)
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

## Verify Balance-XOR Mode

```bash
cat /proc/net/bonding/bond0
# Bonding Mode: load balancing (xor)
# Transmit Hash Policy: layer3+4 (3)
```

## Hash Policy Options

Common policies include:

```bash
# Layer2 (default): based on src/dst MAC addresses
ip link set bond0 type bond xmit_hash_policy layer2

# Layer2+3: based on MAC + IP
ip link set bond0 type bond xmit_hash_policy layer2+3

# Layer3+4: based on IP + port - best for most TCP/UDP workloads
ip link set bond0 type bond xmit_hash_policy layer3+4
```

## Persistent Configuration

```yaml
# Netplan configuration
network:
  version: 2
  ethernets:
    eth0: {}
    eth1: {}
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      parameters:
        mode: balance-xor
        mii-monitor-interval: 100
        transmit-hash-policy: layer3+4
```

## Balance-XOR vs Round-Robin vs LACP

| Feature | Mode 0 (RR) | Mode 2 (XOR) | Mode 4 (LACP) |
|---|---|---|---|
| Load distribution | Per-packet (round-robin) | Hash-based (policy-dependent) | Hash-based (policy-dependent) |
| Out-of-order packets | Yes | Avoided in normal operation; fragmented `layer3+4` traffic can reorder | Avoided in normal operation; fragmented `layer3+4` traffic can reorder |
| Switch requirement | Static aggregation | Static aggregation | LACP |
| Fault tolerance | Yes | Yes | Yes |

## Switch Configuration Note

Balance-XOR requires switch-side static link aggregation (port-channel) configured on the ports connecting to the bond slaves. Without this, the switch may see MAC address flapping from different ports.

## Conclusion

Balance-XOR bonding provides hash-based traffic distribution using a configurable transmit hash policy. It avoids the per-packet reordering seen with round-robin while still distributing load across multiple interfaces. Use `layer3+4` hash policy for broader distribution of most TCP/UDP traffic. Requires switch-side static aggregation but not LACP.
