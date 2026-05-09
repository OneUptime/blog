# How to Monitor DNS Query Latency and Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Monitoring, Latency, Performance, Linux, Prometheus

Description: Monitor DNS query latency and performance metrics using dig timing, dnsperf, and Prometheus to detect resolver degradation and capacity issues.

## Introduction

DNS latency directly impacts every connection your applications make. A 100ms DNS delay adds 100ms to every new connection. Monitoring DNS performance reveals resolver degradation before it becomes an outage, identifies slow upstream resolvers, and quantifies the impact of DNS infrastructure changes.

## Quick Latency Check

```bash
# Single query timing with dig:

dig google.com | grep "Query time"
# Query time: 45 msec = DNS resolved in 45ms

# Measure cached vs uncached:
dig google.com | grep "Query time"   # Second run = cached (should be ~1ms)

# Measure from application perspective:
time getent hosts google.com
# Shows total NSS resolution time including nsswitch.conf processing
```

## Continuous Latency Monitoring Script

```bash
#!/bin/bash
# Monitor DNS latency over time

DOMAINS=("google.com" "cloudflare.com" "amazon.com")
RESOLVER="8.8.8.8"
LOG="/var/log/dns-latency.csv"

echo "timestamp,domain,latency_ms,status" > $LOG

while true; do
    for domain in "${DOMAINS[@]}"; do
        RESULT=$(dig @$RESOLVER +tries=1 +timeout=5 $domain 2>/dev/null)
        LATENCY=$(echo "$RESULT" | grep "Query time" | awk '{print $4}')
        STATUS=$(echo "$RESULT" | grep "ANSWER:" | awk '{print $NF}')

        if [ -z "$LATENCY" ]; then
            LATENCY="timeout"
            STATUS="0"
        fi

        echo "$(date +%s),$domain,${LATENCY},${STATUS}" | tee -a $LOG
    done
    sleep 30
done
```

## DNS Performance Testing with dnsperf

```bash
# Install dnsperf:
apt-get install dnsperf -y

# Create query list:
cat > /tmp/dns_queries.txt << 'EOF'
google.com A
cloudflare.com A
amazon.com A
github.com A
stackoverflow.com A
EOF

# Run performance test (run through 5-query file 1000 times = 5000 queries, act as 10 clients):
dnsperf -s 8.8.8.8 -d /tmp/dns_queries.txt \
  -n 1000 -c 10 -t 30
# Output: queries/sec, latency percentiles, loss rate

# Compare resolvers:
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9; do
    echo "=== $resolver ==="
    dnsperf -s $resolver -d /tmp/dns_queries.txt -n 1000 -c 5 -t 10 2>&1 | \
      grep -E "Queries per|Latency"
done
```

## Prometheus DNS Monitoring

```yaml
# Prometheus + blackbox exporter for DNS monitoring:
# blackbox.yml:
modules:
  dns_google:
    prober: dns
    timeout: 5s
    dns:
      query_name: "google.com"
      query_type: "A"
      preferred_ip_protocol: "ip4"

# prometheus.yml scrape config:
scrape_configs:
  - job_name: 'dns'
    metrics_path: /probe
    params:
      module: [dns_google]
    static_configs:
      - targets:
          - 8.8.8.8    # Google DNS
          - 1.1.1.1    # Cloudflare DNS
          - 127.0.0.53 # Local resolver
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: localhost:9115  # Blackbox exporter address
```

```bash
# Useful Prometheus queries for DNS monitoring:
# Average DNS latency by resolver:
# avg(probe_duration_seconds{job="dns"}) by (instance)

# DNS failure rate (probe_success is a gauge - average over a window):
# avg_over_time(probe_success{job="dns"}[5m]) < 1

# P99 DNS latency (blackbox metrics are gauges, so use quantile_over_time):
# quantile_over_time(0.99, probe_duration_seconds{job="dns"}[5m])
```

## DNS Latency Benchmarking

```bash
#!/bin/bash
# Quick DNS resolver benchmark from your location

DOMAINS=(google.com cloudflare.com amazon.com github.com)
RESOLVERS=(8.8.8.8 1.1.1.1 9.9.9.9 208.67.222.222 $(grep ^nameserver /etc/resolv.conf | awk '{print $2}'))

echo "Resolver        | Avg(ms) | Min(ms) | Max(ms)"
echo "----------------|---------|---------|--------"

for resolver in "${RESOLVERS[@]}"; do
    latencies=()
    for domain in "${DOMAINS[@]}"; do
        for i in 1 2 3; do
            lt=$(dig @$resolver $domain +tries=1 +timeout=3 2>/dev/null | \
                 grep "Query time" | awk '{print $4}')
            [ -n "$lt" ] && latencies+=($lt)
        done
    done

    if [ ${#latencies[@]} -gt 0 ]; then
        sum=0; min=9999; max=0
        for l in "${latencies[@]}"; do
            sum=$((sum + l))
            [ $l -lt $min ] && min=$l
            [ $l -gt $max ] && max=$l
        done
        avg=$((sum / ${#latencies[@]}))
        printf "%-15s | %-7s | %-7s | %s\n" "$resolver" "${avg}ms" "${min}ms" "${max}ms"
    fi
done
```

## Conclusion

DNS latency monitoring should be part of every infrastructure's observability stack. A good DNS resolver should respond in under 5ms for cached queries and under 100ms for uncached. Run the benchmark script to find the fastest resolver for your network location. For production monitoring, deploy Prometheus with the blackbox exporter for alerting on DNS failures and latency spikes. Monitor both cache hit rates (from `resolvectl statistics`) and query times to get a complete picture of DNS health.
