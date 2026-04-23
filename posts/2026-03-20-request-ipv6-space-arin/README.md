# How to Request IPv6 Address Space from ARIN - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ARIN, RIR, Address Space, IP Allocation

Description: Request IPv6 address space from ARIN (American Registry for Internet Numbers) including eligibility requirements, application process, and required documentation.

## ARIN IPv6 Allocation Overview

ARIN serves the United States, Canada, and many Caribbean and North Atlantic territories. IPv6 space in the ARIN region commonly appears in three forms:

| Type | Who Gets It | Typical Size | Requirement |
|---|---|---|---|
| Direct allocation | ISPs / LIRs | /32 minimum | Meet NRPM 6.5.2 criteria and plan to assign to customers |
| Direct assignment | End users | /48 minimum | Meet NRPM 6.5.8 criteria for a /48 or larger |
| ISP sub-allocation | ISP customers | /48, /56, /64 | From ISP's ARIN allocation |

## Eligibility Requirements

```text
For a /32 Direct Allocation (ISPs):
  - ARIN membership is not required
  - Have a previously justified IPv4 ISP allocation from ARIN, or
  - Be IPv6 multihomed (or immediately become multihomed) with a valid global ASN, or
  - Provide reasonable technical justification including 1-, 2-, and 5-year assignment plans
  - If using the technical-justification path, show at least 50 assignments within 5 years

For a /48 Direct Assignment (End Users):
  - Have a previously justified IPv4 end-user assignment from ARIN, or
  - Be IPv6 multihomed (or immediately become multihomed) with a valid global ASN, or
  - Show need for 2000 IPv6 addresses, 200 /64s, or 13 active sites within 12 months, or
  - Demonstrate why provider-assigned IPv6 space is unsuitable

Registration Services Plan fees (effective 2026):
  X-Small: $1,100/year (larger than /36 up to and including /32)
  Small:   $2,205/year (larger than /32 up to and including /28)
  Medium:  $4,410/year (larger than /28 up to and including /24)
```

## Application Process

```text
Step 1: Create ARIN Online account
  - Go to https://account.arin.net
  - Create or link your POC and Organization Identifier (Org ID)

Step 2: Submit IPv6 request
  - Login to ARIN Online
  - Navigate: IP Addresses or ASNs → Request
  - Fill in:
    * Organization information
    * Network infrastructure details
    * One-, two-, and five-year assignment plan (for LIRs using technical justification)
    * Intended use

Step 3: ARIN staff review
  - Analyst review typically begins within 2 business days
  - May request additional documentation

Step 4: Complete agreement and payment
  - If approved, sign the RSA and pay applicable fees within 60 days

Step 5: Receive allocation
  - ARIN issues the IPv6 prefix and updates its registry records
  - Configure RPKI and reverse DNS
```

## RPKI: Create Route Origin Authorization

```bash
# After receiving an ARIN-issued prefix, create a ROA

# In ARIN Online: Routing Security → Manage RPKI → Create ROA
# If needed, sign up for Hosted or Delegated RPKI first

# Or use ARIN's Reg-RWS API
# (requires your Org Handle and ARIN API key)

# ROA fields:
# Origin ASN: 65001 (the ASN authorized to originate the route)
# Prefix:     2600:db8::/32 (your ARIN-issued prefix)
# Max length: 32 (set this to the most specific prefix you actually announce)

# List ROAs for your organization
curl -s "https://reg.arin.net/rest/roa/ORG-HANDLE?apikey=APIKEY"
```

## ARIN Whois Registration

```text
# After allocation, update ARIN Whois (ARIN Online)

# ARIN Whois/RDAP uses ARIN-specific field names, for example:
# NetRange:    2600:db8:: - 2600:db8:ffff:ffff:ffff:ffff:ffff:ffff
# CIDR:        2600:db8::/32
# NetName:     COMPANY-IPV6
# NetType:     Direct Allocation
# Organization: Example Company
# OrgId:       EXAMP-1
# AdminHandle: ADMIN-ARIN
# TechHandle:  TECH-ARIN

# DNS Reverse Delegation:
# For a /32 such as 2600:db8::/32, ARIN will create the nibble-aligned
# reverse zone 8.b.d.0.0.0.6.2.ip6.arpa
# Submit nameserver hostnames via ARIN Online → Manage Reverse DNS
```

## Post-Allocation Checklist

```bash
#!/bin/bash
# post-arin-checklist.sh - Validate new ARIN allocation

YOUR_PREFIX="2600:db8::/32"
YOUR_ORG_HANDLE="EXAMP-1"
ARIN_API_KEY="REPLACE_WITH_ARIN_API_KEY"
REVERSE_ZONE="8.b.d.0.0.0.6.2.ip6.arpa"

echo "=== Post-ARIN Allocation Checklist ==="

# 1. Verify prefix in ARIN Whois
echo "1. Checking ARIN Whois..."
whois -h whois.arin.net "r = ${YOUR_PREFIX}" | grep -E "NetRange|CIDR|NetName|NetType|Organization|OrgName|OrgId"

# 2. Verify RPKI ROA
echo "2. Checking RPKI..."
curl -s "https://reg.arin.net/rest/roa/${YOUR_ORG_HANDLE}?apikey=${ARIN_API_KEY}"

# 3. Verify reverse DNS delegation
echo "3. Checking reverse DNS..."
dig NS "${REVERSE_ZONE}" +short

# 4. Confirm routed visibility separately
echo "4. Confirm BGP origination with your router, looking glass, or BGP monitoring platform"

echo ""
echo "Complete: ARIN allocation checklist done"
```

## Conclusion

Requesting IPv6 from ARIN does not require ARIN membership, but it does require meeting ARIN policy criteria and paying the applicable Registration Services Plan fee if the request is approved. ISPs/LIRs typically receive /32 minimum allocations (with /36 or /40 available on request in some cases), while end-user organizations receive /48 minimum direct assignments and can justify larger blocks when needed. After approval, complete three critical post-allocation steps: create an RPKI Route Origin Authorization (ROA), confirm your ARIN Whois/RDAP registration data is correct, and configure reverse DNS for your ip6.arpa zone. ARIN states analyst review typically begins within two business days for standard resource requests.
