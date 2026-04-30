# How to Configure GRE Tunnel with Key for Multiple Tunnels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRE, Tunnel Key, Linux, Multiple Tunnels, IPv4, Ip tunnel, GRE Key

Description: Learn how to configure GRE tunnel keys on Linux to multiplex multiple logical tunnels between the same pair of endpoints, using unique keys to differentiate traffic flows.

---

When multiple GRE tunnels share the same source and destination IPs, GRE keys differentiate them. This allows different tenants or VRFs to use separate tunnels between the same endpoints.

## Why Use GRE Keys

```text
Without keys: no GRE key is available to distinguish logical flows between 10.0.0.1 and 10.0.0.2

With keys:
  Tunnel 1: 10.0.0.1 → 10.0.0.2, key 100 (Tenant A)
  Tunnel 2: 10.0.0.1 → 10.0.0.2, key 200 (Tenant B)
  Tunnel 3: 10.0.0.1 → 10.0.0.2, key 300 (Management)
```

## Creating GRE Tunnels with Keys

```bash
# Tunnel for Tenant A (key 100)

ip tunnel add gre-tenant-a \
  mode gre \
  local 10.0.0.1 \
  remote 10.0.0.2 \
  key 100 \
  ttl 255

ip addr add 172.16.1.1/30 dev gre-tenant-a
ip link set gre-tenant-a up

# Tunnel for Tenant B (key 200)
ip tunnel add gre-tenant-b \
  mode gre \
  local 10.0.0.1 \
  remote 10.0.0.2 \
  key 200 \
  ttl 255

ip addr add 172.16.2.1/30 dev gre-tenant-b
ip link set gre-tenant-b up

# Management tunnel (key 300)
ip tunnel add gre-mgmt \
  mode gre \
  local 10.0.0.1 \
  remote 10.0.0.2 \
  key 300 \
  ttl 255

ip addr add 172.16.99.1/30 dev gre-mgmt
ip link set gre-mgmt up
```

## Remote Side (10.0.0.2) Configuration

```bash
ip tunnel add gre-tenant-a mode gre local 10.0.0.2 remote 10.0.0.1 key 100 ttl 255
ip addr add 172.16.1.2/30 dev gre-tenant-a
ip link set gre-tenant-a up

ip tunnel add gre-tenant-b mode gre local 10.0.0.2 remote 10.0.0.1 key 200 ttl 255
ip addr add 172.16.2.2/30 dev gre-tenant-b
ip link set gre-tenant-b up

ip tunnel add gre-mgmt mode gre local 10.0.0.2 remote 10.0.0.1 key 300 ttl 255
ip addr add 172.16.99.2/30 dev gre-mgmt
ip link set gre-mgmt up
```

## Verifying Keyed Tunnels

```bash
# Show all tunnels with keys
ip tunnel show | grep key
# gre-tenant-a: gre/ip remote 10.0.0.2 local 10.0.0.1 ttl 255 key 0x64
# gre-tenant-b: gre/ip remote 10.0.0.2 local 10.0.0.1 ttl 255 key 0xc8
# gre-mgmt: gre/ip remote 10.0.0.2 local 10.0.0.1 ttl 255 key 0x12c
# (0x64 = 100, 0xc8 = 200, 0x12c = 300 in decimal)

# Ping through each tunnel
ping 172.16.1.2   # Tenant A tunnel
ping 172.16.2.2   # Tenant B tunnel
ping 172.16.99.2  # Management tunnel
```

## Capturing Keyed GRE Traffic

```bash
# Display only GRE packets with key 100 (tshark display filter)
tshark -i eth0 -Y "gre.key == 100"

# Or with tcpdump (shows all GRE)
tcpdump -i eth0 -nn proto 47
```

## Persistent Configuration (systemd-networkd)

```ini
# /etc/systemd/network/gre-tenant-a.netdev
[NetDev]
Name=gre-tenant-a
Kind=gre

[Tunnel]
Independent=yes
Local=10.0.0.1
Remote=10.0.0.2
TTL=255
Key=100
```

## Key Takeaways

- GRE keys allow multiple tunnels between the same source/destination IP pair to be differentiated.
- The key must match on both ends; a mismatch causes the tunnel to not receive traffic.
- `ip tunnel show | grep key` may display keys in hexadecimal; convert with `printf "%d\n" 0x64`.
- Use GRE keys for multi-tenant environments where different tenants share the same underlay infrastructure.
