# How to Configure a GRE Tunnel with systemd-networkd - Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRE, Tunnel, systemd-networkd, Linux, Networking, VPN, Routing

Description: Learn how to configure a GRE (Generic Routing Encapsulation) tunnel between two Linux hosts using systemd-networkd, including routing configuration and persistence across reboots.

---

GRE (Generic Routing Encapsulation) tunnels encapsulate network layer packets for transport across another network. Unlike VPNs, GRE provides no encryption - it's used for routing and network interconnection. This guide covers configuring GRE tunnels with systemd-networkd.

---

## GRE Tunnel Overview

```text
Host A (198.51.100.10) ←→ Internet ←→ Host B (203.0.113.20)
       [GRE tunnel: 10.100.0.1/30 ←→ 10.100.0.2/30]
```

GRE encapsulates packets in IP, adding a 24-byte overhead. The underlying transport uses IP protocol 47.

---

## Prerequisites

- Two Linux hosts with systemd-networkd
- Routable connectivity between the two tunnel endpoints
- Root/sudo access

---

## Configure Host A (Server Side)

### Create the GRE Tunnel Netdev

```ini
# /etc/systemd/network/10-gre-tunnel.netdev

[NetDev]
Name=gre-to-hostb
Kind=gre

[Tunnel]
# Host A's public or routed IP used as the tunnel source
Local=198.51.100.10
# Host B's public or routed IP used as the tunnel destination
Remote=203.0.113.20
TTL=64
```

### Assign IP to the Tunnel Interface

```ini
# /etc/systemd/network/10-gre-tunnel.network
[Match]
Name=gre-to-hostb

[Network]
Address=10.100.0.1/30

[Route]
# Network reachable via Host B
Destination=10.200.0.0/24
Gateway=10.100.0.2
```

### Apply Configuration

```bash
sudo systemctl restart systemd-networkd

# Verify interface is up
ip link show gre-to-hostb
ip addr show gre-to-hostb
```

---

## Configure Host B (Remote Side)

### Netdev File

```ini
# /etc/systemd/network/10-gre-tunnel.netdev
[NetDev]
Name=gre-to-hosta
Kind=gre

[Tunnel]
# Host B's public or routed IP
Local=203.0.113.20
# Host A's public or routed IP
Remote=198.51.100.10
TTL=64
```

### Network File

```ini
# /etc/systemd/network/10-gre-tunnel.network
[Match]
Name=gre-to-hosta

[Network]
Address=10.100.0.2/30

[Route]
# Network reachable via Host A
Destination=192.168.1.0/24
Gateway=10.100.0.1
```

```bash
sudo systemctl restart systemd-networkd
```

---

## Verify the Tunnel

```bash
# Check tunnel interface
ip link show gre-to-hostb
# Should show the interface with the UP flag

# Check IP assignment
ip addr show gre-to-hostb
# inet 10.100.0.1/30 ...

# Ping the remote tunnel endpoint
ping 10.100.0.2

# Trace the route
traceroute 10.100.0.2

# Check the routing table
ip route show | grep gre
# 10.100.0.0/30 dev gre-to-hostb proto kernel scope link src 10.100.0.1
# 10.200.0.0/24 via 10.100.0.2 dev gre-to-hostb
```

---

## GRE over IPv6 (GREv6)

For GRE running over an IPv6 transport network:

```ini
# /etc/systemd/network/10-grev6-tunnel.netdev
[NetDev]
Name=grev6-tunnel
Kind=ip6gre

[Tunnel]
# Local IPv6 address
Local=2001:db8:a::1
# Remote IPv6 address
Remote=2001:db8:b::1
```

```ini
# /etc/systemd/network/10-grev6-tunnel.network
[Match]
Name=grev6-tunnel

[Network]
Address=10.100.0.1/30
```

---

## Firewall Rules for GRE

Allow IP protocol 47 (GRE) through the firewall:

```bash
# iptables
sudo iptables -A INPUT -p gre -j ACCEPT
sudo iptables -A OUTPUT -p gre -j ACCEPT
sudo iptables -A FORWARD -i gre-to-hostb -j ACCEPT
sudo iptables -A FORWARD -o gre-to-hostb -j ACCEPT

# nftables
sudo nft add rule inet filter input ip protocol gre accept
sudo nft add rule inet filter forward iifname "gre-to-hostb" accept
sudo nft add rule inet filter forward oifname "gre-to-hostb" accept

# Make persistent on Debian/Ubuntu with iptables-persistent
sudo iptables-save -f /etc/iptables/rules.v4
```

---

## Enable IP Forwarding

For the hosts to route traffic between networks:

```bash
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## GRE with Multiple Tunnels

```ini
# /etc/systemd/network/10-gre-site-b.netdev
[NetDev]
Name=gre-site-b
Kind=gre
[Tunnel]
Local=198.51.100.10
Remote=203.0.113.20

# /etc/systemd/network/11-gre-site-c.netdev
[NetDev]
Name=gre-site-c
Kind=gre
[Tunnel]
Local=198.51.100.10
Remote=203.0.113.30
```

---

## Troubleshooting

```bash
# Check if tunnel interface exists
ip tunnel show

# Verify GRE traffic is flowing
sudo tcpdump -i eth0 proto gre

# Check MTU (GRE reduces effective MTU by 24 bytes)
ip link show gre-to-hostb | grep mtu
# Set explicit MTU at runtime
sudo ip link set gre-to-hostb mtu 1476  # 1500 - 24 GRE overhead

# Check routing
ip route get 10.200.0.1
```

---

## Best Practices

1. **Set MTU explicitly** to 1476 (1500 - 24 GRE header) to avoid fragmentation
2. **Use TCP MSS clamping** to handle MTU for TCP traffic over the tunnel
3. **Consider IPsec** if you need encrypted GRE tunnels
4. **Monitor tunnel interface** - GRE tunnels fail silently if the remote endpoint is unreachable
5. **Use monitoring** to detect tunnel failures promptly

---

## Conclusion

systemd-networkd makes GRE tunnel configuration clean and persistent. Create a `.netdev` file for the tunnel definition and a `.network` file for IP assignment and routing. Restart systemd-networkd to apply, and verify with `ping` across the tunnel endpoints.

---

*Monitor your tunnel connectivity and network health with [OneUptime](https://oneuptime.com).*
