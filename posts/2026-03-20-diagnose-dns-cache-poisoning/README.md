# How to Diagnose DNS Cache Poisoning Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Security, Cache Poisoning, DNSSEC, Attack Detection, Linux

Description: Identify signs of DNS cache poisoning attacks, detect suspicious DNS responses, and implement DNSSEC and resolver hardening to prevent poisoning.

## Introduction

DNS cache poisoning (the Kaminsky attack and its variants) involves injecting false DNS records into a resolver's cache. Once poisoned, clients resolving a hostname get an attacker's IP instead of the legitimate one - enabling man-in-the-middle attacks, credential theft, and malware delivery. DNSSEC validation is the definitive protection for signed zones, but detecting poisoning attempts and hardening resolvers provides defense-in-depth.

## Signs of Cache Poisoning

```bash
# 1. IP address changed unexpectedly:

# Compare what your resolver returns vs one authoritative server for the zone apex:
DOMAIN="example.com"
RESOLVER_IPS=$(dig "$DOMAIN" A +short | sort)
RESOLVER_IP=$(printf '%s\n' "$RESOLVER_IPS" | head -1)
AUTH_NS=$(dig "$DOMAIN" NS +short | head -1)
AUTH_IPS=$(dig @"$AUTH_NS" "$DOMAIN" A +short +norecurse | sort)

if [ -z "$AUTH_NS" ]; then
    echo "Could not identify an authoritative nameserver for $DOMAIN"
elif [ "$RESOLVER_IPS" != "$AUTH_IPS" ]; then
    echo "MISMATCH DETECTED!"
    echo "Your resolver:"
    printf '%s\n' "$RESOLVER_IPS"
    echo "Authoritative ($AUTH_NS):"
    printf '%s\n' "$AUTH_IPS"
else
    echo "A RRsets match"
fi

# 2. Domain resolves to suspicious IP:
# Check if the IP belongs to expected AS/ISP:
whois "$RESOLVER_IP" | grep -Ei "OrgName|country|netname"

# 3. TTL anomaly (recursive TTLs count down from the authoritative TTL):
echo "Cached TTLs:"
dig "$DOMAIN" A +noall +answer | awk '{print "TTL:", $2}' | sort -u
echo "Authoritative TTLs:"
dig @"$AUTH_NS" "$DOMAIN" A +norecurse +noall +answer | awk '{print "TTL:", $2}' | sort -u
# Recursive TTLs should be less than or equal to the authoritative TTL
```

## Check Multiple Resolvers

```bash
# Cache poisoning may affect one resolver while others return different data
# Querying multiple resolvers helps detect outliers, but CDNs and GeoDNS can also produce legitimate differences

DOMAIN="example.com"
declare -a RESOLVERS=("8.8.8.8" "1.1.1.1" "9.9.9.9" "208.67.222.222")

echo "DNS responses for $DOMAIN:"
for resolver in "${RESOLVERS[@]}"; do
    IP=$(dig @"$resolver" "$DOMAIN" +short 2>/dev/null | head -1)
    echo "  $resolver: ${IP:-timeout/empty}"
done

# If one resolver is the outlier, investigate that resolver first
```

## Monitor for Poisoning Attempts

```bash
# Enable DNS logging to detect poisoning attempts:
# In Unbound: log queries, replies, and SERVFAIL reasons:
cat >> /etc/unbound/unbound.conf << 'EOF'
server:
    log-queries: yes
    log-replies: yes
    log-tag-queryreply: yes
    log-servfail: yes
EOF
# If unbound-control is not configured, reload Unbound with your service manager instead
unbound-checkconf && unbound-control reload

# Watch for validation failures and unexpected SERVFAILs in Unbound logs:
tail -f /var/log/unbound/unbound.log | grep -Ei 'servfail|bogus|validation'

# BIND: log DNSSEC validation messages:
# In named.conf:
# logging {
#     channel dnssec_log { file "/var/log/named/dnssec.log"; severity debug 3; print-category yes; };
#     category dnssec { dnssec_log; };
# };
```

