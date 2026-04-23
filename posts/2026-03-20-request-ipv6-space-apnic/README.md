# How to Request IPv6 Address Space from APNIC - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, APNIC, RIR, Address Space, IP Allocation

Description: Request IPv6 address space from APNIC (Asia-Pacific Network Information Centre) including membership tiers, allocation policies, and the application process.

## APNIC Service Region

APNIC serves the Asia-Pacific region including Australia, China, Japan, India, Southeast Asia, and Pacific Island nations. IPv6 space is allocated from ranges including `2001:0200::/23`, `2400::/12`, and `2410::/12`.

## APNIC Membership Tiers

APNIC's current membership structure uses seven tiers, and the tier is determined by the amount of IPv4 or IPv6 space held.

| Tier | IPv6 Holdings |
|---|---|
| Associate | None |
| Very Small | Up to and including /35 |
| Small | Greater than /35, up to and including /32 |
| Medium | Greater than /32, up to and including /29 |
| Large | Greater than /29, up to and including /26 |
| Very Large | Greater than /26, up to and including /23 |
| Extra Large | Greater than /23 |

Annual fees are not flat per tier. APNIC calculates them from total IPv4 or IPv6 holdings and charges the larger of the two calculations; new Members also pay a one-off AUD 500 sign-up fee.

Please note that a non-chargeable `/48` IPv6 Provider Independent assignment is not included in the Membership tier calculation, so an Associate Member holding only that `/48` remains an Associate Member.

## Application Process

```sql
Step 1: Apply at https://membership-application.apnic.net
  - Complete the New Member and Internet Resource Application Form
  - Provide organization and network details

Step 2: Determine the resource type you need
  - /32 IPv6 allocation if you will make assignments or sub-allocations to customers
  - /48 IPv6 assignment for a single network

Step 3: Submit IPv6 allocation request
  - New applicants request IPv6 in the application form
  - Existing APNIC Members with IPv4 holdings can use Kickstart IPv6 in MyAPNIC
  - Provide:
    * Network implementation details
    * Planned IPv6 use and customer assignments, if applicable
    * Additional justification for requests larger than the default /32 or /48

Step 4: APNIC review
  - Existing Members with eligible IPv4 holdings can usually receive the default /32 or /48 immediately via Kickstart IPv6
  - New or larger requests are evaluated by APNIC, typically in 2-5 working days

Step 5: After delegation
  - APNIC registers the direct delegation in the APNIC Whois Database
  - Create route6 objects as needed
  - Create RPKI ROAs
  - Set up reverse DNS delegation
```

## APNIC Database Registration

```text
# APNIC registers direct delegations in APNIC Whois.
# Members are responsible for downstream inet6num objects and related route6 objects.
# Replace the example documentation prefix, maintainer, and origin ASN with your actual delegated values.

inet6num:       2001:db8::/32
netname:        EXAMPLE-APNIC-AP
descr:          Example Organization IPv6
country:        AU
admin-c:        ADMIN1-AP
tech-c:         TECH1-AP
mnt-by:         MAINT-AP-EXAMPLE
mnt-lower:      MAINT-AP-EXAMPLE
mnt-routes:     MAINT-AP-EXAMPLE
mnt-irt:        IRT-EXAMPLE-AP
status:         ALLOCATED PORTABLE
source:         APNIC

# Route6 object

route6:         2001:db8::/32
descr:          Example Organization IPv6 Route
origin:         AS64496
mnt-routes:     MAINT-AP-EXAMPLE
mnt-by:         MAINT-AP-EXAMPLE
source:         APNIC
```

```text
# Create route objects in MyAPNIC, or submit updates by email to auto-dbm@apnic.net.
# APNIC also provides an authenticated Registry API for Whois, route, reverse DNS, and ROA management.
```

## APNIC RPKI

```bash
# Replace the example prefix and ASN with your actual delegated prefix and public origin ASN.
# APNIC provides RPKI in Hosted Mode or Self-Hosted (delegated) mode.

# Hosted ROA via MyAPNIC:
# Login → RPKI → Create ROA
# Prefix: 2001:db8::/32
# Max length: 32
# ASN: 64496

# Verify with a validator such as Routinator
routinator validate --asn 64496 --prefix 2001:db8::/32
```

## Sub-Allocation to Customers

```text
# APNIC policy leaves end-site size to the LIR/ISP; /48 is common for end sites.
# Delegations larger than /48 must be registered in APNIC Whois.
# /48 end-site assignments must also be registered for HD-ratio evaluation.

inet6num:       2001:db8:1000::/48
netname:        CUSTOMER-A
descr:          Customer A IPv6 Assignment
country:        JP
admin-c:        CUSTADMIN-AP
tech-c:         CUSTTECH-AP
mnt-by:         MAINT-AP-EXAMPLE
mnt-irt:        IRT-EXAMPLE-AP
status:         ASSIGNED NON-PORTABLE
source:         APNIC
```

## Conclusion

Existing APNIC Members with eligible IPv4 holdings can usually obtain the default IPv6 delegation quickly via Kickstart IPv6, while new or larger requests are reviewed under APNIC policy. A /32 IPv6 allocation falls into the Small membership tier under APNIC's current structure, and fees are calculated from total resource holdings rather than fixed flat tiers. APNIC registers the direct delegation in Whois; Members then maintain downstream `inet6num` records, `route6` objects, RPKI ROAs, and reverse DNS as needed. End-site assignments are commonly /48, but the exact assignment size is a local decision for the LIR/ISP under current policy.
