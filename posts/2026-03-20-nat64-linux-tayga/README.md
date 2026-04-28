# How to Set Up NAT64 with TAYGA on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAT64, Tayga, IPv6, IPv4, Translation, Linux, Networking

Description: Install and configure TAYGA, a stateless NAT64 translator on Linux, to allow IPv6-only hosts to communicate with IPv4-only services.

## Introduction

NAT64 translates between IPv6 and IPv4, enabling IPv6-only clients to reach IPv4-only services. TAYGA is a stateless NAT64 implementation for Linux that uses a TUN interface to perform the translation. It works alongside a DNS64 server that synthesizes AAAA records for IPv4 destinations.

## Architecture

```text
IPv6-only client (2001:db8::10)
       ↓
  DNS64 (returns 64:ff9b::8.8.8.8 for google.com)
       ↓
  Packet to 64:ff9b::8.8.8.8 (IPv6)
       ↓
  TAYGA (translates: extracts 8.8.8.8 from 64:ff9b:: prefix)
       ↓
  IPv4 Internet (8.8.8.8)
```

## Installation

```bash
# Debian/Ubuntu

sudo apt install tayga

# RHEL/CentOS
sudo yum install tayga

# Or build from source
wget http://www.litech.org/tayga/tayga-0.9.2.tar.bz2
tar xjf tayga-0.9.2.tar.bz2
cd tayga-0.9.2
./configure && make && sudo make install
```

## TAYGA Configuration

```bash
# /etc/tayga.conf

# TUN interface name
tun-device nat64

# IPv4 address for TAYGA's TUN interface
ipv4-addr 192.168.255.1

# IPv4 pool for NAT64 translations
# Assign temporary IPv4 from here to IPv6 sources
dynamic-pool 192.168.255.0/24

# NAT64 prefix (well-known: 64:ff9b::/96)
prefix 64:ff9b::/96

# Data directory for state
data-dir /var/db/tayga
```

## Enabling IP Forwarding

```bash
# Enable IP forwarding for both families
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Persist
cat >> /etc/sysctl.conf << 'EOF'
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1
EOF
sudo sysctl -p
```

## Setting Up Routes

```bash
# Initialize TAYGA (creates the TUN interface)
sudo tayga --config /etc/tayga.conf --mktun

# Add IPv4 route to dynamic pool via TUN interface
sudo ip route add 192.168.255.0/24 dev nat64

# Add IPv6 route for the NAT64 prefix via TUN interface
sudo ip -6 route add 64:ff9b::/96 dev nat64

# Add masquerade for outgoing IPv4 traffic from translated sources
sudo iptables -t nat -A POSTROUTING -s 192.168.255.0/24 -j MASQUERADE
```

## Starting TAYGA

```bash
# Run TAYGA
sudo tayga --config /etc/tayga.conf

# Check TUN interface is up
ip address show nat64

# Make persistent with systemd
# /etc/systemd/system/tayga.service
cat > /etc/systemd/system/tayga.service << 'EOF'
[Unit]
Description=TAYGA NAT64
After=network.target

[Service]
ExecStartPre=/usr/sbin/tayga --mktun
ExecStart=/usr/sbin/tayga --config /etc/tayga.conf
ExecStopPost=/usr/sbin/tayga --rmtun

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now tayga
```

## Testing NAT64

```bash
# From IPv6-only client, ping an IPv4 address using 64:ff9b:: prefix
# 8.8.8.8 = 64:ff9b::8.8.8.8 = 64:ff9b::808:808
ping -6 64:ff9b::8.8.8.8

# Test with curl (IPv6 literals in URLs must be in square brackets)
curl -6 'http://[64:ff9b::93.184.216.34]/'    # Example domain IPv4 via NAT64

# Check TAYGA dynamic mappings (stored in data-dir)
sudo cat /var/db/tayga/dynamic.map
```

## Conclusion

TAYGA implements NAT64 by creating a TUN interface that translates IPv6 packets with the 64:ff9b::/96 prefix into IPv4 packets and vice versa. The key steps are: configure `tayga.conf` with the NAT64 prefix and dynamic IPv4 pool, add routes pointing both the IPv4 pool and NAT64 prefix to the TUN interface, enable IP forwarding, and add iptables masquerade for the IPv4 pool. Pair with DNS64 to complete the solution.
