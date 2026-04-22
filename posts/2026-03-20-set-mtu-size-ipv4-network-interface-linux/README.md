# How to Set MTU Size for an IPv4 Network Interface on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, MTU, IPv4, ip command, Jumbo Frame

Description: Set the Maximum Transmission Unit (MTU) on a Linux network interface using ip link set, enable jumbo frames for storage networks, and diagnose MTU mismatch connectivity issues.

## Introduction

On Ethernet, the MTU is the maximum Layer 3 packet size carried in the frame payload; for IPv4, that means the IP datagram size. The standard Ethernet MTU is 1500 bytes. Setting a higher value (jumbo frames, typically 9000 bytes) reduces overhead for large data transfers in storage and backup networks. Setting it too high can cause fragmentation, Path MTU Discovery failures, or dropped frames on links that do not support large packets.

## Checking the Current MTU

```bash
# Show MTU for all interfaces

ip link show | grep mtu

# Show MTU for a specific interface
ip link show eth0 | grep mtu
# Output example: ... mtu 1500 ...
```

## Setting the MTU

```bash
# Set standard MTU (1500)
sudo ip link set eth0 mtu 1500

# Enable jumbo frames (9000 bytes) for iSCSI/NFS traffic
sudo ip link set eth0 mtu 9000

# Verify
ip link show eth0 | grep mtu
```

**Important:** For jumbo frames, the NIC, switch port, and every Layer 2 hop carrying the traffic must support the same or higher MTU. Across a routed path, the effective size is limited by the smallest link MTU. Mismatched MTU can cause large packets to fail while small packets (like a default-size ping) succeed.

## Testing MTU Correctness

```bash
# Send a ping with payload size 1472 (1472 + 28 byte header = 1500 bytes)
# -M do = do not fragment, -s = payload size
ping -M do -s 1472 192.168.1.1

# If smaller pings succeed but this fails, the tested path likely has an MTU below 1500
# Try smaller sizes to find the actual PMTU
ping -M do -s 1400 192.168.1.1
ping -M do -s 1200 192.168.1.1
```

If the smaller ping succeeds but 1472 fails, the path likely has a lower MTU or is dropping large, non-fragmentable ICMP probes.

## Making MTU Persistent with Netplan

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      mtu: 9000
      addresses: [192.168.1.100/24]
```

```bash
sudo netplan apply
```

## Making MTU Persistent with NetworkManager

```bash
nmcli con mod "Wired connection 1" ethernet.mtu 9000
nmcli con up "Wired connection 1"
```

## Setting MTU with /etc/network/interfaces (Debian)

```text
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    mtu 9000
```

## Common MTU Values

| Use Case | MTU |
|---|---|
| Standard Ethernet | 1500 |
| PPPoE (DSL) | 1492 |
| WireGuard VPN | ~1420 (account for encapsulation) |
| VXLAN tunnels | ~1450 (50-byte VXLAN overhead) |
| iSCSI / NFS storage | 9000 (jumbo frames) |

## Diagnosing MTU Issues

```bash
# Use tracepath to discover Path MTU to a destination
tracepath 8.8.8.8 | grep "pmtu"

# Or use ping with decreasing sizes to binary-search the PMTU
for size in 1472 1400 1300 1200 1100; do
    ping -c 1 -M do -s $size 8.8.8.8 &>/dev/null && echo "MTU $((size+28)) works" || echo "MTU $((size+28)) FAILS"
done
```

## Conclusion

Set MTU with `ip link set <interface> mtu <value>` for immediate effect, and persist through Netplan, NetworkManager, or `/etc/network/interfaces`. Always verify the full path supports the chosen MTU by testing with large, non-fragmentable pings.