## Enable DNSSEC Validation

```bash
# DNSSEC is the definitive defense against cache poisoning for signed zones:
# A poisoned response cannot pass DNSSEC signature verification on a validating resolver

# Enable in Unbound (use the same root.key path in both commands):
unbound-anchor -a "/var/lib/unbound/root.key"
cat >> /etc/unbound/unbound.conf << 'EOF'
server:
    auto-trust-anchor-file: "/var/lib/unbound/root.key"
EOF
# If unbound-control is not configured, reload Unbound with your service manager instead
unbound-checkconf && unbound-control reload

# Test DNSSEC validation works against your validating resolver:
dig @127.0.0.1 +dnssec cloudflare.com
# Look for: flags: qr rd ra ad (AD = Authentic Data)

# Test that BOGUS domains fail:
dig @127.0.0.1 www.dnssec-failed.org A
# Should return SERVFAIL if DNSSEC validation is enabled

# Confirm it is specifically a validation failure:
dig @127.0.0.1 www.dnssec-failed.org A +cd
# With +cd, the query should return NOERROR because checking is disabled
```

## Resolver Hardening Against Poisoning

```bash
# 1. Use random source ports (randomized source ports make poisoning harder):
# Modern resolvers do this by default (CVE-2008-1447 fix)
# In BIND, avoid pinning query-source to a fixed UDP port:
(named-checkconf -p | grep -E 'query-source|query-source-v6') || \
  echo "No explicit query-source statements; defaults apply"
# If you see a fixed "port N" value, remove it

# 2. Enable 0x20 bit randomization (case randomization in queries):
# Some resolvers capitalize random letters in queries
# Responses must match case → harder to spoof
# In Unbound, this is the experimental `use-caps-for-id` option and defaults to no

# 3. Check if you're behind a NAT that de-randomizes source ports:
# Some NAT devices map all DNS to the same external port
# → Significantly weakens poisoning resistance
# Capture on the NAT device's WAN side (or upstream of the NAT) to see post-NAT ports
tcpdump -i eth0 -nn 'udp and dst port 53' | \
  awk '{print $3}' | sed 's/:$//' | awk -F. '{print $NF}' | sort -u | head -20
# If you only observe one or two source ports over many queries, NAT may be weakening port randomization
```

## Verify DNS Integrity

```bash
# Regular DNS integrity check script:
#!/bin/bash
# Best for internal or otherwise static records; CDN-backed names may legitimately change IPs
CRITICAL_DOMAINS=("banking.example.com" "auth.example.com" "payments.example.com")
EXPECTED_IPS=("10.20.0.100" "10.20.0.101" "10.20.0.102")

echo "DNS Integrity Check - $(date)"
echo "================================"

for i in "${!CRITICAL_DOMAINS[@]}"; do
    domain="${CRITICAL_DOMAINS[$i]}"
    expected="${EXPECTED_IPS[$i]}"
    current=$(dig +short "$domain" | head -1)

    if [ "$current" = "$expected" ]; then
        echo "OK: $domain → $current"
    else
        echo "ALERT: $domain expected $expected got ${current:-empty}"
        # Send alert to monitoring system here
    fi
done
```

## Conclusion

DNS cache poisoning detection often involves comparing resolver responses against authoritative server responses for the same RRset, but legitimate differences can occur because of caching, CDNs, and GeoDNS. Anomalies (different IPs from different resolvers, unexpected validation failures, or unexpected TTL behavior) warrant investigation. DNSSEC validation is the only cryptographically sound defense for signed zones - enable validation on your resolver with a trust anchor such as `auto-trust-anchor-file`. Harden resolvers by ensuring source port randomization is not defeated by NAT devices. Regularly verify that critical domain resolutions return expected answers using automated monitoring.
