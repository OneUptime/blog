# How to Configure Source NAT (SNAT) with iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, SNAT, NAT, Linux, Networking, Routing

Description: Configure iptables SNAT (Source Network Address Translation) to rewrite the source IP of outgoing packets, enabling multiple hosts to share a single public IP.

SNAT rewrites the source IP address of packets as they leave through a gateway, allowing hosts on a private network to communicate with the internet using the gateway's public IP.

## How SNAT Works

```text
Without SNAT:
  10.0.0.5 → Internet → Internet can't route back to 10.0.0.5 (private IP)

With SNAT on gateway:
  10.0.0.5 → gateway rewrites to 203.0.113.1 → Internet → reply to 203.0.113.1
  → gateway translates back → 10.0.0.5 gets the reply
```

## Basic SNAT Configuration

```bash
# Enable IP forwarding

sudo sysctl -w net.ipv4.ip_forward=1

# SNAT outbound traffic from 10.0.0.0/8 going via eth0
# Changes source IP to the gateway's public IP
sudo iptables -t nat -A POSTROUTING \
  -s 10.0.0.0/8 \
  -o eth0 \
  -j SNAT --to-source 203.0.113.1

# Verify
sudo iptables -t nat -L POSTROUTING -n -v
```

## SNAT to a Specific IP

When the gateway has a static public IP:

```bash
# Gateway has static IP 203.0.113.10 on eth0
# All internal traffic (192.168.1.0/24) appears as 203.0.113.10 externally

sudo iptables -t nat -A POSTROUTING \
  -s 192.168.1.0/24 \
  -o eth0 \
  -j SNAT --to-source 203.0.113.10

# Allow forwarding
sudo iptables -A FORWARD -s 192.168.1.0/24 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -d 192.168.1.0/24 -i eth0 -m conntrack \
  --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## SNAT vs MASQUERADE

```bash
# SNAT (preferred when IP is static):
sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/8 -o eth0 \
  -j SNAT --to-source 203.0.113.1

# MASQUERADE (preferred when IP is dynamic/DHCP):
sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/8 -o eth0 \
  -j MASQUERADE

# Difference:
# SNAT: sets an explicit translated source IP
# MASQUERADE: uses the outgoing interface's current IP automatically
```

## SNAT for a VPN Server

When running an OpenVPN or WireGuard server and clients need internet access through a gateway with a static public IP:

```bash
# WireGuard clients (10.200.0.0/24) exit to internet via eth0
sudo iptables -t nat -A POSTROUTING \
  -s 10.200.0.0/24 \
  -o eth0 \
  -j SNAT --to-source 203.0.113.10
# If eth0 gets its address dynamically, use MASQUERADE instead.

# Allow VPN client forwarding
sudo iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o wg0 -m conntrack \
  --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## Verify NAT Is Working

```bash
# On an internal client, before SNAT:
curl https://api.ipify.org
# Likely fails or times out because replies cannot be routed back to 10.0.0.5

# After SNAT:
curl https://api.ipify.org
# Shows the translated public IP, such as 203.0.113.1

# View NAT table hit counters
sudo iptables -t nat -L POSTROUTING -n -v
# pkts and bytes columns should increment with each connection
```

## Save SNAT Rules

On systems that use `/etc/iptables/rules.v4` (for example Debian/Ubuntu with `iptables-persistent`):

```bash
# Save the current IPv4 ruleset
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'

# The rules.v4 file will include all IPv4 tables and rules, including entries such as:
# *nat
# -A POSTROUTING -s 192.168.1.0/24 -o eth0 -j SNAT --to-source 203.0.113.1
# COMMIT
```

SNAT is what makes shared internet access work in this setup - without it, private IP addresses can't communicate directly with the public internet, since routers can't route back to RFC 1918 addresses.
