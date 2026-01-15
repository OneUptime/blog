# How to Debug IPv6 DNS Resolution with dig and nslookup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, DNS, Troubleshooting, Linux, Networking, Debugging

Description: Learn how to effectively debug IPv6 DNS resolution issues using the powerful command-line tools dig and nslookup, with practical examples and troubleshooting techniques.

---

## Introduction

As IPv6 adoption continues to grow across the internet, understanding how to debug IPv6 DNS resolution has become an essential skill for system administrators, network engineers, and DevOps professionals. DNS (Domain Name System) is the backbone of internet connectivity, translating human-readable domain names into IP addresses. When IPv6 DNS resolution fails, it can cause connectivity issues, degraded performance, or complete service outages.

In this comprehensive guide, we will explore how to use two powerful command-line tools, `dig` and `nslookup`, to diagnose and troubleshoot IPv6 DNS resolution problems. Whether you are dealing with AAAA record lookups, dual-stack configurations, or complex DNS infrastructure issues, this guide will equip you with the knowledge and techniques needed to identify and resolve IPv6 DNS problems effectively.

## Prerequisites

Before diving into IPv6 DNS debugging, ensure you have the following:

- A Linux, macOS, or Windows system with command-line access
- The `dig` utility installed (part of the `bind-utils` or `dnsutils` package)
- The `nslookup` utility installed (typically pre-installed on most systems)
- Basic understanding of DNS concepts
- Network connectivity to DNS servers

### Installing Required Tools

On Debian/Ubuntu systems:

```bash
sudo apt-get update
sudo apt-get install dnsutils
```

On RHEL/CentOS/Fedora systems:

```bash
sudo dnf install bind-utils
```

On macOS:

```bash
# dig and nslookup are pre-installed
# Verify installation
which dig
which nslookup
```

## Understanding IPv6 DNS Records

Before debugging IPv6 DNS issues, it is important to understand the relevant DNS record types:

### AAAA Records

AAAA records (also known as "quad-A" records) are the IPv6 equivalent of A records. They map a domain name to an IPv6 address.

```
example.com.    IN    AAAA    2001:db8::1
```

### A Records vs AAAA Records

| Record Type | IP Version | Address Format | Example |
|-------------|------------|----------------|---------|
| A | IPv4 | 32-bit dotted decimal | 192.0.2.1 |
| AAAA | IPv6 | 128-bit hexadecimal | 2001:db8::1 |

### Other Relevant Records

- **PTR Records**: Used for reverse DNS lookups (IPv6 uses ip6.arpa domain)
- **NS Records**: Nameserver records that may affect resolution
- **SOA Records**: Start of Authority records for zone information

## Using dig for IPv6 DNS Debugging

The `dig` (Domain Information Groper) command is the most powerful and flexible DNS debugging tool available. It provides detailed information about DNS queries and responses.

### Basic AAAA Record Lookup

To query for IPv6 addresses, use the AAAA record type:

```bash
dig AAAA example.com
```

Example output:

```
; <<>> DiG 9.18.18-0ubuntu0.22.04.1-Ubuntu <<>> AAAA example.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 65494
;; QUESTION SECTION:
;example.com.                   IN      AAAA

;; ANSWER SECTION:
example.com.            86400   IN      AAAA    2606:2800:220:1:248:1893:25c8:1946

;; Query time: 23 msec
;; SERVER: 127.0.0.53#53(127.0.0.53) (UDP)
;; WHEN: Wed Jan 15 10:30:00 UTC 2026
;; MSG SIZE  rcvd: 68
```

### Understanding dig Output

Let us break down the key sections of the dig output:

**Header Section:**
- `status: NOERROR` - Query was successful
- `QUERY: 1` - One question was asked
- `ANSWER: 1` - One answer was received

**Question Section:**
- Shows what was queried (domain and record type)

**Answer Section:**
- Contains the actual DNS response with the IPv6 address

**Statistics:**
- Query time, server used, and message size

### Querying Specific DNS Servers

To query a specific DNS server for IPv6 records:

```bash
# Query Google's public DNS
dig AAAA example.com @8.8.8.8

# Query Cloudflare's DNS
dig AAAA example.com @1.1.1.1

# Query an IPv6 DNS server
dig AAAA example.com @2001:4860:4860::8888
```

### Using dig Over IPv6 Transport

To force dig to use IPv6 transport for the query itself:

```bash
dig -6 AAAA example.com
```

To force IPv4 transport:

```bash
dig -4 AAAA example.com
```

### Short Output Format

For a concise output showing only the answer:

