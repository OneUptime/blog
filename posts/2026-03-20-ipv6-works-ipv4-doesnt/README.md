# How to Troubleshoot IPv6 Connectivity Works But IPv4 Does Not

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Troubleshooting, Connectivity, Dual-Stack, Network Debugging

Description: Diagnose and fix situations where IPv6 connectivity is working but IPv4 is broken, including common causes like missing IPv4 routes, DHCP failures, NAT misconfigurations, and ISP IPv4 issues.

## Introduction

When IPv6 works but IPv4 does not, the root cause is typically in the IPv4 layer specifically - IPv6 and IPv4 often use separate address assignment, routing, and firewall mechanisms. Common causes include DHCP failure (no IPv4 address assigned), missing IPv4 default route, NAT misconfiguration on a router or gateway, ISP IPv4 outage, or firewall rules blocking IPv4 but not IPv6. This guide provides systematic diagnosis and fixes.

## Diagnostic Checklist

```bash
#!/bin/bash
echo "=== IPv4 vs IPv6 Comparison Diagnostic ==="

echo ""
echo "--- IPv4 Address Assignment ---"
ip -4 addr show | grep "inet " | grep -v "127.0.0.1"
# Should show: inet x.x.x.x/xx

echo ""
echo "--- IPv6 Address Assignment ---"
ip -6 addr show | grep "inet6.*scope global"
# Should show: inet6 xxxx::/xx scope global

echo ""
echo "--- IPv4 Default Route ---"
ip -4 route show default
# Should show: default via x.x.x.x dev eth0

echo ""
echo "--- IPv6 Default Route ---"
ip -6 route show default
# Should show: default via fe80::1 dev eth0

echo ""
echo "--- IPv4 Gateway Ping ---"
GW4=$(ip -4 route show default | awk '/default/ {for (i=1; i<=NF; i++) if ($i=="via") print $(i+1)}' | head -1)
if [ -n "$GW4" ]; then
  ping -c 2 "$GW4"
else
  echo "No IPv4 gateway found"
fi

echo ""
echo "--- IPv6 Gateway Ping ---"
GW6=$(ip -6 route show default | awk '/default/ {for (i=1; i<=NF; i++) if ($i=="via") print $(i+1)}' | head -1)
DEV6=$(ip -6 route show default | awk '/default/ {for (i=1; i<=NF; i++) if ($i=="dev") print $(i+1)}' | head -1)
if [ -n "$GW6" ] && [ -n "$DEV6" ]; then
  ping -6 -c 2 "${GW6}%${DEV6}"
else
  echo "No IPv6 gateway found"
fi

echo ""
echo "--- IPv4 DNS Test ---"
nslookup google.com 8.8.8.8 2>/dev/null | grep "Address" || echo "IPv4 DNS failed"

echo ""
echo "--- IPv6 DNS Test ---"
nslookup google.com 2001:4860:4860::8888 2>/dev/null | grep "Address" || echo "IPv6 DNS failed"
```

## Fix: No IPv4 Address (DHCP Failure)

```bash
# Symptom: No inet address on interface (only link-local IPv4 169.254.x.x or nothing)

ip -4 addr show eth0

# Fix 1: Request DHCP manually
sudo dhclient eth0
# or
sudo dhcpcd eth0

# Fix 2: Check DHCP logs
sudo journalctl -b | grep -Ei 'dhcp|dhclient|dhcpcd'

# Fix 3: Release and renew DHCP
sudo dhclient -r eth0  # Release
sudo dhclient eth0     # Request new lease

# Fix 4: Check DHCP server reachability
sudo dhclient -v eth0  # Verbose DHCP negotiation
# Look for: DHCPDISCOVER, DHCPOFFER, DHCPREQUEST, DHCPACK
```

## Fix: IPv4 Default Route Missing

```bash
# Symptom: IPv4 address assigned but no internet access
ip -4 route show default
# Empty or missing

# Fix: Add default route manually (replace 192.168.1.1 with your actual gateway)
sudo ip route replace default via 192.168.1.1 dev eth0

# Make persistent (ifupdown)
sudo tee /etc/network/interfaces.d/eth0 > /dev/null << 'EOF'
auto eth0
iface eth0 inet dhcp
    post-up ip route replace default via 192.168.1.1 dev eth0
EOF

# systemd-networkd
sudo tee /etc/systemd/network/eth0.network > /dev/null << 'EOF'
[Match]
Name=eth0

[Network]
DHCP=ipv4
Gateway=192.168.1.1
IPv6AcceptRA=yes
EOF
```

## Fix: NAT/Firewall IPv4 Issue

```bash
# Check iptables for IPv4 blocking rules
sudo iptables -L -n | grep -E "DROP|REJECT"

# Check if NAT masquerade is configured for IPv4 outbound (if this host is a router/NAT gateway)
sudo iptables -t nat -L POSTROUTING -n

# If NAT is missing and this host is the IPv4 gateway for other machines:
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Check IPv4 forwarding (for routing hosts)
cat /proc/sys/net/ipv4/ip_forward
# Should be 1 if forwarding is needed

# Enable IPv4 forwarding
sudo sysctl -w net.ipv4.ip_forward=1
```

## Fix: ISP IPv4 vs IPv6 Outage

```bash
# Test IPv4 and IPv6 independently
# IPv4 test
curl -4 -s --connect-timeout 5 https://www.google.com/ >/dev/null && echo "IPv4 internet: OK" || echo "IPv4 internet: FAIL"

# IPv6 test
curl -6 -s --connect-timeout 5 https://www.google.com/ >/dev/null && echo "IPv6 internet: OK" || echo "IPv6 internet: FAIL"

# Traceroute IPv4 to find where packets are dropped
traceroute -4 8.8.8.8

# Compare with IPv6
traceroute -6 2001:4860:4860::8888

# If IPv4 fails beyond your local gateway while IPv6 continues to work, contact your ISP about a possible IPv4 outage
# IPv6 may use different infrastructure (native vs tunneled)
```

## Conclusion

When IPv6 works but IPv4 fails, diagnose in order: check IPv4 address assignment (DHCP failure is common), verify the IPv4 default route exists, check iptables rules for IPv4-specific blocks, verify NAT masquerade is configured if the host is acting as a router/NAT gateway, and test if the issue is at the ISP level. IPv6 and IPv4 use largely separate address assignment, routing, and firewall mechanisms, so many failures are protocol-specific. A common cause is DHCP failure combined with working IPv6 SLAAC, which can assign IPv6 automatically without DHCPv4.
