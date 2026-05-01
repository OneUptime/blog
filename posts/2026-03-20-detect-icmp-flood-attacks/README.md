# How to Detect ICMP Flood (Ping Flood) Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, DDoS, Security, Networking, iptables, Linux

Description: Detect and identify ICMP flood attacks using packet capture analysis, rate counters, and monitoring tools, then apply mitigations to protect your systems.

## Introduction

An ICMP flood (or ping flood) is a denial-of-service attack where an attacker sends a large volume of ICMP Echo Requests to a target, overwhelming its network interface or CPU. Modern systems can handle thousands of pings per second, so attacks usually come from botnets generating millions of packets per second. Detection is the first step to mitigation.

## Detecting an ICMP Flood

```bash
# Check incoming packet counters on an interface

watch -n 1 "ip -s link show dev eth0 | grep -A1 'RX:'"

# More detailed: estimate ICMP echo-request rate with tcpdump
tcpdump -i eth0 -n -l 'icmp[0]=8' 2>/dev/null | \
  awk 'BEGIN{t=systime()} {count++; now=systime(); if (now>t) {print count " ICMP echo requests/sec"; count=0; t=now}}'

# Use iftop to see top talkers by IP
apt install iftop
iftop -i eth0 -f 'icmp' -n
```

## Identifying the Source

```bash
# Capture ICMP and show top source IPs (last 1000 packets)
tcpdump -i eth0 -n 'icmp[0]=8' -c 1000 | \
  awk '{print $3}' | sort | uniq -c | sort -rn | head -20

# In a flood, you'll see either:
# - One IP dominating (simple attack)
# - Thousands of IPs (distributed attack or spoofed-source traffic)

# Check whether your host is sending Echo Replies to spoofed requests
tcpdump -i eth0 -Q out -n 'icmp[0]=0' -c 20
# A sustained outbound stream of Echo Replies can mean your host is reflecting spoofed Echo Requests.
```

## Monitoring with /proc and nstat

```bash
# Check ICMP statistics (cumulative counters, not rates)
grep '^Icmp:' /proc/net/snmp

# Watch ICMP counters in real time
watch -n 1 "grep '^Icmp:' /proc/net/snmp"
# Look for a rapidly increasing InEchos counter

# Or use nstat
nstat -a | grep '^Icmp'
watch -n 1 "nstat -az IcmpInEchos IcmpOutEchoReps"
```

## Setting Up Alerts

```bash
#!/bin/bash
# Monitor ICMP flood and alert if rate exceeds threshold
THRESHOLD=1000  # echo requests per second

get_in_echos() {
    awk '
        /^Icmp:/ {
            if (!header_seen) {
                for (i = 1; i <= NF; i++) {
                    if ($i == "InEchos") {
                        col = i
                        break
                    }
                }
                header_seen = 1
                next
            }

            if (col) {
                print $col
                exit
            }
        }
    ' /proc/net/snmp
}

while true; do
    BEFORE=$(get_in_echos)
    sleep 1
    AFTER=$(get_in_echos)
    RATE=$((AFTER - BEFORE))

    if [ "$RATE" -gt "$THRESHOLD" ]; then
        echo "$(date): ICMP FLOOD DETECTED - $RATE pps" | tee -a /var/log/icmp-flood.log
        # Add notification here (email, webhook, etc.)
    fi
done
```

## Immediate Mitigation

```bash
# Block all ICMP echo requests immediately
iptables -I INPUT -p icmp --icmp-type echo-request -j DROP

# More targeted: block from specific source
iptables -I INPUT -s 10.50.0.0/24 -p icmp --icmp-type echo-request -j DROP

# Rate-limit ICMP to 10 pps (prevents floods, allows monitoring)
iptables -I INPUT 1 -p icmp --icmp-type echo-request \
  -m limit --limit 10/second --limit-burst 20 -j ACCEPT
iptables -I INPUT 2 -p icmp --icmp-type echo-request -j DROP
```

## Conclusion

ICMP floods are detectable through packet capture analysis and /proc counters. In a real flood, ICMP packet rates will jump by orders of magnitude above baseline. Immediate host-side mitigation with iptables rate limiting drops excess Echo Requests while preserving legitimate monitoring pings. For distributed attacks, coordinate with your ISP for upstream filtering or use a DDoS scrubbing service.