```bash
dig +short AAAA example.com
```

Example output:

```
2606:2800:220:1:248:1893:25c8:1946
```

### Detailed Trace of DNS Resolution

To trace the entire DNS resolution path:

```bash
dig +trace AAAA example.com
```

This shows the complete delegation chain from root servers to authoritative nameservers:

```
; <<>> DiG 9.18.18 <<>> +trace AAAA example.com
;; global options: +cmd
.                       518400  IN      NS      a.root-servers.net.
.                       518400  IN      NS      b.root-servers.net.
;; Received 239 bytes from 127.0.0.53#53(127.0.0.53) in 0 ms

com.                    172800  IN      NS      a.gtld-servers.net.
com.                    172800  IN      NS      b.gtld-servers.net.
;; Received 1170 bytes from 198.41.0.4#53(a.root-servers.net) in 20 ms

example.com.            172800  IN      NS      a.iana-servers.net.
example.com.            172800  IN      NS      b.iana-servers.net.
;; Received 266 bytes from 192.5.6.30#53(a.gtld-servers.net) in 15 ms

example.com.            86400   IN      AAAA    2606:2800:220:1:248:1893:25c8:1946
;; Received 68 bytes from 199.43.135.53#53(a.iana-servers.net) in 12 ms
```

### Checking All Record Types

To query both A and AAAA records simultaneously:

```bash
dig example.com ANY
```

Or query them separately for comparison:

```bash
dig A example.com +short
dig AAAA example.com +short
```

### Checking TTL Values

To see the Time To Live (TTL) values for IPv6 records:

```bash
dig AAAA example.com +ttlunits
```

### Reverse DNS Lookup for IPv6

IPv6 reverse DNS uses the ip6.arpa domain. To perform a reverse lookup:

```bash
dig -x 2606:2800:220:1:248:1893:25c8:1946
```

Or manually construct the PTR query:

```bash
dig PTR 6.4.9.1.8.c.5.2.3.9.8.1.8.4.2.0.1.0.0.0.0.2.2.0.0.0.8.2.6.0.6.2.ip6.arpa.
```

### DNSSEC Validation for IPv6 Records

To check DNSSEC signatures on IPv6 records:

```bash
dig AAAA example.com +dnssec
```

To perform full DNSSEC validation:

```bash
dig AAAA example.com +dnssec +multiline
```

### Batch Queries

For debugging multiple domains, create a file with domain names:

```bash
# Create a file with domains
cat > domains.txt << EOF
google.com
cloudflare.com
github.com
EOF

# Query all domains for AAAA records
dig -f domains.txt AAAA +short
```

## Using nslookup for IPv6 DNS Debugging

While `dig` is more powerful, `nslookup` provides a simpler interface and is available on virtually all operating systems, including Windows.

### Basic AAAA Record Lookup

```bash
nslookup -type=AAAA example.com
```

Example output:

```
Server:         127.0.0.53
Address:        127.0.0.53#53

Non-authoritative answer:
example.com     has AAAA address 2606:2800:220:1:248:1893:25c8:1946
```

### Alternative Syntax

```bash
nslookup -query=AAAA example.com
```

Or using the interactive mode:

```bash
nslookup
> set type=AAAA
> example.com
```

### Querying Specific DNS Servers

```bash
nslookup -type=AAAA example.com 8.8.8.8
```

Or in interactive mode:

```bash
nslookup
> server 8.8.8.8
> set type=AAAA
> example.com
```

### Checking Both A and AAAA Records

```bash
# Check IPv4
nslookup -type=A example.com

# Check IPv6
nslookup -type=AAAA example.com
```

### Debug Mode

For more detailed output:

```bash
nslookup -debug -type=AAAA example.com
```

### Reverse DNS Lookup

```bash
nslookup 2606:2800:220:1:248:1893:25c8:1946
```

### Checking Authoritative Nameservers

```bash
nslookup -type=NS example.com
```

Then query the authoritative server directly:

```bash
nslookup -type=AAAA example.com a.iana-servers.net
```

## Common IPv6 DNS Issues and Solutions

### Issue 1: No AAAA Record Exists

**Symptoms:**
- dig returns `NOERROR` status but no answer section
- nslookup shows no IPv6 address

**Diagnosis:**

```bash
dig AAAA example.com +short
# Returns empty
```

**Solution:**
This is not necessarily an error. The domain may not have IPv6 configured. Check with the domain administrator.

### Issue 2: NXDOMAIN Response

**Symptoms:**
- `status: NXDOMAIN` in dig output
- "Non-existent domain" in nslookup

**Diagnosis:**

