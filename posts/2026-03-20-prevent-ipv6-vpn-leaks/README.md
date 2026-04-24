# How to Prevent IPv6 VPN Leaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VPN, VPN Leaks, Privacy, Security, Network Configuration

Description: A guide to preventing IPv6 traffic from bypassing VPN tunnels, ensuring all IPv6 traffic is either tunneled or blocked to prevent identity exposure.

IPv6 VPN leaks occur when a device with both IPv4 and IPv6 connectivity connects to a VPN that only tunnels IPv4 traffic. IPv6 traffic continues flowing directly to its destination, bypassing the VPN entirely. This can reveal the user's real IPv6 address to IPv6-capable sites they visit, undermining the privacy purpose of the VPN.

## Understanding IPv6 VPN Leaks

```text
Without leak prevention:
  IPv4 traffic → VPN tunnel → Internet (exits at VPN server)
  IPv6 traffic → Direct to Internet (leaks real IPv6 address!)

With leak prevention:
  IPv4 traffic → VPN tunnel → Internet (exits at VPN server)
  IPv6 traffic → Blocked OR tunneled through VPN
```

## Method 1: Block All IPv6 at Firewall Level

The simplest approach: if your VPN doesn't support IPv6, block all IPv6 outbound:

```bash
# Linux: block all outbound IPv6 except through VPN interface

# Allow loopback
sudo ip6tables -I OUTPUT 1 -o lo -j ACCEPT

# Allow traffic over the VPN interface
sudo ip6tables -I OUTPUT 2 -o tun0 -j ACCEPT

# Block everything else not going through VPN
sudo ip6tables -I OUTPUT 3 ! -o tun0 -j DROP
```

## Method 2: Disable IPv6 on Network Interfaces

```bash
# Disable IPv6 on all interfaces (nuclear option)
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1

# Or disable only on specific interface
sudo sysctl -w net.ipv6.conf.eth0.disable_ipv6=1

# Make persistent
sudo tee -a /etc/sysctl.conf >/dev/null << 'EOF'
net.ipv6.conf.all.disable_ipv6=1
net.ipv6.conf.default.disable_ipv6=1
EOF
sudo sysctl -p
```

## Method 3: Null Route IPv6

Route all IPv6 to a blackhole:

```bash
# Route all IPv6 to null (blackhole)
sudo ip -6 route add blackhole ::/0 metric 1

# This discards matching IPv6 traffic locally instead of leaking
# More specific IPv6 routes can still take precedence if your VPN installs them
```

## Method 4: VPN with Dual-Stack Support

The best solution: use a VPN that tunnels IPv6 traffic:

### OpenVPN

```ini
# Add to OpenVPN client config:
# Route all IPv4 and IPv6 through VPN
redirect-gateway ipv6

# Example server-side IPv6 setup:
server-ipv6 2001:db8:100::/64
push "redirect-gateway ipv6"
```

### WireGuard

```ini
[Peer]
# Include IPv6 in AllowedIPs
AllowedIPs = 0.0.0.0/0, ::/0
```

## Method 5: Kill Switch with IPv6

A kill switch blocks all non-VPN traffic if the VPN disconnects:

```bash
#!/bin/bash
# /etc/openvpn/up.sh (run when VPN connects)
# Block all IPv6 except loopback and the VPN interface
ip6tables -I OUTPUT 1 -o lo -j ACCEPT
ip6tables -I OUTPUT 2 -o tun0 -j ACCEPT
ip6tables -I OUTPUT 3 ! -o tun0 -j DROP
```

```bash
#!/bin/bash
# /etc/openvpn/down.sh (run when VPN disconnects)
# Remove the blocking rules (or keep them - depends on policy)
ip6tables -D OUTPUT -o lo -j ACCEPT
ip6tables -D OUTPUT -o tun0 -j ACCEPT
ip6tables -D OUTPUT ! -o tun0 -j DROP
```

```ini
# Add to OpenVPN client config:
script-security 2
up /etc/openvpn/up.sh
down /etc/openvpn/down.sh
```

## Method 6: NetworkManager IPv6 Configuration

On Linux with NetworkManager:

```bash
# Disable IPv6 on the underlying network connection profile
nmcli connection modify "Wired connection 1" ipv6.method disabled

# Or keep only IPv6 link-local addressing on that profile
nmcli connection modify "Wired connection 1" ipv6.method link-local

# Reconnect the profile to apply the change
nmcli connection up "Wired connection 1"
```

## Testing for IPv6 Leaks

```bash
# Check your current IPv6 address
curl -6 https://ifconfig.co

# Use online leak tests
# https://ipleak.net
# https://ipv6leak.com
# https://browserleaks.com/ip

# Manual test: if you have IPv6, this should fail (blocked) or show VPN's IPv6
curl --connect-timeout 5 -6 https://icanhazip.com
```

## Verifying Leak Prevention

```bash
# With VPN connected, try to reach IPv6
ping -6 -c 2 2001:4860:4860::8888

# If leak prevention is working:
# - IPv6 is disabled: "connect: Network is unreachable"
# - IPv6 is blocked: no response
# - IPv6 is tunneled: works, but exits at VPN server IP
```

Preventing IPv6 leaks is essential for any VPN deployment where privacy or security depends on all traffic exiting through the VPN - blocking or tunneling IPv6 ensures complete coverage.
