# Essential iproute2 Commands on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Networking, iproute2, ip command, Linux, Tutorial

Description: Complete guide to iproute2 commands (ip, ss, tc) for modern Linux network configuration and management on Ubuntu.

---

iproute2 is the modern Linux networking toolkit that replaces legacy net-tools (ifconfig, route, netstat). The `ip` command provides unified interface for network configuration, routing, and tunnels. This guide covers essential iproute2 commands on Ubuntu.

## Legacy vs Modern Commands

| Legacy (net-tools) | Modern (iproute2) |
|-------------------|-------------------|
| ifconfig | ip addr, ip link |
| route | ip route |
| arp | ip neigh |
| netstat | ss |
| iptunnel | ip tunnel |
| vconfig | ip link |

## ip addr - Address Management

### View Addresses

```bash
# Show all addresses
ip addr

# Short form
ip a

# Show specific interface
ip addr show eth0

# Show only IPv4
ip -4 addr

# Show only IPv6
ip -6 addr

# Show brief output
ip -br addr

# Show with colors
ip -c addr
```

### Add/Remove Addresses

```bash
# Add IP address
sudo ip addr add 192.168.1.100/24 dev eth0

# Add secondary address
sudo ip addr add 192.168.1.101/24 dev eth0 label eth0:1

# Add IPv6 address
sudo ip addr add 2001:db8::1/64 dev eth0

# Remove IP address
sudo ip addr del 192.168.1.100/24 dev eth0

# Flush all addresses
sudo ip addr flush dev eth0
```

### Address Properties

```bash
# Add address with broadcast
sudo ip addr add 192.168.1.100/24 broadcast 192.168.1.255 dev eth0

# Add address with label
sudo ip addr add 192.168.1.100/24 dev eth0 label eth0:myapp

# Add temporary address (IPv6)
sudo ip addr add 2001:db8::1/64 dev eth0 valid_lft 3600 preferred_lft 1800
```

## ip link - Link Management

### View Links

```bash
# Show all links
ip link

# Short form
ip l

# Show specific link
ip link show eth0

# Show link statistics
ip -s link

# Show detailed info
ip -d link show eth0

# Brief output
ip -br link
```

### Modify Links

```bash
# Bring interface up
sudo ip link set eth0 up

# Bring interface down
sudo ip link set eth0 down

# Set MTU
sudo ip link set eth0 mtu 9000

# Change MAC address
sudo ip link set eth0 down
sudo ip link set eth0 address 00:11:22:33:44:55
sudo ip link set eth0 up

# Rename interface
sudo ip link set eth0 name lan0

# Set promiscuous mode
sudo ip link set eth0 promisc on
```

### Create Virtual Interfaces

```bash
# Create VLAN interface
sudo ip link add link eth0 name eth0.100 type vlan id 100

# Create bridge
sudo ip link add name br0 type bridge

# Add interface to bridge
sudo ip link set eth0 master br0

# Create bonding
sudo ip link add bond0 type bond mode 802.3ad

# Create VXLAN tunnel
sudo ip link add vxlan100 type vxlan id 100 group 239.1.1.1 dev eth0 dstport 4789

# Create macvlan
sudo ip link add macvlan0 link eth0 type macvlan mode bridge

# Delete interface
sudo ip link del eth0.100
```

### Bridge Operations

```bash
# Create bridge
sudo ip link add br0 type bridge

# Add port to bridge
sudo ip link set eth0 master br0
sudo ip link set eth1 master br0

# Remove from bridge
sudo ip link set eth0 nomaster

# Show bridge details
ip -d link show br0

# Set bridge options
sudo ip link set br0 type bridge stp_state 1
sudo ip link set br0 type bridge forward_delay 400
```

## ip route - Routing

### View Routes

```bash
# Show routing table
ip route

# Short form
ip r

# Show route to destination
ip route get 8.8.8.8

# Show cached routes
ip route show cache

# Show specific table
ip route show table main
ip route show table local

# Show IPv6 routes
ip -6 route
```

### Add Routes

```bash
# Add default gateway
sudo ip route add default via 192.168.1.1

# Add network route
sudo ip route add 10.0.0.0/8 via 192.168.1.1

# Add route via interface
sudo ip route add 10.0.0.0/8 dev eth0

# Add route with metric
sudo ip route add 10.0.0.0/8 via 192.168.1.1 metric 100

# Add blackhole route
sudo ip route add blackhole 10.0.0.0/8

# Add unreachable route
sudo ip route add unreachable 10.0.0.0/8
```

### Modify Routes

```bash
# Change route
sudo ip route change 10.0.0.0/8 via 192.168.1.2

# Replace route (add or change)
sudo ip route replace 10.0.0.0/8 via 192.168.1.2

# Delete route
sudo ip route del 10.0.0.0/8

# Delete default gateway
sudo ip route del default

# Flush routing table
sudo ip route flush table main
```

### Policy Routing

```bash
# Add routing rule
sudo ip rule add from 192.168.1.0/24 table 100

# Show rules
ip rule show

# Add route to custom table
sudo ip route add default via 10.0.0.1 table 100

# Mark-based routing
sudo ip rule add fwmark 1 table 100

# Delete rule
sudo ip rule del from 192.168.1.0/24 table 100
```

## ip neigh - Neighbor (ARP) Table

### View Neighbors

```bash
# Show neighbor table
ip neigh

# Short form
ip n

# Show specific interface
ip neigh show dev eth0

# Show with statistics
ip -s neigh
```

### Modify Neighbors