```bash
dig AAAA nonexistent.example.com
```

Output:

```
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 54321
```

**Solution:**
- Verify the domain name is spelled correctly
- Check if the domain has expired
- Verify DNS zone configuration

### Issue 3: SERVFAIL Response

**Symptoms:**
- `status: SERVFAIL` in dig output
- DNS server is returning an error

**Diagnosis:**

```bash
dig AAAA example.com @8.8.8.8
dig AAAA example.com @1.1.1.1
```

**Common Causes:**
- DNSSEC validation failure
- Authoritative server is down
- Zone file corruption

**Solution:**

```bash
# Check without DNSSEC validation
dig AAAA example.com +cd

# Check the authoritative server directly
dig NS example.com +short
dig AAAA example.com @<authoritative-server>
```

### Issue 4: Timeout or No Response

**Symptoms:**
- dig hangs or shows "connection timed out"
- nslookup shows "request timed out"

**Diagnosis:**

```bash
# Test with shorter timeout
dig AAAA example.com +time=2 +tries=1

# Test different DNS servers
dig AAAA example.com @8.8.8.8 +time=2
dig AAAA example.com @1.1.1.1 +time=2
```

**Common Causes:**
- Firewall blocking DNS traffic (port 53)
- Network connectivity issues
- DNS server is overloaded or down

**Solution:**

```bash
# Check network connectivity
ping -c 3 8.8.8.8
ping6 -c 3 2001:4860:4860::8888

# Check if port 53 is accessible
nc -zv 8.8.8.8 53
nc -zv -6 2001:4860:4860::8888 53
```

### Issue 5: Inconsistent Results Across DNS Servers

**Symptoms:**
- Different DNS servers return different IPv6 addresses
- Some servers have the record, others do not

**Diagnosis:**

```bash
# Query multiple DNS servers
dig AAAA example.com @8.8.8.8 +short
dig AAAA example.com @1.1.1.1 +short
dig AAAA example.com @9.9.9.9 +short
dig AAAA example.com @208.67.222.222 +short
```

**Common Causes:**
- DNS propagation in progress
- Different cache states
- Split-horizon DNS configuration

**Solution:**
- Wait for TTL to expire and caches to update
- Query authoritative servers directly
- Check for GeoDNS or split-horizon configurations

### Issue 6: IPv6 Transport Issues

**Symptoms:**
- DNS queries work over IPv4 but fail over IPv6
- Cannot reach IPv6 DNS servers

**Diagnosis:**

```bash
# Test IPv4 transport
dig -4 AAAA example.com @8.8.8.8

# Test IPv6 transport
dig -6 AAAA example.com @2001:4860:4860::8888
```

**Solution:**
- Verify IPv6 connectivity on your system
- Check firewall rules for IPv6 DNS traffic
- Ensure router supports IPv6

### Issue 7: Reverse DNS Mismatch

**Symptoms:**
- Forward lookup works but reverse lookup fails
- PTR record does not match AAAA record

**Diagnosis:**

```bash
# Forward lookup
dig AAAA example.com +short
# Returns: 2606:2800:220:1:248:1893:25c8:1946

# Reverse lookup
dig -x 2606:2800:220:1:248:1893:25c8:1946 +short
# Should return: example.com.
```

**Solution:**
- Configure PTR records in the reverse DNS zone
- Contact your IPv6 address provider for delegation

### Issue 8: DNSSEC Validation Failures

**Symptoms:**
- Queries fail with validating resolvers
- Works when DNSSEC checking is disabled

**Diagnosis:**

```bash
# With DNSSEC validation
dig AAAA example.com +dnssec

# Without DNSSEC validation (CD flag)
dig AAAA example.com +cd
```

**Solution:**
- Check DNSSEC chain of trust
- Verify DNSKEY and DS records
- Use `delv` for detailed DNSSEC debugging

```bash
delv AAAA example.com
```

## Advanced Debugging Techniques

### Comparing IPv4 and IPv6 Resolution

Create a script to compare resolution:

```bash
#!/bin/bash
DOMAIN=$1

echo "=== IPv4 Resolution ==="
dig A $DOMAIN +short

echo ""
echo "=== IPv6 Resolution ==="
dig AAAA $DOMAIN +short

echo ""
echo "=== Resolution Time Comparison ==="
echo "IPv4:"
dig A $DOMAIN | grep "Query time"
echo "IPv6:"
dig AAAA $DOMAIN | grep "Query time"
```

### Checking DNS Server Chain

