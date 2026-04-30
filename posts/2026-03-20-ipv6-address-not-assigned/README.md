# How to Troubleshoot IPv6 Address Not Assigned

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Troubleshooting, SLAAC, DHCPv6, NDP, Address Assignment

Description: Diagnose and fix IPv6 address assignment failures including SLAAC not working, DHCPv6 not assigning addresses, and kernel configuration issues.

## Introduction

When an interface has no IPv6 global address, it can't reach the internet or other IPv6 subnets. Address assignment can fail for several reasons: no Router Advertisement received, SLAAC disabled by kernel settings, DHCPv6 client not running, or address assignment blocked by firewall rules. This guide walks through systematic diagnosis of IPv6 address assignment failures.

## Step 1: Check Current IPv6 Addresses

```bash
# Show all IPv6 addresses

ip -6 addr show

# Show only global IPv6 addresses
ip -6 addr show scope global

# Check specific interface
ip -6 addr show dev eth0

# Expected output includes:
# - Link-local (fe80::) - normally present if IPv6 is enabled
# - Global (2001: or 2600: etc.) - assigned via SLAAC or DHCPv6
# - ULA (fc00:: or fd00::) - private IPv6 addresses
```

## Step 2: Verify IPv6 is Enabled

```bash
# Check if IPv6 is disabled globally
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# 1 = disabled, 0 = enabled

# Check per-interface
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6

# Enable if disabled
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.eth0.disable_ipv6=0

# Make permanent
echo "net.ipv6.conf.all.disable_ipv6=0" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Step 3: Check Router Advertisement Reception

```bash
# Check if SLAAC is configured to accept RAs
cat /proc/sys/net/ipv6/conf/eth0/accept_ra
# 0 = don't accept RAs
# 1 = accept RAs (normal)
# 2 = accept RAs even when forwarding is enabled

# Enable RA acceptance
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=1   # use 2 instead if IPv6 forwarding is enabled

# Try to solicit a Router Advertisement
sudo rdisc6 eth0
# Should show prefix being advertised and M/O flags

# Capture RAs with tcpdump
sudo tcpdump -i eth0 -n "ip6 proto 58 and ip6[40] == 134" -v
```

## Step 4: Check SLAAC Configuration

```bash
# Check if SLAAC address generation is enabled
cat /proc/sys/net/ipv6/conf/eth0/autoconf
# 1 = enabled, 0 = disabled

# Enable SLAAC
sudo sysctl -w net.ipv6.conf.eth0.autoconf=1

# Check if RA received has A flag (Autonomous)
rdisc6 eth0 2>/dev/null | grep "Autonomous"
# "Autonomous address conf.: Yes" means SLAAC should work

# Check if temporary privacy addresses are enabled
cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr
# 0 = disabled, 1 = generate temp addresses but prefer public, 2 = prefer temp
```

## Step 5: Check DHCPv6

```bash
# Check if M flag in RA advertises DHCPv6-managed addressing
rdisc6 eth0 2>/dev/null | grep "Stateful address"
# "Stateful address conf.: Yes" means addresses are available via DHCPv6;
# SLAAC can still coexist if the prefix also has the A flag

# Check if a DHCPv6 client or network manager is handling the interface
pgrep -a dhclient 2>/dev/null || \
pgrep -a dhcpcd 2>/dev/null || \
pgrep -a NetworkManager 2>/dev/null || \
pgrep -a systemd-networkd 2>/dev/null

# Run DHCPv6 client manually
sudo dhclient -6 eth0

# Check systemd-networkd DHCPv6
systemctl status systemd-networkd
networkctl status eth0
```

## Step 6: Check Firewall Rules

```bash
# Check if ip6tables is blocking ICMPv6 (required for NDP/SLAAC)
sudo ip6tables -L INPUT -n | grep "icmp6\|ICMPv6"
sudo ip6tables -L OUTPUT -n | grep "icmp6\|ICMPv6"

# Allow ICMPv6 for NDP (required for address assignment)
sudo ip6tables -A INPUT -p icmpv6 -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 -j ACCEPT
```

## Diagnostic Checklist

```bash
#!/bin/bash
# diagnose-ipv6-address.sh

IFACE="${1:-eth0}"
echo "=== IPv6 Address Diagnosis for $IFACE ==="

# 1. Is IPv6 enabled?
disabled=$(cat /proc/sys/net/ipv6/conf/$IFACE/disable_ipv6 2>/dev/null)
[ "$disabled" = "0" ] && echo "[OK] IPv6 enabled" || echo "[FAIL] IPv6 disabled"

# 2. Link-local address present?
ll=$(ip -6 addr show dev "$IFACE" scope link 2>/dev/null | grep "inet6")
[ -n "$ll" ] && echo "[OK] Link-local address: $ll" || echo "[FAIL] No link-local address"

# 3. Accept RA?
forwarding=$(cat /proc/sys/net/ipv6/conf/$IFACE/forwarding 2>/dev/null)
accept_ra=$(cat /proc/sys/net/ipv6/conf/$IFACE/accept_ra 2>/dev/null)
if [ "$accept_ra" = "2" ] || { [ "$accept_ra" = "1" ] && [ "$forwarding" = "0" ]; }; then
  echo "[OK] accept_ra=$accept_ra"
elif [ "$accept_ra" = "1" ] && [ "$forwarding" = "1" ]; then
  echo "[WARN] accept_ra=1 but forwarding=1 (Linux ignores RAs unless accept_ra=2)"
else
  echo "[WARN] accept_ra=$accept_ra (RAs not accepted)"
fi

# 4. SLAAC enabled?
autoconf=$(cat /proc/sys/net/ipv6/conf/$IFACE/autoconf 2>/dev/null)
[ "$autoconf" = "1" ] && echo "[OK] autoconf=1 (SLAAC enabled)" || echo "[WARN] autoconf=$autoconf (SLAAC disabled)"

# 5. Global address?
global=$(ip -6 addr show dev "$IFACE" scope global 2>/dev/null | grep "inet6")
[ -n "$global" ] && echo "[OK] Global address: $global" || echo "[FAIL] No global IPv6 address"

# 6. RA present on network?
echo "Checking for Router Advertisements (5s)..."
ra=$(timeout 5 rdisc6 "$IFACE" 2>/dev/null | head -5)
[ -n "$ra" ] && echo "[OK] Router Advertisement received" || echo "[FAIL] No Router Advertisement"
```

## Conclusion

IPv6 address assignment failures typically stem from four causes: kernel IPv6 being disabled (`disable_ipv6=1`), no Router Advertisement being received (check `rdisc6`), SLAAC being disabled (`autoconf=0`, `accept_ra=0`), or DHCPv6 not running when the RA signals managed addressing. Check each layer systematically: verify IPv6 is enabled, confirm a link-local address exists, check if RAs are being received and have the `A` flag set, then verify SLAAC or DHCPv6 is configured to process them.
