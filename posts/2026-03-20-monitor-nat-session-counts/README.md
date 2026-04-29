# How to Monitor NAT Session Counts and Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, Linux, Monitoring, Performance

Description: Learn how to monitor NAT session counts, track limits, and set up alerting when connection table usage approaches critical thresholds.

## Why Monitor NAT Sessions?

NAT devices maintain a state table for every active connection. When this table fills up:
- New connections are silently dropped
- Existing connections may be disrupted
- Users experience intermittent connectivity

Monitoring helps you detect and prevent table overflow before it impacts users.

## Checking Current Session Count on Linux

```bash
# Current active connections in conntrack table

cat /proc/sys/net/netfilter/nf_conntrack_count

# Maximum allowed connections
cat /proc/sys/net/netfilter/nf_conntrack_max

# Usage percentage
python3 -c "
count = int(open('/proc/sys/net/netfilter/nf_conntrack_count').read())
max_val = int(open('/proc/sys/net/netfilter/nf_conntrack_max').read())
print(f'Sessions: {count}/{max_val} ({count/max_val*100:.1f}%)')
"
```

## Real-Time Session Monitoring

```bash
# Watch session count every second
watch -n 1 'cat /proc/sys/net/netfilter/nf_conntrack_count'

# More detailed view with conntrack
watch -n 2 'conntrack -L 2>/dev/null | wc -l'

# By protocol
watch -n 2 'conntrack -L 2>/dev/null | awk "{print \$1}" | sort | uniq -c | sort -rn'
```

## Breaking Down Sessions by State

```bash
# TCP connection states
conntrack -L -p tcp 2>/dev/null | awk '{print $4}' | sort | uniq -c | sort -rn

# Expected output:
# 15243 ESTABLISHED
#  3421 TIME_WAIT
#   891 SYN_SENT
```

## Session Count by Source IP

```bash
#!/bin/bash
# Top 10 hosts by active connections
conntrack -L 2>/dev/null | \
    awk '/src=/ {
        match($0, /src=([0-9.]+)/, a)
        print a[1]
    }' | \
    sort | uniq -c | sort -rn | head -10
```

## Setting Up Alerting

### Shell Script Alert

```bash
#!/bin/bash
# /usr/local/bin/check-nat-sessions.sh

THRESHOLD=80  # Alert at 80% usage

COUNT=$(cat /proc/sys/net/netfilter/nf_conntrack_count)
MAX=$(cat /proc/sys/net/netfilter/nf_conntrack_max)
PCT=$((COUNT * 100 / MAX))

if [ "$PCT" -ge "$THRESHOLD" ]; then
    echo "WARNING: NAT session table at ${PCT}% (${COUNT}/${MAX})"
    # Send email, slack, etc.
    # mail -s "NAT Alert: ${PCT}% sessions used" admin@example.com <<< "Session table critical"
fi

echo "NAT sessions: ${COUNT}/${MAX} (${PCT}%)"
```

Add to cron:

```bash
echo "*/5 * * * * root /usr/local/bin/check-nat-sessions.sh >> /var/log/nat-monitor.log" >> /etc/crontab
```

### Prometheus + node_exporter

If using Prometheus, node_exporter exposes conntrack metrics:

```text
node_nf_conntrack_entries          # Current count
node_nf_conntrack_entries_limit    # Max limit
```

Prometheus alert rule:

```yaml
groups:
- name: nat
  rules:
  - alert: NATTableUsageHigh
    expr: node_nf_conntrack_entries / node_nf_conntrack_entries_limit > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "NAT connection table above 80%"
```

## Tuning the Session Limit

```bash
# Check current limit
sysctl net.netfilter.nf_conntrack_max

# Increase for high-traffic NAT gateways
sysctl -w net.netfilter.nf_conntrack_max=524288

# Persist
echo "net.netfilter.nf_conntrack_max = 524288" >> /etc/sysctl.conf
```

Also adjust memory (each entry uses ~300 bytes):

```bash
# Calculate memory for 500K sessions: 500000 * 300 / 1024 / 1024 ≈ 143 MB
free -m  # Verify you have enough RAM
```

## Key Takeaways

- Monitor `nf_conntrack_count` vs `nf_conntrack_max` to track NAT table usage.
- Alert when usage exceeds 80% to prevent silent connection drops.
- Use Prometheus + node_exporter for production NAT monitoring.
- Increase `nf_conntrack_max` for high-traffic gateways, keeping memory overhead in mind.

**Related Reading:**

- [How to Troubleshoot NAT with Connection Tracking](https://oneuptime.com/blog/post/2026-03-20-nat-connection-tracking/view)
- [How to View the NAT Translation Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-nat-translation-table-linux/view)
- [How to Scale NAT for Large Networks](https://oneuptime.com/blog/post/2026-03-20-scale-nat-large-networks/view)
