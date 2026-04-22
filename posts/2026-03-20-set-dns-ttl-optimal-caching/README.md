# How to Set DNS TTL Values for Optimal Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, TTL, Caching, Performance, Configuration, Best Practice

Description: Choose optimal DNS TTL values for different record types and use cases, balancing cache performance against change propagation speed.

## Introduction

DNS TTL (Time to Live) is the number of seconds a DNS record can be cached before resolvers must re-query the authoritative server. TTL is a direct tradeoff: high TTLs mean better performance (more caching) but slower propagation of changes. Low TTLs mean faster propagation but more queries to authoritative servers. Choosing the right TTL for each record type and use case is a critical DNS operation decision.

## Understanding TTL Impact

```text
TTL = 86400 (24 hours):
  + Excellent cache coverage: resolvers worldwide cache for 24 hours
  + Very low query volume to authoritative servers
  - DNS changes take up to 24 hours to propagate everywhere
  - During planned change: must wait 24 hours after reducing TTL

TTL = 3600 (1 hour):
  + Good balance: decent caching, 1-hour propagation
  - Queries hit authoritative servers 24x more than 86400

TTL = 300 (5 minutes):
  + Fast propagation for changes
  - 288x more queries than 86400 TTL
  - Appropriate only for records that change frequently

TTL = 60 (1 minute):
  + Near-realtime updates
  - Very high query load; only use during migrations
```

## TTL by Record Type

```bash
# Recommended TTLs by record type:

# A/AAAA records (server IPs):

# Stable production servers:     3600-86400 (1-24 hours)
# Load balanced / health-checked: 30-300    (30 sec to 5 min)
# Frequently changed:             60-300    (1-5 minutes)
# During migration:               60        (1 minute, temporarily)

# CNAME records:
# Static aliases:                 3600-86400
# CDN/cloud endpoints:            300-3600 (cloud provider may change)

# MX records (mail):
# Rarely changed:                 3600-86400
# Reduce before mail server change: 300-600

# NS records:
# Very rarely changed:            86400-172800 (24-48 hours)
# These propagate through parent zone (longer lead time needed)

# TXT records (SPF, DKIM, DMARC):
# SPF (rarely changes):           3600-86400
# DKIM (rotated periodically):    3600 with planned rotation

# SOA record negative TTL:
# How long to cache NXDOMAIN:    300-3600
# Low value reduces impact of mistyped DNS names in code
```

## Setting TTL in Zone Files

```bash
# Zone file example with appropriate TTLs:

cat > /etc/bind/zones/db.example.com << 'EOF'
$TTL 3600    ; Default TTL for all records unless overridden

@   IN SOA ns1.example.com. admin.example.com. (
            2026032001
            3600        ; Refresh
            900         ; Retry
            604800      ; Expire
            300         ; Negative TTL (NXDOMAIN cache time)
            )

; Nameservers (stable, high TTL):
@       86400   IN NS   ns1.example.com.
@       86400   IN NS   ns2.example.com.

; Stable server A records:
ns1     86400   IN A    10.20.0.1
ns2     86400   IN A    10.20.0.2

; Production web server (moderate TTL):
www     3600    IN A    93.184.216.34

; Load balanced endpoint (low TTL for fast failover):
api     30      IN A    93.184.216.35

; Mail server (moderate TTL):
mail    3600    IN A    93.184.216.36
@       3600    IN MX   10 mail.example.com.

; TXT records:
@       3600    IN TXT  "v=spf1 include:_spf.example.com ~all"
EOF
```

## The Migration TTL Pattern

```bash
# Standard process for changing an A record:

# Step 1: Reduce TTL 48 hours BEFORE the change:
# Change TTL from 86400 → 300 in zone file
# Increment serial number
# Wait 48+ hours for caches to expire

# Step 2: Verify low TTL is propagated:
dig example.com | grep -A1 "ANSWER SECTION" | tail -1 | awk '{print $2}'
# Should show: 300 (or lower if the resolver cached it earlier and the TTL is counting down)

# Step 3: Make the actual IP change
# Update A record to new IP, keep TTL=300

# Step 4: Verify propagation (should complete within 5 minutes)
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9; do
    echo -n "$resolver: "
    dig @$resolver example.com +short
done

# Step 5: After successful cutover, restore TTL:
# Change TTL from 300 → 3600 (or whatever is appropriate)
```

## Monitor TTL in Production

```bash
# Check current effective TTL from a resolver:
dig example.com | grep -A1 "ANSWER" | tail -1 | awk '{print $2}'
# This is the REMAINING TTL in the cache

# Track TTL countdown (confirms caching is working):
for i in 1 2 3; do
    dig example.com | grep -A1 "ANSWER" | tail -1 | awk '{printf "TTL: %s\n", $2}'
    sleep 10
done
# Each iteration should show TTL decreasing by ~10

# Check TTL at authoritative (should always show full TTL):
AUTH=$(dig NS example.com +short | head -1)
dig @$AUTH example.com | grep -A1 "ANSWER" | tail -1 | awk '{print $2}'
# Should show the configured TTL (e.g., 3600)
```

## Conclusion

TTL selection is a tradeoff between cache efficiency and change agility. Use 3600 for production A records as a reasonable default. Reduce to 30-60 for health-checked load balancer endpoints that need rapid failover. Always reduce TTL to 300 before planned changes and wait for the original TTL to expire before making the change. The "migration TTL pattern" - reduce TTL 48+ hours before changing - eliminates the surprise of slow propagation during incidents and planned changes.
