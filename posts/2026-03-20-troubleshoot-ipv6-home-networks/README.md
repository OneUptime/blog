# How to Troubleshoot IPv6 on Home Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Troubleshooting, Home Network, NDP, Connectivity, Router

Description: A step-by-step guide to diagnosing and fixing the most common IPv6 problems on home networks.

## Most Common Home IPv6 Issues

1. No IPv6 addresses on any device
2. IPv6 on router WAN but not on devices
3. IPv6 connectivity to some sites but not others
4. Slow performance over IPv6
5. IPv6 stopped working after router reboot

## Step 1: Check ISP IPv6 Availability

First, verify IPv6 is available from your ISP:

```bash
# Connect a laptop directly to the modem/ONT (bypass router)

# Then run:
ip -6 addr show scope global
# or visit test-ipv6.com in a browser
```

If no IPv6 directly from modem, the issue is with the ISP. Contact support.

## Step 2: Check Router WAN IPv6

Log into your router admin panel and check WAN status:

- Look for a global IPv6 address (starts with `2xxx:` or `3xxx:`)
- If only `fe80::` address: no IPv6 from ISP or DHCPv6 failed

On OpenWRT via SSH:

```bash
# Check WAN interface IPv6 status (wan6 is a UCI logical interface on OpenWRT)
ifstatus wan6
ip -6 route show default
```

Expected: a route `default via fe80::xxxx dev wan6 proto ra`

## Step 3: Check DHCPv6 Client Logs

If the router WAN has no global IPv6, check the DHCPv6 client:

```bash
# OpenWRT: check odhcp6c logs
logread | grep odhcp6c | tail -30

# Ubuntu/Debian (ISC dhclient):
journalctl -t dhclient -n 30

# Common errors:
# "NoBinding" → ISP doesn't have a lease for you; try releasing/renewing
# "NotOnLink" → Prefix delegation configuration mismatch
```

Force a DHCPv6 renew:

```bash
# OpenWRT
ifup wan6

# Ubuntu
dhclient -6 -r eth0 && dhclient -6 eth0
```

## Step 4: Check Prefix Delegation

The router must receive a prefix to distribute to LAN devices:

```bash
# On OpenWRT: check if prefix was delegated
logread | grep "delegated"

# Check LAN interface has a prefix assigned
ip -6 addr show br-lan | grep "scope global"
# Expected: 2001:xxxx::/64
```

If no delegated prefix, try changing the prefix delegation size in router settings (try /56, /60, /64).

## Step 5: Check Router Advertisement on LAN

Devices need to receive RAs to get IPv6 addresses. Capture RAs on a device:

```bash
# Linux: capture Router Advertisement messages
sudo tcpdump -i eth0 'icmp6 and ip6[40] == 134' -v

# Expected: see RA from router's link-local address (fe80::)
# Carrying prefix 2001:xxxx::/64

# macOS equivalent
tcpdump -i en0 'icmp6 and ip6[40] == 134'
```

If no RAs are received:
- Check that RA is enabled in router LAN settings
- Verify no other device is suppressing RAs (RA Guard misconfiguration)

## Step 6: Device-Level Debugging

If RAs are present but devices still don't get IPv6:

```bash
# Linux: manually trigger SLAAC
sysctl net.ipv6.conf.eth0.accept_ra=1
sysctl net.ipv6.conf.eth0.autoconf=1

# Check kernel IPv6 is enabled
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6
# Should be 0 (enabled)

# Restart network interface
ip link set eth0 down && ip link set eth0 up
```

## Step 7: Connectivity Issues to Specific Sites

If IPv6 works for most sites but some are slow or failing:

```bash
# Test specific site via IPv6
curl -6 -v https://example.com 2>&1 | grep -E "connect|IPv6|time"

# Traceroute to find where packets are dropped
traceroute6 example.com

# Check PMTUD is working (MTU issues cause stalls)
ping6 -s 1400 example.com  # Should work if PMTUD is correct
```

## Quick Fixes Checklist

| Problem | Fix |
|---------|-----|
| No WAN IPv6 | Check ISP provides IPv6, try DHCPv6 vs SLAAC |
| No LAN IPv6 | Enable RA in router, check prefix delegation size |
| Devices not SLAAC-ing | Accept_ra=1 on device, check ICMPv6 firewall |
| Slow IPv6 | Check PMTUD, try disabling large send offload |
| IPv6 stopped after reboot | DHCPv6 lease not renewed; add router to autostart |

## Conclusion

Most home IPv6 issues trace back to ISP provisioning, DHCPv6 prefix delegation configuration, or Router Advertisement delivery. Systematic debugging from WAN → router → LAN → device identifies the layer where the failure occurs, and most fixes are configuration changes in the router admin panel.
