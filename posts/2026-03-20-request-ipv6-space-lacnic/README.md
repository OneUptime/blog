# How to Request IPv6 Address Space from LACNIC - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, LACNIC, RIR, Address Space, Latin America

Description: Request IPv6 address space from LACNIC (Latin America and Caribbean Network Information Centre) for organizations in the Latin American and Caribbean region.

## LACNIC Service Region

LACNIC serves Latin America and the Caribbean. IANA's IPv6 global unicast registry shows `2800::/12` allocated to LACNIC. Organizations in Brazil and Mexico request number resources through their corresponding NIRs rather than directly from LACNIC.

## Membership and Fees

```text
LACNIC fees are published separately for ISPs and end users and depend on
the largest IPv4 or IPv6 block assigned to the organization.

Examples from the official IPv6 fee tables:
  ISP: Small, Medium, Large, X Large, ...
  End user: /48 up to and including /35, greater than /35 up to and including /32, ...

Organizations that receive IP addresses directly from LACNIC automatically
become members. Approved requests also require payment of the applicable fee
and signature of the Registration Services Agreement.

IPv6 policy:
  Minimum ISP allocation: /32
  Minimum direct end-user assignment: /48
  Larger-than-/32 initial ISP requests require documentation
  Subsequent allocations use the IPv6 HD-ratio threshold of 0.94
```

## Application Process

```sql
1. Review the requirements at https://www.lacnic.net/1016/2/lacnic/get-ip-addresses_asns
   - Organizations in Brazil or Mexico request resources from their NIR
   - Decide whether the request is as an ISP or as an end user

2. Submit the IPv6 request
   - Create a new organization or log in to MiLACNIC
   - Select IPv6 and complete the request form
   - Include an addressing plan when the policy requires it

3. LACNIC review
   - You receive a confirmation email within minutes
   - LACNIC analyzes the request within 48 hours and an analyst contacts you

4. Approval and membership
   - Pay the applicable fee
   - Sign the Registration Services Agreement
   - Direct recipients of IP resources become LACNIC members

5. Post-approval
   - Verify the Whois/RDAP registration data
   - Create RPKI ROAs
   - Configure reverse DNS delegation in MiLACNIC
```

## LACNIC Whois Registration

```text
# Query LACNIC Whois for an IPv6 allocation

whois -h whois.lacnic.net 2001:1200::/32

# Typical IPv6 fields returned by LACNIC Whois include:
# inetnum, status, owner, ownerid, country, owner-c, tech-c, abuse-c,
# inetrev, and source.

# Direct allocations already appear in LACNIC Whois after approval.
# BGP announcements are configured on your own routers and with your
# upstreams, not through Whois.

```

## RPKI via LACNIC

```bash
# LACNIC offers both hosted and delegated RPKI service for members.

# Hosted RPKI is managed through MiLACNIC:
# https://milacnic.lacnic.net/

# For API automation, request OAuth credentials for the
# LACNIC Registration API. The v3 production documentation is at:
# https://registro.api.lacnic.net/lacnic/v3/info
#
# Relevant ROA endpoints:
#   /rpki/roas
#   /rpki/roas/{serialNumber}
```

## Conclusion

LACNIC provides IPv6 allocations to qualifying organizations in its service region, subject to policy review, applicable fees, and the Registration Services Agreement. The minimum direct allocation for ISPs is /32 and the minimum direct assignment for end users is /48, while larger initial requests require additional documentation and subsequent allocations are evaluated with the IPv6 HD-ratio policy. After approval, verify your Whois data, create ROAs, and configure reverse DNS in MiLACNIC. Organizations outside the region, as well as organizations in Brazil and Mexico, must request resources from their corresponding registry rather than directly from LACNIC.
