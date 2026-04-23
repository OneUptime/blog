# How to Request IPv6 Address Space from RIPE NCC - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RIPE NCC, RIR, Address Space, IP Allocation

Description: Request IPv6 address space from RIPE NCC as an LIR or end-user organization including membership, allocation policies, and the RIPE NCC application process.

## RIPE NCC Service Region

RIPE NCC serves Europe, the Middle East, and parts of Central Asia. IPv6 address space is allocated from address ranges managed by the RIPE NCC, including `2a00::/12`.

## LIR vs End-User

| Type | Who | Min Prefix | Fee |
|---|---|---|---|
| LIR (Local Internet Registry) | ISPs, large orgs | /32 | €1,800/year + €1,000 sign-up |
| End-user PI assignment | Enterprises | /48 | €75/year via sponsoring LIR |

End-users cannot request IPv6 PI space directly from RIPE NCC - they must go through a sponsoring LIR.

## Becoming an LIR

```text
Requirements to become a RIPE NCC LIR:

1. Organization must be legally established in RIPE service region
2. Sign RIPE NCC Standard Service Agreement
3. Pay RIPE NCC sign-up fee and annual service fee (€1,000 sign-up + €1,800/year in 2026)

Process:
1. Go to https://www.ripe.net/membership/member-support/become-a-member/
2. Fill out LIR application form
3. Provide:
   - Legal entity documentation
   - Proof of address in service region
   - Additional addressing documentation only if requesting more than a /29
4. RIPE NCC verifies the application and sends the SSA and invoice
5. Sign the SSA and pay the invoice
6. Once the LIR account is activated, request IPv6 space in the LIR Portal
```

## Initial IPv6 Allocation

```text
RIPE NCC policy:

RIPE NCC members qualify for one IPv6 allocation per organization.
Minimum size is /32.
You can request up to a /29 with no additional justification beyond the standard criteria.
Subsequent allocations beyond /29 can be approved by:
  - showing sufficient utilization under the HD-Ratio policy
  - or justifying new needs that cannot be met from the current allocation

Your /32 allows:
  - 65,536 /48 assignments to customers
  - Or any combination of /48 to /128 assignments
```

## RIPE NCC Database: Register Your Allocation

```text
# RIPE NCC registers the top-level allocation object when issuing the allocation
# You add more specific inet6num and route6 objects as needed

# Example RIPE Database objects

# inet6num object (your allocation)

inet6num:       2001:db8::/32
netname:        EXAMPLE-NET
descr:          Example ISP IPv6 Space
country:        NL
org:            ORG-EX1-RIPE
admin-c:        ADMIN1-RIPE
tech-c:         TECH1-RIPE
status:         ALLOCATED-BY-RIR
mnt-by:         RIPE-NCC-HM-MNT
mnt-lower:      EXAMPLE-MNT
source:         RIPE

# route6 object (BGP announcement)
route6:         2001:db8::/32
descr:          Example ISP IPv6
origin:         AS3333
mnt-by:         EXAMPLE-MNT
source:         RIPE
```

```bash
# Create route6 object via RIPE Database REST API
# Replace the example prefix and ASN with resources you actually hold
curl -X POST "https://rest.db.ripe.net/ripe/route6" \
  -H "Authorization: Basic YOUR_BASE64_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "objects": {
      "object": [{
        "type": "route6",
        "attributes": {
          "attribute": [
            {"name": "route6",   "value": "2001:db8::/32"},
            {"name": "origin",   "value": "AS3333"},
            {"name": "mnt-by",   "value": "EXAMPLE-MNT"},
            {"name": "source",   "value": "RIPE"}
          ]
        }
      }]
    }
  }'
```

## RPKI ROA via RIPE NCC

```bash
# Create ROA via RIPE NCC dashboard
# https://my.ripe.net → RPKI Dashboard

# Or via RIPE NCC API
curl -X POST "https://my.ripe.net/api/rpki/roas/publish" \
  -H "ncc-api-authorization: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "added": [{
      "prefix": "2001:db8::/32",
      "maximalLength": 48,
      "asn": "AS3333"
    }],
    "deleted": []
  }'

# Verify ROA
curl -s "https://stat.ripe.net/data/rpki-validation/data.json?resource=3333&prefix=2001:db8::/32"
```

## Sub-Allocating to Customers

```text
# RIPE policy: document IPv6 assignments in RIPE Database

# Customer assignment example:
inet6num:       2001:db8:1000::/48
netname:        CUSTOMER-A-IPV6
descr:          Customer A Assignment
country:        DE
admin-c:        CUSTADMIN-RIPE
tech-c:         CUSTTECH-RIPE
status:         ASSIGNED
mnt-by:         EXAMPLE-MNT
source:         RIPE

# For pools of uniform assignments, use AGGREGATED-BY-LIR with assignment-size
```

## Conclusion

RIPE NCC membership lets an LIR request an initial IPv6 allocation with a minimum size of /32, and requests up to /29 do not need extra justification beyond the standard criteria. The RIPE NCC registers the top-level `inet6num` allocation object for you; you then add more specific `inet6num` and `route6` objects as needed. Create RPKI ROAs via the RIPE NCC dashboard or the RPKI Management API. When assigning IPv6 space to customers, document it in the RIPE Database using `ASSIGNED` or `AGGREGATED-BY-LIR` as appropriate. If you need more space beyond /29, RIPE evaluates either documented utilization under the HD-Ratio policy or newly justified needs.
