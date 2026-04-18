# How to Troubleshoot VPN IPv6 Connectivity Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VPN, Troubleshooting, Connectivity, WireGuard, OpenVPN

Description: A systematic guide to diagnosing and resolving IPv6 connectivity issues in VPN tunnels, covering routing, DNS, firewall, and tunnel configuration problems.

VPN IPv6 connectivity issues can stem from routing misconfiguration, DNS problems, firewall blocking, or tunnel establishment failures. This guide provides a systematic troubleshooting approach.

## Troubleshooting Decision Tree

```text
IPv6 over VPN not working?
├─ VPN connected? (check wg show / openvpn status)
│   ├─ No → Fix tunnel establishment first
│   └─ Yes ↓
├─ IPv6 address on tunnel interface?
│   ├─ No → Check address assignment config
│   └─ Yes ↓
├─ IPv6 default route through tunnel?
│   ├─ No → Check AllowedIPs / route push config
│   └─ Yes ↓
├─ Can ping IPv6 gateway through tunnel?
│   ├─ No → Check server firewall / forwarding
│   └─ Yes ↓
└─ Can reach public IPv6? → Check NAT/masquerade on server
```

## Step 1: Verify Tunnel Interface Has IPv6

```bash
# WireGuard

ip -6 addr show wg0

# OpenVPN
ip -6 addr show tun0

# IPsec (check child SA)
sudo ip -6 xfrm state show | grep src

# No IPv6 on interface? Check config:
# WireGuard: Address = fd00:wg::2/128 in [Interface]
# OpenVPN: server-ipv6 in server.conf, tun-ipv6 in client.conf
# IPsec: rightsourceip= in ipsec.conf
```

## Step 2: Check IPv6 Routes

```bash
# Show IPv6 default route
ip -6 route show default

# If no default via VPN, check:
# WireGuard AllowedIPs = 0.0.0.0/0, ::/0
# OpenVPN server pushes: push "route-ipv6 ::/0"

# Show all IPv6 routes
ip -6 route show

# Check if route conflicts exist (lower metric wins)
ip -6 route show table all | grep -v "unreachable"
```

## Step 3: Test Connectivity Step by Step

```bash
# Test 1: Can reach VPN server's tunnel IPv6 address?
ping6 -c 3 fd00:wg::1   # WireGuard server's tunnel IP

# Test 2: Can reach a host inside the VPN network?
ping6 -c 3 fd00:internal::server

# Test 3: Can reach public IPv6 through VPN?
ping6 -c 3 2001:4860:4860::8888

# Test 4: Is exit IP the VPN server's?
curl -6 https://ifconfig.co
```

## Step 4: Check Server-Side IPv6 Forwarding

```bash
# On VPN server: verify IPv6 forwarding is enabled
cat /proc/sys/net/ipv6/conf/all/forwarding
# Must be 1

# If 0, enable it
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Check ip6tables FORWARD chain allows VPN traffic
sudo ip6tables -L FORWARD -n -v

# Verify masquerade is configured for VPN clients
sudo ip6tables -t nat -L POSTROUTING -n -v
```

## Step 5: Check Firewall on Both Ends

```bash
# Client-side: is ip6tables blocking VPN traffic?
sudo ip6tables -L -n -v

# Server-side: is VPN port open for IPv6?
sudo ip6tables -L INPUT -n -v | grep "dpt:51820\|dpt:1194"

# Test VPN port reachability
nmap -6 -p 51820 -sU 2001:db8::vpn-server   # WireGuard
nmap -6 -p 1194 -sU 2001:db8::vpn-server    # OpenVPN
```

## Step 6: DNS Resolution Over IPv6

```bash
# Test DNS works through VPN
dig AAAA google.com @2001:4860:4860::8888

# Check which DNS server is being used
nslookup google.com

# Verify VPN pushes DNS server
# WireGuard: DNS = <server-ipv6> in [Interface]
# OpenVPN: push "dhcp-option DNS6 ..." in server.conf
```

## Common Issues and Fixes

| Issue | Symptom | Fix |
|---|---|---|
| No IPv6 on tunnel | `ip -6 addr show tun0` empty | Add server-ipv6/Address to config |
| Route not installed | ping6 works locally, not through VPN | Check AllowedIPs includes ::/0 |
| Forwarding disabled | Server pings work, external doesn't | `sysctl net.ipv6.conf.all.forwarding=1` |
| No NAT/masquerade | VPN server can ping, clients can't | Add ip6tables masquerade rule |
| DNS leaking | IPv6 DNS resolves to local | Check push "dhcp-option DNS6" |
| MTU issues | TCP hangs, small packets work | Set MTU to 1280 on tunnel interface |

## MTU Troubleshooting

```bash
# IPv6 minimum MTU is 1280 bytes
# VPN tunnel adds overhead (WireGuard adds ~60 bytes)

# Test with specific packet sizes
ping6 -c 3 -s 1200 fd00:wg::1   # Should work
ping6 -c 3 -s 1400 fd00:wg::1   # May fail if MTU issue

# Fix: reduce MTU on WireGuard interface
sudo ip link set wg0 mtu 1420

# Or in wg0.conf:
# MTU = 1420   in [Interface]
```

## Enabling Debug Logging

```bash
# WireGuard debug
sudo dmesg | grep wireguard

# OpenVPN verbose
# Add to client.conf: verb 9
sudo journalctl -u openvpn@client -f

# strongSwan/IPsec debug
# Stream log messages from the charon daemon
sudo swanctl --log

# To raise log verbosity, set levels in /etc/strongswan.conf, e.g.:
#   charon { filelog { /var/log/charon.log { default = 1; ike = 4; knl = 4; cfg = 3 } } }
# Then apply with: sudo swanctl --reload-settings
```

Systematic IPv6 VPN troubleshooting - working from the tunnel interface through routing, forwarding, and NAT - quickly identifies the layer where connectivity breaks down.
