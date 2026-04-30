# How to Use ip rule and ip route for Policy-Based Routing on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Policy Routing, Ip rule, Ip route, IPv4

Description: Implement policy-based routing on Linux using ip rule to match traffic by source, destination, or mark, and ip route to direct matched traffic to custom routing tables.

## Introduction

Policy-based routing (PBR) on Linux uses a two-step system: `ip rule` defines which packets are subject to special routing, and `ip route` populates the custom routing tables those rules point to. Together they allow fine-grained control over routing decisions beyond destination-only matching.

## How ip rule Works

The kernel evaluates routing rules in priority order (lower = higher priority). Each rule specifies a **selector** (which packets it matches) and a **table** to look up when matched.

```bash
# View all current routing rules

ip rule show
```

Default rules:

```text
0:      from all lookup local       # Local addresses (highest priority)
32766:  from all lookup main        # Standard routing table
32767:  from all lookup default     # Usually empty fallback
```

## Rule Selectors

| Selector | Example | Matches |
|---|---|---|
| `from <address>` | `from 10.0.0.5` | Source IP |
| `to <address>` | `to 8.8.8.8` | Destination IP |
| `fwmark <mark>` | `fwmark 0x1` | Netfilter packet mark |
| `tos <value>` | `tos 0x10` | TOS/DS field |
| `iif <interface>` | `iif eth0` | Incoming interface |

## Scenario 1: Route Traffic by Source IP

```bash
# Register table 100 with the name "vpn"
echo "100 vpn" | sudo tee -a /etc/iproute2/rt_tables

# Populate table 100: route to VPN gateway
sudo ip route add default via 10.8.0.1 dev tun0 table vpn
sudo ip route add 192.168.1.0/24 dev eth0 table vpn  # local return path

# Add rule: traffic from 192.168.1.50 uses vpn table
sudo ip rule add from 192.168.1.50 table vpn priority 100
```

## Scenario 2: Route by Netfilter Mark

Use iptables to mark traffic, then route marked packets:

```bash
# Mark packets going to port 80 with mark 1
sudo iptables -t mangle -A OUTPUT -p tcp --dport 80 -j MARK --set-mark 1

# Route marked packets through a specific gateway
sudo ip route add default via 192.168.2.1 dev eth1 table 200
sudo ip rule add fwmark 0x1 table 200 priority 150
```

## Scenario 3: Route by Incoming Interface

Useful when routing forwarded traffic received on multiple interfaces:

```bash
# Forwarded traffic received on eth1 should use eth1's routing table
sudo ip route add default via 10.0.0.1 dev eth1 table 300
sudo ip rule add iif eth1 table 300 priority 200
```

## Removing Rules and Cleaning Up

```bash
# Delete a specific rule
sudo ip rule del from 192.168.1.50 table vpn

# Flush all rules, including the default three
sudo ip rule flush
# Re-add the mandatory rules
sudo ip rule add from all lookup local priority 0
sudo ip rule add from all lookup main priority 32766
sudo ip rule add from all lookup default priority 32767
```

## Verifying Policy Routing

```bash
# Inspect current rule order and priorities
ip rule show | head -20

# Test route lookup with specific source
ip route get 8.8.8.8 from 192.168.1.50
```

## Making Rules Persistent

Add the `ip rule` and `ip route` commands to a startup script or NetworkManager dispatcher:

```bash
sudo tee /etc/NetworkManager/dispatcher.d/99-pbr << 'EOF'
#!/bin/bash
if [ "$1" = "tun0" ] && [ "$2" = "vpn-up" ]; then
    ip rule del from 192.168.1.50 table vpn priority 100 2>/dev/null
    ip rule add from 192.168.1.50 table vpn priority 100
    ip route replace default via 10.8.0.1 dev tun0 table vpn
fi
EOF
sudo chmod +x /etc/NetworkManager/dispatcher.d/99-pbr
```

## Conclusion

`ip rule` defines which packets are redirected, and `ip route` in custom tables defines where they go. Combine source, destination, and mark selectors to build complex routing policies. Always test with `ip route get` before deploying to confirm the kernel selects the intended route.
