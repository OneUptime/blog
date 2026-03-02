# How to Set Up GRE Tunnels on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Tunneling, GRE, VPN

Description: A practical guide to creating Generic Routing Encapsulation (GRE) tunnels on Ubuntu using iproute2, covering point-to-point tunnels, routing configuration, and persistent setup.

---

Generic Routing Encapsulation (GRE) is a tunneling protocol that wraps packets from one network protocol inside packets of another. On Linux, GRE is built into the kernel and can be configured with standard `ip` commands. It is simpler than VXLAN or WireGuard - no keys, no encryption, just encapsulation - which makes it useful for connecting networks where the underlying connection is already secure (private data centers, leased lines) or where encryption is handled by a separate layer.

This guide creates GRE tunnels between two Ubuntu hosts and configures routing so that private networks on each side can reach each other.

## Use Cases for GRE Tunnels

- Connecting two private networks over a public or semi-public IP backbone
- Extending a layer-3 network across data centers without a full VPN
- Encapsulating non-IP traffic (GRE can carry IPv6, MPLS, etc.) over an IPv4 network
- Lab environments where you need fast tunnel setup without encryption overhead

## Setup

Two hosts:
- **Host A**: public IP `203.0.113.10`, private network `10.1.0.0/24`
- **Host B**: public IP `203.0.113.20`, private network `10.2.0.0/24`

Goal: machines on `10.1.0.0/24` can reach machines on `10.2.0.0/24` through the GRE tunnel.

## Prerequisites

```bash
# Verify the GRE kernel module is available
lsmod | grep gre

# Load it if not present
sudo modprobe gre
sudo modprobe ip_gre

# Make it persistent
echo 'ip_gre' | sudo tee /etc/modules-load.d/gre.conf
```

## Creating the GRE Tunnel Interface

GRE tunnel setup on Linux follows a standard pattern with the `ip tunnel` command.

**On Host A (203.0.113.10):**

```bash
# Create a GRE tunnel interface
# local: this host's public IP
# remote: the other host's public IP
sudo ip tunnel add gre1 mode gre \
  local 203.0.113.10 \
  remote 203.0.113.20 \
  ttl 255

# Bring the tunnel interface up
sudo ip link set gre1 up

# Assign a tunnel endpoint IP (used for the tunnel's own traffic)
# These IPs are not routed - they just address each end of the tunnel
sudo ip addr add 172.16.0.1/30 dev gre1

# Verify the interface is up
ip addr show gre1
ip link show gre1
```

**On Host B (203.0.113.20):**

```bash
# Create the matching GRE tunnel - local and remote are reversed
sudo ip tunnel add gre1 mode gre \
  local 203.0.113.20 \
  remote 203.0.113.10 \
  ttl 255

sudo ip link set gre1 up

# Assign the other tunnel endpoint IP
sudo ip addr add 172.16.0.2/30 dev gre1
```

## Testing Basic Connectivity

From Host A, ping Host B's tunnel endpoint:

```bash
ping -c 4 172.16.0.2
```

Verify GRE encapsulation with tcpdump:

```bash
# On Host B, capture GRE packets on the physical interface
sudo tcpdump -i eth0 -n proto gre -v

# You should see packets with GRE encapsulation
# showing outer IP headers (your public IPs) and inner ICMP packets
```

## Adding Routes to Private Networks

The tunnel itself only provides connectivity between the tunnel endpoint IPs. To route between the private networks on each side:

**On Host A - route to Host B's private network through the tunnel:**

```bash
# Route 10.2.0.0/24 (Host B's private network) through the tunnel
sudo ip route add 10.2.0.0/24 via 172.16.0.2 dev gre1
```

**On Host B - route to Host A's private network:**

```bash
sudo ip route add 10.1.0.0/24 via 172.16.0.1 dev gre1
```

Enable IP forwarding on both hosts so they actually route packets:

```bash
# Enable immediately
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-gre.conf
sudo sysctl -p /etc/sysctl.d/99-gre.conf
```

## Testing End-to-End Routing

From a machine on Host A's private network (`10.1.0.0/24`), try to reach a machine on Host B's private network (`10.2.0.0/24`):

```bash
# From a machine on 10.1.x.x
ping -c 4 10.2.0.5

# Trace the path
traceroute 10.2.0.5
# Should show: 10.1.0.1 -> 172.16.0.2 -> 10.2.0.5
```

## Firewall Rules for GRE

GRE uses IP protocol number 47 (not TCP or UDP):

```bash
# Allow GRE traffic between the two public IPs
sudo ufw allow proto 47 from 203.0.113.20 to 203.0.113.10

# Or with iptables directly
sudo iptables -A INPUT -p gre -s 203.0.113.20 -j ACCEPT
sudo iptables -A OUTPUT -p gre -d 203.0.113.20 -j ACCEPT
```

