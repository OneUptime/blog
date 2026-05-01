# How to Document IPv6 Compliance for Audits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Compliance, Audit, Documentation, Security, Governance

Description: Create comprehensive IPv6 compliance documentation for security audits, including network diagrams, configuration evidence, testing results, and policy documentation.

---

IPv6 compliance audits require systematic documentation of your IPv6 deployment, security controls, and policy framework. Well-prepared audit documentation reduces audit time and demonstrates mature IPv6 governance.

## IPv6 Audit Documentation Framework

```text
Required Documentation Categories:

1. Network Architecture Documentation
   - Network diagrams showing IPv6 addressing
   - Address allocation plan (IPAM records)
   - IPv6 routing topology
   - Dual-stack vs IPv6-only segments

2. Configuration Documentation
   - Router/switch IPv6 configurations
   - Firewall IPv6 rule sets
   - Server IPv6 network settings
   - DNS AAAA records inventory

3. Policy Documentation
   - IPv6 Security Policy
   - IPv6 Transition Plan
   - IPv6 Address Management Policy
   - Acceptable Use Policy (IPv6 section)

4. Testing Evidence
   - Penetration test results for IPv6
   - Vulnerability scans of IPv6 addresses
   - Connectivity test results
```

## Collecting IPv6 Configuration Evidence

```bash
#!/bin/bash
# collect_ipv6_evidence.sh - Collect IPv6 compliance evidence

OUTPUT_DIR="/tmp/ipv6_audit_$(date +%Y%m%d)"
mkdir -p $OUTPUT_DIR

echo "Collecting IPv6 compliance evidence..."

# 1. IPv6 address assignments

ip -6 addr show > "$OUTPUT_DIR/ipv6_addresses.txt"

# 2. IPv6 routing table
ip -6 route show > "$OUTPUT_DIR/ipv6_routes.txt"

# 3. Firewall rules
sudo ip6tables -L -n -v > "$OUTPUT_DIR/ip6tables_rules.txt" 2>/dev/null || true
sudo nft list ruleset > "$OUTPUT_DIR/nftables_ruleset.txt" 2>/dev/null || true

# 4. DNS configuration
cat /etc/resolv.conf > "$OUTPUT_DIR/dns_config.txt"

# 5. Listening services on IPv6
ss -6 -tlnp > "$OUTPUT_DIR/ipv6_listeners_tcp.txt"
ss -6 -ulnp > "$OUTPUT_DIR/ipv6_listeners_udp.txt"

# 6. IPv6 neighbor table
ip -6 neigh show > "$OUTPUT_DIR/ndp_table.txt"

# 7. Kernel IPv6 settings
sysctl -a 2>/dev/null | grep "ipv6" > "$OUTPUT_DIR/ipv6_sysctl.txt"

echo "Evidence collected in $OUTPUT_DIR"
ls -la $OUTPUT_DIR
```

## IPv6 Security Policy Template

```markdown
# IPv6 Security Policy
Version: 1.0
Date: 2026-03-20
Owner: Information Security Team

## 1. Purpose
This policy establishes requirements for secure IPv6 deployment
across all organization networks and systems.

## 2. Scope
Applies to all systems, networks, and personnel managing
IPv6-enabled infrastructure.

## 3. Requirements

### 3.1 Address Management
- All IPv6 addresses MUST be registered in the IPAM system
- All public-facing servers MUST have DNS AAAA records
- Address allocations MUST follow the approved IPv6 addressing plan

### 3.2 Firewall and Access Control
- IPv6 traffic MUST be filtered with explicit rules
- ICMPv6 Packet Too Big MUST be permitted (required for PMTU)
- Unauthorized IPv6 tunneling MUST be blocked
- Default IPv6 policy: DENY (except explicitly permitted services)

### 3.3 Monitoring
- IPv6 traffic MUST be included in network monitoring
- Security events from IPv6 sources MUST be logged and reviewed
- SNMP and syslog MUST support IPv6 transport

### 3.4 Prohibited Actions
- IPv6 tunneling over unauthorized paths
- Use of IPv6 address space not allocated to the organization
- Disabling IPv6 security features without change management
```

## IPv6 Address Inventory Spreadsheet

```bash
#!/bin/bash
# Generate IPv6 address inventory for audit
echo "Hostname,IPv6 Address,Interface,Scope,DNS AAAA,Notes" > /tmp/ipv6_inventory.csv

# Inventory known IPv6 neighbors from the local neighbor table
ip -6 neigh show | awk '$2=="dev"{print $1 "," $3}' | while IFS=, read -r addr iface; do
    hostname=$(dig -x "$addr" +short 2>/dev/null | sed 's/\.$//')
    aaaa_records="NONE"

    if [ -n "$hostname" ]; then
        aaaa_records=$(dig AAAA "$hostname" +short 2>/dev/null | paste -sd ';' -)
        aaaa_records=${aaaa_records:-NONE}
    fi

    case "$addr" in
        fe80:*) scope="link" ;;
        fc*|fd*) scope="unique-local" ;;
        ::1) scope="host" ;;
        *) scope="global" ;;
    esac

    echo "${hostname:-UNKNOWN},$addr,$iface,$scope,$aaaa_records," \
      >> /tmp/ipv6_inventory.csv
done

# Check DNS AAAA records for known servers
for server in web app db mail; do
    aaaa=$(dig AAAA "${server}.example.com" +short 2>/dev/null | paste -sd ';' -)
    echo "${server}.example.com,$aaaa,,,${aaaa:-MISSING},Check AAAA record" \
      >> /tmp/ipv6_inventory.csv
done

cat /tmp/ipv6_inventory.csv
```

## Testing IPv6 Controls

```bash
# Audit testing commands

# Test 1: Verify IPv6 filtering is active
sudo ip6tables -L INPUT -n | grep -E "ACCEPT|DROP|REJECT"

# Test 2: Verify no unauthorized IPv6 tunnels
sudo ip tunnel show
sudo ip -6 tunnel show
sudo ip -d link show type sit
sudo ip -d link show type ip6tnl
sudo ip -d link show type ip6gre
sudo ip -d link show type vti6

# Test 3: Verify ICMPv6 Packet Too Big is allowed (PMTU)
sudo ip6tables -S | grep -- "--icmpv6-type packet-too-big"

# Test 4: Verify IPv6 logging is configured
sudo ip6tables -L | grep LOG

# Test 5: Check for IPv6 listening on unexpected ports
ss -6 -tlnp | awk '{print $4, $6}' | grep -v "::1"
```

Comprehensive IPv6 audit documentation requires evidence collection scripts, documented security policies, address inventories, and testing results, with the combination of automated evidence gathering and policy documentation providing auditors confidence in the maturity of your IPv6 security posture.
