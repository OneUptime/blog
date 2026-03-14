# How to Diagnose DNS Issues with dig and nslookup on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Dig, Nslookup, DNS, Troubleshooting, Linux

Description: Master the dig and nslookup commands on RHEL to diagnose DNS problems quickly, from basic lookups to advanced debugging.

---

When DNS breaks, you need to figure out what's going wrong fast. The `dig` and `nslookup` commands are your primary tools for this. Both come with the `bind-utils` package on RHEL. While `nslookup` is simpler and good for quick checks, `dig` gives you the detailed output you need for real troubleshooting. This guide covers both.

## Installing the Tools

```bash
dnf install bind-utils -y
```

This gives you `dig`, `nslookup`, and `host`.

## dig Basics

The most basic dig query:

```bash
dig example.com
```

This queries your system's configured resolver for the A record of example.com. The output has several sections.

Query a specific DNS server:

```bash
dig @8.8.8.8 example.com
```

Query for a specific record type:

```bash
dig example.com MX
dig example.com AAAA
dig example.com NS
dig example.com TXT
dig example.com SOA
```

Get just the answer (short format):

```bash
dig example.com +short
```

## Understanding dig Output

A full dig response has these sections:

```bash
;; HEADER - Status codes, flags, counts
;; QUESTION SECTION - What you asked
;; ANSWER SECTION - The response records
;; AUTHORITY SECTION - Name servers for the zone
;; ADDITIONAL SECTION - Extra helpful records (like NS IP addresses)
;; Query time, server used, message size
```

The key things to look at:

**Status code:** `NOERROR` means success. `NXDOMAIN` means the domain doesn't exist. `SERVFAIL` means the server had a problem. `REFUSED` means the server won't answer you.

**Flags:** `aa` means authoritative answer. `rd` means recursion desired. `ra` means recursion available. `ad` means DNSSEC authenticated data.

## Common dig Recipes

Check all record types for a domain:

```bash
dig example.com ANY
```

Follow the full resolution chain from root servers:

```bash
dig +trace example.com
```

Check a specific name server for a zone:

```bash
dig @ns1.example.com example.com SOA
```

Do a reverse lookup:

```bash
dig -x 192.168.1.100
```

Check DNSSEC records:

```bash
dig example.com DNSKEY +dnssec
dig example.com A +dnssec
```

Disable DNSSEC validation (useful for troubleshooting):

```bash
dig example.com +cd
```

Show only specific sections:

```bash
# Answer section only
dig example.com +noall +answer

# Authority section only
dig example.com +noall +authority
```

Set a custom timeout:

```bash
dig example.com +timeout=10 +tries=3
```

Do a zone transfer (if allowed):

```bash
dig @ns1.example.com example.com AXFR
```

## nslookup Basics

nslookup is simpler and works well for quick checks:

```bash
nslookup example.com
```

Query a specific server:

```bash
nslookup example.com 8.8.8.8
```

Look up a specific record type:

```bash
nslookup -type=MX example.com
nslookup -type=NS example.com
nslookup -type=TXT example.com
```

Reverse lookup:

```bash
nslookup 192.168.1.100
```

## Diagnosing Common Problems

### Problem: NXDOMAIN (Domain Not Found)

```bash
dig nonexistent.example.com
# Status: NXDOMAIN
```

This means the authoritative server says the name doesn't exist. Check:

Is the name spelled correctly? Is the record actually in the zone file?

```bash
# Check the authoritative servers
dig example.com NS +short

# Query the authoritative server directly
dig @ns1.example.com nonexistent.example.com
```

### Problem: SERVFAIL

```bash
dig example.com
# Status: SERVFAIL
```

The resolver tried but failed. Common causes:

1. DNSSEC validation failure:

```bash
# Try with DNSSEC check disabled
dig example.com +cd
```

2. Upstream server unreachable:

```bash
# Check if the authoritative servers respond
dig @ns1.example.com example.com
dig @ns2.example.com example.com
```

### Problem: REFUSED

```bash
dig @some-server example.com
# Status: REFUSED
```

The server is explicitly refusing your query. You're probably not in its `allow-query` or `allow-recursion` ACL.

### Problem: Timeout (No Response)

```bash
dig @192.168.1.10 example.com +timeout=5
# ;; connection timed out
```

The server isn't responding. Check:

```bash
# Is the server reachable?
ping 192.168.1.10

# Is DNS service running on that server?
# (run on the server itself)
ss -tulnp | grep :53

# Is the firewall blocking?
firewall-cmd --list-all | grep dns
```

### Problem: Wrong Answer

You get an answer, but it's wrong. This usually means stale cache or wrong zone data.

Check where the answer comes from:

```bash
# Check if it's authoritative
dig example.com | grep flags
# Look for 'aa' flag
```

Query the authoritative server directly to bypass caches:

```bash
dig @ns1.example.com www.example.com A
```

## Advanced dig Techniques

### Tracing Resolution Step by Step

```bash
dig +trace www.example.com
```

This shows the full resolution path: root servers to TLD to authoritative. If it breaks at a specific step, that tells you exactly where the problem is.

### Checking Delegation

Verify that the parent zone has the correct NS records:

```bash
# For example.com, check what .com says
dig @a.gtld-servers.net example.com NS
```

### Testing from Multiple Resolvers

```bash
# Google
dig @8.8.8.8 example.com +short

# Cloudflare
dig @1.1.1.1 example.com +short

# Quad9
dig @9.9.9.9 example.com +short
```

If one resolver works and another doesn't, the problem might be specific to that resolver or its cache.

### Checking TTL Values

```bash
dig example.com A | grep -A1 "ANSWER SECTION"
```

The number after the record name is the TTL in seconds. Query again to see it counting down (from cache).

### Batch Queries

Query multiple names at once:

```bash
dig +short google.com facebook.com twitter.com
```

Or from a file:

```bash
cat > /tmp/domains.txt << 'EOF'
google.com
facebook.com
github.com
EOF

while read domain; do
    echo "$domain: $(dig +short $domain A | head -1)"
done < /tmp/domains.txt
```

## dig vs nslookup: When to Use Which

Use `nslookup` when:
- You need a quick answer
- You're on a system where you're not sure what's installed
- You're walking someone through basic DNS checks

Use `dig` when:
- You need to see full DNS response details
- You're debugging DNSSEC issues
- You need to trace resolution
- You're checking zone transfers
- You need to verify specific response flags

Both tools are indispensable for DNS troubleshooting. Learn dig's output format well enough to read it at a glance, and you'll solve DNS problems much faster.
