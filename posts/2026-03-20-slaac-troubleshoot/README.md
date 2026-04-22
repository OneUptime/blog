# How to Troubleshoot SLAAC Problems on IPv6 Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLAAC, Troubleshooting, IPv6, Router Advertisement, Diagnostic

Description: Troubleshoot common SLAAC failures including no address received, DAD failures, missing default routes, and incorrect prefix configuration using step-by-step diagnostic procedures.

## Introduction

SLAAC failures typically manifest as hosts not receiving IPv6 addresses or routes. The troubleshooting process follows a logical path: verify the host can receive RAs, verify the RA contains the correct prefix information, confirm DAD succeeds, and check that routes are installed. This guide provides systematic diagnostic steps for the most common SLAAC problems.

## Diagnostic Flowchart

```text
SLAAC Troubleshooting Flow:

Host has no global IPv6 address?
  ↓
Is IPv6 enabled?      → check: ip link show; sysctl accept_ra
  ↓ YES
Is link-local present? → check: ip -6 addr show | grep fe80
  ↓ YES
Is RA being received? → check: tcpdump 'icmp6 and ip6[40] == 134'
  ↓ YES
Does RA have A=1?     → check: rdisc6 eth0 | grep Autonomous
  ↓ YES
Is prefix /64?        → check: rdisc6 eth0 | grep Prefix
  ↓ YES
Did DAD succeed?      → check: ip -6 addr | grep -E 'tentative|dadfailed'
  ↓ YES
Check address state   → ip -6 addr show | grep dynamic
```

## Problem 1: No IPv6 Address

```bash
# Step 1: Verify IPv6 is enabled on the interface

ip link show eth0 | grep "UP"
# Should show UP LOWER_UP

# Check IPv6 is not disabled globally
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6
# Expected: 0 (disabled = 0 means IPv6 is ENABLED)

# Step 2: Verify link-local address exists
ip -6 addr show eth0 | grep fe80
# If no link-local: IPv6 not working at all on this interface
# Fix: sudo sysctl -w net.ipv6.conf.eth0.disable_ipv6=0

# Step 3: Check accept_ra setting
cat /proc/sys/net/ipv6/conf/eth0/accept_ra
# 0 = disabled (SLAAC won't work)
# 1 = enabled (correct for non-routing hosts)
# 2 = enabled even when forwarding (correct for routers doing SLAAC)
# Fix: sudo sysctl -w net.ipv6.conf.eth0.accept_ra=1

# Step 4: Check autoconf setting
cat /proc/sys/net/ipv6/conf/eth0/autoconf
# 0 = disabled (link-local only, no global SLAAC)
# 1 = enabled (correct)
# Fix: sudo sysctl -w net.ipv6.conf.eth0.autoconf=1
```

## Problem 2: No Router Advertisement Received

```bash
# Capture RA messages (periodic RAs may be minutes apart; trigger RS below if needed)
sudo tcpdump -i eth0 -n "icmp6 and ip6[40] == 134" -c 5
# If nothing appears, trigger RS and keep capturing

# Trigger immediate RS to request RA
sudo rdisc6 eth0  # Sends Router Solicitation
# If no RA returned after its default retries (~12 seconds): router or firewall issue

# Check from router side (if accessible):
# Is radvd running?
sudo systemctl status radvd

# Is radvd sending RAs?
sudo radvdump  # On router: show RA content

# Check firewall blocking RAs
# RAs use ICMPv6 type 134; periodic RAs go to ff02::1, solicited RAs may be unicast
sudo ip6tables -L INPUT -v | grep -E "icmpv6|ipv6-icmp"
# If a DROP rule matches ICMPv6: it may be blocking RAs

# Allow RA on host
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT
```

## Problem 3: RA Received but Wrong Prefix

