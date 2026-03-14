# How to Configure Proxy ARP on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, ARP, Proxy ARP, Iproute2

Description: Configure proxy ARP on Ubuntu to allow a Linux host to answer ARP requests on behalf of other machines, enabling transparent layer-2 bridging and VPN gateway scenarios.

---

Proxy ARP is a technique where a device responds to ARP requests intended for another host. When a host on network A asks "who has IP 192.168.2.50?", a proxy ARP-enabled router between network A and network B can respond with its own MAC address, effectively saying "send it to me and I'll deliver it." The original host never knows the destination is on a different network segment.

This is used in VPN gateways, transparent firewalls, and situations where you want two subnets to appear as a single flat network.

## Understanding When to Use Proxy ARP

Proxy ARP is a tool for specific scenarios. Using it unnecessarily adds complexity. The common use cases are:

- **Mobile devices and VPNs**: When a VPN client gets an IP from the local subnet's range, proxy ARP lets it communicate with local hosts without adding static routes everywhere.
- **Transparent firewalls**: The firewall answers for addresses behind it without requiring hosts on either side to update their routing.
- **Cloud environments**: Some cloud providers use proxy ARP extensively to avoid distributing routes between hypervisors.

For most routing scenarios, proper routing tables are a better solution than proxy ARP.

## Enabling Proxy ARP System-Wide

```bash
# Check current proxy ARP status on all interfaces
cat /proc/sys/net/ipv4/conf/all/proxy_arp

# 0 = disabled, 1 = enabled

# Enable proxy ARP on a specific interface
sudo sysctl -w net.ipv4.conf.eth0.proxy_arp=1

# Enable on all interfaces
sudo sysctl -w net.ipv4.conf.all.proxy_arp=1

# Make it persistent
sudo tee /etc/sysctl.d/99-proxy-arp.conf > /dev/null <<'EOF'
# Enable proxy ARP on eth0 (the interface toward the hosts needing proxy)
net.ipv4.conf.eth0.proxy_arp = 1

# Enable on all interfaces if needed
# net.ipv4.conf.all.proxy_arp = 1
EOF

sudo sysctl -p /etc/sysctl.d/99-proxy-arp.conf
```

## Practical Scenario: VPN Gateway with Proxy ARP

A common real-world setup: VPN clients get IPs from the same subnet as the LAN (192.168.1.0/24). Without proxy ARP, LAN hosts don't know how to reach VPN client addresses because their ARP requests won't cross the VPN boundary.

```text
LAN: 192.168.1.0/24
  - LAN hosts: 192.168.1.1 to 192.168.1.100
  - Ubuntu VPN gateway: eth0=192.168.1.1

VPN clients get addresses: 192.168.1.200 to 192.168.1.254
  - Connected via tun0 on the VPN gateway
```

```bash
# Step 1: Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Step 2: Enable proxy ARP on the LAN interface
# This makes the gateway respond to ARP requests for VPN client IPs
sudo sysctl -w net.ipv4.conf.eth0.proxy_arp=1

# Step 3: Add a host route for each VPN client
# When a VPN client connects with IP 192.168.1.200:
sudo ip route add 192.168.1.200/32 dev tun0

# Now when a LAN host ARPs for 192.168.1.200:
# 1. The gateway (eth0) responds with its own MAC
# 2. LAN host sends packet to gateway
# 3. Gateway routes the packet to tun0 (toward the VPN client)
```

## Proxy ARP with Specific Networks

Linux can be configured to proxy ARP only for specific address ranges using the `proxy_arp_pvlan` setting or by controlling what routes exist:

```bash
# The kernel only proxies ARP if there is a route for the address
# on a different interface than the one the ARP request arrived on

# Example: only proxy for 192.168.1.200/32
sudo ip route add 192.168.1.200/32 dev tun0

# Now the kernel will proxy ARP for 192.168.1.200 on eth0
# but not for any other addresses (unless you add more routes)

# To proxy an entire subnet of VPN addresses:
# Add routes for each active client (OpenVPN/WireGuard scripts do this automatically)

# Or add a static route for the entire VPN pool:
sudo ip route add 192.168.1.128/25 dev tun0
```

## Adding Manual ARP Entries

In some cases you want to manually add a proxy ARP entry rather than relying on the kernel's automatic behavior:

```bash
# Add a static proxy ARP entry
# This tells the system to respond to ARP for 192.168.1.200
# with the MAC address of eth0 on behalf of tun0
sudo arp -i eth0 -s 192.168.1.200 <MAC_of_eth0> pub

# View the ARP table including proxy entries
sudo arp -n

# View using ip neigh (the modern way)
ip neigh show

# Remove a proxy ARP entry
sudo arp -i eth0 -d 192.168.1.200 pub
```

## Using arptables for Selective Proxy ARP

For fine-grained control, `arptables` lets you control which ARP requests get proxied:

```bash
# Install arptables
sudo apt install -y arptables

# Only proxy ARP for a specific destination IP range
sudo arptables -A OUTPUT -o eth0 --opcode Request --dst-ip 192.168.1.200/32 -j ACCEPT

# Block proxy ARP for everything else
# (This is advanced usage - consult arptables documentation for your specific scenario)
```

## Proxy ARP for Public Cloud Scenarios

Cloud environments often use proxy ARP to allow VMs to have IPs that appear to be on the same subnet as the hypervisor's interface. For example, when assigning secondary IPs to VMs:

```bash
# A server with primary IP 203.0.113.10 wants to use secondary IP 203.0.113.11
# for a container or VM

# The cloud hypervisor uses proxy ARP to forward traffic for 203.0.113.11
# to the VM, even though 203.0.113.11 and 203.0.113.10 are on the same /24

# On the host side, you see something like:
sudo ip addr add 203.0.113.11/32 dev dummy0
sudo ip route add 203.0.113.11/32 dev dummy0

# The cloud's network layer handles the proxy ARP externally
```

## Monitoring and Debugging

```bash
# Watch ARP activity on an interface in real time
sudo tcpdump -i eth0 arp

# Filter for ARP requests for a specific IP
sudo tcpdump -i eth0 'arp[6:2] = 1 and arp host 192.168.1.200'

# Check current ARP/neighbor table
ip neigh show

# Flush the ARP cache if you need to reset state
sudo ip neigh flush dev eth0

# Check how many ARP responses the interface has sent
# (Relevant metric if you suspect ARP storms)
cat /proc/net/arp

# Check sysctl settings for proxy ARP
sysctl -a | grep proxy_arp
```

## Potential Issues and Mitigations

**ARP storms**: If proxy ARP is enabled broadly and the network is misconfigured, a single ARP request can trigger cascading responses. Limit proxy ARP to specific interfaces and ensure proper route control.

**Asymmetric routing**: Proxy ARP can cause packets to take different paths in each direction. If you are using stateful firewalls, both directions of a flow must pass through the firewall.

**Gratuitous ARP conflicts**: When a device moves from one network to another with proxy ARP in use, stale ARP cache entries can cause connectivity issues. Shorter ARP cache timeouts help:

```bash
# View and adjust ARP cache timeout (in seconds, default 60)
sysctl net.ipv4.neigh.eth0.base_reachable_time_ms
sudo sysctl -w net.ipv4.neigh.eth0.base_reachable_time_ms=30000

# Adjust garbage collection thresholds
sudo sysctl -w net.ipv4.neigh.default.gc_stale_time=60
```

Proxy ARP solves a specific class of networking problem elegantly. The key is enabling it only on the right interfaces with proper routing in place, rather than enabling it globally and hoping for the best.
