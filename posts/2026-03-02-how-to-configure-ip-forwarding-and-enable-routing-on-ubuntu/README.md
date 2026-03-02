# How to Configure IP Forwarding and Enable Routing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, IP Forwarding, Routing, sysctl

Description: Enable IP forwarding on Ubuntu to allow the system to route packets between network interfaces, with persistent configuration via sysctl and practical routing examples.

---

By default, Linux discards any packets that arrive on one network interface but are destined for an address on a different network. Enabling IP forwarding changes this behavior, allowing the system to forward (route) packets between interfaces. This is required for any Ubuntu system that acts as a router, VPN gateway, NAT server, or container host.

## Understanding IP Forwarding

When IP forwarding is disabled, the kernel only processes packets addressed to the machine itself. Any packet arriving on `eth0` destined for a host on the `eth1` subnet is silently dropped.

With IP forwarding enabled, the kernel checks its routing table for each incoming packet, regardless of the destination. If a matching route exists, the packet is forwarded to the next hop.

## Checking Current Forwarding State

```bash
# Check IPv4 forwarding status
cat /proc/sys/net/ipv4/ip_forward
# 0 = disabled, 1 = enabled

# Check IPv6 forwarding
cat /proc/sys/net/ipv6/conf/all/forwarding
# 0 = disabled, 1 = enabled

# Using sysctl
sysctl net.ipv4.ip_forward
sysctl net.ipv6.conf.all.forwarding
```

## Enabling IP Forwarding Temporarily

For immediate enabling without persistence (resets on reboot):

```bash
# Enable IPv4 forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Verify
sysctl net.ipv4.ip_forward
```

This is useful for testing before making the change permanent.

## Enabling IP Forwarding Persistently

Edit the sysctl configuration to persist across reboots:

```bash
# Create a drop-in configuration file
sudo tee /etc/sysctl.d/99-ip-forward.conf <<'EOF'
# Enable IPv4 packet forwarding
net.ipv4.ip_forward = 1

# Enable IPv6 packet forwarding
net.ipv6.conf.all.forwarding = 1

# Also enable for the default interface template
net.ipv6.conf.default.forwarding = 1
EOF
```

Apply immediately without rebooting:

```bash
sudo sysctl --system
```

Verify the settings are active:

```bash
sysctl net.ipv4.ip_forward
sysctl net.ipv6.conf.all.forwarding
```

## Setting Up Basic Routing

With IP forwarding enabled, the kernel routes between networks according to its routing table. Add routes to connect networks:

```bash
# Show the current routing table
ip route show

# Add a static route: packets destined for 10.0.0.0/8 go via 192.168.1.254
sudo ip route add 10.0.0.0/8 via 192.168.1.254 dev eth0

# Add a host route to a specific machine
sudo ip route add 10.0.0.5/32 via 192.168.1.254 dev eth0

# Set or change the default gateway
sudo ip route add default via 192.168.1.1
```

These are not persistent. Make routes persistent via Netplan:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
        - to: 10.0.0.0/8
          via: 192.168.1.254
```

## Practical Example: Ubuntu as a Router Between Two Networks

A common scenario: Ubuntu with two interfaces, acting as a router between two subnets.

Network topology:
- `eth0` - 192.168.1.100/24 (network 1)
- `eth1` - 10.0.0.1/24 (network 2)

Machines on network 1 need to reach network 2 and vice versa.

### Step 1: Enable IP Forwarding

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-forwarding.conf
```

### Step 2: Configure Interfaces

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
    eth1:
      dhcp4: false
      addresses: [10.0.0.1/24]
```

Apply:

```bash
sudo netplan apply
```

### Step 3: Configure Route on Other Hosts

For hosts on network 1 to reach network 2, they need a route:

```bash
# On a host in network 1 (192.168.1.x):
sudo ip route add 10.0.0.0/24 via 192.168.1.100

# On a host in network 2 (10.0.0.x):
sudo ip route add 192.168.1.0/24 via 10.0.0.1
```

For simpler setups, configure the Ubuntu router as the default gateway for both networks.

### Step 4: Test Routing

```bash
# From a host on network 1, ping a host on network 2
ping 10.0.0.50

# Trace the path to verify routing is working
traceroute 10.0.0.50
# Should show 192.168.1.100 as the first hop
```

## Controlling What Can Be Forwarded

IP forwarding enables routing globally. Use iptables to restrict which traffic is forwarded:

```bash
# Allow established connections to be forwarded
sudo iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow forwarding from eth0 to eth1
sudo iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT

# Allow forwarding from eth1 to eth0
sudo iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT

# Block all other forwarding
sudo iptables -P FORWARD DROP
```

This allows bidirectional routing between eth0 and eth1 while blocking forwarding to/from other interfaces.

## Forwarding for Containers and VMs

Docker, LXC, and KVM all require IP forwarding. When you install Docker, it enables IP forwarding automatically. You can verify:

```bash
# Check if Docker is managing iptables forwarding rules
sudo iptables -L DOCKER-USER -n -v
sudo iptables -L FORWARD -n -v | grep -E "docker|br-|veth"
```

For LXC containers:

```bash
# LXC also requires forwarding - check its bridge
ip link show lxcbr0
sudo iptables -L FORWARD -n | grep lxcbr0
```

## Per-Interface Forwarding Control

You can enable forwarding on specific interfaces only, rather than globally:

```bash
# Enable forwarding on eth0 only
sudo sysctl -w net.ipv4.conf.eth0.forwarding=1

# Disable forwarding globally (but it's still on for eth0)
sudo sysctl -w net.ipv4.ip_forward=0
```

Note: For IPv6, `net.ipv6.conf.all.forwarding=1` overrides per-interface settings. Set `all` to control the global behavior.

## Debugging Forwarding Issues

```bash
# Check forwarding state
sysctl net.ipv4.ip_forward
sysctl -a | grep forward

# Check if iptables is dropping forwarded traffic
sudo iptables -L FORWARD -n -v

# Use conntrack to see if connections are being tracked
sudo conntrack -L | head -20

# Trace a packet path through the kernel
# (requires linux-headers for xtables)
sudo iptables -t raw -A PREROUTING -s 192.168.1.50 -j TRACE
sudo iptables -t raw -A OUTPUT -d 10.0.0.50 -j TRACE
sudo journalctl -k | grep "TRACE"

# Clean up trace rules after debugging
sudo iptables -t raw -D PREROUTING -s 192.168.1.50 -j TRACE
sudo iptables -t raw -D OUTPUT -d 10.0.0.50 -j TRACE
```

## Reverse Path Filtering

Reverse path filtering (rp_filter) is a security feature that drops packets where the source IP address would not be routable back through the incoming interface. This can block legitimate traffic in asymmetric routing scenarios:

```bash
# Check rp_filter setting (0=disabled, 1=strict, 2=loose)
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.eth0.rp_filter

# Disable strict rp_filter if you have asymmetric routes
sudo sysctl -w net.ipv4.conf.all.rp_filter=2

# Or disable it entirely (less secure but sometimes necessary)
sudo sysctl -w net.ipv4.conf.all.rp_filter=0
```

For persistent configuration:

```bash
echo "net.ipv4.conf.all.rp_filter = 2" | sudo tee /etc/sysctl.d/99-rp-filter.conf
sudo sysctl --system
```

IP forwarding is a foundational capability for any Ubuntu system serving as a network infrastructure component. Enabling it is a single sysctl change, but the routing configuration around it - routing tables, firewall rules, and NAT - requires careful planning based on your specific network topology.
