# How to Configure IPv6 MTU on Linux Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MTU, Linux, Network Configuration, ip command

Description: Configure and verify IPv6 MTU settings on Linux network interfaces using the ip command, understand how MTU affects IPv6 performance, and make settings persistent.

## Introduction

On Linux, the MTU is a per-interface property that affects both IPv4 and IPv6. For IPv6, the MTU must be at least 1280 bytes - the RFC 8200 minimum. Setting the correct MTU is important for tunnels (which add encapsulation overhead) and any link type where the default 1500 bytes is not appropriate.

## Viewing Current MTU Settings

```bash
# Show all interfaces with their MTU values

ip link show

# Show MTU for a specific interface
ip link show eth0

# Show IPv6-specific info (includes MTU)
ip -6 link show

# Show IPv6 addresses and their prefixes (confirms IPv6 is active)
ip -6 addr show

# Check the MTU as seen by the IPv6 stack
cat /proc/sys/net/ipv6/conf/eth0/mtu

# Check for any interfaces with MTU below 1280 (violates the IPv6 minimum MTU)
ip link show | awk '
  /^[0-9]+:/ { iface = $2 }
  /mtu/ {
    for(i=1; i<=NF; i++) {
      if ($i == "mtu") {
        mtu = $(i+1)+0
        if (mtu < 1280) print "WARNING: " iface " MTU=" mtu " < 1280 (below IPv6 minimum)"
      }
    }
  }
'
```

## Setting MTU on an Interface

```bash
# Set MTU to 1500 (Ethernet default)
sudo ip link set eth0 mtu 1500

# Set MTU on a loopback (lo already has 65536 by default)
sudo ip link set lo mtu 65536

# For IPv6-over-IPv4 tunnel (sit0, he-ipv6, etc.):
# Outer IPv4 header = 20 bytes, so inner IPv6 MTU = 1500 - 20 = 1480
sudo ip link set sit0 mtu 1480

# For basic GRE over IPv4 without checksum/key/sequence options:
# Outer IPv4 header (20) + base GRE header (4) = 24 bytes, so inner IPv6 MTU = 1476
sudo ip link set gre0 mtu 1476

# For an OpenVPN TUN device (common starting point; actual overhead varies by protocol and options):
# Lower the MTU as needed to avoid fragmentation
sudo ip link set tun0 mtu 1420

# Verify the change
ip link show eth0 | grep mtu
```

## Making MTU Settings Persistent

```bash
# Method 1: Using /etc/network/interfaces (Debian/Ubuntu)
# Add `mtu 1480` to the existing interface stanza, for example:
# iface eth0 inet6 static
#     address 2001:db8::1/64
#     mtu 1480

# Method 2: Using NetworkManager (nmcli)
nmcli connection modify "Wired connection 1" 802-3-ethernet.mtu 1480
nmcli connection up "Wired connection 1"

# Verify NetworkManager setting
nmcli connection show "Wired connection 1" | grep mtu

# Method 3: Using systemd-networkd (.network file)
sudo tee /etc/systemd/network/10-eth0.network << 'EOF'
[Match]
Name=eth0

[Link]
MTUBytes=1480

[Network]
DHCP=yes
IPv6AcceptRA=yes
EOF
sudo systemctl restart systemd-networkd

# Method 4: Using ip command in /etc/rc.local or a udev rule
# Add to /etc/rc.local before 'exit 0':
# ip link set eth0 mtu 1480
```

## Tunnel MTU Calculation Reference

```python
def calculate_tunnel_mtu(outer_link_mtu: int, tunnel_type: str) -> dict:
    """
    Calculate an inner IPv6 MTU using fixed or commonly assumed tunnel overheads.
    """
    overhead = {
        "6in4":        20,   # IPv4 header
        "6in4-ipsec":  52,   # Example ESP-over-IPv4 estimate; actual overhead depends on ESP mode, algorithm, and padding
        "gre":         24,   # IPv4 (20) + base GRE (4)
        "gre-ipsec":   60,   # Example GRE-over-IPv4 with ESP estimate; actual overhead depends on GRE/ESP options
        "ipip6":       40,   # IPv6 outer header
        "openvpn":     74,   # Example over IPv4/UDP; actual overhead varies by mode and options
        "wireguard":   60,   # IPv4 (20) + UDP (8) + WireGuard data packet overhead (32); use 80 over IPv6
    }

    if tunnel_type not in overhead:
        return {"error": f"Unknown tunnel type: {tunnel_type}"}

    inner_mtu = outer_link_mtu - overhead[tunnel_type]
    return {
        "tunnel_type": tunnel_type,
        "outer_link_mtu": outer_link_mtu,
        "overhead_bytes": overhead[tunnel_type],
        "inner_ipv6_mtu": inner_mtu,
        "meets_ipv6_minimum": inner_mtu >= 1280,
    }

for tunnel in ["6in4", "gre", "wireguard", "openvpn"]:
    result = calculate_tunnel_mtu(1500, tunnel)
    status = "OK" if result["meets_ipv6_minimum"] else "BROKEN"
    print(f"{tunnel}: inner MTU = {result['inner_ipv6_mtu']} [{status}]")
```

## Conclusion

IPv6 MTU configuration on Linux is managed via the `ip link set` command. For physical Ethernet interfaces, the default 1500 bytes is common and usually correct on standard links. Tunnel interfaces require MTU reduction by the encapsulation overhead, which may vary with the tunnel type and options. Always verify that the resulting MTU is at least 1280 bytes to satisfy the IPv6 minimum requirement. Use NetworkManager, systemd-networkd, or `/etc/network/interfaces` to persist MTU settings across reboots.
