# How to Request IPv6 Address Space from ARIN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ARIN, RIR, Address Space, ISP, Registry

Description: A step-by-step guide to requesting IPv6 address space from ARIN (American Registry for Internet Numbers) for ISPs and end-users.

## What is ARIN?

ARIN (American Registry for Internet Numbers) manages IPv6 address allocation for the United States, Canada, and many Caribbean and North Atlantic territories. Organizations in this region request IPv6 space through ARIN.

## Types of IPv6 Allocations from ARIN

- **ISP Allocation**: Allocations for ISPs/LIRs to reassign to customers; the standard minimum is `/32`, while `/36` or, in limited cases, `/40` can also be requested, and larger nibble-aligned blocks are possible when justified
- **End-User Assignment**: Direct assignments for organizations that do not provide Internet services to customers; the minimum initial assignment is `/48`
- **Critical Infrastructure**: IPv6 micro-allocations, no longer than `/48`, for qualifying public exchange points, core DNS service providers, the RIRs, and IANA

## Prerequisites

Before applying, you need:
1. An ARIN Online account linked to an authorized Admin or Tech POC for a valid Org ID
2. Documentation showing you meet the applicable ARIN policy requirements
3. To be prepared to sign the RSA (Registration Services Agreement) and pay any applicable fees before ARIN issues the resources

## Step-by-Step ISP Allocation Request

### 1. Create an ARIN Online Account

Go to `https://account.arin.net` and create your ARIN Online account. To submit a request, the account must be linked to a valid Org ID and an authorized Admin or Tech POC. You will need:
- Organization legal name
- Physical address
- Technical and administrative POC contact details

### 2. Be Ready to Sign the RSA

The RSA is ARIN's legal agreement for registry services. ARIN requires a signed current RSA before it issues resources.

### 3. Submit a Request for IPv6 Space

For IPv6 requests, navigate to: **ARIN Online → IP Addresses → Request**

Fill in:
- **Organization / Org ID**: Your authorized organization
- **Request Size**: `/32` minimum for standard ISP allocations; `/36` or, in limited cases, `/40` can also be requested
- **Qualification Basis**: How you meet NRPM `6.5.2`
- **Supporting Documentation**: Details about the network and planned customer assignments or reallocations

### 4. Provide Justification

ARIN evaluates initial ISP allocations under NRPM `6.5.2`. For ISPs, qualification typically falls into one of these categories:

```text
- Previously justified IPv4 ISP allocation from ARIN or a predecessor, or qualification for an IPv4 ISP allocation under current policy
- Immediate IPv6 multihoming with a valid global ASN, with reassignments or reallocations to other organizations
- Reasonable technical justification describing the intended use, network infrastructure, and planned reassignments/reallocations for one, two, and five years, with at least 50 assignments within five years
```

If you request larger than `/32`, ARIN sizes the allocation based on the customer subnet size, the number of serving sites, and the size of the largest serving site.

### 5. Initial Allocation Sizes

| Organization Type | Size | Notes |
|------------------|------|-------|
| ISP / LIR | `/32` minimum; `/36` or, in limited cases, `/40` can also be requested | Larger initial allocations are possible when justified under NRPM `6.5.2` |
| End-user org | `/48` minimum | Larger initial assignments are based on site count and supporting documentation |
| Critical infrastructure | Up to `/48` | Available as micro-allocations for qualifying IXPs, core DNS providers, the RIRs, and IANA |

## After Approval

Once ARIN approves the request and receives the signed RSA and applicable fees, it will:
1. Issue your prefix and register it in the ARIN database (Whois)
2. Confirm issuance through the request correspondence
3. Your allocation will only appear in the global routing table after you announce it via BGP and other networks accept the route

## Register Your Routes (ROA)

After receiving your prefix, immediately create a Route Origin Authorization (ROA) in ARIN's RPKI system:

```text
In ARIN Online:
1. Go to Routing Security
2. Select Manage RPKI for the organization
3. Choose Create ROA
4. Enter the origin ASN, prefix, and max length
5. Review and submit
```

Use the narrowest `maxLength` that matches the prefixes you actually announce. This helps protect against route hijacking and accidental invalid announcements.

## Fees

ARIN charges annual Registration Services Plan fees. Check `https://www.arin.net/resources/fees/fee_schedule/` for current pricing. The service category is based on an organization's aggregate IPv4, IPv6, or ASN holdings.

## Conclusion

Requesting IPv6 space from ARIN involves creating an ARIN Online account linked to your Org ID, documenting how you qualify under current policy, and creating ROAs for route security after issuance. ARIN says it typically follows up on requests within two business days, and resources are issued after ARIN receives the signed RSA and applicable fees.
