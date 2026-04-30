# How to Set Up IP Forwarding on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Linux, IPv4, NAT

Description: Learn how to enable IPv4 packet forwarding on Linux so it can act as a router, NAT gateway, or VPN server.

## What Is IP Forwarding?

IP forwarding allows a Linux host to forward packets between network interfaces. Without it, packets destined for other hosts are dropped at the Linux kernel level. It is required for:

- NAT gateways
- Linux routers
- VPN servers (WireGuard, OpenVPN)
- Container hosts (Docker, Kubernetes)

## Checking Current State

```bash
# Check if IPv4 forwarding is enabled

cat /proc/sys/net/ipv4/ip_forward
# 0 = disabled, 1 = enabled

# Or with sysctl
sysctl net.ipv4.ip_forward
```

## Enabling IP Forwarding Temporarily

```bash
# Enable (lost at reboot)
echo 1 > /proc/sys/net/ipv4/ip_forward

# Or with sysctl
sysctl -w net.ipv4.ip_forward=1
```

## Enabling IP Forwarding Permanently

```bash
# Edit /etc/sysctl.conf
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf

# Apply immediately
sysctl -p

# Verify
sysctl net.ipv4.ip_forward
```

Alternatively, create a drop-in file:

```bash
cat > /etc/sysctl.d/99-ip-forward.conf << 'EOF'
net.ipv4.ip_forward = 1
EOF
sysctl -p /etc/sysctl.d/99-ip-forward.conf
```

## IPv6 Forwarding

For IPv6 routing, enable separately:

```bash
# Enable IPv6 forwarding
sysctl -w net.ipv6.conf.all.forwarding=1

# Persist
echo "net.ipv6.conf.all.forwarding = 1" >> /etc/sysctl.conf
```

## Per-Interface Forwarding

Linux also exposes an interface-specific forwarding control:

```bash
# Enable forwarding on eth1
sysctl -w net.ipv4.conf.eth1.forwarding=1

# This controls whether packets received on eth1 can be forwarded
```

## Verifying Forwarding Works

```bash
# From a host behind the Linux router, test routing
traceroute 8.8.8.8
# Should show the Linux router as hop 1

# On the Linux router, confirm packets are forwarded
tcpdump -n -i eth0 'host CLIENT_IP'
tcpdump -n -i eth1
# Client packets should arrive on eth0 and leave via eth1
```

## Common Use Cases

### NAT Gateway

```bash
sysctl -w net.ipv4.ip_forward=1
iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE
iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT
iptables -A FORWARD -i eth1 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

### WireGuard VPN Server

```bash
# /etc/wireguard/wg0.conf
[Interface]
PostUp = sysctl -w net.ipv4.ip_forward=1; iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

### Docker and Kubernetes

On Linux, Docker may enable IP forwarding automatically for its default bridge networking, but Kubernetes networking varies by implementation, so you may need to enable it yourself:

```bash
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/k8s.conf
sysctl --system
```

## Key Takeaways

- `net.ipv4.ip_forward = 1` enables packet forwarding between interfaces.
- Without it, a multi-interface Linux host drops packets not destined for itself.
- Persist the setting in `/etc/sysctl.conf` or `/etc/sysctl.d/`.
- Both NAT gateways and VPN servers require IP forwarding.

**Related Reading:**

- [How to Configure NAT on Linux Using iptables](https://oneuptime.com/blog/post/2026-03-20-nat-linux-iptables/view)
- [How to Enable IPv4 Packet Forwarding on a Linux Router](https://oneuptime.com/blog/post/2026-03-20-enable-ipv4-forwarding-linux-router/view)
- [How to Configure Policy-Based Routing on Linux](https://oneuptime.com/blog/post/2026-03-20-policy-based-routing-linux/view)
