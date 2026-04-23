# How to Request IPv6 Address Space from APNIC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, APNIC, RIR, Asia Pacific, Address Space, Registry

Description: Guide to requesting IPv6 address space from APNIC for organizations in the Asia-Pacific region.

## What is APNIC?

APNIC (Asia-Pacific Network Information Centre) is the RIR responsible for IPv6 address allocation across the Asia-Pacific region, covering 56 economies across Asia and Oceania.

## Membership Types

APNIC does not use simple ISP size tiers for current pricing. New applicants pay a once-off sign-up fee and an annual fee based on total IPv4 or IPv6 holdings:

| Item | Fee |
|----------|---------------------|
| Sign-up fee | AUD 500 once-off |
| Associate membership (no chargeable IP resources) | AUD 500 annual fee |
| Members with IP holdings | Annual fee calculated from the current APNIC Member Fee Schedule based on address holdings |

## Becoming an APNIC Member

### 1. Pre-registration Check

Verify your organization is legally present in, or operates networks located in, the APNIC service region, and confirm whether your economy is served directly by APNIC or by an NIR.

### 2. Apply for Membership

Visit `https://www.apnic.net/get-ip/` and complete the New Member and Internet Resource Application Form at `https://membership-application.apnic.net`:
- Organization name and type
- Country/economy of operation
- Technical and abuse contact details
- Existing IP resources (if any)
- Supporting documents for your organization and network plan

### 3. Sign the Membership Agreement

Agree to APNIC's membership agreement, duties, and responsibilities.

## Requesting IPv6 Address Space

### For New Members (Initial Allocation)

New applicants that qualify as LIRs can request an initial IPv6 allocation during the membership and resource application process:

1. Complete the New Member and Internet Resource Application Form at `https://membership-application.apnic.net`
2. Request IPv6 resources as part of the application
3. The minimum IPv6 allocation size is /32
4. APNIC states membership and resource evaluations typically take 2-5 working days, and delegation occurs after payment

Without existing IPv4 space, the applicant must be an LIR, not an end site, and plan within two years to provide IPv6 connectivity to others/end users.

### For Existing Members (Additional Space)

Existing APNIC account holders with no IPv6 space can qualify under the matching IPv6 policy:
- An IPv4 allocation qualifies for a /32 IPv6 block
- An IPv4 assignment qualifies for a /48 IPv6 block

If you already hold IPv6 and need more space, APNIC evaluates subsequent allocations under the HD-Ratio policy:
- Meet the HD-Ratio threshold of 0.94, measured in /56 assignments; or
- Document another valid technical reason under APNIC's IPv6 guidelines

When approved, APNIC generally makes an additional allocation that doubles the existing space (for example, /32 to /31), preferably from adjacent space where possible.

### End-User Assignments

Organizations that need provider-independent IPv6 space can receive an initial PI /48 directly from APNIC:

```text
Request criteria:
- Be eligible for an APNIC account
- Commit to using and advertising the IPv6 space within 12 months
- Request more than /48 only with additional justification
```

## Creating Whois Objects in APNIC DB

APNIC or the relevant NIR creates the top-level `inet6num` object for direct delegations. Members are responsible for registering downstream `inet6num` assignments/sub-allocations and any `route6` objects they need:

```text
# example inet6num object for a direct allocation

inet6num: 2001:db8::/32
netname:  YOUR-NET-AP
descr:    Your ISP Name
country:  AU
admin-c:  YO1-AP
tech-c:   YO1-AP
mnt-lower: MAINT-YOUR-ORG-AP
mnt-routes: MAINT-YOUR-ORG-AP
mnt-by:   MAINT-YOUR-ORG-AP
mnt-irt:  IRT-YOUR-ORG-AP
status:   ALLOCATED PORTABLE
source:   APNIC

# route6 object
route6: 2001:db8::/32
descr: YOUR-ORG IPv6 routing
origin: AS1234
mnt-routes: MAINT-YOUR-ORG-AP
mnt-by: MAINT-YOUR-ORG-AP
source: APNIC
```

Create and update objects through MyAPNIC or by sending plain-text email updates to `auto-dbm@apnic.net`.

## RPKI with APNIC

APNIC provides hosted RPKI through MyAPNIC. To create ROAs, enable Resource Certification first, then use Route Management:

1. Log into MyAPNIC at `https://my.apnic.net`
2. If needed, enable **Resources → Resource Certification**
3. Go to **Resources → Route Management**
4. Create or edit the route entry with the prefix, origin ASN, and most specific announcement

ROA creation in MyAPNIC requires the appropriate Resource Certification permission and two-factor authentication. Use a relying-party validator such as `rpki-client` or Routinator to confirm the published ROA/VRP for your prefix and origin ASN.

## Conclusion

APNIC Members and new applicants can obtain IPv6 resources under current APNIC policy criteria: a minimum /32 allocation for qualifying LIRs and a /48 PI assignment for eligible end users. Once the account is active, MyAPNIC is used to manage delegated resources, route objects, and hosted RPKI.
