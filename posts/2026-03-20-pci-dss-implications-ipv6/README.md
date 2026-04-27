# How to Understand PCI DSS Implications for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, IPv6, Compliance, Payment Card, Security, Cardholder Data

Description: Understand how PCI DSS (Payment Card Industry Data Security Standard) applies to IPv6 networks, covering network segmentation, firewall requirements, and audit considerations.

---

PCI DSS does not have separate IPv6-specific requirements; rather, all PCI DSS controls apply equally to IPv4 and IPv6 networks. Organizations must ensure that IPv6 traffic within the cardholder data environment (CDE) meets the same security standards as IPv4.

## PCI DSS and IPv6 - Key Principle

```text
PCI DSS Core Principle for IPv6:
"All PCI DSS requirements that apply to IPv4 networks
apply equally to IPv6 networks and dual-stack environments."

- Requirement 1: Network security controls apply to IPv6
- Requirement 2: Secure configs required for IPv6 components
- Requirement 6: Vulnerabilities must be addressed including IPv6
- Requirement 10: Logging applies to IPv6 traffic
- Requirement 11: Testing must include IPv6
```

## PCI DSS Requirement 1: Firewall for IPv6

```bash
# PCI DSS 4.0 Requirement 1.3 - Network Access Controls

# All inbound and outbound IPv6 traffic must be controlled

# No "allow all" rules for IPv6

# CDE inbound - only necessary services
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT  # HTTPS only
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo ip6tables -P INPUT DROP  # Deny all else

# Block tunneling attempts (PCI DSS prohibits unauthorized tunnels)
sudo ip6tables -A INPUT -p ipv6 -j DROP  # Block IPv6-in-IPv6 (proto 41)
# Note: 6in4 (IPv6 over IPv4) is IPv4 traffic with proto 41 -
# block it on the IPv4 firewall: sudo iptables -A INPUT -p 41 -j DROP

# Save rules (iptables-persistent default path on Debian/Ubuntu)
sudo ip6tables-save > /etc/iptables/rules.v6

# Document all firewall rules (required for PCI audit)
sudo ip6tables -L -n -v > /tmp/pci_ipv6_fw_rules.txt
```

## PCI DSS Requirement 2: Hardening for IPv6

```bash
# Disable unnecessary IPv6 services

# Remove unnecessary IPv6 listening services
ss -6 -tlnp | grep -v "127.0.0.1\|::1"

# Disable router advertisement if not needed
sudo sysctl -w net.ipv6.conf.all.accept_ra=0
sudo sysctl -w net.ipv6.conf.default.accept_ra=0

# Disable IPv6 on interfaces not in CDE scope
sudo sysctl -w net.ipv6.conf.eth_untrusted.disable_ipv6=1

# Document all active IPv6 addresses in CDE
ip -6 addr show scope global | tee /tmp/pci_ipv6_addresses.txt
```

## PCI DSS Requirement 10: Logging IPv6 Events

```bash
# All IPv6 security events must be logged

# Enable IPv6 firewall logging
sudo ip6tables -A INPUT -j LOG \
  --log-prefix "PCI-IPV6-INPUT-DROP: " \
  --log-level 4

sudo ip6tables -A FORWARD -j LOG \
  --log-prefix "PCI-IPV6-FWD-DROP: " \
  --log-level 4

# Configure rsyslog to capture IPv6 events
cat >> /etc/rsyslog.conf << 'EOF'
# PCI DSS IPv6 logging
kern.warning    /var/log/ipv6-security.log
EOF

sudo systemctl restart rsyslog

# Log IPv6 authentication events
sudo grep "2001:\|ipv6\|::" /var/log/auth.log | head -20
```

## PCI DSS Requirement 11: Testing IPv6

```bash
# Annual penetration testing must include IPv6

# 1. External IPv6 vulnerability scan
# nmap -6 -sV -sC 2001:db8::1

# 2. Test for IPv6-specific vulnerabilities
# - Rogue Router Advertisements
# - NDP spoofing
# - IPv6 extension header attacks
# - Unauthorized IPv6 tunnels

# 3. Verify all CDE servers are scanned via IPv6
nmap -6 -p 443,80 2001:db8::1

# 4. ASV (Approved Scanning Vendor) scans must include IPv6
# Confirm with your ASV that scans target IPv6 addresses
```

## IPv6 Network Segmentation for PCI

```bash
# CDE must be segmented from non-CDE (applies to IPv6 too)

# IPv6 segmentation with VLANs
# VLAN 100: CDE IPv6 prefix - 2001:db8:cde::/48
# VLAN 200: Non-CDE IPv6 prefix - 2001:db8:corp::/48

# ip6tables rules for CDE isolation
# Allow CDE to payment processor
sudo ip6tables -A FORWARD \
  -s 2001:db8:cde::/48 \
  -d 2001:db8:processor::/48 \
  -p tcp --dport 443 \
  -j ACCEPT

# Block CDE to all other IPv6
sudo ip6tables -A FORWARD \
  -s 2001:db8:cde::/48 \
  -j DROP

# Verify no IPv6 routes leak between segments
ip -6 route show table all
```

## PCI DSS QSA Considerations for IPv6

```text
What QSAs look for with IPv6:

1. Network diagrams include IPv6 addressing
2. Firewall rules cover both IPv4 and IPv6
3. Vulnerability scans target IPv6 addresses
4. Log review includes IPv6 source addresses
5. Penetration tests include IPv6 attack vectors
6. Security configurations applied to IPv6 components
7. No unauthorized IPv6 tunnels crossing CDE boundaries
8. IPv6 addresses included in system inventories

Common Finding: "IPv6 is enabled on CDE servers but
firewall rules only cover IPv4" - this is a PCI finding
that requires remediation.
```

PCI DSS IPv6 compliance gaps most commonly appear when organizations add IPv4 security controls and forget to apply equivalent rules to IPv6 - particularly firewall policies, logging, and vulnerability scanning scope - so a systematic review comparing IPv4 and IPv6 control parity is the most effective compliance approach.