If the hosts are behind NAT, GRE may not traverse it well (since it lacks port numbers for NAT to track). In that case, use GRE over UDP with the `ip6gre` or consider VXLAN instead.

## Making GRE Tunnels Persistent

The `ip tunnel` command is ephemeral - it does not survive a reboot. For persistence, use systemd-networkd or a startup script.

**Option 1 - systemd-networkd (recommended on Ubuntu 22.04+):**

```bash
# Create a netdev file for the tunnel
sudo nano /etc/systemd/network/10-gre1.netdev
```

```ini
[NetDev]
Name=gre1
Kind=gre

[Tunnel]
Local=203.0.113.10
Remote=203.0.113.20
TTL=255
```

```bash
# Create a network file for the tunnel interface
sudo nano /etc/systemd/network/10-gre1.network
```

```ini
[Match]
Name=gre1

[Network]
Address=172.16.0.1/30

[Route]
Destination=10.2.0.0/24
Gateway=172.16.0.2
```

```bash
sudo systemctl restart systemd-networkd
```

**Option 2 - Network interface configuration (Ubuntu with Netplan):**

```yaml
# /etc/netplan/99-gre-tunnel.yaml
network:
  version: 2
  tunnels:
    gre1:
      mode: gre
      local: 203.0.113.10
      remote: 203.0.113.20
      addresses:
        - 172.16.0.1/30
      routes:
        - to: 10.2.0.0/24
          via: 172.16.0.2
```

```bash
sudo netplan apply
```

**Option 3 - Startup script:**

```bash
sudo nano /etc/network/if-up.d/gre-tunnel
```

```bash
#!/bin/bash
# GRE tunnel setup - runs when network comes up

if [ "$IFACE" = "eth0" ]; then
    # Create the GRE tunnel
    ip tunnel add gre1 mode gre \
      local 203.0.113.10 \
      remote 203.0.113.20 \
      ttl 255

    ip link set gre1 up
    ip addr add 172.16.0.1/30 dev gre1
    ip route add 10.2.0.0/24 via 172.16.0.2 dev gre1
fi
```

```bash
sudo chmod +x /etc/network/if-up.d/gre-tunnel
```

## GRE over IPv6

GRE can also tunnel IPv4 traffic over IPv6:

```bash
# Create a GRE tunnel using IPv6 endpoints
sudo ip tunnel add gre6 mode ip6gre \
  local 2001:db8::1 \
  remote 2001:db8::2

sudo ip link set gre6 up
sudo ip addr add 172.16.1.1/30 dev gre6
```

## Monitoring Tunnel Traffic

```bash
# View tunnel statistics
ip -s tunnel show gre1

# Capture tunnel traffic
sudo tcpdump -i gre1 -n -v

# Monitor interface traffic in real time
watch -n 1 'cat /proc/net/dev | grep gre1'
```

## Multiple GRE Tunnels

You can have multiple GRE tunnels to different endpoints:

```bash
# Tunnel to Host B
sudo ip tunnel add gre1 mode gre local 203.0.113.10 remote 203.0.113.20 ttl 255
sudo ip link set gre1 up
sudo ip addr add 172.16.0.1/30 dev gre1

# Tunnel to Host C
sudo ip tunnel add gre2 mode gre local 203.0.113.10 remote 203.0.113.30 ttl 255
sudo ip link set gre2 up
sudo ip addr add 172.16.1.1/30 dev gre2

# Routes to each network
sudo ip route add 10.2.0.0/24 via 172.16.0.2 dev gre1
sudo ip route add 10.3.0.0/24 via 172.16.1.2 dev gre2
```

## Troubleshooting

**Tunnel interface shows but no traffic flows:**
```bash
# Check IP forwarding
sysctl net.ipv4.ip_forward

# Check routing table
ip route show table main | grep gre

# Verify the remote IP is reachable first
ping -c 4 203.0.113.20
```

**Packet loss or MTU issues:**
GRE adds a 24-byte header, reducing the effective MTU. If the underlying path MTU is 1500, the tunnel MTU should be 1476:

```bash
# Set tunnel MTU
sudo ip link set gre1 mtu 1476

# Alternatively, enable PMTU discovery
sudo ip tunnel change gre1 pmtudisc
```

**Cannot remove a tunnel:**
```bash
# Delete the tunnel interface
sudo ip tunnel del gre1

# If the interface is stuck, flush it
sudo ip link del gre1
```

GRE is one of the lowest-overhead tunneling options on Linux. When the underlying network is already secure or when encryption is handled at another layer (like IPsec), GRE's simplicity makes it a good choice for straightforward network interconnection scenarios.
