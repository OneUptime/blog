# How to Understand USGv6 (US Government IPv6 Profile)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: USGv6, IPv6, Government, Compliance, NIST, Federal, Standard

Description: Understand the USGv6 profile which defines IPv6 technical requirements for US federal government networks, equipment procurement, and deployment standards.

---

USGv6 (US Government IPv6 Profile) is a technical specification developed by NIST defining the minimum set of IPv6 capabilities required for equipment and software used in US federal government networks. Understanding USGv6 is essential for government contractors and federal IT departments.

## USGv6 Background

```text
USGv6 History:
- Developed by NIST (National Institute of Standards and Technology)
- Published as NIST SP 500-267: "A Profile for IPv6 in the US Government"
- Based on IETF RFCs with additional government-specific requirements
- Required for federal agency IPv6 deployment per OMB mandates

Key Documents:
- NIST SP 500-267B Rev 1: Updated USGv6 Profile (2020)
- IETF RFC 8504: IPv6 Node Requirements (foundation, obsoletes RFC 6434)
- USGv6 Technical Testing Requirements: Equipment testing procedures
```

## USGv6 Product Categories

```text
USGv6 defines requirements for product categories:

1. Host Devices
   - End-user devices, servers
   - Must support full IPv6 stack per USGv6 host profile
   - Required: IPv6 addressing, ICMPv6, NDP, PMTU

2. Router Devices
   - Network infrastructure routing equipment
   - Must support: OSPFv3, IS-IS for IPv6, BGP4+
   - Must support: IPv6 access control, filtering

3. Security Devices
   - Firewalls, IDS/IPS, VPN gateways
   - Must process IPv6 at full performance (no IPv6 slowdown)
   - Must apply same security policies to IPv6 as IPv4

4. Network Management Systems
   - SNMP over IPv6 transport
   - IPv6 address support in NMS databases
```

## USGv6 Host Requirements

```bash
# USGv6 Host Profile requirements (subset):

# 1. IPv6 Addressing

# - Static, SLAAC, and DHCPv6 support required
# Test SLAAC:
cat /proc/sys/net/ipv6/conf/eth0/autoconf
# Should be: 1

# Test DHCPv6 client:
dhclient -6 -v eth0

# 2. ICMPv6 (all mandatory types)
# - Echo Request/Reply
# - Destination Unreachable
# - Packet Too Big
# - Time Exceeded
# - Parameter Problem

# Verify ICMPv6 is not blocked
sudo ip6tables -L INPUT | grep icmpv6

# 3. Neighbor Discovery (NDP)
ip -6 neigh show

# 4. Privacy Extensions (required for hosts)
cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr
# Set to 2 for compliance

# 5. Path MTU Discovery
cat /proc/sys/net/ipv6/conf/eth0/mtu
```

## USGv6 Router Requirements

```bash
# USGv6 Router Profile (subset):

# 1. Routing Protocol Support
# OSPFv3:
sudo apt install quagga -y
# Configure /etc/quagga/ospf6d.conf

# BGP4+ for IPv6:
# Configure /etc/quagga/bgpd.conf with IPv6 address-family

# 2. IPv6 Filtering/ACL
sudo ip6tables -A FORWARD -s 2001:db8::/32 -j ACCEPT
sudo ip6tables -A FORWARD -j DROP

# 3. Source Address Verification (BCP 38)
# Prevent spoofed IPv6 packets
sudo ip6tables -A FORWARD -m rpfilter --invert -j DROP

# 4. Route Advertisement
# radvd configuration
cat /etc/radvd.conf
```

## USGv6 Testing and Certification

```text
USGv6 Testing Organizations:
- UNH InterOperability Laboratory (UNH-IOL)
- Spirent Communications
- IXIA (Keysight)

Testing Categories:
1. Conformance Testing: Does the device implement the RFCs correctly?
2. Interoperability Testing: Does it work with other vendors' equipment?
3. Performance Testing: Does IPv6 performance match IPv4?

Government Procurement:
- Federal agencies SHOULD only procure USGv6-conformant equipment
- Check NIST IPv6 Conformance Database for certified products
- USGv6 test results posted publicly at: https://www.iol.unh.edu/services/testing/usgv6
```

## Checking USGv6 Compliance

```bash
# Basic compliance check script
#!/bin/bash
echo "=== USGv6 Compliance Check ==="

# IPv6 enabled?
if sysctl net.ipv6.conf.all.disable_ipv6 | grep -q "= 0"; then
  echo "PASS: IPv6 enabled"
else
  echo "FAIL: IPv6 disabled"
fi

# Link-local address?
if ip -6 addr show | grep -q "fe80"; then
  echo "PASS: Link-local address present"
else
  echo "FAIL: No link-local address"
fi

# ICMPv6 allowed?
if ip6tables -L INPUT | grep -q "icmpv6"; then
  echo "PASS: ICMPv6 rules found"
else
  echo "WARN: No explicit ICMPv6 rules - check policy"
fi

# Privacy extensions?
TEMPADDR=$(sysctl net.ipv6.conf.eth0.use_tempaddr 2>/dev/null | awk '{print $3}')
if [ "$TEMPADDR" = "2" ]; then
  echo "PASS: Privacy extensions enabled"
else
  echo "WARN: Privacy extensions not enabled (use_tempaddr=$TEMPADDR)"
fi

echo "=== Check Complete ==="
```

USGv6 compliance builds on RFC 8504 with additional requirements specific to US federal government needs, with equipment certification through testing labs like UNH-IOL providing the procurement guidance federal agencies use to ensure interoperable IPv6 infrastructure.
