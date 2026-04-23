# How to Understand RIPE IPv6 Deployment Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RIPE, IPv6, ISP, Address Space, RIR, European Network, Deployment

Description: Understand RIPE NCC's IPv6 policies and deployment requirements for ISPs and organizations operating networks in the RIPE NCC service region.

---

RIPE NCC (Réseaux IP Européens Network Coordination Centre) is the Regional Internet Registry (RIR) for Europe, the Middle East, and parts of Central Asia. Understanding RIPE's IPv6 policies helps organizations obtain address space and meet deployment expectations.

## RIPE NCC IPv6 Address Policy

```text
RIPE IPv6 Address Allocation Hierarchy:

IANA
└── RIPE NCC (Regional allocation: 2001:0600::/23, 2001:1400::/22, etc.)
    └── LIR (Local Internet Registry) / ISP: /32 minimum, up to /29 without extra documentation
        └── End-user organizations: up to /48 per End Site without extra justification
            └── Site subnet: /64 for LANs, /127 possible for inter-router point-to-point links
```

## Obtaining IPv6 Space from RIPE NCC

```text
Requirements to receive IPv6 address space from RIPE NCC:

1. Become an LIR (Local Internet Registry):
   - Annual service fee to RIPE NCC
   - 2026 annual fee: EUR 1,800 per LIR account
   - New members or additional LIR accounts also pay a EUR 1,000 sign-up fee
   - Allows receiving IPv6 allocations directly; IPv4 is subject to current IPv4 policy

2. Standard IPv6 Allocation:
   - LIRs receive at minimum a /32 IPv6 allocation
   - Can request up to a /29 without additional documentation
   - Larger allocations require documented justification
   - Policy: RIPE-738 "IPv6 Address Allocation and Assignment Policy"

3. IPv6 PI (Provider Independent) Space:
   - End-sites can receive a minimum /48 PI assignment (RIPE-738)
   - Larger PI assignments require documented justification
   - Useful for multi-homed organizations
```

## RIPE Database Registration Requirements

```bash
# After receiving an IPv6 allocation, the RIPE NCC registers the top-level allocation

# Create inet6num objects for assignments or sub-allocations under your allocation as needed

# Login to: https://apps.db.ripe.net/

# Example inet6num object for a customer/site assignment:
# inet6num: 2001:db8:100::/48
# netname: EXAMPLE-NET
# country: NL
# org: ORG-EL1-RIPE
# admin-c: ADMIN-RIPE
# tech-c: TECH-RIPE
# status: ASSIGNED
# mnt-by: EXAMPLE-MNT
# source: RIPE

# Register route6 object for BGP routing, replacing the prefix and origin with your real values
# route6: 2001:db8:100::/48
# descr: Example IPv6 Route
# origin: AS64496
# mnt-by: EXAMPLE-MNT
# source: RIPE
```

## RIPE IPv6 Deployment Best Practices

```text
RIPE deployment guidance and common IPv6 practice include:

1. Address Planning:
   - Use /64 for LAN and end-user subnets that need SLAAC
   - Use /127 for inter-router point-to-point links where appropriate
   - Use up to /48 per End Site without extra justification
   - /32 per LIR allocation minimum, with up to /29 available without extra documentation

2. Routing:
   - Advertise your IPv6 prefix consistently
   - Register route6 objects and ROAs for prefixes where peers use IRR or RPKI filtering
   - Set up IRR (Internet Routing Registry) filters

3. Reverse DNS:
   - Create reverse DNS domain objects in the RIPE Database for ip6.arpa delegation
   - Configure at least two authoritative name servers before submitting delegation objects
   - Maintain PTR records for servers

4. Documentation:
   - Keep RIPE DB objects up to date
   - Assign proper tech-c and admin-c contacts
   - Keep mntner and org objects current
```

## RIPE NCC Reverse DNS Delegation

```bash
# Request reverse DNS delegation for IPv6 space by creating domain objects in the RIPE Database
# RIPE NCC propagates valid reverse DNS domain objects to its DNS zones

# Verify delegation exists for your reverse zone
dig NS 0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa +short

# Set up DNS server for ip6.arpa zone
# Example BIND zone for 2001:db8::/48
# Zone file: /etc/bind/db.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa

# /etc/bind/named.conf.local
zone "0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa" {
    type master;
    file "/etc/bind/db.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa";
};
```

## RIPE IPv6 Compliance Requirements for ISPs

```text
ISP membership requirements relevant to IPv6:
- Keep IPv6 allocation consistent with the purpose under which it was allocated
- Maintain route6 objects and RPKI ROAs for advertised prefixes where your routing policy requires them
- Maintain accurate RIPE DB objects (inet6num, route6, org)
- Comply with RIPE NCC's accounting and legal requirements

Tools for compliance:
- RIPE NCC Stat: stat.ripe.net (routing analysis)
- RIPE DB query: https://apps.db.ripe.net/db-web-ui/query
- IRRToolset: validate your routing policy
```

## Checking Your RIPE IPv6 Registration

```bash
# Query RIPE database for IPv6 allocation
whois -h whois.ripe.net 2001:db8::/32

# Check exact route6 registration
whois -h whois.ripe.net -r -x -T route6 2001:db8::/32

# Verify routing in looking glasses
# AS-PATH to your prefix: lg.he.net

# Check RPKI status (Route Origin Authorization)
# RIPE NCC provides RPKI for members and eligible PI or legacy resource holders
# Create ROA at: https://dashboard.rpki.ripe.net/
```

RIPE NCC's IPv6 policies are designed to ensure efficient address use and accurate resource registration, with LIR membership being the typical path for ISPs to obtain IPv6 allocations and the RIPE Database serving as the registry for inet6num and RIPE IRR route6 objects in the RIPE region.
