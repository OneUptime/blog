# How to Troubleshoot ISP Customer IPv6 Issues - Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ISP, Troubleshooting, Customer Support, DHCPv6, Connectivity

Description: A structured guide for ISP support staff to diagnose and resolve common IPv6 connectivity issues reported by customers.

## Common Customer IPv6 Complaints

1. "My IPv6 doesn't work at all"
2. "Some websites are slow with IPv6"
3. "I have IPv6 but can't reach IPv4-only sites"
4. "My devices don't get IPv6 addresses"
5. "IPv6 was working and now stopped"

## Diagnostic Checklist

### Step 1: Verify CPE Has IPv6 WAN Address

Check the ISP side first - does the BNG/BRAS show an active IPv6 session?

```bash
# On BNG (Cisco IOS): find customer session

show subscriber session uid <customer-id> detail | include IPv6

# Check DHCPv6 lease on DHCP server
echo '{"duid": "<customer-duid>"}' \
  | kea-shell --service dhcp6 lease6-get-by-duid \
  | python3 -m json.tool
```

### Step 2: Check Prefix Delegation

Verify the customer received a delegated prefix:

```bash
# Check RADIUS accounting for delegated prefix
grep "customer@isp.com" /var/log/radius/detail | grep "Delegated-IPv6"

# Alternatively check DHCP lease file (Kea memfile CSV default)
grep "<customer-duid>" /var/lib/kea/kea-leases6.csv
```

### Step 3: Test Connectivity from ISP Side

Attempt a ping from the ISP network to the customer's delegated prefix:

```bash
# Ping the customer's CPE WAN IPv6 address
ping6 2001:db8:cust:1234::1

# If PD is working, try pinging a LAN address in their delegated range
# (Customer must have a device with a known IPv6 address)
```

### Step 4: Customer Self-Diagnosis Script

Provide customers with a simple diagnosis command:

```bash
#!/bin/bash
# IPv6 diagnosis script for customers

echo "=== IPv6 Interface Addresses ==="
ip -6 addr show scope global

echo ""
echo "=== Default Route ==="
ip -6 route show default

echo ""
echo "=== Ping Test to ISP DNS ==="
ping6 -c 3 2001:db8:dns::1

echo ""
echo "=== Ping Test to Google IPv6 ==="
ping6 -c 3 2001:4860:4860::8888

echo ""
echo "=== DNS AAAA Test ==="
dig AAAA ipv6.google.com
```

### Step 5: Common Fixes

**No IPv6 address on CPE WAN**:
```bash
# Restart DHCPv6 client on OpenWRT
/etc/init.d/network restart

# Force DHCPv6 renew on Linux
dhclient -6 -r eth0 && dhclient -6 eth0
```

**IPv6 address on WAN but no LAN prefix**:
- Check if CPE is requesting prefix delegation (`reqprefix` option in config)
- Verify DHCPv6-PD pool has available prefixes

**Slow IPv6 to some sites (Happy Eyeballs fallback)**:
```bash
# Test connection time with IPv6 vs IPv4
curl -6 -o /dev/null -s -w "IPv6 time: %{time_total}s\n" https://example.com
curl -4 -o /dev/null -s -w "IPv4 time: %{time_total}s\n" https://example.com

# Check for packet loss on the path
mtr -6 2001:4860:4860::8888
```

## Escalation Decision Tree

```nginx
Customer reports no IPv6
├── BNG shows no IPv6 session → Check RADIUS, CPE model, port configuration
├── BNG shows session, no PD → Check DHCPv6 pool, relay configuration
├── PD assigned, no LAN IPv6 → CPE firewall or RA configuration issue
└── LAN IPv6 works, internet broken → Check upstream routing, prefix advertisement
```

## Conclusion

Systematic IPv6 troubleshooting for ISP customers starts at the BNG/RADIUS layer and works toward the customer's devices. Providing customers with simple diagnostic scripts reduces support call duration. Most issues are caused by CPE configuration, exhausted DHCPv6 PD pools, or RADIUS attribute misconfiguration.
