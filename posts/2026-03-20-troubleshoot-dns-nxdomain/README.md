# How to Troubleshoot DNS NXDOMAIN Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, NXDOMAIN, Troubleshooting, Linux, Debugging, Networking

Description: Diagnose DNS NXDOMAIN errors by distinguishing between non-existent domains, missing records, search domain issues, and resolver-specific problems.

## Introduction

NXDOMAIN (Non-Existent Domain) means the DNS response is saying "this domain name does not exist." Unlike a timeout or SERVFAIL, NXDOMAIN is a definitive negative answer, normally based on authoritative DNS data but sometimes cached or synthesized by a resolver. Understanding the difference between a truly non-existent domain, a missing record for an existing domain, a search domain issue, or a resolver-specific NXDOMAIN is essential for diagnosis.

## Understand What NXDOMAIN Means

```bash
# NXDOMAIN = the DOMAIN NAME does not exist (not a specific record type)

# Example:
dig nonexistent.invalid
# status: NXDOMAIN → the name nonexistent.invalid doesn't exist in DNS

# NOERROR with empty ANSWER = domain exists but no record of that type
dig example.com CAA
# status: NOERROR, ANSWER: 0 → example.com exists but has no CAA record
# This is NOT NXDOMAIN

# The distinction matters for troubleshooting:
# NXDOMAIN: domain doesn't exist
# NOERROR + no answer: domain exists, missing record type
```

## Verify the Domain Exists

```bash
# Check if a zone exists in DNS:
# Avoid ANY as an existence test; many DNS servers minimize ANY responses.
# Query expected record types, or check SOA/NS for the zone:
dig example.com SOA +short
dig example.com NS +short
# SOA/NS response = zone is delegated/configured

# Check authoritative server directly (bypasses resolver cache):
AUTH_NS=$(dig NS example.com +short 2>/dev/null | head -1)
if [ -n "$AUTH_NS" ]; then
    dig @$AUTH_NS api.example.com
else
    echo "Could not find authoritative NS - domain may not exist"
fi

# Check SOA record (exists = zone apex is configured):
dig example.com SOA +short
# Returns SOA = zone apex exists in DNS (even if a specific hostname doesn't)
```

## Diagnose Search Domain Issues

```bash
# NXDOMAIN from short hostname + search domain problem:
# /etc/resolv.conf: search company.internal
# Query: getent hosts db (or dig +search db) → tries db.company.internal → if this doesn't exist: NXDOMAIN
# But you might have meant: db.company.local

# Check your search domains:
cat /etc/resolv.conf | grep search
# search company.internal us.company.internal

# Test without search domain (use FQDN with trailing dot):
dig db.company.internal.   # Force absolute lookup (no search)
dig db.company.local.      # Check alternative domain

# Debug search domain expansion:
dig +search +showsearch db
# Or test the resolver path used by applications:
getent hosts db
```

## Distinguish Real vs Resolver-Specific NXDOMAIN

```bash
# Some resolvers return NXDOMAIN for blocked domains (parental control, DNS filters)
# Verify by querying multiple resolvers:

HOSTNAME="api.example.com"
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9 208.67.222.222; do
    RESULT=$(dig @$resolver $HOSTNAME +short 2>/dev/null)
    CODE=$(dig @$resolver $HOSTNAME 2>/dev/null | awk '/status:/ {sub(/^.*status: /, ""); sub(/,.*/, ""); print; exit}')
    echo "$resolver: code=$CODE answer=${RESULT:-empty}"
done
# If one resolver returns NXDOMAIN but others return an IP:
# → That resolver may be filtering/blocking this domain, holding stale negative cache,
#   or seeing a different split-horizon DNS view.
```

## Negative Caching of NXDOMAIN

```bash
# NXDOMAIN and NOERROR/NODATA responses can be cached using the SOA in AUTHORITY:
# Negative cache TTL = min(SOA RR TTL, SOA.MINIMUM)
# $TTL 3600
# @ 3600 IN SOA ns1 admin (serial refresh retry expire 300)
#                                                        ^^^
# The last value is SOA.MINIMUM; here min(3600, 300) = 300 seconds

# Check how long NXDOMAIN was cached:
dig no-such-hostname.iana.org
# Look at SOA in AUTHORITY section → the TTL before IN is the remaining cache TTL.
# The last SOA field is SOA.MINIMUM, not the remaining TTL.

# If NXDOMAIN is being returned for a hostname you just created:
# Wait for the negative TTL to expire, then re-query
# Or flush the local systemd-resolved cache:
resolvectl flush-caches

# Force re-query bypassing recursive resolver caches by querying an authoritative server:
AUTH_NS=$(dig NS example.com +short 2>/dev/null | head -1)
dig @$AUTH_NS newhost.example.com
```

## NXDOMAIN Hijacking

```bash
# ISPs sometimes hijack NXDOMAIN to return their own "helpful" search page
# Symptom: NXDOMAIN query returns an IP instead of NXDOMAIN status

# Test for NXDOMAIN hijacking:
dig random-nonexistent-12345.invalid
# Should return: NXDOMAIN
# If returns IP: your ISP is hijacking NXDOMAIN (returns their search page IP)

# Fix: use a resolver that doesn't hijack (1.1.1.1, 8.8.8.8, 9.9.9.9):
# Configure your OS/router DNS settings to use one of these resolvers.
# These resolvers pass through NXDOMAIN as-is

# Check if your current resolver hijacks:
CURRENT_NS=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf)
CODE=$(dig @$CURRENT_NS xyz123nonexistent456.invalid 2>/dev/null | awk '/status:/ {sub(/^.*status: /, ""); sub(/,.*/, ""); print; exit}')
RESULT=$(dig @$CURRENT_NS xyz123nonexistent456.invalid +short 2>/dev/null)
echo "NXDOMAIN test: code=${CODE:-unknown} answer=${RESULT:-empty}"
# Expected: code=NXDOMAIN answer=empty
```

## Conclusion

NXDOMAIN troubleshooting requires distinguishing four causes: truly missing domain (verify on authoritative server), missing specific record type (different from NXDOMAIN - check for NOERROR + empty answer), search domain expansion gone wrong (use FQDN with trailing dot to test), and resolver-specific blocking or cache behavior (compare multiple resolvers). Negative caching means a just-created hostname won't resolve until the negative cache TTL derived from the SOA expires on the querying resolver - flush your local resolver cache or query an authoritative server to force an immediate re-query.
