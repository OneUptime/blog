# How to Create a GRE Tunnel Using nmcli on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRE, Tunnel, nmcli, RHEL, NetworkManager, IPv4, Networking

Description: Learn how to create and manage a GRE tunnel on RHEL/CentOS using nmcli (NetworkManager CLI) for persistent tunnel configuration that survives reboots.

---

GRE (Generic Routing Encapsulation) tunnels encapsulate network packets to create virtual point-to-point links between hosts. On RHEL, nmcli provides persistent tunnel management through NetworkManager.

## Creating a GRE Tunnel with nmcli

```bash
# Create a GRE tunnel connection
# 10.0.0.1 is this host's tunnel source IP
# 10.0.0.2 is the remote tunnel endpoint IP

nmcli connection add type ip-tunnel \
  ifname gre1 \
  con-name gre-tunnel-1 \
  ip-tunnel.mode gre \
  ip-tunnel.local 10.0.0.1 \
  ip-tunnel.remote 10.0.0.2

# Assign IP to the tunnel interface
nmcli connection modify gre-tunnel-1 \
  ipv4.method manual \
  ipv4.addresses "172.16.1.1/30"

# Activate the tunnel
nmcli connection up gre-tunnel-1
```

## Verify the GRE Tunnel

```bash
# Show tunnel interface
ip -d link show gre1
# gre: remote 10.0.0.2 local 10.0.0.1 dev eth0 ttl inherit

# Check IP assignment
ip addr show gre1

# Ping the remote tunnel endpoint
ping 172.16.1.2

# Show routing through tunnel
ip route show dev gre1
```

## Adding Routes Through the GRE Tunnel

```bash
# Route traffic to remote subnet through GRE tunnel
nmcli connection modify gre-tunnel-1 \
  +ipv4.routes "192.168.2.0/24 172.16.1.2"

nmcli connection up gre-tunnel-1

# On both tunnel endpoints, enable IPv4 forwarding if they route
# traffic for other subnets through the GRE tunnel
echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/95-IPv4-forwarding.conf
sysctl -p /etc/sysctl.d/95-IPv4-forwarding.conf

# Verify
ip route show | grep 192.168.2.0
```

## GRE Tunnel Configuration File (for reference)

NetworkManager stores the connection in `/etc/NetworkManager/system-connections/`. A generated profile looks similar to:

```ini
# /etc/NetworkManager/system-connections/gre-tunnel-1.nmconnection
[connection]
id=gre-tunnel-1
type=ip-tunnel
interface-name=gre1

[ip-tunnel]
local=10.0.0.1
mode=2
remote=10.0.0.2

[ipv4]
method=manual
address1=172.16.1.1/30
route1=192.168.2.0/24,172.16.1.2

[ipv6]
addr-gen-mode=default
method=auto
```

## Remote Side Configuration

```bash
# On the remote host (10.0.0.2):
nmcli connection add type ip-tunnel \
  ifname gre1 \
  con-name gre-tunnel-1 \
  ip-tunnel.mode gre \
  ip-tunnel.local 10.0.0.2 \
  ip-tunnel.remote 10.0.0.1

nmcli connection modify gre-tunnel-1 \
  ipv4.method manual \
  ipv4.addresses "172.16.1.2/30"

nmcli connection up gre-tunnel-1
```

## Managing the Tunnel

```bash
# Bring down tunnel
nmcli connection down gre-tunnel-1

# Delete tunnel
nmcli connection delete gre-tunnel-1

# Show all tunnels
nmcli connection show | grep tunnel
```

## Key Takeaways

- Use `nmcli connection add type ip-tunnel` with `ip-tunnel.mode gre` to create persistent GRE tunnels on RHEL.
- Set `ip-tunnel.local` to the local tunnel endpoint IP and `ip-tunnel.remote` to the peer's IP.
- Add static routes with `+ipv4.routes` to direct traffic through the tunnel.
- nmcli stores connections persistently; with autoconnect enabled, tunnels reconnect automatically after reboot.