```bash
#!/bin/bash
DOMAIN=$1

echo "=== Local Resolver ==="
dig AAAA $DOMAIN +short

echo ""
echo "=== Authoritative Server ==="
AUTH_NS=$(dig NS $DOMAIN +short | head -1)
dig AAAA $DOMAIN @$AUTH_NS +short

echo ""
echo "=== Public DNS Comparison ==="
echo "Google: $(dig AAAA $DOMAIN @8.8.8.8 +short)"
echo "Cloudflare: $(dig AAAA $DOMAIN @1.1.1.1 +short)"
echo "Quad9: $(dig AAAA $DOMAIN @9.9.9.9 +short)"
```

### Monitoring DNS Response Times

```bash
#!/bin/bash
DOMAIN=$1
COUNT=${2:-10}

echo "Testing DNS resolution times for $DOMAIN"
echo "=========================================="

for i in $(seq 1 $COUNT); do
    TIME=$(dig AAAA $DOMAIN | grep "Query time" | awk '{print $4}')
    echo "Query $i: ${TIME}ms"
    sleep 1
done
```

### Checking DNS Over HTTPS (DoH) for IPv6

```bash
# Using curl to test DoH
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=example.com&type=AAAA' | jq
```

### Checking DNS Over TLS (DoT)

```bash
# Using kdig (from knot-dnsutils)
kdig -d @1.1.1.1 +tls-ca +tls-host=cloudflare-dns.com AAAA example.com
```

## Debugging IPv6 DNS in Different Scenarios

### Scenario 1: Web Server Not Accessible Over IPv6

```bash
# Step 1: Check if AAAA record exists
dig AAAA www.example.com +short

# Step 2: Verify the IPv6 address is reachable
ping6 -c 3 <ipv6-address>

# Step 3: Check if web server is listening on IPv6
nc -zv -6 <ipv6-address> 80
nc -zv -6 <ipv6-address> 443

# Step 4: Test HTTP connectivity
curl -6 -v https://www.example.com
```

### Scenario 2: Email Delivery Issues with IPv6

```bash
# Check MX records
dig MX example.com +short

# Check if mail server has IPv6
dig AAAA mail.example.com +short

# Verify SPF includes IPv6
dig TXT example.com +short | grep spf

# Check reverse DNS for mail server IPv6
dig -x <mail-server-ipv6> +short
```

### Scenario 3: CDN IPv6 Resolution

```bash
# Check multiple geographic locations using different DNS servers
dig AAAA cdn.example.com @8.8.8.8 +short
dig AAAA cdn.example.com @1.1.1.1 +short

# Check if CDN returns different addresses based on location
# Use DNS servers in different regions for comparison
```

### Scenario 4: Dual-Stack Application Debugging

```bash
# Check both record types
echo "A Records:"
dig A app.example.com +short

echo "AAAA Records:"
dig AAAA app.example.com +short

# Verify application behavior
curl -4 -v https://app.example.com  # Force IPv4
curl -6 -v https://app.example.com  # Force IPv6
```

## Best Practices for IPv6 DNS

### 1. Always Configure Both A and AAAA Records

Ensure your services are accessible over both IPv4 and IPv6:

```bash
# Verify dual-stack configuration
dig A example.com +short
dig AAAA example.com +short
```

### 2. Set Appropriate TTL Values

Lower TTL values allow faster updates but increase DNS query load:

```bash
# Check current TTL
dig AAAA example.com | grep -A1 "ANSWER SECTION"
```

### 3. Configure Reverse DNS (PTR Records)

Essential for email servers and some security applications:

```bash
# Verify PTR record exists
dig -x <your-ipv6-address> +short
```

### 4. Test with Multiple DNS Resolvers

```bash
# Create a testing script
for dns in 8.8.8.8 1.1.1.1 9.9.9.9; do
    echo "Testing $dns:"
    dig AAAA example.com @$dns +short
done
```

### 5. Monitor DNS Resolution Performance

```bash
# Simple monitoring one-liner
while true; do
    echo "$(date): $(dig AAAA example.com +short) - $(dig AAAA example.com | grep 'Query time')"
    sleep 60
done
```

### 6. Implement DNSSEC

Protect your DNS records from spoofing:

```bash
# Verify DNSSEC is configured
dig AAAA example.com +dnssec +short
dig DNSKEY example.com +short
```

## Troubleshooting Checklist

Use this checklist when debugging IPv6 DNS issues:

1. **Verify the record exists:**
   ```bash
   dig AAAA domain.com +short
   ```

2. **Check authoritative nameservers:**
   ```bash
   dig NS domain.com +short
   dig AAAA domain.com @<auth-ns> +short
   ```

