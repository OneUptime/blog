# How to Troubleshoot Dual-Stack IPv4/IPv6 Connectivity Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dual-Stack, IPv4, IPv6, Troubleshooting, Connectivity, Networking

Description: Diagnose and fix dual-stack networking issues including Happy Eyeballs failures, IPv6 preference problems, DNS resolution inconsistencies, and routing asymmetry.

## Introduction

Dual-stack deployments introduce new failure modes: an application may prefer IPv6 but the IPv6 path is broken, DNS returns both A and AAAA but one is unreachable, or routing works on one protocol but not the other. This guide covers systematic diagnosis of dual-stack connectivity problems.

## Happy Eyeballs and Protocol Selection

```bash
# Happy Eyeballs (RFC 8305): clients prefer IPv6, then start IPv4 shortly after if IPv6 is slow or unreachable

# When something is "slow" in dual-stack, IPv6 is often broken

# Test which protocol is being used:
curl -v https://example.com 2>&1 | grep "Connected to"
# Look for IPv4 or IPv6 address in the output

# Force specific protocol:
curl -4 https://example.com  # Force IPv4
curl -6 https://example.com  # Force IPv6 (will fail if IPv6 broken)
```

## Diagnosing IPv6 Issues in Dual-Stack

```bash
# Step 1: Is IPv6 working at all?
ping -6 ::1              # Loopback (should work if IPv6 stack is enabled)
ping -6 2001:4860:4860::8888   # Google's IPv6 DNS

# Step 2: Is the IPv6 default route configured?
ip -6 route show default
# Expected: default via <gateway> dev eth0

# Step 3: Can you reach the IPv6 gateway?
ping -6 <your-ipv6-gateway>
# If the gateway is link-local, include the interface:
ping -6 fe80::1%eth0

# Step 4: Are AAAA records resolving?
dig AAAA google.com
# Expected: AAAA records returned

# Step 5: Check IPv6 is not disabled:
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6
# 0 = enabled, 1 = disabled
```

## DNS Issues in Dual-Stack

```bash
# DNS returns AAAA but IPv6 is broken → connection may stall before falling back

# Check what DNS returns:
host example.com
# Should show both A and AAAA if host is dual-stack

# Test specific record types:
dig A example.com          # Query IPv4 address records
dig AAAA example.com       # Query IPv6 address records

# If you need to test DNS transport:
dig -4 AAAA example.com    # Send DNS query over IPv4
dig -6 AAAA example.com    # Send DNS query over IPv6

# Compare:
host -t A example.com
host -t AAAA example.com

# If AAAA exists but IPv6 doesn't work:
# The application may be slow (waits for IPv6 timeout or Happy Eyeballs delay)
# Fix: either make IPv6 work OR remove AAAA record
```

## Routing Issues

```bash
# Check routing tables for both protocols
ip -4 route show
ip -6 route show

# Test path for specific destination:
traceroute -4 google.com   # IPv4 path
traceroute -6 google.com   # IPv6 path

# Compare path lengths (asymmetric paths are normal)

# Check if specific prefix is reachable:
ip -6 route get 2001:4860:4860::8888
# Shows: via <gateway> dev <interface> src <local-ipv6>

# Test IPv6 minimum MTU (1232 data + 8 ICMPv6 + 40 IPv6 = 1280):
ping -6 -s 1232 -M do 2001:4860:4860::8888

# Test a 1500-byte path (1452 data + headers = 1500):
ping -6 -s 1452 -M do 2001:4860:4860::8888
# If smaller packets work but larger ones hang, MTU or ICMPv6 Packet Too Big handling issues may exist on the path
```

## Protocol Preference Issues

```bash
# Check /etc/gai.conf for address preference ordering
grep -vE '^[[:space:]]*(#|$)' /etc/gai.conf

# Default policy generally prefers IPv6 over IPv4 when both are suitable
# To prefer IPv4 in gai.conf:
sudo sed -i 's/^#[[:space:]]*precedence[[:space:]]*::ffff:0:0\/96[[:space:]]*100/precedence ::ffff:0:0\/96  100/' /etc/gai.conf

# Or add at end of /etc/gai.conf:
echo "precedence ::ffff:0:0/96  100" | sudo tee -a /etc/gai.conf

# Test after change (what getaddrinfo returns first):
python3 -c "import socket; print([r[4][0] for r in socket.getaddrinfo('google.com',80)])"
```

## Application-Level Dual-Stack Testing

```bash
# Test if an application listens on both protocols:
sudo ss -tlnp | grep :443
# Expect: 0.0.0.0:443 for IPv4 and [::]:443/:::443 for IPv6
# On Linux, one IPv6 wildcard listener may also accept IPv4 if net.ipv6.bindv6only=0

# Or for Python/Ruby/Node apps that may only bind to IPv4:
# Check bind address in application configuration

# Test with nc:
nc -4 -vz -w 5 example.com 80    # IPv4 connection
nc -6 -vz -w 5 example.com 80    # IPv6 connection
printf 'GET / HTTP/1.0\r\nHost: example.com\r\n\r\n' | nc -6 -w 5 example.com 80
```

## Conclusion

Dual-stack troubleshooting starts by isolating which protocol family has the issue using `curl -4` / `curl -6` or `ping -4` / `ping -6`. Check DNS returns the correct records for both families, verify default routes exist for both IPv4 and IPv6, and ensure IPv6 isn't disabled on the interface. Slow connections often indicate a broken IPv6 path causing Happy Eyeballs delays - fix the IPv6 path or disable AAAA records until IPv6 is properly working.
