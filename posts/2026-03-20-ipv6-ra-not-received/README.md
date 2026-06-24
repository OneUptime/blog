# How to Troubleshoot IPv6 Router Advertisement Not Received

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Router Advertisement, SLAAC, NDP, Troubleshooting, Network Diagnostics

Description: Diagnose why IPv6 Router Advertisements are not being received, causing hosts to have no default route or global addresses via SLAAC.

## Introduction

Router Advertisements (RAs) are ICMPv6 messages sent by routers to announce IPv6 prefixes, default gateway information, and DHCPv6 flags. Hosts rely on RAs to configure SLAAC addresses and default routes. When RAs are not received, hosts typically get no global IPv6 addresses via SLAAC and no default route. This guide diagnoses RA reception failures.

## Step 1: Actively Solicit a Router Advertisement

```bash
# Send Router Solicitation and wait for RA response

rdisc6 eth0

# Wait longer (5 seconds) and try multiple times
rdisc6 -r 3 -w 5000 eth0

# If no RA is received, the router may not be sending one or it may be filtered

# Expected output when working:
# Hop limit                 :   64
# Stateful address conf.    :   No
# Router lifetime           : 1800
# Prefix                   : 2001:db8:cafe::/64
```

## Step 2: Capture RA Traffic Passively

```bash
# Listen for any Router Advertisement on the interface
# (Routers send unsolicited RAs every few minutes by default)
sudo tcpdump -i eth0 -v "ip6 proto 58 and ip6[40] == 134"

# Wait up to 10 minutes for unsolicited RA
# If nothing appears, RAs are either not being sent or are being blocked before reaching this host

# Also capture Router Solicitations (type 133)
sudo tcpdump -i eth0 -v "ip6 proto 58 and (ip6[40] == 133 or ip6[40] == 134)"
```

## Step 3: Check RA Acceptance Settings

```bash
# Check if kernel is configured to accept RAs
cat /proc/sys/net/ipv6/conf/eth0/accept_ra
# 0 = don't accept RAs
# 1 = accept RAs if forwarding is disabled
# 2 = accept RAs even when forwarding is enabled

# If 0, enable RA acceptance on a host
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=1

# Check if forwarding is causing the issue
# When forwarding=1, accept_ra must be 2
cat /proc/sys/net/ipv6/conf/eth0/forwarding
# If forwarding=1, set:
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=2
```

## Step 4: Check for RA Guard or Firewall Blocking

```bash
# Check if ip6tables is blocking ICMPv6 RA type (134)
sudo ip6tables -L INPUT -n -v | grep "icmp6\|134"

# Allow Router Advertisements
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT
# Or more specifically:
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 134 -j ACCEPT

# Check for RA Guard on switch (hardware-level blocking)
# RA Guard blocks RAs on access ports, allowing them only from router ports
# Check switch configuration if all hosts on a segment fail to get RAs
```

## Step 5: Verify Router Configuration

```bash
# Check if radvd (RA daemon) is running on the router/gateway
# (Run this on the device acting as IPv6 router)
systemctl status radvd

# Check radvd configuration
cat /etc/radvd.conf

# Sample working radvd.conf:
# interface eth0 {
#     AdvSendAdvert on;
#     AdvDefaultLifetime 1800;
#     prefix 2001:db8:cafe::/64 {
#         AdvOnLink on;
#         AdvAutonomous on;
#     };
# };

# Restart radvd, then re-test with rdisc6
sudo systemctl restart radvd

# Check if IPv6 forwarding is enabled on the router
cat /proc/sys/net/ipv6/conf/eth0/forwarding  # should be 1 on router
```

## Step 6: Check Link-Local Connectivity

RAs come from the router's link-local address (`fe80::/10`). If link-local communication is broken, RAs can't be received:

```bash
# Find router's link-local address
ip -6 neigh show dev eth0 | grep "router"

# Or check if any fe80:: addresses are in neighbor cache
ip -6 neigh show | grep fe80

# Try to ping router's link-local address
ping6 -I eth0 fe80::1

# If ping fails, check physical connectivity
ethtool eth0 | grep "Link detected"
```

## Diagnostic Script

```bash
#!/bin/bash
# diagnose-ra.sh

IFACE="${1:-eth0}"
echo "=== Router Advertisement Diagnostics for $IFACE ==="

echo ""
echo "1. accept_ra setting:"
val=$(cat /proc/sys/net/ipv6/conf/$IFACE/accept_ra 2>/dev/null)
case "$val" in
    0) echo "  [FAIL] accept_ra=0 - RAs will be ignored" ;;
    1) echo "  [OK] accept_ra=1 - RAs are processed only when forwarding=0" ;;
    2) echo "  [OK] accept_ra=2 - RAs processed even with forwarding" ;;
    *) echo "  [?] accept_ra=$val" ;;
esac

echo ""
echo "2. IPv6 forwarding:"
fwd=$(cat /proc/sys/net/ipv6/conf/$IFACE/forwarding 2>/dev/null)
echo "  forwarding=$fwd"
[ "$fwd" = "1" ] && [ "$val" = "1" ] && \
    echo "  [WARN] forwarding=1 but accept_ra=1 - set accept_ra=2"

echo ""
echo "3. Actively soliciting RA (3s wait, 1 attempt)..."
if command -v rdisc6 >/dev/null 2>&1; then
    result=$(rdisc6 -r 1 -w 3000 "$IFACE" 2>/dev/null)
    if [ -n "$result" ]; then
        echo "  [OK] RA received!"
        echo "$result" | grep -E "Prefix|Lifetime|Stateful"
    else
        echo "  [FAIL] No RA received"
    fi
else
    echo "  [WARN] rdisc6 not installed"
fi

echo ""
echo "4. Current default route:"
ip -6 route show default 2>/dev/null || echo "  [FAIL] No default route"
```

## Conclusion

Router Advertisement failures are typically caused by a few common issues: `accept_ra=0` on the receiving host, a firewall or RA Guard blocking ICMPv6 type 134, the router not configured to send RAs, or IPv6 forwarding enabled on the host without setting `accept_ra=2`. Use `rdisc6` to actively solicit an RA and `tcpdump` to confirm whether RA packets are arriving on the interface. If RAs arrive but are not applied, check Linux sysctl settings and whether the advertisements themselves are valid.