3. **Test multiple public DNS servers:**
   ```bash
   dig AAAA domain.com @8.8.8.8 +short
   dig AAAA domain.com @1.1.1.1 +short
   ```

4. **Check for DNSSEC issues:**
   ```bash
   dig AAAA domain.com +dnssec
   dig AAAA domain.com +cd  # Disable checking
   ```

5. **Verify network connectivity:**
   ```bash
   ping6 -c 3 <resolved-ipv6>
   ```

6. **Check reverse DNS:**
   ```bash
   dig -x <ipv6-address> +short
   ```

7. **Review TTL values:**
   ```bash
   dig AAAA domain.com | grep -A2 "ANSWER"
   ```

8. **Trace the resolution path:**
   ```bash
   dig +trace AAAA domain.com
   ```

## Summary Table: dig vs nslookup Commands

| Task | dig Command | nslookup Command |
|------|-------------|------------------|
| Basic AAAA lookup | `dig AAAA example.com` | `nslookup -type=AAAA example.com` |
| Short output | `dig AAAA example.com +short` | N/A |
| Query specific server | `dig AAAA example.com @8.8.8.8` | `nslookup -type=AAAA example.com 8.8.8.8` |
| Reverse lookup | `dig -x <ipv6>` | `nslookup <ipv6>` |
| Force IPv6 transport | `dig -6 AAAA example.com` | N/A |
| Force IPv4 transport | `dig -4 AAAA example.com` | N/A |
| Trace resolution | `dig +trace AAAA example.com` | N/A |
| Debug mode | `dig AAAA example.com +all` | `nslookup -debug -type=AAAA example.com` |
| Check DNSSEC | `dig AAAA example.com +dnssec` | N/A |
| Disable DNSSEC check | `dig AAAA example.com +cd` | N/A |
| Set timeout | `dig AAAA example.com +time=5` | N/A |
| Batch queries | `dig -f domains.txt AAAA` | N/A |

## Common Response Codes

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| NOERROR | Query successful | Normal response |
| NXDOMAIN | Domain does not exist | Typo, expired domain |
| SERVFAIL | Server failure | DNSSEC issue, server error |
| REFUSED | Query refused | Server policy, ACL |
| TIMEOUT | No response | Network issue, firewall |

## Useful dig Flags Reference

| Flag | Description |
|------|-------------|
| `+short` | Show only the answer |
| `+trace` | Trace delegation path |
| `+dnssec` | Request DNSSEC records |
| `+cd` | Disable DNSSEC checking |
| `+tcp` | Use TCP instead of UDP |
| `+time=N` | Set timeout to N seconds |
| `+tries=N` | Set number of retries |
| `+all` | Show all sections |
| `+noall +answer` | Show only answer section |
| `+ttlunits` | Show TTL in human-readable format |
| `-4` | Use IPv4 transport only |
| `-6` | Use IPv6 transport only |
| `-x` | Reverse lookup |
| `-f` | Read queries from file |

## Conclusion

Debugging IPv6 DNS resolution is a critical skill in modern network administration. The `dig` and `nslookup` tools provide powerful capabilities for diagnosing DNS issues, from simple AAAA record lookups to complex DNSSEC validation problems.

Key takeaways from this guide:

1. **Use dig for detailed analysis** - It provides more comprehensive output and advanced features like tracing and DNSSEC validation.

2. **Use nslookup for quick checks** - It is simpler and available on all platforms, making it ideal for basic troubleshooting.

3. **Always compare multiple DNS servers** - This helps identify propagation issues and caching problems.

4. **Check both forward and reverse DNS** - Many services require properly configured PTR records for IPv6 addresses.

5. **Consider DNSSEC** - Validation failures are a common cause of DNS issues that may not be immediately obvious.

6. **Test both IPv4 and IPv6 transport** - Network issues may affect one protocol but not the other.

By mastering these tools and techniques, you will be well-equipped to diagnose and resolve IPv6 DNS issues quickly and effectively. Remember that DNS problems often have cascading effects on application availability, so having strong debugging skills is essential for maintaining reliable services in an IPv6-enabled world.

## Additional Resources

- RFC 3596: DNS Extensions to Support IP Version 6
- RFC 4291: IP Version 6 Addressing Architecture
- RFC 8499: DNS Terminology
- ISC BIND Documentation
- IANA IPv6 Special-Purpose Address Registry

---

*This guide is part of the OneUptime monitoring and observability documentation. For more information about monitoring your IPv6-enabled infrastructure, visit [OneUptime](https://oneuptime.com).*