```bash
# Inspect RA content
sudo rdisc6 eth0
# Look for:
#  Prefix: 2001:db8::/64      ← should be your network prefix
#   Valid time: 2592000        ← should be > 0
#   Pref. time: 604800         ← should be > 0
#   Autonomous address conf. : Yes  ← A flag must be YES

# If "Autonomous address conf.: No" (A=0):
# Router is not advertising prefix for SLAAC
# Fix on router (radvd): set AdvAutonomous on;
# Fix on Cisco: remove no-autoconfig from the ipv6 nd prefix configuration

# If prefix is wrong (/128, /48, etc):
# On Ethernet LANs, SLAAC normally requires a /64 prefix
# Router config error

# If prefix is correct but Pref. time = 0:
# Prefix is being DEPRECATED
# Fix on radvd: AdvPreferredLifetime 604800;
```

## Problem 4: DAD Failure

```bash
# Check for DAD failure
ip -6 addr show eth0 | grep -i dadfailed
# inet6 2001:db8::211:22ff:fe33:4455/64 scope global dadfailed

# This means another device has the same IPv6 address
# Causes:
# 1. VM clone with same MAC address (same interface ID when EUI-64 is used)
# 2. Static address conflict
# 3. NDP spoofing/attack

# Fix for VM clone:
# Change MAC address of VM
# Then: sudo ip link set eth0 down && sudo ip link set eth0 up

# Fix for static conflict:
# Find the other device: sudo ndisc6 2001:db8::211:22ff:fe33:4455 eth0
# Remove static conflicting address from other device

# Monitor DAD process:
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 135 and ip6 src ::"
# Should see 1-2 DAD NS messages per new address
# If you see a NA response to DAD NS: another device has the address
```

## Problem 5: Address Assigned but No Connectivity

```bash
# Address exists but no internet connectivity

# Step 1: Check default route
ip -6 route show default
# If missing: router not sending RouterLifetime > 0
# Or: RA not being accepted as a default router source

# Step 2: Ping the router
ROUTER=$(ip -6 route show default | grep -oP 'via \K[^ ]+' | head -1)
ping6 -c 3 "$ROUTER%eth0"
# If fails: router itself is unreachable on this link

# Step 3: Check on-link route
ip -6 route show | grep "proto kernel"
# Should show: 2001:db8::/64 dev eth0 proto kernel ...
# If missing: prefix is not on-link (L=1) or address has noprefixroute

# Step 4: Verify address is not deprecated
ip -6 addr show eth0 | grep deprecated
# If deprecated: preferred_lft has expired
# Wait for new address or trigger fresh RS

# Step 5: Test IPv6 connectivity step by step
ping6 -c 2 "$ROUTER%eth0"        # Ping router link-local
ping6 -c 2 2001:4860:4860::8888  # Ping Google DNS
ping6 -c 2 ipv6.google.com        # Test DNS + connectivity
```

## Problem 6: IPv6 Forwarding Breaks SLAAC

```bash
# Common issue: enabling IPv6 forwarding makes accept_ra=1 ineffective
# Result: host/router that should SLAAC from upstream loses SLAAC

cat /proc/sys/net/ipv6/conf/eth0/forwarding
# 1 = forwarding enabled

cat /proc/sys/net/ipv6/conf/eth0/accept_ra
# 1 = accept RA only when forwarding is disabled
# With forwarding=1, RAs are ignored unless accept_ra=2

# This is intentional behavior to prevent routing loops
# But for a router that also needs SLAAC from upstream:
# Fix: use accept_ra=2 (accept RA even when forwarding)
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=2
```

## Conclusion

SLAAC troubleshooting follows a layered approach: verify IPv6 is enabled, confirm link-local address exists, check that RA is being received, inspect RA content for correct prefix with A=1 flag, verify DAD passes, and confirm routes are installed. Key sysctl parameters are `accept_ra` (use 1 for hosts, or 2 when forwarding is enabled) and `autoconf` (must be 1). Use `rdisc6` for comprehensive RA inspection, `tcpdump icmp6` for packet capture, and `ip -6 addr show` plus `ip -6 route show` for state verification.
