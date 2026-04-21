# How to Troubleshoot Game Server IPv6 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Game Server, Troubleshooting, Networking, Connectivity, Diagnostic

Description: Diagnose and fix common IPv6 connectivity issues for game servers, including address assignment problems, firewall misconfigurations, and dual-stack connection failures.

---

When players cannot connect to your IPv6 game server, systematic troubleshooting helps identify whether the issue is with IPv6 address assignment, firewall rules, DNS resolution, or the game server binding itself.

## Step 1: Verify Server Has a Global IPv6 Address

```bash
# Check IPv6 address assignment

ip -6 addr show scope global

# Verify address is not just link-local (fe80::/10) or ULA (fc00::/7)
# You need a routable global unicast address, usually from 2000::/3

# Check default route exists
ip -6 route show default

# Verify outbound IPv6 connectivity
ping -6 -c 4 google.com
ping -6 -c 4 2001:4860:4860::8888
```

## Step 2: Verify Server is Listening on IPv6

```bash
# Check all listening sockets
ss -tlnp  # TCP
ss -ulnp  # UDP
ss -6 -tlnp  # IPv6 TCP only
ss -6 -ulnp  # IPv6 UDP only

# For specific port (e.g., Minecraft 25565)
ss -tlnp | grep 25565
ss -6 -tlnp | grep 25565

# Check if process is bound to specific address or all
# 0.0.0.0 = IPv4 only
# [::] or :::25565 = IPv6 (possibly dual-stack)
```

## Step 3: Test Firewall Rules

```bash
# List IPv6 firewall rules
sudo ip6tables -L INPUT -n -v

# Check for DROP rules affecting game ports
sudo ip6tables -L INPUT -n -v | grep "25565\|27015\|2456\|34197"

# Save current IPv6 firewall rules before temporary testing
sudo ip6tables-save > /tmp/ip6tables.before

# Temporarily allow all INPUT traffic (for testing only)
sudo ip6tables -I INPUT 1 -j ACCEPT

# Then test connection, and restore the saved rules exactly
sudo ip6tables-restore < /tmp/ip6tables.before
```

## Step 4: DNS Troubleshooting

```bash
# Check AAAA record resolution
dig AAAA gameserver.example.com +short

# If no AAAA record, clients can't connect by hostname
# Add AAAA record to your DNS zone:
# gameserver.example.com. IN AAAA 2001:db8::10
# Replace the documentation address with your server's real IPv6 address

# Test from client side
nslookup gameserver.example.com
nslookup -type=AAAA gameserver.example.com
```

## Step 5: Test Port Reachability from External Host

```bash
# From another host with IPv6 connectivity
nmap -6 -sT -p 25565 2001:db8::10
sudo nmap -6 -sU -p 27015 2001:db8::10

# Simple TCP test
nc -6 -z -w 5 2001:db8::10 25565 && echo "OPEN" || echo "CLOSED"

# Traceroute over IPv6
traceroute6 2001:db8::10
```

## Step 6: Diagnose Dual-Stack Issues

```bash
# Some clients prefer IPv4 over IPv6 (or vice versa)
# Check if game client supports IPv6

# On Linux client, force IPv6 connection
curl -6 http://[2001:db8::10]:8080/

# Check Happy Eyeballs behavior
# Some games implement Happy Eyeballs (RFC 8305; RFC 6555 was earlier)

# If clients connect via IPv4 but not IPv6:
# 1. Check getaddrinfo preference on Linux/glibc clients
grep "^precedence" /etc/gai.conf

# Prefer IPv6 by keeping native IPv6 (::/0) above IPv4-mapped IPv6 (::ffff:0:0/96)
# If you set precedence lines, include the full table; one precedence line disables defaults
sudoedit /etc/gai.conf
```

## Common Issues and Fixes

```bash
# Issue: Server binds to 0.0.0.0 only (no IPv6)
# Fix: Change bind address to :: in server config

# Issue: ip6tables blocking connections
sudo ip6tables -I INPUT 1 -p tcp --dport 25565 -j ACCEPT

# Issue: Router not routing IPv6 to server
# Fix: Ensure firewall on router/CPE allows forwarding
sudo ip6tables -A FORWARD -d 2001:db8::10 -j ACCEPT

# Issue: IPv6 address expired or deprecated
ip -6 addr show | grep "preferred_lft\|valid_lft"
# Renew via DHCPv6 only if the address came from DHCPv6: sudo dhclient -6 eth0
```

## Logging Connection Attempts

```bash
# Log IPv6 connection attempts for debugging
sudo ip6tables -A INPUT -p tcp --dport 25565 -j LOG --log-prefix "GAME-IPV6: "

# Watch kernel log for connection attempts
sudo dmesg | grep "GAME-IPV6"
sudo journalctl -k | grep "GAME-IPV6"
```

Systematic verification of IPv6 address assignment, server binding configuration, firewall rules, and DNS records covers the vast majority of game server IPv6 connectivity issues, with the server's bind address being the most common misconfiguration to check first.
