# How to Configure an IPIP Tunnel with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPIP, Tunnel, systemd-networkd, Linux, IPv4, .netdev, IP-in-IP, Networking

Description: Learn how to configure an IPIP (IP-in-IP) tunnel using systemd-networkd .netdev and .network files for persistent IPv4-over-IPv4 encapsulation.

---

IPIP (IP-in-IP) tunnels encapsulate IPv4 packets inside IPv4 packets with minimal overhead - just 20 bytes per packet, less than GRE's 24 bytes. They're useful for simple point-to-point connectivity.

## IPIP vs. GRE

| Feature | IPIP | GRE |
|---------|------|-----|
| Overhead | 20 bytes | 24 bytes |
| Multicast support | No | Yes |
| Key support | No | Yes |
| Protocol number | 4 | 47 |
| Complexity | Simpler | More flexible |

## Creating an IPIP Tunnel with systemd-networkd

### Step 1: Define the Tunnel Device

```ini
# /etc/systemd/network/ipip1.netdev

[NetDev]
Name=ipip1
Kind=ipip

[Tunnel]
# This host's outer IP
Local=10.0.0.1
# Remote tunnel endpoint
Remote=10.0.0.2
TTL=255
Independent=yes
```

### Step 2: Configure the Tunnel Network

```ini
# /etc/systemd/network/ipip1.network
[Match]
Name=ipip1

[Network]
Address=172.16.1.1/30

[Route]
Destination=192.168.2.0/24
Gateway=172.16.1.2
```

### Step 3: Apply

```bash
networkctl reload
networkctl status ipip1
ip link show ipip1
ip addr show ipip1
```

## Remote Side Configuration

```ini
# On 10.0.0.2:
# /etc/systemd/network/ipip1.netdev
[NetDev]
Name=ipip1
Kind=ipip

[Tunnel]
Independent=yes
Local=10.0.0.2
Remote=10.0.0.1
TTL=255
```

```ini
# /etc/systemd/network/ipip1.network
[Match]
Name=ipip1

[Network]
Address=172.16.1.2/30

[Route]
Destination=192.168.1.0/24
Gateway=172.16.1.1
```

## Manual IPIP Tunnel (Temporary)

```bash
# Create IPIP tunnel manually
ip tunnel add ipip1 mode ipip local 10.0.0.1 remote 10.0.0.2 ttl 255

# Assign IP and bring up
ip addr add 172.16.1.1/30 dev ipip1
ip link set ipip1 up

# Add route
ip route add 192.168.2.0/24 via 172.16.1.2 dev ipip1
```

## Verifying the Tunnel

```bash
# Show tunnel details
ip -d link show ipip1
# ipip1: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1480
#     ipip remote 10.0.0.2 local 10.0.0.1 ttl 255

# Test connectivity
ping 172.16.1.2
ping 192.168.2.1   # Remote LAN

# Capture IPIP traffic (protocol 4)
tcpdump -i eth0 -nn proto 4
```

## Firewall: Allow IPIP Protocol 4

```bash
# iptables
iptables -A INPUT -p 4 -j ACCEPT   # IP protocol 4 = IPIP
iptables -A OUTPUT -p 4 -j ACCEPT
```

```nft
# nftables
table ip filter {
  chain input {
    type filter hook input priority 0; policy accept;
    ip protocol 4 accept comment "IPIP tunnels"
  }

  chain output {
    type filter hook output priority 0; policy accept;
    ip protocol 4 accept comment "IPIP tunnels"
  }
}
```

## Key Takeaways

- IPIP tunnels use IP protocol 4 (not TCP/UDP); allow proto 4 between endpoints in firewall rules.
- In systemd-networkd, use `Kind=ipip` in the `.netdev` file with a `[Tunnel]` section for Local/Remote IPs, and set `Independent=yes` unless you create the tunnel from an underlying interface with `Tunnel=`.
- IPIP has lower overhead than GRE but no support for multicast or tunnel keys - use GRE when those are needed.
- MTU on IPIP tunnels is 20 bytes less than the physical interface (1500-20=1480 for standard Ethernet).
