# How to Enable IPv4 Forwarding and NAT for WireGuard on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WireGuard, IPv4, NAT, iptables, Linux, Networking

Description: Enable IPv4 packet forwarding and configure NAT masquerading on Linux so WireGuard VPN clients can access the internet through the server.

For a WireGuard server to provide internet access to its clients, two things must be in place: IP forwarding (so the kernel passes packets between interfaces) and NAT (so responses can find their way back to the correct client).

## Step 1: Enable IPv4 Forwarding

By default, Linux does not forward packets between network interfaces. Enable it with `sysctl`:

```bash
# Check current status (1 = enabled, 0 = disabled)

sysctl net.ipv4.ip_forward

# Enable immediately (non-persistent)
sudo sysctl -w net.ipv4.ip_forward=1

# Make it persistent across reboots
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-wireguard-forward.conf

# Apply the persistent setting now
sudo sysctl -p /etc/sysctl.d/99-wireguard-forward.conf
```

## Step 2: Configure NAT with iptables

NAT masquerading rewrites the source IP of packets leaving the server's internet interface, allowing responses to return correctly.

```bash
# Identify the internet-facing interface
ip route get 8.8.8.8 | awk '{for (i = 1; i <= NF; i++) if ($i == "dev") { print $(i+1); exit }}'
# Output example: eth0

# Allow forwarding from the WireGuard interface
sudo iptables -A FORWARD -i wg0 -j ACCEPT
sudo iptables -A FORWARD -o wg0 -j ACCEPT

# Masquerade outbound traffic from VPN clients
sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE
```

## Step 3: Integrate NAT into the WireGuard Config

Rather than running iptables commands manually, embed them in the `wg-quick` `PostUp` and `PostDown` hooks:

```ini
# /etc/wireguard/wg0.conf

[Interface]
PrivateKey = <SERVER_PRIVATE_KEY>
Address = 10.0.0.1/24
ListenPort = 51820

# Run when wg0 comes up
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE

# Clean up when wg0 goes down
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE
```

`%i` is a `wg-quick` substitution that expands to the interface name (`wg0`).

## Step 4: Persist iptables Rules

```bash
# On Ubuntu/Debian
sudo apt install iptables-persistent -y
sudo netfilter-persistent save

# On RHEL/CentOS systems using iptables-services
sudo iptables-save | sudo tee /etc/sysconfig/iptables > /dev/null
```

## Verifying NAT is Working

```bash
# From a connected VPN client, access the internet
ping 8.8.8.8

# On the server, watch connection tracking events in real time
sudo conntrack -E
```

## Using nftables Instead of iptables

On modern systems using nftables:

```bash
# Add equivalent forwarding and masquerade rules using nft
sudo nft add table inet wgfilter
sudo nft 'add chain inet wgfilter forward { type filter hook forward priority 0; }'
sudo nft add rule inet wgfilter forward iifname "wg0" accept
sudo nft add rule inet wgfilter forward oifname "wg0" accept
sudo nft add table ip wgnat
sudo nft 'add chain ip wgnat postrouting { type nat hook postrouting priority 100; }'
sudo nft add rule ip wgnat postrouting ip saddr 10.0.0.0/24 oifname "eth0" masquerade
```

With IP forwarding and outbound NAT properly configured, VPN clients will be able to access the internet through the server and any private networks that route back through it.
