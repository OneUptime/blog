# How to Set Up Dual A and AAAA Records for Dual-Stack Domains

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Dual-Stack, AAAA Records, A Records

Description: A guide to correctly setting up both A and AAAA records for dual-stack services so that IPv4 and IPv6 clients both get the best connection path.

## Why Both A and AAAA Records Matter

Dual-stack means a service is reachable over both IPv4 and IPv6. For clients to use both, the DNS must return both A and AAAA records for the same hostname. A missing AAAA record forces IPv6-capable clients to fall back to IPv4, wasting IPv6 capacity. A missing A record breaks connectivity for IPv4-only clients.

## Correct Dual-Stack DNS Configuration

Both A and AAAA records should coexist for the same hostname. Keeping their TTLs aligned is a good operational practice:

```dns
; /var/named/example.com.zone

; Dual-stack records for web service
www     3600    IN  A       93.184.216.34
www     3600    IN  AAAA    2001:db8::1

; Dual-stack records for mail
mail    3600    IN  A       93.184.216.100
mail    3600    IN  AAAA    2001:db8::100

; Zone apex dual-stack
@       3600    IN  A       93.184.216.34
@       3600    IN  AAAA    2001:db8::1

; Address records for an in-zone name server host
ns1     3600    IN  A       93.184.216.200
ns1     3600    IN  AAAA    2001:db8::200
```

## Verifying Dual-Stack Records Exist

```bash
# Check both record types exist for the same hostname

dig A www.example.com +short
dig AAAA www.example.com +short

# Script to audit all hostnames for dual-stack completeness
for HOST in www mail api ftp; do
    A=$(dig A $HOST.example.com +short)
    AAAA=$(dig AAAA $HOST.example.com +short)
    if [ -z "$A" ]; then
        echo "WARNING: No A record for $HOST.example.com"
    fi
    if [ -z "$AAAA" ]; then
        echo "WARNING: No AAAA record for $HOST.example.com"
    fi
    if [ -n "$A" ] && [ -n "$AAAA" ]; then
        echo "OK: $HOST.example.com - A=$A AAAA=$AAAA"
    fi
done
```

## TTL Consistency Between A and AAAA

It is usually best to give both records the same TTL. Mismatched TTLs can cause A and AAAA answers to be cached and refreshed at different times:

```dns
; GOOD PRACTICE: Matching TTLs
www     3600    IN  A       93.184.216.34
www     3600    IN  AAAA    2001:db8::1

; LESS CONSISTENT: Mismatched TTLs
www     300     IN  A       93.184.216.34
www     86400   IN  AAAA    2001:db8::1
```

## How Happy Eyeballs Uses Dual-Stack Records

Many modern clients use the Happy Eyeballs algorithm (RFC 8305) when both A and AAAA records exist. The algorithm:

1. Sends AAAA and A queries very close together, typically AAAA first and then A immediately after
2. Starts connection attempts as soon as one address family is available instead of waiting for both answers
3. Gives IPv6 a slight preference, but starts additional attempts after a short delay if needed
4. Uses the first successful connection and cancels the others

This means dual-stack records let modern clients take advantage of IPv6 while maintaining IPv4 fallback safety.

## Handling Load-Balanced Services

For load-balanced services with multiple backends, add multiple records for each protocol:

```dns
; IPv4 load balancing with multiple A records
www     300     IN  A       203.0.113.1
www     300     IN  A       203.0.113.2
www     300     IN  A       203.0.113.3

; IPv6 load balancing with multiple AAAA records
www     300     IN  AAAA    2001:db8::1
www     300     IN  AAAA    2001:db8::2
www     300     IN  AAAA    2001:db8::3
```

Use a short TTL (300 seconds) for load-balanced records to allow quick updates.

## Using CNAME for Simplified Dual-Stack Management

When many hostnames point to the same service, use CNAMEs to simplify updates:

```dns
; Central dual-stack record
web-cluster     3600    IN  A       203.0.113.1
web-cluster     3600    IN  AAAA    2001:db8::1

; CNAME records all pointing to the central record
www             3600    IN  CNAME   web-cluster.example.com.
api             3600    IN  CNAME   web-cluster.example.com.
app             3600    IN  CNAME   web-cluster.example.com.
```

Note: CNAMEs cannot be used at the zone apex (@). Use A/AAAA directly there.

## Testing Dual-Stack Connectivity

After setting up dual-stack DNS, verify both paths work:

```bash
# Test IPv4 connectivity via A record
curl -4 https://www.example.com/

# Test IPv6 connectivity via AAAA record
curl -6 https://www.example.com/

# See which address family curl actually used
curl -v https://www.example.com/ 2>&1 | grep "Connected to"
# This may show either an IPv6 or IPv4 address, depending on which connection succeeds first
```

## Summary

Proper dual-stack DNS requires both A and AAAA records for every hostname that should be reachable over both IPv4 and IPv6. Audit your zones to find hostnames missing either record type. Keeping TTLs aligned is a good operational practice, and with both records present, modern clients can use Happy Eyeballs to give IPv6 a slight preference while still falling back to IPv4 when needed - providing the best experience for all clients without any additional configuration.
