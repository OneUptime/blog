# How to Set Up GRE Tunnel Between Linux and OPNsense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRE, Tunnel, Linux, OPNsense, IPv4, Networking, Site-to-Site, FreeBSD

Description: Learn how to configure a GRE tunnel between a Linux host and an OPNsense firewall to extend Layer 3 connectivity across separate network segments.

---

A GRE tunnel between Linux and OPNsense creates a virtual point-to-point link for routing traffic between networks. OPNsense uses FreeBSD's GRE implementation, which is compatible with Linux.

## Architecture

```text
Linux Host (10.0.0.1)     ──GRE Tunnel──     OPNsense (10.0.0.2)
  172.16.1.1/30                                   172.16.1.2/30
  LAN: 192.168.1.0/24                             LAN: 192.168.2.0/24
```

## Linux Side Configuration

```bash
# Create the GRE tunnel

ip tunnel add gre1 \
  mode gre \
  local 10.0.0.1 \
  remote 10.0.0.2 \
  ttl 255

# Assign inner IP
ip addr add 172.16.1.1/30 dev gre1
ip link set gre1 up

# If this Linux system routes a LAN behind it, enable IPv4 forwarding
sysctl -w net.ipv4.ip_forward=1

# Route traffic to OPNsense LAN through tunnel
ip route add 192.168.2.0/24 via 172.16.1.2 dev gre1

# Make persistent with systemd-networkd
# /etc/systemd/network/gre1.netdev
```

## OPNsense Side Configuration

```text
Interfaces → Devices → GRE → Add

  Parent Interface: WAN (or the interface facing Linux host)
  GRE Remote Address: 10.0.0.1     (Linux host's outer IP)
  GRE Tunnel Local Address: 172.16.1.2/30
  GRE Tunnel Remote Address: 172.16.1.1
  Description: GRE to Linux
```

After saving:

```text
Interfaces → Assignments
  Assign the new GRE interface (greX)
  Enable the interface
  Confirm the tunnel local address is 172.16.1.2/30
```

## Static Routes on OPNsense

```text
System → Routes → Configuration → Add

  Network: 192.168.1.0/24
  Gateway: GRE_GW (create a gateway pointing to 172.16.1.1)
  Description: Linux LAN via GRE
```

## Firewall Rules on OPNsense

```text
Firewall → Rules → GRE interface

Add rule:
  Protocol: any
  Source: 192.168.1.0/24
  Destination: 192.168.2.0/24
  Action: Pass
  Description: Allow GRE tunnel traffic
```

## Verifying the GRE Tunnel

```bash
# On Linux:
ping 172.16.1.2              # Ping OPNsense inner IP
traceroute 192.168.2.1       # Should route through gre1

# On OPNsense shell (SSH):
ping 172.16.1.1              # Ping Linux inner IP
ifconfig gre0
route -n get 192.168.1.0
```

## Troubleshooting

```bash
# Linux: Capture GRE packets
tcpdump -i eth0 -nn proto 47   # GRE is IP protocol 47

# OPNsense: Check GRE interface
# Interfaces → Overview → GRE interface → check status

# Common issue: firewall blocking GRE (protocol 47)
# Ensure WAN firewall rules allow IP protocol 47 from peer IP
```

## Key Takeaways

- GRE uses IP protocol 47 (not TCP/UDP); ensure firewall rules allow protocol 47 between the two endpoints.
- On OPNsense, configure the GRE tunnel under `Interfaces → Devices → GRE` and then assign it as an interface.
- Add static routes on both sides to direct LAN-to-LAN traffic through the tunnel.
- Use `tcpdump -i eth0 proto 47` to verify GRE packets are being sent and received.
