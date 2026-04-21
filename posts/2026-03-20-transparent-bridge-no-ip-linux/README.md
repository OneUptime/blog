# How to Set Up a Transparent Bridge (No IP Address) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bridge, Transparent Bridge, Networking, Firewall, Traffic Inspection

Description: Configure a Linux transparent bridge with no IP address to transparently forward traffic between two network segments while applying firewall rules or traffic inspection.

## Introduction

A transparent bridge forwards packets at Layer 2 without an IP address. Because it has no IP, it is nearly invisible at Layer 3. This is useful for inserting firewall rules, traffic inspection, or monitoring between two network segments without disrupting the existing IP addressing scheme.

## Use Cases

- Insert an IDS/IPS between a router and a switch
- Apply firewall rules between two network segments without changing IPs
- Traffic mirroring and monitoring

## Create a Transparent Bridge

```bash
# Create bridge (no IP)

ip link add br0 type bridge
ip link set br0 type bridge stp_state 0

# Make sure the bridge ports do not keep Layer 3 addresses
ip addr flush dev eth0
ip addr flush dev eth1

# Add two physical interfaces as bridge ports
ip link set eth0 master br0
ip link set eth1 master br0

# Bring everything up
ip link set eth0 up
ip link set eth1 up
ip link set br0 up

# Verify (br0 has NO IP)
ip addr show br0
# 2: br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...
#     link/ether ...
#     (no inet line - no IP address)
```

## Verify Transparent Bridging

```bash
# Hosts on either side should still communicate normally
# Traffic flows: eth0 <-> br0 <-> eth1

# Check bridge FDB to see that MAC addresses are being learned
bridge fdb show br br0
```

## Apply Firewall Rules on the Bridge

Even without an IP, you can apply nftables bridge-family rules, ebtables (bridge-level) rules, or iptables rules with bridge-nf enabled. The iptables bridge-netfilter path is useful on legacy systems; for new configurations, prefer nftables bridge filtering.

```bash
# Enable bridge netfilter for iptables/ip6tables
modprobe br_netfilter
sysctl -w net.bridge.bridge-nf-call-iptables=1
sysctl -w net.bridge.bridge-nf-call-ip6tables=1

# Apply iptables rules that intercept bridged IPv4 traffic
iptables -A FORWARD -p tcp --dport 443 -j ACCEPT
iptables -A FORWARD -j DROP

# Or use ebtables for MAC-level rules
ebtables -A FORWARD -p IPv4 -j ACCEPT
```

## Use ebtables for Bridge-Level Filtering

```bash
# Install ebtables
apt install ebtables

# Block a specific MAC address at the bridge level
ebtables -A FORWARD -s aa:bb:cc:dd:ee:ff -j DROP

# Allow only specific traffic
ebtables -A FORWARD -p ARP -j ACCEPT
ebtables -A FORWARD -p IPv4 --ip-protocol TCP --ip-dport 80 -j ACCEPT
ebtables -A FORWARD -p IPv4 --ip-protocol TCP --ip-sport 80 -j ACCEPT
ebtables -A FORWARD -j DROP
```

## Monitor Bridged Traffic

```bash
# Capture traffic passing through the bridge
tcpdump -i br0 -n

# Or capture on a specific port
tcpdump -i eth0 -n
```

## Persistent Configuration

```bash
# /etc/network/interfaces (Debian)
# Do not assign addresses to eth0 or eth1 elsewhere
auto br0
iface br0 inet manual    # No IP - manual mode
    bridge_ports eth0 eth1
    bridge_stp off
    bridge_fd 0
```

## Conclusion

A transparent bridge with no IP address creates a Layer 3-invisible bridge in the network path. This allows you to insert firewall rules, IDS/IPS inspection, or monitoring between network segments without changing IP addressing. Use nftables bridge filtering or ebtables for Layer 2 (MAC-level) filtering, or iptables with bridge-nf for legacy Layer 3 filtering on bridged IPv4 traffic.
