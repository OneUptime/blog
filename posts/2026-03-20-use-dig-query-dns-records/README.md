# How to Use dig to Query DNS Records Over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, dig, Linux, Networking, Troubleshooting, DNS Records

Description: Use the dig command to query all types of DNS records, trace resolution paths, check DNSSEC, and diagnose DNS issues over IPv4.

## Introduction

`dig` (Domain Information Groper) is the definitive DNS debugging tool. Unlike `nslookup`, it provides detailed output that shows exactly what the DNS server returned, including TTL values, flags, authority records, and timing. Every DNS troubleshooting workflow should start with `dig`.

## Basic Queries

```bash
# Query A record (IPv4 address):

dig example.com
dig example.com A

# Query AAAA record (IPv6):
dig example.com AAAA

# Query MX record (mail):
dig example.com MX

# Query NS record (nameservers):
dig example.com NS

# Query TXT record:
dig example.com TXT

# Query CNAME:
dig www.example.com CNAME

# Query PTR (reverse DNS):
dig -x 93.184.216.34

# Query ANY (all records - may be restricted):
dig example.com ANY

# Query SOA (Start of Authority):
dig example.com SOA
```

## Understanding dig Output

```bash
dig example.com A

# Output sections:
# ;; ->>HEADER<<-
#   status: NOERROR   (success)
#   QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
#   flags: qr rd ra  (query response, recursion desired, recursion available)
#   "aa" flag = authoritative answer

# ;; QUESTION SECTION:
#   ;example.com.  IN  A   (what was asked)

# ;; ANSWER SECTION:
#   example.com.  3600  IN  A  93.184.216.34
#   (name)       (TTL) (class) (type) (value)
#   TTL = seconds until this expires from cache

# ;; AUTHORITY SECTION:
#   Nameservers that are authoritative for this domain

# ;; Query time: 45 msec
# ;; SERVER: 8.8.8.8#53(8.8.8.8)  ← which resolver answered
```

## Common dig Options

```bash
# Query specific DNS server (bypass system resolver):
dig @8.8.8.8 example.com
dig @ns1.example.com example.com  # Query authoritative server directly

# Short output (just the answer):
dig +short example.com
# Returns: 93.184.216.34

# Force IPv4 transport:
dig -4 example.com

# Trace full delegation chain:
dig +trace example.com

# Disable recursion (ask for answer without resolver doing work):
dig +norecurse example.com @8.8.8.8
# If server doesn't have it cached: returns referral to lower nameservers

# Show DNSSEC records:
dig +dnssec example.com

# Disable DNSSEC validation:
dig +cd example.com   # +cd = checking disabled

# Set source IP address (use 0.0.0.0 to let OS choose; append #port to set source port):
dig -b 0.0.0.0 example.com

# Set query timeout:
dig +time=2 example.com

# Retry count:
dig +tries=3 example.com
```

## Diagnosing DNS Issues with dig

```bash
# Check if domain exists:
dig example.com +short
# Empty output + NXDOMAIN in status = domain doesn't exist
dig example.com | grep -E "status|ANSWER"

# Check TTL to see if cached:
dig example.com | grep -A1 "ANSWER SECTION"
# Low TTL = cache is about to expire
# Maximum TTL = freshly fetched

# Verify record propagation (query different resolvers):
for resolver in 8.8.8.8 1.1.1.1 208.67.222.222; do
    echo -n "$resolver: "
    dig @$resolver +short example.com
done

# Check for split-horizon DNS:
dig example.com            # Uses system resolver (may return internal IP)
dig @8.8.8.8 example.com   # External resolver (returns public IP)

# Test authoritative vs cached:
dig example.com | grep "aa"  # "aa" flag = authoritative answer (not cached)
```

## Batch Queries

```bash
# Query multiple domains at once:
dig example.com google.com cloudflare.com +noall +answer +short

# Query all common record types:
for type in A AAAA MX NS TXT SOA; do
    echo "=== $type ==="
    dig example.com $type +short
done

# Check SPF record (used in email authentication):
dig example.com TXT | grep -i spf

# Check DMARC:
dig _dmarc.example.com TXT +short

# Check DKIM:
dig default._domainkey.example.com TXT +short
```

## Conclusion

`dig` is the essential DNS troubleshooting tool. Use `dig @server domain type` to query specific servers, `+short` for quick answers, `+trace` to follow the delegation chain, and `-x IP` for reverse lookups. Compare results from your system resolver versus a public resolver (`@8.8.8.8`) to identify split-horizon issues. Check `status: NOERROR` and the ANSWER count to quickly determine whether a query succeeded and returned data.
