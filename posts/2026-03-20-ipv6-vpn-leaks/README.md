# How to Troubleshoot IPv6 VPN Leaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VPN, Security, Privacy, Troubleshooting, DNS Leak

Description: Detect and fix IPv6 traffic leaks through VPNs that only tunnel IPv4, exposing your real IPv6 address and location even when connected to a VPN.

## Introduction

IPv6 VPN leaks occur when a VPN tunnels IPv4 traffic but leaves IPv6 traffic unprotected. If the VPN client or server is only configured for IPv4, IPv6 traffic bypasses the tunnel and uses the native ISP connection, revealing the real IPv6 address and location. This is a significant privacy and security issue that is easy to diagnose and fix.

## Step 1: Check for IPv6 Leak

```bash
# Check your current IPv6 address (before and after VPN)

echo "Current IPv6 address:"
curl -6 -s --max-time 5 https://api6.my-ip.io/ip 2>/dev/null || \
    echo "No IPv6 connectivity"

# Capture your IPv6 before connecting to VPN
# Then connect to VPN and run again
# If the IPv6 address doesn't change and still matches your ISP address,
# you likely have a leak

# Cross-check with another IPv6 echo service
curl -6 -s --max-time 5 https://ipv6.icanhazip.com 2>/dev/null

# Online tools for leak testing (run from browser):
# https://ipleak.net
# https://test-ipv6.com
# https://browserleaks.com/ip
```

## Step 2: Identify the Leak Source

```bash
# Check routing table while VPN is active
# If IPv6 default route doesn't go through VPN interface:
ip -6 route show default

# Expected VPN behavior:
# default dev tun0  ← all IPv6 through VPN tunnel
# default via fe80::... dev eth0  ← LEAK! IPv6 bypasses VPN

# Check all interfaces
ip -6 addr show scope global

# If the default route still points to eth0 and the VPN interface (tun0)
# has no IPv6 route, IPv6 traffic will bypass the tunnel
```

## Step 3: Fix Option 1 - Block IPv6 Traffic When on VPN

For VPNs that don't support IPv6, block all IPv6 while connected:

```bash
# Replace tun0 with your VPN interface name.
# Insert rules at the top so they take precedence over existing OUTPUT rules.
sudo ip6tables -I OUTPUT 1 -j DROP
sudo ip6tables -I OUTPUT 1 -o tun0 -j ACCEPT
sudo ip6tables -I OUTPUT 1 -o lo -j ACCEPT

# Remove only the rules you added when VPN disconnects:
sudo ip6tables -D OUTPUT -o lo -j ACCEPT
sudo ip6tables -D OUTPUT -o tun0 -j ACCEPT
sudo ip6tables -D OUTPUT -j DROP
```

## Step 4: Fix Option 2 - Route IPv6 Through VPN

For OpenVPN with IPv6 support:

```ovpn
# OpenVPN must actually provide IPv6 on the tunnel.
# Server-side, push IPv6 redirection to clients:
push "redirect-gateway ipv6"

# Or in client config, when the server supports IPv6:
redirect-gateway ipv6
```

```bash
# For WireGuard with IPv6:
# In [Peer] section, add IPv6 to AllowedIPs:
# AllowedIPs = 0.0.0.0/0, ::/0

# Verify after connection:
ip -6 route show default
# Should show: default dev wg0
```

## Step 5: Fix Option 3 - Disable IPv6 While on VPN

```bash
# Create scripts that OpenVPN calls on connect/disconnect
# /etc/openvpn/vpn-up.sh
sudo tee /etc/openvpn/vpn-up.sh > /dev/null << 'EOF'
#!/bin/bash
# Disable IPv6 when VPN connects
sysctl -w net.ipv6.conf.all.disable_ipv6=1
sysctl -w net.ipv6.conf.default.disable_ipv6=1
echo "IPv6 disabled while VPN is active"
EOF
sudo chmod +x /etc/openvpn/vpn-up.sh

# /etc/openvpn/vpn-down.sh
sudo tee /etc/openvpn/vpn-down.sh > /dev/null << 'EOF'
#!/bin/bash
# Re-enable IPv6 when VPN disconnects
sysctl -w net.ipv6.conf.all.disable_ipv6=0
sysctl -w net.ipv6.conf.default.disable_ipv6=0
echo "IPv6 re-enabled"
EOF
sudo chmod +x /etc/openvpn/vpn-down.sh

# In the OpenVPN client config:
# script-security 2
# up /etc/openvpn/vpn-up.sh
# down /etc/openvpn/vpn-down.sh
```

## Step 6: DNS Leak Check

```bash
# DNS leaks over IPv6 can occur even if traffic is tunneled
# Check the public IP seen by a known resolver over IPv4 and IPv6 transport
dig +short myip.opendns.com @resolver1.opendns.com
dig -6 +short AAAA myip.opendns.com @2620:119:35::35

# Verify classic DNS queries go through VPN
# Capture DNS traffic on the VPN interface
sudo tcpdump -i tun0 "port 53"

# If DNS queries appear on eth0 instead of tun0: DNS leak
sudo tcpdump -i eth0 "port 53"
```

## Continuous Leak Monitoring Script

```bash
#!/bin/bash
# monitor-ipv6-leak.sh

PRE_VPN_IPV6=$(curl -6 -s --max-time 5 https://api6.my-ip.io/ip 2>/dev/null)
echo "IPv6 before VPN: ${PRE_VPN_IPV6:-no IPv6}"
echo "Connect your VPN now, then press Enter..."
read

POST_VPN_IPV6=$(curl -6 -s --max-time 5 https://api6.my-ip.io/ip 2>/dev/null)
echo "IPv6 after VPN: ${POST_VPN_IPV6:-no IPv6}"

if [ "$PRE_VPN_IPV6" = "$POST_VPN_IPV6" ] && [ -n "$PRE_VPN_IPV6" ]; then
    echo "[LEAK DETECTED] IPv6 address unchanged - VPN is leaking IPv6!"
elif [ -z "$POST_VPN_IPV6" ]; then
    echo "[PROTECTED] No IPv6 connectivity through VPN (leak blocked)"
else
    echo "[PROTECTED] IPv6 address changed (VPN handles IPv6)"
fi
```

## Conclusion

IPv6 VPN leaks expose your real IP address and bypass the VPN's privacy protection. Detect leaks by checking your public IPv6 address before and after connecting to the VPN. Fix by either routing all IPv6 through the VPN tunnel (add `::/0` to WireGuard AllowedIPs or use OpenVPN `redirect-gateway ipv6`), blocking all IPv6 with ip6tables while connected, or disabling IPv6 entirely with `net.ipv6.conf.all.disable_ipv6=1`. Modern VPN clients like WireGuard handle IPv6 natively when configured correctly.
