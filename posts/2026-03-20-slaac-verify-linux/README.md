# How to Verify SLAAC Address Assignment on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLAAC, Linux, Verification, IPv6, ip command, Diagnostic

Description: Verify that SLAAC is working correctly on Linux by examining address states, checking received prefixes, viewing default routes, and capturing Router Advertisement messages.

## Introduction

After configuring SLAAC on a Linux host or on a forwarding interface configured to accept RAs, verification confirms that addresses are being assigned correctly, default routes are learned, and DNS is configured. This guide covers the complete set of verification commands for checking SLAAC operation, from address state inspection to packet captures.

## Checking SLAAC Addresses

```bash
# Show all IPv6 addresses with lifetimes and state

ip -6 addr show

# SLAAC indicators to look for:
# - "dynamic" keyword: IPv6 address was installed by stateless address configuration
# - "proto kernel_ra" (newer iproute2): address was installed from Router Advertisement
# - "valid_lft": non-zero while the address is valid
# - "preferred_lft": non-zero while preferred; 0 means the address is deprecated
# - Scope "global": address is not link-local (can include GUAs or ULAs)

# Example expected output:
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...
#     inet6 2001:db8::211:22ff:fe33:4455/64 scope global dynamic
#        valid_lft 2591897sec preferred_lft 604697sec
#     inet6 fe80::211:22ff:fe33:4455/64 scope link
#        valid_lft forever preferred_lft forever

# Show only SLAAC addresses (dynamic global scope)
ip -6 addr show scope global | grep dynamic

# Show with detailed flags
ip -d -6 addr show dev eth0
# Flags may include: dynamic, mngtmpaddr, nodad, noprefixroute
```

## Checking SLAAC-Learned Routes

```bash
# Show routes learned from Router Advertisements
ip -6 route show proto ra
# Expected:
# 2001:db8::/64 dev eth0 proto ra metric 1024 expires 2591897sec

# Show default route from RA
ip -6 route show default
# Expected:
# default via fe80::1 dev eth0 proto ra metric 1024 expires 1799sec
# "proto ra" = route learned from Router Advertisement

# Show all IPv6 routes
ip -6 route show

# Check default route expiry (important: default routes expire when RA Router Lifetime expires)
ip -6 route show default
# "expires 1799sec" = 30 minutes remaining from RA Router Lifetime=1800
```

## Checking RA Received Information

```bash
# The kernel's IPv6 neighbor discovery stores RA info
# View per-interface RA-related settings
cat /proc/sys/net/ipv6/conf/eth0/accept_ra
cat /proc/sys/net/ipv6/conf/eth0/autoconf

# Show received Router Advertisement statistics
cat /proc/net/snmp6 | grep Icmp6InRouterAdvertisements
# Icmp6InRouterAdvertisements        42  # Number of RAs received

# Or with nstat:
nstat -az | grep -i "router"

# Complete ICMPv6 statistics
cat /proc/net/snmp6 | grep Icmp6

# rdisc6: Send RS and display received RA content
# (requires ndisc6 package)
sudo apt-get install ndisc6
rdisc6 eth0
# Output shows full RA content:
# Hop limit                 :           64 (      0x40)
# Stateful address conf.    :           No
# Other configuration       :           No
# Router lifetime           :         1800 (0x00000708) seconds
# Reachable time            :  unspecified (0x00000000)
# Retransmit time           :  unspecified (0x00000000)
#  Source link-layer address: 00:11:22:33:44:55
#  Prefix                   : 2001:db8::/64
#   Valid time               : 2592000 (0x00278D00) seconds
#   Pref. time               :  604800 (0x00093A80) seconds
```

## Verifying DAD Completion

```bash
# Check for addresses still in TENTATIVE state (DAD in progress)
ip -6 addr show | grep -i tentative
# Should be empty in normal operation
# tentative = DAD not yet complete

# Check DAD status
ip -6 addr show dev eth0 | grep -Ei "tentative|dadfailed"
# dadfailed = duplicate address detected
# If dadfailed: change MAC address or manually choose different IID

# Monitor DAD process
ip monitor all 2>&1 | grep -Ei "tentative|dadfailed|scope global"

# DAD sends NS with unspecified source (::) to solicited-node multicast
# Capture DAD packets
sudo tcpdump -i eth0 -vv "icmp6 and ip6[40] == 135 and ip6 src ::"
# These are DAD Neighbor Solicitations (src = :: = tentative address DAD)
```

## Checking DNS Configuration from SLAAC

```bash
# If RA includes RDNSS option, check DNS configuration
# Using resolvectl (systemd-resolved):
resolvectl status eth0
# DNS Servers: 2001:4860:4860::8888 2001:4860:4860::8844
# DNS Domain: example.com

# Using /etc/resolv.conf (traditional):
cat /etc/resolv.conf
# nameserver 2001:4860:4860::8888
# nameserver 2001:4860:4860::8844
# search example.com

# If using NetworkManager:
nmcli device show eth0 | grep DNS

# Note: RDNSS in RA only works if the OS supports it
# Linux with NetworkManager or systemd-networkd: supported
# Older systems: may need DHCPv6 for DNS
```

## Full Verification Script

```bash
#!/bin/bash
# SLAAC Verification Script
IFACE=${1:-eth0}

echo "=== SLAAC Verification for $IFACE ==="

echo ""
echo "1. IPv6 Addresses:"
ip -6 addr show dev "$IFACE" | grep "inet6"

echo ""
echo "2. SLAAC (dynamic) addresses:"
ip -6 addr show dev "$IFACE" | grep dynamic
if [ $? -ne 0 ]; then
    echo "  WARNING: No dynamic (SLAAC) addresses found"
fi

echo ""
echo "3. Default route from RA:"
ip -6 route show default dev "$IFACE" | grep "proto ra"
if [ $? -ne 0 ]; then
    echo "  WARNING: No default route from Router Advertisement"
fi

echo ""
echo "4. accept_ra setting:"
ACCEPT_RA=$(cat /proc/sys/net/ipv6/conf/"$IFACE"/accept_ra)
echo "  accept_ra = $ACCEPT_RA"
[ "$ACCEPT_RA" = "0" ] && echo "  WARNING: accept_ra=0 disables SLAAC!"

echo ""
echo "5. RA received count:"
cat /proc/net/snmp6 | grep Icmp6InRouterAdvertisements

echo ""
echo "6. Connectivity test:"
ping -6 -c 2 2001:4860:4860::8888 2>/dev/null && \
    echo "  PASS: Google DNS reachable" || \
    echo "  FAIL: Cannot reach Google DNS"
```

## Conclusion

SLAAC verification on Linux involves checking for dynamic global addresses with valid/preferred lifetimes (`ip -6 addr show`), verifying the default route has `proto ra` (`ip -6 route show default`), and confirming RA-learned prefix routes are present (`ip -6 route show proto ra`). Use `rdisc6` to inspect the RA content and verify the prefix, router lifetime, and flags. Check `accept_ra` and `autoconf` sysctl values if SLAAC isn't working. Monitor DAD with `ip -6 addr show | grep -i tentative` to ensure addresses are completing DAD successfully.
