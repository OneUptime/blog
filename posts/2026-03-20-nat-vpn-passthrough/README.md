# How to Configure NAT for VPN Passthrough

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, VPN, IPsec, Linux

Description: Learn how to configure NAT to allow VPN protocols (IPsec, L2TP, PPTP, OpenVPN) to pass through a NAT gateway.

## VPN NAT Passthrough Overview

VPN protocols use specific ports and protocols that NAT can interfere with. Different VPN types have different requirements:

| VPN Protocol | Transport | Ports | NAT Issues |
|-------------|-----------|-------|-----------|
| IPsec/IKE | UDP | 500, 4500 | ESP protocol (IP 50) |
| L2TP/IPsec | UDP | 1701 + IPsec | Same as IPsec |
| OpenVPN | UDP/TCP | 1194 (default) | Works well through NAT |
| WireGuard | UDP | 51820 (default) | Works well through NAT |
| PPTP | TCP+GRE | 1723 + IP 47 | GRE protocol issues |

## IPsec NAT Passthrough (NAT-T)

IPsec uses ESP (IP Protocol 50) which doesn't have ports, making PAT impossible. **NAT-T (NAT Traversal)** wraps ESP in UDP port 4500 to traverse NAT.

```bash
# Linux: Allow IPsec through NAT

iptables -A INPUT -p udp --dport 500 -j ACCEPT   # IKE
iptables -A INPUT -p udp --dport 4500 -j ACCEPT  # NAT-T
iptables -A INPUT -p esp -j ACCEPT               # ESP (for non-NAT path)

# Allow forwarding of IPsec traffic
iptables -A FORWARD -m policy --dir in --pol ipsec -j ACCEPT
iptables -A FORWARD -m policy --dir out --pol ipsec -j ACCEPT
```

### IPsec Through NAT: Port Forwarding

For an IPsec server behind NAT:

```bash
# Forward IKE and NAT-T to internal IPsec server (192.168.1.10)
iptables -t nat -A PREROUTING -i eth1 -p udp --dport 500 \
    -j DNAT --to-destination 192.168.1.10:500
iptables -t nat -A PREROUTING -i eth1 -p udp --dport 4500 \
    -j DNAT --to-destination 192.168.1.10:4500

iptables -A FORWARD -p udp -d 192.168.1.10 --dport 500 -j ACCEPT
iptables -A FORWARD -p udp -d 192.168.1.10 --dport 4500 -j ACCEPT
```

## OpenVPN NAT Passthrough

OpenVPN (UDP 1194) passes through NAT naturally. Just ensure:

```bash
# For OpenVPN client behind NAT - usually just works
# For OpenVPN server behind NAT, forward port 1194:
iptables -t nat -A PREROUTING -i eth1 -p udp --dport 1194 \
    -j DNAT --to-destination 192.168.1.10:1194

iptables -A FORWARD -p udp -d 192.168.1.10 --dport 1194 -j ACCEPT

# After connection: enable forwarding for VPN clients
iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth1 -j MASQUERADE
```

## WireGuard NAT Passthrough

WireGuard (UDP 51820) also traverses NAT well:

```bash
# Forward WireGuard port to internal server
iptables -t nat -A PREROUTING -i eth1 -p udp --dport 51820 \
    -j DNAT --to-destination 192.168.1.10:51820

iptables -A FORWARD -p udp -d 192.168.1.10 --dport 51820 -j ACCEPT

# For WireGuard server routing:
iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth1 -j MASQUERADE
```

## PPTP NAT Passthrough (GRE)

PPTP uses GRE (IP Protocol 47). Linux's `nf_conntrack_pptp` module handles this:

```bash
# Load PPTP conntrack helper
modprobe nf_conntrack_pptp
modprobe nf_nat_pptp

# Forward PPTP
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 1723 \
    -j DNAT --to-destination 192.168.1.10:1723
iptables -A FORWARD -p tcp -d 192.168.1.10 --dport 1723 -j ACCEPT
iptables -A FORWARD -p 47 -d 192.168.1.10 -j ACCEPT  # GRE
```

## conntrack Helpers for VPN

```bash
# Check loaded helpers
lsmod | grep -E 'conntrack|nat' | grep -v nf_nat

# Common VPN helpers
modprobe nf_conntrack_pptp    # PPTP GRE helper
modprobe nf_nat_pptp          # PPTP NAT
```

## Key Takeaways

- IPsec requires NAT-T (UDP 4500) for clients behind NAT; enable both 500 and 4500.
- OpenVPN and WireGuard traverse NAT easily using UDP.
- PPTP requires the `nf_conntrack_pptp` kernel module for GRE protocol handling.
- Always add corresponding FORWARD rules when using DNAT for VPN port forwarding.

**Related Reading:**

- [How to Configure Source NAT (SNAT) on Linux](https://oneuptime.com/blog/post/2026-03-20-configure-snat-linux/view)
- [How to Use NAT with IPsec VPN Tunnels](https://oneuptime.com/blog/post/2026-03-20-nat-ipsec-vpn/view)
