# How to Configure Policy-Based Routing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Routing, Policy-Based Routing, iproute2

Description: Learn how to configure policy-based routing on Ubuntu using iproute2 rules and multiple routing tables for advanced traffic control scenarios.

---

Standard IP routing selects paths based solely on the destination address. Policy-based routing (PBR) breaks that limitation by letting you route traffic based on source address, incoming interface, DSCP marks, firewall marks, or combinations thereof. This is useful for multi-homed servers, ISP redundancy setups, or when different types of traffic need to take different paths through the network.

## How Policy-Based Routing Works

Linux implements PBR through a hierarchy of routing tables and a rule database that maps traffic to those tables. By default there are three built-in tables:

- **local** (255) - automatically populated by the kernel for local addresses
- **main** (254) - the default routing table
- **default** (253) - the fallback table, usually empty

When a packet needs to be routed, the kernel walks through the rule list (ordered by priority, lower is higher priority) and uses the first matching rule's table to look up the route.

```bash
# View the current rule list
ip rule list

# Output will look like:
# 0:      from all lookup local
# 32766:  from all lookup main
# 32767:  from all lookup default
```

## Scenario: Multi-Homed Server with Two ISPs

The most common PBR use case on a server is having two network interfaces connected to different ISPs. You want traffic from each interface to return via the same ISP it arrived on (symmetric routing), and you can optionally route specific services through a preferred ISP.

### Network Setup

```
eth0: 203.0.113.10/24, gateway 203.0.113.1  (ISP1)
eth1: 198.51.100.20/24, gateway 198.51.100.1 (ISP2)
```

### Creating Custom Routing Tables

```bash
# Add table names to /etc/iproute2/rt_tables for readability
# Table IDs can be 1-252; avoid the built-in ones
sudo tee -a /etc/iproute2/rt_tables <<'EOF'
100     isp1
200     isp2
EOF
```

### Populating the Tables

Each custom table needs at minimum a default route pointing to the appropriate ISP gateway:

```bash
# Table isp1: all traffic exits via ISP1's gateway
sudo ip route add default via 203.0.113.1 dev eth0 table isp1

# Table isp2: all traffic exits via ISP2's gateway
sudo ip route add default via 198.51.100.1 dev eth1 table isp2

# Add the local network routes to each table so packets can reach their source interface
sudo ip route add 203.0.113.0/24 dev eth0 src 203.0.113.10 table isp1
sudo ip route add 198.51.100.0/24 dev eth1 src 198.51.100.20 table isp2
```

### Adding Rules

Rules determine which routing table is consulted for which traffic:

```bash
# Traffic from eth0's IP address uses isp1 table
sudo ip rule add from 203.0.113.10 lookup isp1

# Traffic from eth1's IP address uses isp2 table
sudo ip rule add from 198.51.100.20 lookup isp2

# Verify the rules were added
ip rule list
```

### Testing Symmetric Routing

```bash
# Verify that traffic from each source IP takes the right path
ip route get 8.8.8.8 from 203.0.113.10
ip route get 8.8.8.8 from 198.51.100.20

# Each command should show a different interface and gateway
```

## Routing by Firewall Mark

Netfilter (iptables/nftables) can mark packets, and iproute2 rules can match on those marks. This is powerful for routing by application, port, or any criteria iptables can match.

```bash
# Mark outbound HTTP traffic (port 80 and 443) with mark 0x1
sudo iptables -t mangle -A OUTPUT -p tcp --dport 80 -j MARK --set-mark 1
sudo iptables -t mangle -A OUTPUT -p tcp --dport 443 -j MARK --set-mark 1

# Create a rule that sends marked packets to the isp2 table
# Priority 100 puts it before the default rules
sudo ip rule add fwmark 1 priority 100 lookup isp2

# All HTTP/HTTPS from this machine now routes through ISP2
```

## Routing by Incoming Interface

You can match the incoming interface in rules using the `iif` parameter. This is useful when the server is acting as a router.

```bash
# Traffic arriving on eth2 (a LAN interface) routes through a specific table
sudo ip rule add iif eth2 lookup isp1

# Note: for locally generated traffic, use 'oif' (outgoing interface)
sudo ip rule add oif eth0 lookup isp1
```

## Making PBR Persistent

`ip rule` and `ip route` changes are lost on reboot. The cleanest way to persist them on Ubuntu is using Netplan's routing hooks or a systemd service.

### Using a systemd Service

```bash
# Create a script with all the PBR commands
sudo tee /usr/local/sbin/setup-pbr.sh > /dev/null <<'EOF'
#!/bin/bash

# Flush existing custom rules (keep rules 0, 32766, 32767)
while ip rule del priority 100 2>/dev/null; do :; done
while ip rule del from 203.0.113.10 2>/dev/null; do :; done
while ip rule del from 198.51.100.20 2>/dev/null; do :; done

# Flush custom tables
ip route flush table isp1
ip route flush table isp2

# Populate isp1 table
ip route add default via 203.0.113.1 dev eth0 table isp1
ip route add 203.0.113.0/24 dev eth0 src 203.0.113.10 table isp1

# Populate isp2 table
ip route add default via 198.51.100.1 dev eth1 table isp2
ip route add 198.51.100.0/24 dev eth1 src 198.51.100.20 table isp2

# Add rules
ip rule add from 203.0.113.10 priority 200 lookup isp1
ip rule add from 198.51.100.20 priority 201 lookup isp2

echo "Policy-based routing configured"
EOF

sudo chmod +x /usr/local/sbin/setup-pbr.sh

# Create a systemd unit to run it after networking
sudo tee /etc/systemd/system/pbr-setup.service > /dev/null <<'EOF'
[Unit]
Description=Policy-Based Routing Setup
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/setup-pbr.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable pbr-setup.service
sudo systemctl start pbr-setup.service
```

## Debugging PBR Issues

```bash
# Show all routing tables that have entries
ip route show table all | grep -v "^default\|^local\|^broadcast"

# Show rules with verbose output
ip rule list

# Trace what happens to a specific packet
# (requires iproute2 with 'ip route get' support)
ip route get 8.8.8.8 from 198.51.100.20 iif eth1

# Check if marks are being applied correctly
sudo iptables -t mangle -L OUTPUT -v -n

# Monitor routing cache hits
ip route show cache
```

## Common Pitfalls

Asymmetric routing is the most common problem when PBR is misconfigured. If a packet arrives on eth1 but the reply is sent via eth0 (because the main table points there), stateful firewalls and some network equipment will drop it.

The `rp_filter` sysctl can also cause issues. Ubuntu enables reverse path filtering by default, which drops packets when the source address is not reachable on the interface the packet arrived on. When using PBR with multiple ISPs, you may need to adjust this:

```bash
# Check current rp_filter settings
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.eth0.rp_filter

# Set to loose mode (1=strict, 2=loose, 0=disabled)
# Loose mode is usually sufficient for multi-homed servers
sudo sysctl -w net.ipv4.conf.all.rp_filter=2
sudo sysctl -w net.ipv4.conf.eth0.rp_filter=2
sudo sysctl -w net.ipv4.conf.eth1.rp_filter=2

# Persist it
echo "net.ipv4.conf.all.rp_filter=2" | sudo tee -a /etc/sysctl.d/99-pbr.conf
```

Policy-based routing on Linux is mature and flexible. The combination of iproute2 rules and multiple routing tables can handle virtually any traffic engineering requirement without requiring dedicated routing hardware.
