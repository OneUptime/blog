# How to Allow ESP Protocol Traffic Through iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, ESP, iptables, Linux, Firewall, Protocol 50

Description: Configure iptables rules to allow ESP (Encapsulating Security Payload, IP protocol 50) traffic for IPsec VPN packet forwarding.

ESP (Encapsulating Security Payload) is IP protocol number 50 - distinct from TCP (6) and UDP (17). It carries the encrypted IPsec payload. Without explicit iptables rules, a default-deny firewall blocks all ESP traffic.

## Understanding ESP in iptables

ESP is a raw IP protocol, not a TCP/UDP service. It cannot be identified by port number:

```bash
# ESP is identified by protocol number 50

# NOT by port number

# Wrong approach (doesn't work for ESP):
iptables -A INPUT -p udp --dport 50 -j ACCEPT  # INCORRECT

# Correct approach (use protocol name or number):
iptables -A INPUT -p esp -j ACCEPT              # By name
iptables -A INPUT -p 50 -j ACCEPT              # By number (same thing)
```

## Basic ESP Allow Rules

```bash
# Allow inbound ESP from any source
sudo iptables -A INPUT -p esp -j ACCEPT

# Allow outbound ESP
sudo iptables -A OUTPUT -p esp -j ACCEPT

# Allow ESP forwarding (for a gateway/router)
sudo iptables -A FORWARD -p esp -j ACCEPT
```

## Restricting ESP to Specific Peer

```bash
# Only allow ESP from/to a specific VPN peer
PEER_IP="5.6.7.8"

# Inbound ESP from peer
sudo iptables -A INPUT -s $PEER_IP -p esp -j ACCEPT

# Outbound ESP to peer
sudo iptables -A OUTPUT -d $PEER_IP -p esp -j ACCEPT
```

## Complete IPsec Ruleset

```bash
#!/bin/bash
# ipsec-firewall.sh - Complete IPsec firewall rules
set -e

PEER_IP="${1:-0.0.0.0/0}"  # Default to any peer, or pass specific IP

echo "Applying IPsec firewall rules for peer: $PEER_IP"

# Allow IKE
iptables -A INPUT -s $PEER_IP -p udp --dport 500 -j ACCEPT
iptables -A OUTPUT -d $PEER_IP -p udp --dport 500 -j ACCEPT

# Allow NAT-T
iptables -A INPUT -s $PEER_IP -p udp --dport 4500 -j ACCEPT
iptables -A OUTPUT -d $PEER_IP -p udp --dport 4500 -j ACCEPT

# Allow ESP (encrypted data)
iptables -A INPUT -s $PEER_IP -p esp -j ACCEPT
iptables -A OUTPUT -d $PEER_IP -p esp -j ACCEPT

# Allow forwarding for IPsec traffic
iptables -A FORWARD -m policy --dir in --pol ipsec -j ACCEPT
iptables -A FORWARD -m policy --dir out --pol ipsec -j ACCEPT

echo "Done"
```

## Making Rules Persistent

```bash
# Ubuntu/Debian with iptables-persistent
sudo apt install iptables-persistent -y
sudo netfilter-persistent save

# Or manually save and restore
sudo iptables-save -f /etc/iptables/rules.v4

# Restore manually later:
sudo iptables-restore < /etc/iptables/rules.v4
```

## Verifying ESP Traffic Flows

```bash
# View ESP-related rules
sudo iptables -L -n | grep -i "esp\|50"

# Capture ESP traffic to confirm it's passing through
sudo tcpdump -i eth0 -n proto 50

# When NAT-T is not in use, expect ESP packets like:
# 1.2.3.4 > 5.6.7.8: ESP(spi=0x12345678, seq=0x1)

# Check kernel IPsec state/policy
sudo ip xfrm state list
sudo ip xfrm policy list
```

## Checking if ESP is Being Blocked

```bash
# If native ESP is blocked, tcpdump may show IKE on UDP 500/4500 but no protocol 50 packets
sudo tcpdump -i eth0 -n 'proto 50 or (udp port 500 or udp port 4500)'

# If NAT-T is in use, encrypted payloads may appear only on UDP 4500 rather than as raw ESP

# Check DROP counters
sudo iptables -L FORWARD -n -v | grep DROP
```

## AH Protocol (Protocol 51)

```bash
# AH (Authentication Header) is less common but may also need to be allowed
sudo iptables -A INPUT -p ah -j ACCEPT
sudo iptables -A OUTPUT -p ah -j ACCEPT
```

Allowing ESP protocol (50) is a commonly forgotten step when setting up IPsec behind a firewall without NAT-T. Without it, IKE may negotiate successfully but native ESP data cannot flow.
