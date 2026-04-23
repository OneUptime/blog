# How to Request IPv6 Address Space from AFRINIC - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, AFRINIC, RIR, Address Space, Africa

Description: Request IPv6 address space from AFRINIC (African Network Information Centre) for organizations in Africa including membership requirements and application process.

## AFRINIC Service Region

AFRINIC serves the African continent and Indian Ocean region. At the IANA level, AFRINIC holds `2c00::/12` for IPv6 and issues PA allocations and PI assignments from its AFRINIC-managed IPv6 pools. AFRINIC is the newest RIR and actively promotes IPv6 adoption across Africa.

## Membership Categories

```text
AFRINIC IPv6-related fees (current published schedule, USD):

Existing AFRINIC members:
  No additional fee for an IPv6 prefix or ASN
  IPv6 holdings are not counted toward the billing category

New IPv6-only members:
  LIR /32 allocation: $2,500 allocation fee + $2,500 annual membership
  LIR allocation larger than /32: $20,000 allocation fee + $20,000 annual membership
  End-user /48 PI assignment: $2,500 assignment fee + $100 annual membership
  First-year membership fee discount: 100%
  Years 2-4 membership fee discounts: 75%, 50%, 25%

IPv6 policy:
  Minimum LIR allocation: /32
  Eligibility requires an IPv6 deployment plan
  LIRs must show a plan to make /48 assignments within 12 months
  End-users can receive PI space directly from AFRINIC, minimum /48
```

## Application Process

```sql
1. Register on the New Membership Registration Portal:
   https://apps.afrinic.net/nmrp/authentication/newRegistrant
   - Submit organization details
   - Upload incorporation/founding documents
   - Provide an IPv6 addressing plan for the next 12 months

2. Compliance checks and evaluation
   - AFRINIC verifies eligibility and supporting documents
   - AFRINIC publishes average times of 2 working days for compliance checks and 4 working days for evaluation when documentation is complete
   - Review and sign the Registration Service Agreement (RSA)

3. Invoicing and payment
   - Pay the applicable allocation/assignment fee and membership fee
   - The invoice must be settled before resources are issued

4. Receive allocation / assignment
   - Minimum /32 for LIR IPv6 allocations
   - Minimum /48 for end-user PI assignments
   - AFRINIC activates MyAFRINIC for ongoing resource management after registration

5. Post-allocation requirements
   - Keep the AFRINIC Whois registration accurate
   - Create ROAs in MyAFRINIC Resource Certification
   - Set up reverse DNS
```

## AFRINIC Whois Registration

```text
inet6num:       <your IPv6 allocation>
netname:        EXAMPLE-ZA-IPV6
descr:          Example ISP South Africa IPv6
country:        ZA
admin-c:        ADMIN-AFRINIC
tech-c:         TECH-AFRINIC
mnt-by:         MAINT-EXAMPLE-ZA
status:         ALLOCATED-BY-RIR
changed:        noc@example.za
source:         AFRINIC
```

## RPKI via AFRINIC

```bash
# AFRINIC hosted RPKI via MyAFRINIC portal
# If required, request and enroll your BPKI certificate first.

# https://my.afrinic.net/login -> Resources -> Resource Certification -> Issue ROA's

# Create ROA:
# Prefix: your allocated IPv6 prefix
# Max Length: the most specific prefix you intend to originate
# ASN: your AS number

# Verify via AFRINIC Routinator
curl "https://routinator.afrinic.net/validity?asn=AS65001&prefix=2001:db8::/32"
```

## Conclusion

AFRINIC is actively working to increase IPv6 adoption across Africa, but the current fee model follows AFRINIC's published fee schedule rather than a low-cost Micro ISP tier. The minimum IPv6 allocation for LIRs is /32, subject to policy criteria and a 12-month plan for /48 assignments, and end-user organisations can receive PI space directly from AFRINIC with a minimum /48. Keep AFRINIC Whois records accurate, set up reverse DNS, and create ROAs in MyAFRINIC Resource Certification to complete the IPv6 deployment process.
