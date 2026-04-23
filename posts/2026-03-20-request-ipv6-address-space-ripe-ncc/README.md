# How to Request IPv6 Address Space from RIPE NCC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RIPE NCC, RIR, Address Space, Europe, Registry

Description: Step-by-step guide to requesting IPv6 address space from RIPE NCC for organizations in Europe, the Middle East, and Central Asia.

## What is RIPE NCC?

RIPE NCC (Réseaux IP Européens Network Coordination Centre) is the RIR responsible for IPv6 address allocation in Europe, the Middle East, and Central Asia. It serves over 20,000 members in 76 countries.

## RIPE NCC Membership

RIPE NCC uses a membership model for direct allocations. To receive IPv6 address space directly from RIPE NCC, you must become a member (LIR - Local Internet Registry).

Alternatively, end-users can receive IPv6 space from an LIR (their ISP) without becoming members.

## Becoming an LIR (ISPs and Large Organizations)

### 1. Register as an LIR

Start the RIPE NCC membership application at `https://my.ripe.net` and submit the required details:
- Official company registration papers (not older than one year)
- Registered and billing address information
- Contact details for administrative/technical questions and network abuse
- Payment of the RIPE NCC fees (EUR 1,000 sign-up fee and EUR 1,800 annual fee for 2026)

### 2. IPv6 Allocation for LIRs

After becoming a member, you can request an IPv6 allocation through the LIR Portal. If you have a plan for making sub-allocations and/or end site assignments within two years, you qualify for an initial allocation from /32 up to /29 without additional justification.

The allocation is created in the RIPE database as:

```text
inet6num: 2001:db8::/32
netname:  YOUR-NET-NAME
descr:    Your Organization Name
country:  DE
org:      ORG-YO1-RIPE
admin-c:  YNO1-RIPE
tech-c:   YNO1-RIPE
status:   ALLOCATED-BY-RIR
mnt-by:   RIPE-NCC-HM-MNT
mnt-lower: YOUR-MNT
source:   RIPE
```

### 3. Additional Allocations

After deploying your current allocation, you can request additional space:
- Existing smaller allocations can be extended up to /29 without further justification
- For requests beyond /29, RIPE NCC requires either documented sufficient utilization of the current allocation or justification of newly identified needs

## End-User Assignments (Non-ISPs)

If your organization is not an ISP and does not want LIR membership:

1. Request an IPv6 PI (Provider Independent) assignment, with a minimum size of /48, through a sponsoring LIR
2. Alternatively, request IPv6 space from your upstream LIR as an assignment or aggregated assignment

## Creating RIPE Database Objects

After receiving your allocation, create the necessary RIPE database objects:

```text
# Create inet6num objects for customer assignments

inet6num: 2001:db8:1::/48
netname:  CUSTOMER-A-NET
descr:    Customer A IPv6 Block
country:  NL
org:      ORG-CA1-RIPE
admin-c:  CA1-RIPE
tech-c:   CA1-RIPE
status:   ASSIGNED
mnt-by:   YOUR-MNT
source:   RIPE

# Create route6 object for BGP routing
route6: 2001:db8::/32
descr: YOUR-ORG IPv6 Route
origin: AS12345
mnt-by: YOUR-MNT
source: RIPE
```

## RPKI ROA Creation

Create a ROA in the RIPE NCC RPKI portal to secure your route announcements:

1. Log in to the Resource Certification (RPKI) dashboard at `https://dashboard.rpki.ripe.net`
2. If needed, create a Hosted or Delegated Certification Authority (CA)
3. Create a ROA with your ASN, prefix, and maximum prefix length

## Whois Queries

Verify your allocation in the RIPE database:

```bash
# Query RIPE Whois
whois -h whois.ripe.net -- '2001:db8::/32'

# Query for route objects
whois -h whois.ripe.net -- '-x -T route6 2001:db8::/32'
```

## Conclusion

RIPE NCC lets member LIRs request IPv6 allocations after joining. The minimum /32 allocation size, with requests up to /29 available without additional justification, combined with the RIPE database's hierarchical object model and RPKI support, makes it straightforward to deploy and secure IPv6 for organizations in the RIPE NCC service region.
