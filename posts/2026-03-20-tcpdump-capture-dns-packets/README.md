# How to Capture DNS Query and Response Packets with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, DNS, Linux, UDP, Networking, Diagnostic

Description: Capture and analyze DNS query and response packets with tcpdump to debug resolution failures, identify slow DNS servers, and monitor DNS traffic patterns.

DNS is the foundation of internet connectivity. When applications fail to reach services, DNS is often the culprit. For plaintext DNS on port 53, tcpdump captures the full query/response cycle, showing exactly what names are being resolved, by whom, and how fast.

## Capture DNS Traffic on Port 53

```bash
# Capture standard DNS traffic (UDP port 53)

sudo tcpdump -nn -i eth0 udp port 53

# Include DNS over TCP (zone transfers, large responses)
sudo tcpdump -nn -i eth0 port 53

# DNS to a specific resolver
sudo tcpdump -nn 'port 53 and host 8.8.8.8'

# Port 53 DNS traffic on all interfaces
sudo tcpdump -nn -i any port 53
```

## Reading DNS tcpdump Output

```bash
sudo tcpdump -nn 'udp port 53'

# Query output:
# 10:15:32.123456 IP 192.168.1.100.35123 > 8.8.8.8.53: 12345+ A? google.com. (28)
# query ID = 12345, query type = A, hostname = google.com.

# Response output:
# 10:15:32.145678 IP 8.8.8.8.53 > 192.168.1.100.35123: 12345 1/0/0 A 142.250.80.46 (44)
# query ID = 12345, answers/authority/additional = 1/0/0, answer = 142.250.80.46

# RTT = response timestamp - query timestamp for the same query ID/client port
# RTT = 10:15:32.145678 - 10:15:32.123456 = 22ms
```

## Capture Specific Query Types

```bash
# Capture DNS queries (not responses) for IPv4 UDP DNS
# DNS starts after the 8-byte UDP header; udp[10] is the DNS flags byte with the QR bit
sudo tcpdump -nn 'ip and udp port 53 and udp[10] & 0x80 = 0'
# "udp[10] & 0x80 = 0" means query (QR bit = 0), not response

# More readable approach: capture all DNS and grep for types
sudo tcpdump -nn -l 'udp port 53' 2>/dev/null | grep -E ' (A|AAAA|MX|PTR|CNAME)\? '
```

## Diagnose DNS Resolution Failures

```bash
# Capture to see if DNS queries are being sent
sudo tcpdump -nn 'udp port 53'

# If you see queries but no responses:
# -> DNS server may be unreachable or responses may be blocked (check firewall/routing)

# If you see NXDomain in responses:
# -> Domain doesn't exist or wrong resolver

# Check response codes
sudo tcpdump -nn -l 'udp port 53' | grep -Ei '(NXDOMAIN|SERVFAIL|REFUSED)'
```

## Monitor Which Domains an Application Resolves

```bash
# Capture DNS queries from a specific source IP
sudo tcpdump -nn -v 'src 192.168.1.50 and udp port 53'

# Find all unique domains being queried
sudo tcpdump -nn -l 'udp port 53' 2>/dev/null | \
  awk '{for (i=1; i<NF; i++) if ($i ~ /\?$/) print $(i+1)}' | sort -u

# Find the most queried domains
sudo tcpdump -nn -c 500 'udp port 53' 2>/dev/null | \
  awk '{for (i=1; i<NF; i++) if ($i ~ /\?$/) print $(i+1)}' | \
  sort | uniq -c | sort -rn | head -20
```

## Save DNS Capture for Audit

```bash
# Capture 10 minutes of DNS activity
sudo timeout 600 tcpdump -nn -i eth0 -w /tmp/dns-audit.pcap 'port 53'

# Analyze: find all queried domains
sudo tcpdump -nn -r /tmp/dns-audit.pcap 'udp port 53' | \
  awk '{for (i=1; i<NF; i++) if ($i ~ /\?$/) print $(i+1)}' | sort -u

# Find DNS queries that got no response (timeouts)
sudo tcpdump -nn -r /tmp/dns-audit.pcap 'udp port 53' | \
  awk '
    function clean_addr(a) { sub(/:$/, "", a); return a }
    function clean_id(i) { sub(/[^0-9].*$/, "", i); return i }
    $7 ~ /\?$/ || $8 ~ /\?$/ {
        src=$3; dst=clean_addr($5); id=clean_id($6)
        q[src "|" dst "|" id]=$0
        next
    }
    $6 ~ /^[0-9]+$/ {
        src=$3; dst=clean_addr($5); id=$6
        delete q[dst "|" src "|" id]
    }
    END {for (k in q) print q[k]}
  '
```

## Check DNS Response Time Distribution

```bash
#!/bin/bash
# dns-latency.sh - Measure DNS resolution times

echo "Measuring DNS latency to 8.8.8.8..."

for i in $(seq 1 5); do
    # Query a specific resolver directly; the resolver may answer from cache.
    RTT=$(dig @8.8.8.8 google.com +tries=1 +time=2 +stats 2>/dev/null | awk '/Query time:/ {print $4}')
    if [ -n "$RTT" ]; then
        echo "Query $i: ${RTT}ms"
    else
        echo "Query $i: timeout"
    fi
done
```

Capturing DNS traffic with tcpdump is a direct way to debug resolution problems: if you can see queries going out and responses coming back, the path to the resolver is working, and the response code tells you whether resolution succeeded. If you see queries but no responses, focus on resolver reachability, routing, or filtering.
