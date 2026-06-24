# SLAAC vs DHCPv6: Choosing the Right IPv6 Address Assignment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLAAC, DHCPv6, IPv6, Address Assignment, M Flag, O Flag

Description: Compare SLAAC and DHCPv6 for IPv6 address assignment, understand when to use each, and how the M and O flags in Router Advertisements control the choice.

## Introduction

IPv6 networks commonly use three address/configuration models: SLAAC (stateless, automatic from RA prefix), stateful DHCPv6 (centralized server assigns addresses like DHCPv4), and stateless DHCPv6 (SLAAC provides addresses, DHCPv6 provides DNS/options). The Router Advertisement M and O flags signal DHCPv6 availability; SLAAC itself is enabled per advertised prefix by the Prefix Information A flag. Choosing the right approach depends on your requirements for address tracking, DNS configuration, and management complexity.

## Three Address Assignment Models

```text
IPv6 Address Assignment Models:

Model 1: Pure SLAAC (M=0, O=0, A=1)
  Address:  From RA prefix + host-generated IID
  DNS:      From RA RDNSS option (if present) or manual
  Tracking: No central record of who has what address
  Setup:    Only a router needed (no DHCP server)
  Best for: Small networks, home networks, IoT

Model 2: SLAAC + Stateless DHCPv6 (M=0, O=1, A=1)
  Address:  From RA prefix + host-generated IID (SLAAC)
  DNS:      From DHCPv6 Information-request/Reply exchange
  Tracking: No address tracking (DHCPv6 only provides DNS)
  Setup:    Router + stateless DHCPv6 server
  Best for: Networks needing DHCPv6-based DNS without address control

Model 3: Stateful DHCPv6 (M=1, A=0 for DHCPv6-only addressing)
  Address:  From DHCPv6 server (IA_NA assignment)
  DNS:      From DHCPv6 (DNS option in REPLY)
  Tracking: Central server records DHCPv6 assignments
  Setup:    Router + stateful DHCPv6 server
  Best for: Enterprise, security-conscious deployments
```

## M and O Flag Decision Matrix

```text
RA Flag Settings and Their Effects:

M=0, O=0 (Pure SLAAC):
  Router: sends RA with prefix A=1, no DHCPv6 server needed
  Host:   generates SLAAC address, no DHCPv6 exchange
  DNS:    from RDNSS in RA, or not provided

M=0, O=1 (SLAAC + Stateless DHCPv6):
  Router: sends RA with prefix A=1 + O flag set
  Host:   generates SLAAC address (from RA prefix)
          AND sends DHCPv6 Information-request for DNS
  DNS:    from DHCPv6 REPLY

M=1, O=0 (Stateful DHCPv6-only addressing when A=0):
  Router: sends RA with M=1 and prefix A=0 if advertising a prefix
  Host:   starts DHCPv6 Solicit/Advertise/Request/Reply for address
          no SLAAC address generated from prefixes with A=0
  DNS:    from DHCPv6 REPLY (or separate RA RDNSS)

M=1, O=1 (Stateful DHCPv6 + extra options; O is redundant):
  Router: sends RA with M=1 and O=1
  Host:   gets address from stateful DHCPv6
          can also get other options in the same DHCPv6 exchange
  Common: Microsoft networks (Windows DHCPv6 server)

Note: A=1 (prefix AdvAutonomous=on) in RA Prefix Info enables SLAAC
      for that prefix regardless of M flag.
      To prevent SLAAC: set A=0 in the prefix option.
```

## Feature Comparison

```text
SLAAC vs DHCPv6 Comparison Table:

Feature                  | SLAAC        | Stateful DHCPv6
-------------------------|--------------|------------------
Address control          | Host decides | Server assigns
Address tracking/audit   | No central lease log | DHCPv6 server log
DNS configuration        | RDNSS in RA  | DHCPv6 option
NTP/other options        | Limited RA options (not NTP) | DHCPv6 options
Requires DHCP server     | No           | Yes
Stable addresses         | Depends (EUI-64 or RFC 7217) | Can be stable (server assigns)
Address reservation      | Not possible | Possible (by DUID)
Works without router     | No           | No (still needs RA for gateway)
Prefix delegation        | Not provided by SLAAC | DHCPv6-PD (IA_PD)
Zero-touch deployment    | Yes          | Requires DHCP server setup
Privacy by default       | Often (temporary addresses if enabled) | Lower (server leases are logged)
```

