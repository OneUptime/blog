# How to Troubleshoot Intermittent DNS Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Intermittent, Troubleshooting, Reliability, Linux, Networking

Description: Diagnose sporadic DNS resolution failures by capturing failures as they occur, analyzing patterns, and identifying root causes like resolver instability or network congestion.

## Introduction

Intermittent DNS failures are among the most frustrating networking issues. Applications work most of the time but occasionally fail to resolve a hostname, causing request failures, connection errors, or service timeouts. The challenge is that by the time you investigate, the failure has stopped. This requires proactive monitoring and pattern analysis.

## Capture DNS Failures as They Happen

```bash
#!/bin/bash
# DNS failure monitoring script - run in background

# Logs every DNS failure with timestamp and details.
# Run as root or change LOG to a writable path.

LOG="/var/log/dns-failures.log"
CHECK_DOMAINS=(google.com cloudflare.com)
# Add application and internal hostnames that should resolve in your environment.
INTERVAL=5  # Check every 5 seconds

echo "Starting DNS failure monitoring..."

while true; do
    for domain in "${CHECK_DOMAINS[@]}"; do
        RESULT=$(dig +tries=1 +timeout=2 "$domain" 2>/dev/null)
        STATUS=$(printf '%s\n' "$RESULT" | sed -n 's/.*status: \([^,]*\),.*/\1/p' | head -1)
        QUERY_TIME=$(printf '%s\n' "$RESULT" | grep "Query time" | awk '{print $4}')

        if [ "$STATUS" != "NOERROR" ] || [ -z "$QUERY_TIME" ]; then
            echo "$(date +%Y-%m-%dT%H:%M:%S) FAIL domain=$domain status=${STATUS:-timeout} time=${QUERY_TIME:-timeout}" \
              | tee -a "$LOG"
        elif [ "${QUERY_TIME:-0}" -gt 1000 ]; then
            echo "$(date +%Y-%m-%dT%H:%M:%S) SLOW domain=$domain status=$STATUS time=${QUERY_TIME}ms" \
              | tee -a "$LOG"
        fi
    done
    sleep "$INTERVAL"
done
```

## Pattern Analysis

```bash
# Analyze captured failures:

# How many failures per hour?
cat /var/log/dns-failures.log | \
  awk '{print substr($1, 1, 13)}' | sort | uniq -c
# Shows: failures per hour (YYYY-MM-DDTHH format)

# Which domains fail most?
cat /var/log/dns-failures.log | grep FAIL | \
  awk '{for(i=1;i<=NF;i++) if($i ~ /^domain=/) print substr($i,8)}' | \
  sort | uniq -c | sort -rn

# Are failures correlated with specific times (e.g., business hours)?
cat /var/log/dns-failures.log | \
  awk '{print substr($1, 12, 2)}' | sort | uniq -c | sort -rn | head -5
# Shows: which hours have most failures

# Are all domains failing at the same time (resolver issue)?
# Or just specific domains (authoritative issue)?
grep "FAIL" /var/log/dns-failures.log | \
  awk '{print $1, $3}' | sort | head -20
```

## Common Causes and Diagnoses

```bash
# Cause 1: Resolver overload at peak times
# Check resolver statistics:
resolvectl statistics
# Monitor live local query activity on systemd 252+:
resolvectl monitor
# Monitor resolver CPU separately at time of failures

# Cause 2: Resolver failover gaps
# When primary resolver fails and secondary takes over:
# The few seconds of failover appear as "intermittent" failures
# Check resolver configured:
cat /etc/resolv.conf
# If only 1 nameserver: single point of failure
# Fix: add backup nameserver

# Cause 3: UDP packet loss to DNS server
# Check for path loss to DNS resolver (replace 8.8.8.8 with your resolver IP):
ping -c 100 -i 0.1 8.8.8.8 | tail -3
# Any loss% suggests path loss that can also affect DNS queries intermittently

# Cause 4: DNS server rate limiting
# Your IP may be rate-limited for sending too many queries
# Test: are failures from specific source IP?
# If rate limited: use different resolver or reduce query rate
```

## Isolate the Failure Layer

```bash
# When a failure occurs, capture immediately:
DNS_FAILURE_CAPTURE() {
    DOMAIN="$1"
    RESOLVER="8.8.8.8"  # Replace with your configured resolver for internal names
    TS=$(date +%Y%m%d_%H%M%S)

    echo "=== Failure at $TS for $DOMAIN ===" >> "/tmp/dns_failure_$TS.txt"

    # Check system resolver:
    dig "$DOMAIN" >> "/tmp/dns_failure_$TS.txt" 2>&1

    # Check specific resolver directly:
    dig @"$RESOLVER" "$DOMAIN" >> "/tmp/dns_failure_$TS.txt" 2>&1

    # Check resolver connectivity:
    ping -c 3 "$RESOLVER" >> "/tmp/dns_failure_$TS.txt" 2>&1

    # Check resolver response:
    resolvectl query "$DOMAIN" >> "/tmp/dns_failure_$TS.txt" 2>&1

    echo "Failure details saved to /tmp/dns_failure_$TS.txt"
}

# Call when failure detected:
# DNS_FAILURE_CAPTURE "api.example.com"
```

## Fix Strategies by Cause

```bash
# Fix 1: Single resolver → Add redundancy
cat > /etc/resolv.conf << 'EOF'
# Primary
nameserver 8.8.8.8
# Secondary (queried if primary times out)
nameserver 1.1.1.1
options timeout:2 attempts:2
EOF

# Fix 2: Slow failover → Reduce timeout:
# options timeout:1 → waits 1 second for a response before retrying another server

# Fix 3: Intermittent UDP loss → Test DNS over TCP:
dig @8.8.8.8 google.com +tcp  # Test TCP to the resolver
# For the glibc resolver, add "options use-vc" to force TCP for application lookups

# Fix 4: Resolver overload → Use local caching resolver:
systemctl enable --now unbound
# Then configure the host to use the local cache, for example: nameserver 127.0.0.1
# Local cache absorbs repeated queries, reduces load on upstream resolver
```

## Conclusion

Intermittent DNS failures require proactive monitoring with a background script that captures failures with timestamps. Analyze patterns to distinguish time-correlated failures (resolver load), domain-specific failures (authoritative server issues), and random failures (packet loss). The key diagnostic question is: do all domains fail simultaneously (resolver/network issue) or just specific domains (authoritative server issue)? Add resolver redundancy with multiple `nameserver` lines and low `timeout` values for fast failover.
