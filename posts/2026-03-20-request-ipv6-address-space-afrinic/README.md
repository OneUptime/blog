# How to Request IPv6 Address Space from AFRINIC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, AFRINIC, RIR, Africa, Address Space, Registry

Description: Guide to requesting IPv6 address space from AFRINIC for organizations operating in Africa.

## What is AFRINIC?

AFRINIC (African Network Information Centre) is the RIR responsible for Internet number resources in Africa and the Indian Ocean region. It is headquartered in Mauritius.

## AFRINIC Service Region

AFRINIC covers countries in Africa and several islands in the Indian and Atlantic Oceans that fall within its service region.

## Membership Categories

| Category | Description | Fee Notes |
|----------|-------------|-----------|
| LIR | Local Internet Registry requesting provider-aggregatable IPv6 space | For new IPv6-only members, AFRINIC currently lists a $2,500 USD allocation fee for a /32 and $20,000 USD for larger than /32, with introductory membership-fee discounts. |
| End User (PI) | End-user organization requesting provider-independent IPv6 space | The minimum PI size is /48; AFRINIC currently lists a $2,500 USD assignment fee, with separate end-user membership fees. |
| Associate | Non-resource membership | Associate membership is separate and does not itself provide IPv6 address space. |

Existing AFRINIC members with IPv4 allocations and/or EU/PI assignments do not pay additional fees for an issued IPv6 prefix under the current fee schedule.

## How to Apply

### 1. Register on AFRINIC's New Membership Registration Portal

If you are a new applicant, start at `https://apps.afrinic.net/nmrp`. MyAFRINIC access is activated after approval:
- Organization name and registration/incorporation documents
- Physical address in the AFRINIC service region
- Technical and administrative POC details
- Signed Registration Service Agreement (RSA)

### 2. Submit IPv6 Request

Once your membership is approved and MyAFRINIC is active, navigate to **Resources → IPv6 Resources → Request IPv6 resource**:

```text
Required documentation typically includes:
- Detailed IPv6 service/addressing plan
- Planned /48 end-site assignments within 12 months
- Justification for the requested prefix size
- Announcement plan, or justification if the prefix will not be announced within 12 months
- ASN number, or a simultaneous ASN request if you will originate the prefix
```

### 3. Initial Allocation Sizes

- Eligible LIRs: minimum /32 IPv6 PA allocation
- Larger than /32: available with justification
- End-user organizations: minimum /48 IPv6 PI assignment per site; multiple sites can justify a larger nibble-aligned prefix

## Creating Whois Objects

After allocation, AFRINIC creates the top-level `inet6num` object for direct allocations. For route advertisement and downstream registration, you'll work with the AFRINIC Whois/IRR database:

```text
# Example direct allocation object

inet6num: 2c0f:f790::/32
netname:  EXAMPLE-NET-V6
descr:    Example Provider
country:  MU
org:      ORG-BTL1-AFRINIC
admin-c:  EC16-AFRINIC
tech-c:   EC16-AFRINIC
status:   ALLOCATED-BY-RIR
notify:   noc@example.net
mnt-by:   AFRINIC-HM-MNT
mnt-lower: EXAMPLE-1-MNT
changed:  noc@example.net 20260423
source:   AFRINIC
parent:   2c00::/12

# Example route6 object
route6:   2c0f:f790::/32
descr:    Example Route6 object
origin:   AS327800
mnt-by:   EXAMPLE-1-MNT
changed:  noc@example.net
source:   AFRINIC
```

Submit route6 objects via the AFRINIC Whois web interface or the email update method.

## RPKI with AFRINIC

AFRINIC provides hosted RPKI through the MyAFRINIC portal. Access to the resource certification section requires a BPKI certificate:

1. Log into My.AFRINIC.NET
2. Enroll your BPKI certificate if you have not already done so
3. Navigate to **Resources → Resource Certification**
4. Select **Issue ROA's** and create the ROA for your prefix and originating ASN

## IPv6 Adoption Context in Africa

Africa has significant IPv6 adoption momentum driven by:
- Ongoing IPv6 deployment by carriers and network operators in the region
- AFRINIC's IPv4 Exhaustion Soft-landing Phase 2, which began on 13 January 2020
- Continued growth of regional Internet infrastructure and exchange ecosystems

Organizations in Africa should prioritize IPv6 deployment as IPv4 resources remain constrained under AFRINIC's exhaustion policy and are still issued only on justified need.

## Support Resources

- New applications: `https://apps.afrinic.net/nmrp`
- Member portal: `https://my.afrinic.net`
- Email: `hostmaster@afrinic.net`
- AFRINIC Academy: `https://afrinic.academy`
- Community: `https://lists.afrinic.net`

## Conclusion

AFRINIC is the IPv6 registry for Africa and the Indian Ocean region, and with IPv4 resources constrained under the current soft-landing policy, IPv6 deployment is increasingly urgent. New applications start on AFRINIC's NMRP and approved members then manage requests through the MyAFRINIC portal, with support available through the official portal and hostmaster channels.
