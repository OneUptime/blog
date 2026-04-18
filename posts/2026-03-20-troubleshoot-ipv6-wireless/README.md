# How to Troubleshoot IPv6 on Wireless Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Troubleshooting, Wireless, Wi-Fi, SLAAC, DHCPv6, NDP, Debugging

Description: Diagnose and resolve common IPv6 issues on wireless networks including missing SLAAC addresses, RA not reaching clients, DHCPv6 failures, and IPv6 connectivity problems after roaming.

---

IPv6 wireless troubleshooting follows a layered approach: verify the access point bridges ICMPv6, confirm Router Advertisements reach wireless clients, validate SLAAC or DHCPv6 address assignment, and test end-to-end connectivity through each network hop.

## Step 1: Verify Wi-Fi Client Has IPv6 Address

```bash
# Linux wireless client

ip -6 addr show wlan0
# Look for scope global address:
# inet6 2001:db8::xxxx/64 scope global dynamic
# If only link-local (fe80::) - no RA received

# macOS
networksetup -getinfo Wi-Fi
# Or (filter out link-local fe80:: to see global addresses)
ifconfig en0 inet6 | grep -v fe80

# Windows
netsh interface ipv6 show addresses interface="Wi-Fi"

# Android (via adb)
adb shell ip -6 addr show wlan0
```

## Step 2: Check Router Advertisement Reception

```bash
# Monitor for RA messages (type 134)
sudo tcpdump -i wlan0 -nn icmp6 and ip6[40]==134 -v

# Send Router Solicitation to trigger RA (rdisc6 from ndisc6 package)
sudo rdisc6 -1 wlan0
# Should see RA response within 1-3 seconds

# Check if RA is accepted by the kernel
sysctl net.ipv6.conf.wlan0.accept_ra
# Must be 1 (or 2 if forwarding enabled)

# Enable RA acceptance if disabled
sudo sysctl -w net.ipv6.conf.wlan0.accept_ra=1

# View RA-learned routes
ip -6 route show proto ra dev wlan0

# Check RA flags from router
ip -6 route show dev wlan0 | grep "^default"
# Should show: default via fe80::router dev wlan0
```

## Step 3: Diagnose RA Not Reaching Clients

```bash
# On the access point or router:

# Check if RA is being sent on the wireless interface
sudo tcpdump -i wlan0 -nn icmp6 and ip6[40]==134

# Check radvd is running and configured correctly
sudo systemctl status radvd
sudo radvdump -i wlan0

# Common problem: AP blocks multicast/broadcast
# Check multicast snooping settings
cat /sys/devices/virtual/net/br0/bridge/multicast_snooping
# Set to 0 to allow all multicast (including RA ff02::1)
echo 0 > /sys/devices/virtual/net/br0/bridge/multicast_snooping

# Verify bridge is forwarding ICMPv6
sudo ebtables -L | grep icmpv6

# Check iptables/ip6tables on AP doesn't block RA
sudo ip6tables -L -n | grep icmpv6
```

## Step 4: Debug DHCPv6 Issues

```bash
# Capture DHCPv6 traffic
# DHCPv6 uses UDP ports 546 (client) and 547 (server)
sudo tcpdump -i wlan0 -nn udp and port 547

# Test DHCPv6 request manually
sudo dhclient -6 -v wlan0

# Common DHCPv6 issues:
# 1. Firewall blocking UDP 547 from client
# 2. M flag not set in RA (client won't use DHCPv6)
# 3. DHCPv6 server not configured

# Check M flag in RA
sudo tcpdump -i wlan0 -nn icmp6 and ip6[40]==134 -v | grep "flags"
# Look for: flags [managed] or flags [other stateful]

# Debug ISC DHCP server
sudo tail -f /var/log/syslog | grep dhcpd6
journalctl -u isc-dhcp-server6 -f
```

## Step 5: Test IPv6 After Roaming

```bash
# After roaming between APs, IPv6 may not reconnect

# On client: Send RS to get new RA from new AP
sudo ip -6 route flush dev wlan0
sudo rdisc6 -1 wlan0

# Check if IPv6 address is still valid after roam
ip -6 addr show wlan0
# "valid_lft" should be > 0

# Force SLAAC renegotiation
sudo ip link set wlan0 down
sudo ip link set wlan0 up

# Check NDP cache for stale entries
ip -6 neigh show dev wlan0
# Flush stale entries
sudo ip -6 neigh flush dev wlan0
```

## Step 6: Connectivity Tests

```bash
# Test IPv6 ping to gateway
GATEWAY=$(ip -6 route show dev wlan0 | grep "^default" | awk '{print $3}')
ping6 $GATEWAY -c 3

# Test DNS resolution over IPv6
dig AAAA google.com @2001:4860:4860::8888

# Test internet reachability
ping6 2606:4700:4700::1111 -c 3  # Cloudflare
ping6 2001:4860:4860::8888 -c 3   # Google

# Test HTTP over IPv6
curl -6 -v https://ipv6.google.com 2>&1 | head -20

# Check path MTU (important for Wi-Fi)
tracepath6 2001:4860:4860::8888
# PMTU issues common if AP changes MTU

# Test with explicit interface
curl -6 --interface wlan0 https://ipv6.google.com
```

## Step 7: Common Fixes

```bash
# Fix 1: Enable IPv6 if disabled on interface
sudo sysctl -w net.ipv6.conf.wlan0.disable_ipv6=0

# Fix 2: Accept RA even with forwarding enabled
sudo sysctl -w net.ipv6.conf.wlan0.accept_ra=2

# Fix 3: Enable SLAAC privacy extensions
sudo sysctl -w net.ipv6.conf.wlan0.use_tempaddr=1

# Fix 4: Fix MTU for wireless (common issue)
sudo ip link set wlan0 mtu 1500
# Or for tunneled environments
sudo ip link set wlan0 mtu 1480

# Fix 5: Restart networking
sudo systemctl restart NetworkManager
# Or
sudo ip link set wlan0 down && sudo ip link set wlan0 up
```

IPv6 wireless troubleshooting most commonly resolves to RA messages blocked by AP multicast filtering, `accept_ra` disabled on the client, or MLD/ICMPv6 traffic dropped by firewall rules; verifying with tcpdump on the wireless interface that RA type-134 messages are visible is the fastest way to isolate whether the problem is at the AP/router or client side.