```bash
# Add static ARP entry
sudo ip neigh add 192.168.1.100 lladdr 00:11:22:33:44:55 dev eth0

# Delete entry
sudo ip neigh del 192.168.1.100 dev eth0

# Change entry
sudo ip neigh change 192.168.1.100 lladdr 00:11:22:33:44:66 dev eth0

# Flush neighbor cache
sudo ip neigh flush all
sudo ip neigh flush dev eth0
```

### Neighbor States

| State | Description |
|-------|-------------|
| PERMANENT | Static entry |
| NOARP | No ARP needed |
| REACHABLE | Valid entry |
| STALE | Entry might be outdated |
| DELAY | Waiting for confirmation |
| PROBE | Sending probe |
| FAILED | Resolution failed |

## ip tunnel - Tunnels

### Create GRE Tunnel

```bash
# Create GRE tunnel
sudo ip tunnel add gre1 mode gre remote 203.0.113.1 local 198.51.100.1

# Add addresses
sudo ip addr add 10.0.0.1/30 dev gre1

# Bring up tunnel
sudo ip link set gre1 up
```

### Create IPIP Tunnel

```bash
# Create IPIP tunnel
sudo ip tunnel add ipip1 mode ipip remote 203.0.113.1 local 198.51.100.1

sudo ip addr add 10.0.0.1/30 dev ipip1
sudo ip link set ipip1 up
```

### Manage Tunnels

```bash
# Show tunnels
ip tunnel show

# Delete tunnel
sudo ip tunnel del gre1

# Change tunnel parameters
sudo ip tunnel change gre1 remote 203.0.113.2
```

## ss - Socket Statistics

### View Connections

```bash
# Show all sockets
ss

# Show TCP listening
ss -tln

# Show TCP established
ss -t state established

# Show UDP
ss -uln

# Show with process info
ss -tlnp

# Show with timer info
ss -to
```

### Filter Connections

```bash
# Filter by port
ss -t '( sport = :22 or dport = :22 )'

# Filter by state
ss -t state established
ss -t state time-wait

# Filter by address
ss -t dst 192.168.1.100

# Complex filter
ss -tn 'src 192.168.1.0/24 and dport = :443'
```

### Connection States

```bash
# Show specific states
ss -t state established
ss -t state syn-sent
ss -t state syn-recv
ss -t state fin-wait-1
ss -t state fin-wait-2
ss -t state time-wait
ss -t state close-wait
ss -t state last-ack
ss -t state listen
ss -t state closing
```

## ip netns - Network Namespaces

### Manage Namespaces

```bash
# Create namespace
sudo ip netns add myns

# List namespaces
ip netns list

# Execute command in namespace
sudo ip netns exec myns ip addr

# Delete namespace
sudo ip netns del myns
```

### Connect Namespaces

```bash
# Create veth pair
sudo ip link add veth0 type veth peer name veth1

# Move one end to namespace
sudo ip link set veth1 netns myns

# Configure in namespace
sudo ip netns exec myns ip addr add 10.0.0.2/24 dev veth1
sudo ip netns exec myns ip link set veth1 up
sudo ip netns exec myns ip link set lo up

# Configure host end
sudo ip addr add 10.0.0.1/24 dev veth0
sudo ip link set veth0 up
```

## tc - Traffic Control

### View Queuing

```bash
# Show qdiscs
tc qdisc show

# Show specific interface
tc qdisc show dev eth0

# Show classes
tc class show dev eth0

# Show filters
tc filter show dev eth0
```

### Rate Limiting

```bash
# Add rate limit
sudo tc qdisc add dev eth0 root tbf rate 10mbit burst 32kbit latency 400ms

# Add HTB for shaping
sudo tc qdisc add dev eth0 root handle 1: htb default 12
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit
sudo tc class add dev eth0 parent 1:1 classid 1:12 htb rate 10mbit ceil 100mbit

# Delete qdisc
sudo tc qdisc del dev eth0 root
```

### Simulate Network Conditions

```bash
# Add latency
sudo tc qdisc add dev eth0 root netem delay 100ms

# Add latency with jitter
sudo tc qdisc add dev eth0 root netem delay 100ms 20ms

# Add packet loss
sudo tc qdisc add dev eth0 root netem loss 1%

# Add packet corruption
sudo tc qdisc add dev eth0 root netem corrupt 0.1%

# Add packet reordering
sudo tc qdisc add dev eth0 root netem delay 10ms reorder 25% 50%

# Combine effects
sudo tc qdisc add dev eth0 root netem delay 100ms 20ms loss 1%

# Remove netem
sudo tc qdisc del dev eth0 root
```

## Practical Examples

### Quick Interface Setup

```bash
# Full interface configuration
sudo ip link set eth0 up
sudo ip addr add 192.168.1.100/24 dev eth0
sudo ip route add default via 192.168.1.1
```

### Create VLAN Network

```bash
# Create and configure VLAN
sudo ip link add link eth0 name eth0.100 type vlan id 100
sudo ip addr add 192.168.100.1/24 dev eth0.100
sudo ip link set eth0.100 up
```

### Setup NAT Router

```bash
# Enable forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Configure interfaces
sudo ip addr add 192.168.1.1/24 dev eth1  # LAN
# eth0 gets IP from ISP via DHCP

# NAT is done via iptables/nftables
```

## Persistent Configuration

Changes made with `ip` are temporary. For persistence:

### Using Netplan

```yaml
# /etc/netplan/01-config.yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
```

### Using rc.local

```bash
# /etc/rc.local
ip link set eth0 up
ip addr add 192.168.1.100/24 dev eth0
ip route add default via 192.168.1.1
```

---

iproute2 provides powerful, consistent tools for Linux network management. Mastering these commands is essential for modern system administration. For comprehensive network monitoring and alerting, consider using OneUptime to track your infrastructure health.
