# How to Set the VXLAN Destination Port (UDP 4789)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, UDP Port, 4789, Linux, Ip link, Networking, Firewall

Description: Learn how to set and verify the VXLAN destination UDP port, change it from the legacy 8472 default to the IANA-assigned port 4789, and update firewall rules accordingly.

---

VXLAN uses UDP for encapsulation. The IANA-assigned port is 4789 (RFC 7348), but older Linux kernels defaulted to 8472. Ensuring the correct port is set maintains interoperability with other vendors and cloud platforms.

## Default Port History

```text
Old Linux default: 8472 (before proper IANA assignment)
IANA-assigned:     4789 (RFC 7348, 2014)
VMware NSX:        8472
AWS/Azure VXLAN:   4789
```

## Setting the Destination Port

```bash
# Create VXLAN with explicit port 4789

ip link add vxlan10 type vxlan \
  id 10 \
  dstport 4789 \
  local 10.0.0.1 \
  remote 10.0.0.2

# Verify
ip -d link show vxlan10
# Output includes: vxlan id 10 remote 10.0.0.2 local 10.0.0.1 srcport 0 0 dstport 4789
```

## Changing Port on Existing Interface

You cannot change `dstport` on a running VXLAN interface; you must recreate it:

```bash
# Remove existing interface
ip link del vxlan10

# Recreate with correct port
ip link add vxlan10 type vxlan \
  id 10 \
  dstport 4789 \
  local 10.0.0.1 \
  remote 10.0.0.2
ip link set vxlan10 up
```

## Firewall Rules for VXLAN Traffic

```bash
# iptables: allow VXLAN on UDP 4789
iptables -A INPUT -p udp --dport 4789 -j ACCEPT
iptables -A OUTPUT -p udp --dport 4789 -j ACCEPT
# Also allow established return traffic
iptables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# nftables
table ip filter {
  chain input {
    udp dport 4789 accept comment "VXLAN"
  }
}

# Or with UFW (Ubuntu)
ufw allow 4789/udp
```

## Verifying the Port

```bash
# Check if the kernel has a UDP socket bound on 4789
# (VXLAN is a kernel tunnel, so ss will not show a user-space process)
ss -ulnp | grep 4789
# UNCONN 0 0 0.0.0.0:4789 0.0.0.0:*

# Capture VXLAN traffic
tcpdump -i eth0 -nn udp port 4789

# Verify in ip link
ip -d link show vxlan10 | grep dstport
```

## systemd-networkd Configuration

```ini
# /etc/systemd/network/vxlan10.netdev
[NetDev]
Name=vxlan10
Kind=vxlan

[VXLAN]
VNI=10
Local=10.0.0.1
Remote=10.0.0.2
DestinationPort=4789     # Explicitly set IANA port
```

## Checking Interoperability

```bash
# AWS: VXLAN uses port 4789
# VMware NSX: may use 8472
# Cisco ACI: uses 4789

# If peering with VMware NSX on 8472:
ip link add vxlan10 type vxlan id 10 dstport 8472 local 10.0.0.1 remote 10.0.0.2
```

## Key Takeaways

- Always set `dstport 4789` explicitly when creating VXLAN interfaces to ensure IANA-standard behavior.
- Old Linux kernels default to port 8472; check with `ip -d link show vxlan10` and recreate if needed.
- Allow UDP 4789 through all firewalls and security groups between VTEP hosts.
- When peering with VMware NSX or other vendors using 8472, explicitly set `dstport 8472` on Linux VTEPs.