## When to Use SLAAC

```text
SLAAC is appropriate when:

1. Simplified deployment is priority:
   - No DHCP server infrastructure to manage
   - Plug-in-and-go IPv6 addressing
   - Small office / home office environments

2. Address tracking is not required:
   - No compliance requirement to know which host had which IP
   - Privacy is desired (temp addresses from RFC 8981)

3. Predictable addresses are acceptable:
   - EUI-64 addresses are predictable from MAC
   - RFC 7217 addresses are stable and manageable

4. DNS can be provided via RA RDNSS:
   - RDNSS is standardized for DNS in Router Advertisements
   - Eliminates need for DHCPv6 for DNS on clients that support RDNSS

5. IoT/embedded devices:
   - Simple devices may only support SLAAC
   - DHCPv6 may not be available in firmware
```

## When to Use Stateful DHCPv6

```text
Stateful DHCPv6 is appropriate when:

1. Address tracking required:
   - Security compliance (know which host used which IP)
   - Logging requirements (IP to user mapping)
   - Forensics capability

2. Address control required:
   - Specific host must always get same address
   - Address reservations by DUID (like DHCP reservations)

3. Cannot use SLAAC:
   - Prefix length is not /64 on common Ethernet/Wi-Fi links
   - Unusual network topologies

4. Other DHCPv6 options needed:
   - Vendor-specific options
   - Bootfile/PXE options
   - Options not supported in RA

5. Windows Server environment:
   - Windows DHCP Server handles DHCPv6 natively
   - Active Directory integration
   - Familiar to Windows administrators
```

## Configuring the Right Model on the Router

```bash
# Model 1: Pure SLAAC (M=0, O=0, with RDNSS)

# radvd.conf:
# AdvManagedFlag off;    # M=0
# AdvOtherConfigFlag off; # O=0
# RDNSS 2001:4860:4860::8888 { AdvRDNSSLifetime 600; };

# Model 2: SLAAC + Stateless DHCPv6 (M=0, O=1)
# radvd.conf:
# AdvManagedFlag off;    # M=0
# AdvOtherConfigFlag on;  # O=1 → clients use DHCPv6 Information-request

# Model 3: Stateful DHCPv6 (M=1)
# radvd.conf:
# AdvManagedFlag on;     # M=1 → clients use stateful DHCPv6
# AdvOtherConfigFlag on;  # O=1 (redundant but often set with M=1)
# prefix block: AdvAutonomous off;  # A=0 → no SLAAC

# Cisco IOS equivalents:
# interface GigabitEthernet0/1
#  ! M=0 (default, SLAAC):
#  no ipv6 nd managed-config-flag
#  ! M=1 (stateful DHCPv6):
#  ipv6 nd managed-config-flag
#  ! O=1 (stateless DHCPv6 for options):
#  ipv6 nd other-config-flag
#  ! A=0 for an advertised prefix (disable SLAAC for that prefix):
#  ipv6 nd prefix 2001:db8:1:1::/64 86400 14400 no-autoconfig
```

## Conclusion

SLAAC and DHCPv6 each have appropriate use cases. SLAAC excels in simplicity - hosts configure themselves with no server infrastructure. Stateful DHCPv6 provides address tracking, reservations, and controlled assignment. The M flag in RA signals whether DHCPv6 address assignment is available; the per-prefix A flag controls whether SLAAC addresses are generated. The O flag signals DHCPv6 availability for non-address options such as DNS when M=0. For most enterprise environments, stateful DHCPv6 provides the address visibility and control that compliance and security teams require. For home and small office environments, pure SLAAC with RDNSS is the simpler choice.
