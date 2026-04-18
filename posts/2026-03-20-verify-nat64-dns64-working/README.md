# How to Verify NAT64 and DNS64 Are Working Correctly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAT64, DNS64, IPv6, IPv4, Testing, Verification, Networking

Description: Test and verify a NAT64/DNS64 deployment by checking DNS synthesis, testing IPv4 reachability from IPv6-only hosts, and validating TAYGA translation tables.

## Introduction

After deploying NAT64 (TAYGA) and DNS64 (BIND or Unbound), systematic verification ensures the entire translation chain works correctly. Testing covers DNS synthesis, IPv6-to-IPv4 packet translation, and end-to-end connectivity from IPv6-only clients.

## Step 1: Verify DNS64 Synthesis

```bash
# Test against your DNS64 server (e.g., 10.0.0.5)

# 1. Check synthesis for a known IPv4-only host

#    ipv4only.arpa has only an A record (192.0.0.170 and 192.0.0.171)
dig @10.0.0.5 AAAA ipv4only.arpa.
# Expected: 64:ff9b::c000:aa  (synthesized from 192.0.0.170)
# NOT expected: NXDOMAIN

# 2. Verify real AAAA records are not synthesized
dig @10.0.0.5 AAAA google.com
# Expected: real IPv6 addresses (2607:f8b0:...), NOT 64:ff9b::

# 3. Verify A → AAAA synthesis for any IPv4-only domain
dig @10.0.0.5 A example.com            # Get the IPv4 address
dig @10.0.0.5 AAAA example.com         # Should return 64:ff9b::<ipv4>
```

## Step 2: Verify NAT64 (TAYGA) Configuration

```bash
# On the NAT64 gateway (where TAYGA runs)

# Check TAYGA interface is up
ip address show nat64
# Expected: up, with 192.168.255.1/24 address

# Check routes are configured
ip route show | grep 192.168.255
# Expected: 192.168.255.0/24 dev nat64

ip -6 route show | grep "64:ff9b"
# Expected: 64:ff9b::/96 dev nat64

# Check iptables masquerade is set
sudo iptables -t nat -L POSTROUTING -n | grep 192.168.255
# Expected: MASQUERADE  all  192.168.255.0/24

# Check TAYGA is running
sudo systemctl status tayga
# or
ps aux | grep tayga
```

## Step 3: Test Packet Translation

```bash
# From an IPv6-only host, test NAT64 directly using the prefix:
# 8.8.8.8 = 0x08080808 → 64:ff9b::808:808

# Option 1: Direct prefix test (no DNS)
ping -6 64:ff9b::808:808   # Pings 8.8.8.8 through NAT64
# Expected: replies from 64:ff9b::808:808

# Option 2: Test with known IPv4 service
curl -6 http://64:ff9b::5db8:d822/  # http://93.184.216.34/ (example.com)

# Check TAYGA translation table
# TAYGA persists dynamic IPv4↔IPv6 mappings to the file `dynamic.map`
# inside the `data-dir` directory configured in tayga.conf
# (Debian/Ubuntu packages default data-dir to /var/spool/tayga):
sudo cat /var/spool/tayga/dynamic.map
# Shows active IPv4↔IPv6 mappings with last-used timestamps
```

## Step 4: End-to-End Test from IPv6-Only Client

```bash
# Configure client to use DNS64 server
# /etc/resolv.conf (on IPv6-only client)
# nameserver 2001:db8::dns64server

# Test DNS resolution + NAT64 together:
# 1. nslookup resolves via DNS64 to 64:ff9b:: address
# 2. Client sends IPv6 to 64:ff9b:: address
# 3. TAYGA translates to IPv4 and back

# Test with curl on IPv6-only client:
curl -6 https://www.example.com
# Expected: HTTP 200 response

# Test with ping on IPv6-only client:
# (DNS64 should return 64:ff9b:: for an IPv4-only domain)
ping -6 ipv4only.arpa
```

## Common Issues and Fixes

```bash
# Issue: DNS64 returning NXDOMAIN instead of synthesizing
# Fix: Check DNS64 server is configured correctly
#      Verify upstream DNS has A records
nslookup ipv4only.arpa 8.8.8.8   # Should return IPv4

# Issue: Ping to 64:ff9b:: works but HTTP doesn't
# Fix: Check MTU - NAT64 adds overhead
#      TAYGA interface MTU should be 1480 or lower
ip link show nat64 | grep mtu

# Issue: Translation happening but IPv4 not routing
# Fix: Check iptables masquerade is active
sudo iptables -t nat -nL | grep MASQUERADE

# Issue: Asymmetric routing - IPv6 packets going out but no reply
# Fix: Verify TAYGA is on the default IPv4 path
ip route show
```

## Conclusion

Verify NAT64/DNS64 in sequence: DNS synthesis first (`dig AAAA ipv4only.arpa`), then direct NAT64 translation (`ping -6 64:ff9b::808:808`), then end-to-end from an IPv6-only client. The `dynamic.map` file in TAYGA's `data-dir` shows active translation mappings. Ensure TAYGA's TUN interface has routes for both `64:ff9b::/96` (inbound) and `192.168.255.0/24` (outbound), and iptables masquerade covers the dynamic pool.
