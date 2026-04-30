# How to Configure iptables for a Multi-Homed Linux Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Linux, Multi-Homed, Firewall, Routing, Security

Description: Configure iptables rules on a multi-homed Linux server with multiple network interfaces to apply different security policies per interface and handle routing correctly.

A multi-homed server has multiple network interfaces - typically a public interface (internet-facing) and one or more private interfaces (internal networks). Each interface requires its own firewall policy, and traffic between interfaces needs forwarding rules.

## Multi-Homed Network Topology

```text
Internet
    |
  eth0 (203.0.113.1 - public)
    |
  Linux Server
    |
  eth1 (192.168.1.1 - private LAN 1)
  eth2 (10.0.0.1 - private LAN 2)
```

## Interface-Specific Input Rules

```bash
# Allow all traffic on loopback

sudo iptables -A INPUT -i lo -j ACCEPT

# Public interface (eth0) - strict rules
sudo iptables -A INPUT -i eth0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -i eth0 -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -i eth0 -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -i eth0 -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -i eth0 -j DROP   # Drop everything else from internet

# Private LAN 1 (eth1) - trusted, allow all
sudo iptables -A INPUT -i eth1 -j ACCEPT

# Private LAN 2 (eth2) - trusted, allow all
sudo iptables -A INPUT -i eth2 -j ACCEPT
```

## Forward Traffic Between Interfaces

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Allow forwarding from LAN1 to internet (eth1 → eth0)
sudo iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o eth1 \
  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow forwarding from LAN2 to internet (eth2 → eth0)
sudo iptables -A FORWARD -i eth2 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o eth2 \
  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow forwarding between LANs (if desired)
sudo iptables -A FORWARD -i eth1 -o eth2 -j ACCEPT
sudo iptables -A FORWARD -i eth2 -o eth1 -j ACCEPT

# Default: drop forwarding not explicitly allowed
sudo iptables -P FORWARD DROP
```

## NAT for LAN Clients

```bash
# LAN clients use server's public IP for internet access
sudo iptables -t nat -A POSTROUTING \
  -s 192.168.1.0/24 -o eth0 -j MASQUERADE

sudo iptables -t nat -A POSTROUTING \
  -s 10.0.0.0/24 -o eth0 -j MASQUERADE
```

## Restrict Traffic Between LANs

```bash
# Insert restrictive rules before broader inter-LAN allow rules so they take precedence
sudo iptables -I FORWARD 1 -i eth1 -o eth2 \
  -p tcp --dport 3306 -j ACCEPT  # MySQL access only
sudo iptables -I FORWARD 2 -i eth1 -o eth2 -j DROP
sudo iptables -I FORWARD 3 -i eth2 -o eth1 -j DROP
```

## Output Rules Per Interface

```bash
# Allow all outbound traffic on all interfaces
sudo iptables -P OUTPUT ACCEPT

# Or restrict outbound per interface:
# Start with a default drop policy, then allow specific interfaces
# Allow loopback, internet via eth0, and local LANs via eth1/eth2
sudo iptables -P OUTPUT DROP
sudo iptables -A OUTPUT -o lo -j ACCEPT
sudo iptables -A OUTPUT -o eth0 -j ACCEPT
sudo iptables -A OUTPUT -o eth1 -j ACCEPT
sudo iptables -A OUTPUT -o eth2 -j ACCEPT
```

## Verify Per-Interface Rules

```bash
# Check INPUT chain - look for -i interface matches
sudo iptables -L INPUT -n -v

# Check FORWARD chain - look for -i and -o interface pairs
sudo iptables -L FORWARD -n -v

# View NAT rules for LAN clients
sudo iptables -t nat -L POSTROUTING -n -v
```

Multi-homed firewalling requires thinking about each traffic direction independently - public-to-server, LAN-to-internet, inter-LAN, and server-to-LAN all need separate rules with appropriate trust levels.
