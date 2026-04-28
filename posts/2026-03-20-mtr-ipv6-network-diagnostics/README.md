# How to Use mtr for IPv6 Network Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, mtr, Network Diagnostics, Routing, Packet Loss, Troubleshooting

Description: Use mtr (My Traceroute) for real-time IPv6 network diagnostics that combine traceroute and ping to show packet loss and latency at each hop.

## Introduction

`mtr` combines `traceroute` and `ping` into a single real-time diagnostic tool. It continuously sends packets and updates statistics for each hop, making it superior to single-shot traceroute for identifying intermittent packet loss, jitter, and unstable routes in IPv6 networks.

## Basic IPv6 Usage

```bash
# Force IPv6 with the -6 flag

mtr -6 ipv6.google.com

# Interactive mode (default) - updates every second
mtr -6 2001:4860:4860::8888

# Report mode (non-interactive, outputs summary)
mtr -6 --report 2001:4860:4860::8888

# Report with no DNS lookups (faster)
mtr -6 --report --no-dns 2001:4860:4860::8888
```

## Key mtr Options

```bash
# Run for 100 cycles then print report
mtr -6 --report-cycles 100 --report 2001:4860:4860::8888

# Use UDP instead of ICMP (ICMP is the default; UDP can help when ICMP is blocked)
mtr -6 --udp ipv6.google.com

# Use TCP (requires root, useful for TCP-specific path testing)
sudo mtr -6 --tcp --port 443 ipv6.google.com

# Set interval between packets (seconds)
mtr -6 --interval 0.5 ipv6.google.com

# Set packet size
mtr -6 --psize 1400 ipv6.google.com

# Show BGP AS numbers (requires whois lookup)
mtr -6 --aslookup ipv6.google.com

# Maximum number of hops
mtr -6 --max-ttl 30 ipv6.google.com
```

## Interpreting mtr Output

```text
Start: 2026-03-20T12:00:00+0000
HOST: myhost                      Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 2001:db8::1               0.0%    10    0.4    0.4   0.3   0.5   0.1
  2.|-- 2001:db8:isp::1           0.0%    10    2.1    2.0   1.9   2.2   0.1
  3.|-- ???                      100.0%   10    0.0    0.0   0.0   0.0   0.0
  4.|-- 2607:f8b0::1             0.0%    10   12.4   12.3  12.1  12.6   0.2
  5.|-- 2607:f8b0:4004:c1b::65e  0.0%    10   12.8   12.6  12.4  13.0   0.2
```

Column meanings:
- `Loss%`: Percentage of packets lost at this hop
- `Snt`: Packets sent
- `Last`: Last RTT
- `Avg`: Average RTT
- `Best`: Minimum RTT
- `Wrst`: Maximum RTT
- `StDev`: Standard deviation (jitter)

Interpreting patterns:
- `???` (100% loss at middle hops): Router doesn't send ICMPv6 Time Exceeded - not necessarily a problem
- High loss only at the last hop: Destination firewall
- Loss starting at hop N, continuing: Real packet loss at hop N
- Loss only at one hop: That router rate-limits ICMP responses

## IPv6-Specific mtr Diagnostics

```bash
# Test specific IPv6 source address
sudo mtr -6 --address 2001:db8::10 ipv6.google.com

# Compare paths from different source IPs
echo "=== Path from 2001:db8::10 ==="
sudo mtr -6 --address 2001:db8::10 --report --no-dns --report-cycles 20 \
    2001:4860:4860::8888

echo "=== Path from 2001:db8::11 ==="
sudo mtr -6 --address 2001:db8::11 --report --no-dns --report-cycles 20 \
    2001:4860:4860::8888
```

## Automated Reporting Script

```bash
#!/bin/bash
# ipv6-mtr-report.sh - Automated IPv6 path quality report

TARGETS=(
    "2001:4860:4860::8888"   # Google IPv6 DNS
    "2606:4700:4700::1111"   # Cloudflare IPv6 DNS
    "2620:fe::fe"            # Quad9 DNS
)

for target in "${TARGETS[@]}"; do
    echo "=== mtr to $target ==="
    mtr -6 --report --no-dns --report-cycles 20 "$target" 2>/dev/null | \
        awk 'NR>2 {
            # Highlight hops with packet loss > 5%
            loss = $3
            gsub(/%/, "", loss)
            if (loss+0 > 5)
                printf "⚠ LOSS: %s\n", $0
            else
                print $0
        }'
    echo ""
done
```

## Using mtr JSON Output

```bash
# Output results in JSON for programmatic processing
mtr -6 --report --no-dns --report-cycles 10 --json 2001:4860:4860::8888 2>/dev/null

# Parse with Python
mtr -6 --report --no-dns --report-cycles 5 --json 2001:4860:4860::8888 2>/dev/null | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for hop in data['report']['hubs']:
    loss = hop.get('Loss%', 0)
    print(f\"Hop {hop['count']}: {hop['host']} - Loss: {loss}%  Avg: {hop.get('Avg', 'N/A')}ms\")
"
```

## Comparing IPv4 vs IPv6 Path Quality

```bash
echo "=== IPv6 path quality to Google ==="
mtr -6 --report --no-dns --report-cycles 20 ipv6.google.com 2>/dev/null | tail -5

echo "=== IPv4 path quality to Google ==="
mtr -4 --report --no-dns --report-cycles 20 google.com 2>/dev/null | tail -5
```

## Conclusion

`mtr -6` provides real-time IPv6 network quality metrics that single-shot traceroute cannot match. Use `--report` for scripted output, `--udp` or `--tcp` when ICMP is filtered, and `--aslookup` to see autonomous system numbers for each hop. Focus on sustained packet loss (not single hops showing 100% which is normal for routers that rate-limit ICMP) and high jitter as indicators of network problems.
