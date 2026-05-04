# How to Configure NAT64 with Tayga on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NAT64, Tayga, Linux, IPv6 Transition

Description: A practical guide to setting up Tayga, a userspace stateless NAT64 daemon for Linux, to translate traffic between IPv6-only clients and IPv4-only servers.

## What Is Tayga?

Tayga is a userspace, stateless NAT64 daemon for Linux. Unlike Jool (which operates in kernel space), Tayga runs as a userspace process and uses the TUN device to handle packet translation. It is simpler to configure but has lower throughput compared to kernel-based solutions.

Tayga implements SIIT (Stateless IP/ICMP Translation) defined in RFC 7915 and maps individual IPv6 addresses to IPv4 addresses via a static or dynamic mapping table.

## Installing Tayga

```bash
# On Ubuntu/Debian

apt update && apt install tayga

# On RHEL/CentOS (may need EPEL)
yum install epel-release && yum install tayga

# Build from source
wget http://www.litech.org/tayga/tayga-0.9.2.tar.bz2
tar -xjf tayga-0.9.2.tar.bz2
cd tayga-0.9.2
./configure && make && make install
```

## Understanding Tayga's Configuration File

Tayga's configuration lives in `/etc/tayga.conf`. The key parameters are:

- `tun-device`: name of the TUN interface Tayga creates
- `ipv4-addr`: the IPv4 address of the Tayga TUN interface itself
- `prefix`: the NAT64 IPv6 prefix (e.g., `64:ff9b::/96`)
- `dynamic-pool`: IPv4 address pool for dynamic assignments
- `data-dir`: directory to store dynamic address mappings

## Creating the Tayga Configuration File

```bash
# Create the Tayga configuration file
cat > /etc/tayga.conf << 'EOF'
# Name of the TUN device Tayga will create
tun-device nat64

# IPv4 address assigned to the Tayga TUN interface
ipv4-addr 192.168.255.1

# The NAT64 IPv6 prefix (well-known prefix)
prefix 64:ff9b::/96

# IPv4 pool for dynamic address assignments to IPv6 clients
dynamic-pool 203.0.113.0/28

# Directory for storing dynamic address mappings (persists across restarts)
data-dir /var/db/tayga
EOF
```

## Creating the Data Directory

```bash
# Create the data directory for Tayga's dynamic mappings
mkdir -p /var/db/tayga

# Initialize Tayga (creates the TUN device without starting translation)
tayga --config /etc/tayga.conf --mktun
```

## Configuring the TUN Interface

After Tayga creates the TUN device, configure IP addresses and routes on it:

```bash
# Bring the TUN interface up
ip link set dev nat64 up

# Assign the IPv4 address to the TUN interface
ip addr add 192.168.255.0/31 dev nat64

# Assign an IPv6 address to the TUN interface
ip -6 addr add 64:ff9b::192.168.255.1/96 dev nat64

# Add a route for the IPv4 pool through the TUN device
ip route add 203.0.113.0/28 dev nat64

# Add a route so IPv6-only clients can reach IPv4 via the NAT64 prefix
ip -6 route add 64:ff9b::/96 dev nat64
```

## Enabling IP Forwarding

```bash
# Enable IPv4 and IPv6 forwarding on the gateway
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.ipv6.conf.all.forwarding=1
```

## Starting Tayga

```bash
# Start Tayga in the foreground (for testing)
tayga --config /etc/tayga.conf --nodetach

# Start Tayga as a daemon
tayga --config /etc/tayga.conf

# On systems with systemd, enable and start the tayga service
systemctl enable tayga
systemctl start tayga
systemctl status tayga
```

## Adding NAT (Masquerade) for Outbound IPv4 Traffic

When translating IPv6 to IPv4, you typically need masquerading so translated packets use your gateway's public IP:

```bash
# Masquerade outbound IPv4 traffic from the dynamic pool
iptables -t nat -A POSTROUTING -s 203.0.113.0/28 -j MASQUERADE

# Or use a specific public IP with SNAT
iptables -t nat -A POSTROUTING -s 203.0.113.0/28 -j SNAT --to-source <YOUR_PUBLIC_IPV4>
```

## Verifying Tayga is Working

```bash
# Check that the nat64 TUN device is up
ip link show nat64

# From an IPv6-only client, ping an IPv4 address via the NAT64 prefix
ping6 64:ff9b::8.8.8.8

# Check Tayga's dynamic address mappings (stored in the data-dir)
cat /var/db/tayga/dynamic.map
```

## Comparison: Tayga vs Jool

| Feature | Tayga | Jool |
|---|---|---|
| Operation | Userspace | Kernel module |
| Translation type | Stateless (SIIT) | Stateful (NAT64) + SIIT |
| Throughput | Lower | Higher |
| Complexity | Simpler | More features |
| Protocol support | TCP, UDP, ICMP | TCP, UDP, ICMP + more |

## Summary

Tayga provides a simple userspace approach to NAT64/SIIT translation. Configure `/etc/tayga.conf` with your prefix and IPv4 pool, set up the TUN interface, enable IP forwarding, and add iptables masquerading rules. Tayga is well-suited for smaller deployments where ease of configuration outweighs maximum throughput requirements.
