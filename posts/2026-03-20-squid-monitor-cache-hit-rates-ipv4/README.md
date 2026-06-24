# How to Monitor Squid Cache Hit Rates for IPv4 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Monitoring, Cache Hit Rate, IPv4, Squidclient, Metric, Performance

Description: Learn how to monitor Squid proxy cache hit rates and performance metrics for IPv4 traffic using the cache manager interface and access log analysis.

---

Cache hit rate is the primary metric for measuring Squid's effectiveness. A high hit rate (>40%) means Squid is successfully serving content from its local cache, reducing upstream bandwidth consumption. This guide shows how to monitor overall hit rates in real time and IPv4 client hit rates through log analysis.

## Method 1: Cache Manager (curl or squidclient)

Squid's cache manager exposes reports over HTTP. Squid 6 and older can also use `squidclient`; Squid 7 removed `squidclient` and `cachemgr.cgi`, so `curl` works across current releases.

```bash
# Enable cache manager access in squid.conf (allow from localhost by default)

# No extra configuration needed for local access

# Get overall cache statistics
curl -s http://127.0.0.1:3128/squid-internal-mgr/info

# Get detailed counters
curl -s http://127.0.0.1:3128/squid-internal-mgr/counters

# Squid 6 and older, if squidclient is installed:
squidclient -h localhost -p 3128 mgr:info

squidclient -h localhost -p 3128 mgr:counters
```

Key metrics from the `info` report:

```text
Cache information for squid:
    Hits as % of all requests:   5min: 42.3%, 60min: 38.7%
    Hits as % of bytes sent:     5min: 61.2%, 60min: 57.8%
    Memory hits as % of hit requests: 5min: 18.1%
    Disk hits as % of hit requests:   5min: 24.2%
```

## Method 2: Parsing the Access Log

```bash
# Count result codes for IPv4 client traffic from the access log (last 1000 lines)
tail -n 1000 /var/log/squid/access.log | \
  awk '$3 ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ {print $4}' | \
  sort | uniq -c | sort -rn

# Calculate cache hit percentage for IPv4 client traffic from the full log
awk '$3 ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ {
  total++
  if ($4 ~ /HIT/) hits++
} END {
  rate = total ? (hits/total)*100 : 0
  printf "Total: %d, Hits: %d, Hit Rate: %.1f%%\n", total, hits, rate
}' /var/log/squid/access.log
```

## Squid Access Log Result Codes

| Code | Meaning |
|------|---------|
| `TCP_HIT` | Served from local cache |
| `TCP_MEM_HIT` | Served from memory cache |
| `TCP_MISS` | Cache miss; fetched from origin |
| `TCP_REFRESH_UNMODIFIED` | Stale cached object revalidated with origin; origin returned Not Modified |
| `TCP_DENIED` | Access denied by ACL |
| `TCP_TUNNEL` | HTTPS CONNECT tunnel |

## Method 3: cachemgr.cgi Web Interface

Squid 6 and older packages may include a CGI-based cache manager for browser-based monitoring. Squid 7 removed `cachemgr.cgi`; use the HTTP cache manager URLs directly on Squid 7 and later.

```bash
# Install the cache manager CGI on Squid 6 and older Debian/Ubuntu packages
apt install squid-cgi -y

# Configure Apache or Nginx to serve it
# (usually at /usr/lib/cgi-bin/cachemgr.cgi)

# Or access the cache manager directly with curl in a loop
watch -n5 "curl -s http://127.0.0.1:3128/squid-internal-mgr/info | grep 'Hits as %'"
```

## Enabling Detailed Logging

```squid
# /etc/squid/squid.conf
# Add the result code to the access log format for better analysis
logformat squid_hits %ts.%03tu %6tr %>a %Ss/%03>Hs %<st %rm %ru %[un %Sh/%<a %mt
access_log daemon:/var/log/squid/access.log logformat=squid_hits
```

## Real-Time Hit Rate Dashboard (Shell Script)

```bash
#!/bin/bash
# monitor_squid.sh - Print cache hit rate every 10 seconds
while true; do
    STATS=$(curl -s http://127.0.0.1:3128/squid-internal-mgr/info 2>/dev/null)
    HIT5=$(echo "$STATS" | grep -oP 'Hits as % of all requests:\s+5min:\s+\K\d+(\.\d+)?(?=%)' | head -1)
    echo "$(date '+%H:%M:%S') - 5-min cache hit rate: ${HIT5}%"
    sleep 10
done
```

## Key Takeaways

- The cache manager `info` report gives real-time hit rates for 5-minute and 60-minute windows.
- Parse the access log and count `TCP_HIT` vs `TCP_MISS` for IPv4 historical analysis.
- A hit rate below 20% suggests the cache is too small, TTLs are too short, or traffic is mostly dynamic/uncacheable.
- Increase `cache_mem` and `cache_dir` size, or tune `minimum_object_size` / `maximum_object_size`, to improve hit rates.
