# How to Troubleshoot NTP over IPv6 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NTP, IPv6, Troubleshooting, Time Synchronization, Networking, Chrony

Description: Systematically diagnose and resolve NTP synchronization failures over IPv6 by checking connectivity, DNS resolution, firewall rules, and NTP server responses.

---

NTP over IPv6 failures can manifest as time drift, synchronization failures, or inability to connect to NTP servers. This guide provides a structured approach to diagnosing and resolving these issues.

## Step 1: Verify Basic IPv6 Connectivity

```bash
# Check IPv6 is functional on the host

ip -6 addr show
# Look for a valid global unicast address (2001:... or similar)

# Test basic IPv6 connectivity
ping6 -c 4 2001:4860:4860::8888

# If ping6 fails, check the default IPv6 route
ip -6 route show
# Should have a default route via your gateway
```

## Step 2: Verify DNS Resolution for NTP Servers

```bash
# Check if NTP pool resolves to IPv6 addresses
dig AAAA pool.ntp.org +short
dig AAAA time.google.com +short

# If no AAAA records returned, DNS may not be returning IPv6
# Check your resolver configuration
cat /etc/resolv.conf

# Use an IPv6-capable DNS server explicitly
dig AAAA pool.ntp.org @2001:4860:4860::8888 +short
```

## Step 3: Test NTP Port (UDP 123) Reachability

```bash
# Check if UDP port 123 is reachable on an NTP server
# (nmap treats UDP differently - may need root)
sudo nmap -6 -sU -p 123 2001:db8::1

# Use ntpdate to test connectivity
ntpdate -q 2001:db8::1

# Use nc to test UDP connectivity
echo "" | nc -6 -u -w 2 2001:db8::1 123 && echo "Connected" || echo "Failed"
```

## Step 4: Check Local Firewall Rules

```bash
# Check IPv6 firewall rules for NTP
sudo ip6tables -L -n -v | grep "123\|ntp"

# Check output rules (for client)
sudo ip6tables -L OUTPUT -n | grep 123

# Check input rules (for server)
sudo ip6tables -L INPUT -n | grep 123

# Temporarily allow NTP for testing
sudo ip6tables -I OUTPUT -p udp --dport 123 -j ACCEPT
sudo ip6tables -I INPUT  -p udp --sport 123 -j ACCEPT

# For firewalld
sudo firewall-cmd --list-services | grep ntp
sudo firewall-cmd --add-service=ntp --permanent
sudo firewall-cmd --reload
```

## Step 5: Check chrony/ntpd Logs for Errors

```bash
# chrony logs
sudo journalctl -u chronyd --since "1 hour ago"

# Look for specific error patterns
sudo journalctl -u chronyd | grep -i \
  "unreachable\|timeout\|refused\|resolve\|ipv6\|failed"

# ntpd logs
sudo journalctl -u ntp
sudo tail -100 /var/log/ntp/ntp.log

# Check if chrony is using IPv6 addresses (contain colons)
chronyc sources -v | grep ":"
```

## Step 6: Capture NTP Traffic

```bash
# Capture NTP packets on IPv6
sudo tcpdump -i eth0 -n ip6 and udp port 123 -v

# Save capture for analysis
sudo tcpdump -i eth0 -w /tmp/ntp_ipv6.pcap ip6 and udp port 123

# Capture both IPv4 and IPv6 NTP traffic
sudo tcpdump -i eth0 -n udp port 123 -v

# Read the capture
tcpdump -r /tmp/ntp_ipv6.pcap -nn
```

## Step 7: Test NTP Response Manually

```bash
# Use ntpdate in debug mode
sudo ntpdate -d 2001:db8::1

# Expected output includes:
# - "receive time stamp: ..." (indicates response received)
# - "offset X.XXXXXX sec"
# Failure shows "no server suitable for synchronization found"

# Use chronyc to manually poll
chronyc online       # Bring sources online
chronyc burst 1/2   # Request burst of samples
chronyc sources     # Check results
```

## Common NTP IPv6 Issues and Solutions

```bash
# Issue: chrony shows "?" for IPv6 sources (unreachable)
# Check:
chronyc sources
# Fix: Verify firewall allows UDP 123 outbound

# Issue: "Name or service not known" in chrony logs
# The NTP hostname doesn't resolve to an IPv6 address
dig AAAA pool.ntp.org
# Fix: Use the IPv6-capable pool zone 2.pool.ntp.org (prefix "2" returns AAAA records)

# Issue: "Connection refused" on ntpdate
# NTP server may be blocking your IPv6 source
sudo ntpdate -6 -d 2001:db8::1 2>&1 | grep -i "refused\|block\|rate"

# Issue: IPv6 routing problem
ip -6 route show default
# If no default IPv6 route, add one:
sudo ip -6 route add default via 2001:db8::1 dev eth0
```

## Automated NTP IPv6 Health Check Script

```bash
#!/bin/bash
# ntp_ipv6_health.sh - Check NTP synchronization over IPv6

NTP_SERVERS=("2001:db8::1" "2001:db8::2" "time.google.com")
MAX_OFFSET=100  # milliseconds

for server in "${NTP_SERVERS[@]}"; do
  echo -n "Testing $server: "
  result=$(ntpdate -q "$server" 2>&1)

  if echo "$result" | grep -q "offset"; then
    offset=$(echo "$result" | grep -oP 'offset \K[\d.-]+' | head -1)
    echo "OK (offset: ${offset}s)"
  else
    echo "FAILED - $(echo "$result" | tail -1)"
  fi
done

# Check overall sync status
echo ""
chronyc tracking | grep -E "System time|Last offset|RMS offset"
```

A systematic approach - from basic IPv6 connectivity through DNS, firewall, and NTP-specific checks - efficiently identifies the root cause of NTP over IPv6 synchronization failures.
