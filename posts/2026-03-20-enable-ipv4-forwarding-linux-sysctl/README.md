# How to Enable IPv4 Forwarding on Linux with sysctl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, Sysctl, Routing, IP Forwarding

Description: Enable IPv4 packet forwarding on Linux using sysctl to allow the system to act as a router, NAT gateway, or VPN server, and make the change persistent across reboots.

## Introduction

By default, Linux drops packets that arrive on one interface and need to be forwarded to another - it acts as a host, not a router. Enabling `ip_forward` allows the kernel to route packets between interfaces, which is required for NAT gateways, VPN gateways, Docker hosts, and any router role.

## Checking the Current State

```bash
# Check if IP forwarding is currently enabled

cat /proc/sys/net/ipv4/ip_forward
# 0 = disabled (default for non-router hosts)
# 1 = enabled
```

## Enabling IP Forwarding Temporarily (Runtime)

```bash
# Enable immediately - takes effect instantly, but lost on reboot
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward

# Or using sysctl
sudo sysctl -w net.ipv4.ip_forward=1

# Verify
sysctl net.ipv4.ip_forward
```

## Enabling IP Forwarding Persistently

Write the setting to `/etc/sysctl.d/`:

```bash
# Create a dedicated sysctl config file
sudo tee /etc/sysctl.d/99-ip-forward.conf << 'EOF'
# Enable IPv4 packet forwarding
net.ipv4.ip_forward = 1
EOF

# Apply immediately
sudo sysctl --system

# Verify
sysctl net.ipv4.ip_forward
```

Alternatively, if your system reads `/etc/sysctl.conf` at boot, uncomment the line there:

```bash
sudo sed -i 's/^[#[:space:]]*net\.ipv4\.ip_forward[[:space:]]*=.*/net.ipv4.ip_forward = 1/' /etc/sysctl.conf
sudo sysctl -p
```

## Per-Interface Forwarding

To control whether packets received on a specific interface may be forwarded:

```bash
# Allow packets received on eth0 to be forwarded
sudo sysctl -w net.ipv4.conf.eth0.forwarding=1

# Set forwarding on all current interfaces
sudo sysctl -w net.ipv4.conf.all.forwarding=1
```

## Setting Up NAT After Enabling Forwarding

If the upstream network does not have a route back to the downstream subnet, you also need source NAT. For a dynamically assigned WAN IP, `MASQUERADE` is the usual choice:

```bash
# After enabling ip_forward, add a source NAT rule
# eth0 = WAN, eth1 = LAN
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

## Use Cases for IPv4 Forwarding

| Use Case | Requires Forwarding |
|---|---|
| Linux router | Yes |
| NAT gateway / internet sharing | Yes |
| WireGuard VPN server (routing clients) | Yes |
| OpenVPN server (routing clients) | Yes |
| Docker (bridge networking) | Yes (Docker enables automatically) |
| Regular workstation / server | No |

## Conclusion

Enable IPv4 forwarding with `net.ipv4.ip_forward = 1` in `/etc/sysctl.d/` and apply with `sysctl --system`. Add iptables NAT rules if the system is serving as an internet gateway. This is a prerequisite for any Linux router, VPN gateway, or container host role.
