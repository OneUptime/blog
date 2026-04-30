# How to Set Up IP Masquerading with iptables for Internet Sharing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Masquerade, NAT, Linux, Internet Sharing, Networking

Description: Configure iptables MASQUERADE to share an internet connection with hosts on a private network, automatically translating source IPs regardless of the gateway's public address.

IP Masquerading is the most common NAT configuration for Linux gateways and routers. It allows multiple devices on a private network to share a single internet connection, with the gateway automatically handling address translation.

## What Masquerading Does

```text
Private network: 192.168.1.0/24
Gateway: eth0 (public internet), eth1 (private LAN 192.168.1.1)

Without masquerade:
  Host 192.168.1.50 → can't reach internet (private IP not routable)

With masquerade:
  Host 192.168.1.50 → gateway sees private IP
  Gateway translates: 192.168.1.50 → gateway's public IP
  Internet server replies to gateway's public IP
  Gateway translates back → delivers to 192.168.1.50
```

## Enable IP Forwarding (Required)

```bash
# Must enable before masquerading works

sudo sysctl -w net.ipv4.ip_forward=1

# Make permanent
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Configure Masquerading

```bash
# Basic masquerade: all traffic exiting through eth0 gets translated
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# More specific: only masquerade LAN traffic (192.168.1.0/24)
sudo iptables -t nat -A POSTROUTING \
  -s 192.168.1.0/24 -o eth0 -j MASQUERADE

# Allow forwarding between interfaces
sudo iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o eth1 \
  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## Complete Gateway Setup

```bash
#!/bin/bash
# setup-gateway.sh - Complete internet sharing gateway

LAN_IFACE="eth1"
WAN_IFACE="eth0"
LAN_NET="192.168.1.0/24"

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Reset existing rules
sudo iptables -F
sudo iptables -t nat -F

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow LAN to WAN forwarding
sudo iptables -A FORWARD -i "$LAN_IFACE" -o "$WAN_IFACE" -j ACCEPT

# Masquerade LAN traffic exiting via WAN
sudo iptables -t nat -A POSTROUTING \
  -s "$LAN_NET" -o "$WAN_IFACE" -j MASQUERADE

# Allow SSH to gateway itself
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

echo "Gateway configured for internet sharing"
```

## WireGuard VPN Internet Sharing

If VPN clients need internet access through the server:

```bash
# Forward WireGuard client traffic to internet
WG_IFACE="wg0"
WAN_IFACE="eth0"

sudo iptables -A FORWARD -i "$WG_IFACE" -o "$WAN_IFACE" -j ACCEPT
sudo iptables -A FORWARD -i "$WAN_IFACE" -o "$WG_IFACE" \
  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Masquerade VPN traffic
sudo iptables -t nat -A POSTROUTING \
  -o "$WAN_IFACE" -j MASQUERADE
```

## Verify Masquerading is Working

```bash
# Check the NAT rule is in place
sudo iptables -t nat -L POSTROUTING -n -v

# Output:
# Chain POSTROUTING (policy ACCEPT)
# target      prot  source         destination
# MASQUERADE  all   192.168.1.0/24  0.0.0.0/0

# From a client on the LAN:
curl https://api.ipify.org
# Should return the gateway's public IP, not 192.168.1.x
```

## Save and Persist

```bash
# Install iptables-persistent so rules can be restored on boot
sudo apt install iptables-persistent -y

# Save rules (including NAT table)
sudo iptables-save -f /etc/iptables/rules.v4
sudo netfilter-persistent save
```

Masquerading is the simplest form of outbound NAT - it requires just one rule and automatically handles dynamic IP changes, making it ideal for home gateways, VPN servers, and Linux hosts sharing internet access when the external IP can change.
