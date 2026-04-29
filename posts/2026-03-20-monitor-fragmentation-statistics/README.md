# How to Monitor Fragmentation Statistics on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Fragmentation, Monitoring, Linux, Statistics, Networking

Description: Monitor IPv4 fragmentation statistics using kernel counters, nstat, and /proc/net/snmp to detect fragmentation in production and track reassembly failures.

## Introduction

Linux kernel maintains detailed counters for all fragmentation and reassembly operations. These counters reveal whether your host is fragmenting packets (sending too-large datagrams) or receiving fragments (upstream is fragmenting toward you), and whether reassembly is succeeding. Monitoring these counters in production enables early detection of MTU misconfiguration and fragmentation-induced packet loss.

## Key Fragmentation Counters

```bash
# View all IP fragmentation and reassembly counters:
nstat -az | grep -iE "frag|reasm"

# Or pair keys/values directly from /proc/net/snmp:
awk '/^Ip:/{if(!h){h=$0;next} n=split(h,k); split($0,v); for(i=2;i<=n;i++) if(k[i]~/Frag|Reasm/) print k[i]"="v[i]}' /proc/net/snmp

# Primary counters:
# IpFragCreates:  Fragments created by this host (we're sending too-large packets)
# IpFragOKs:      Successful fragmentations
# IpFragFails:    Fragmentation failures (DF bit set, can't fragment)

# IpReasmReqds:   Fragments received that need reassembly
# IpReasmOKs:     Successful reassemblies (good)
# IpReasmFails:   Failed reassemblies (fragments lost or timeout)
# IpReasmTimeout: Fragments that expired before complete arrival
```

## Real-Time Monitoring

```bash
# Watch fragmentation stats in real time:
watch -n 2 "nstat -z | grep -E 'IpFrag|IpReasm'"

# Monitor with rate of change (per-interval deltas):
# Default nstat uses a per-user history file, so each invocation
# prints the change since the previous call:
nstat | grep -E "IpFrag|IpReasm"
# Run every 10 seconds to get per-10-second rates:
while true; do
    echo "$(date +%H:%M:%S): $(nstat | awk '/IpFrag|IpReasm/{printf "%s=%s ", $1, $2}')"
    sleep 10
done

# Alert on reassembly failures (uses absolute counters with -az):
#!/bin/bash
PREV_FAIL=0
while true; do
    FAIL=$(nstat -az 2>/dev/null | awk '/IpReasmFails/{print $2+0}')
    if [ "$FAIL" -gt "$PREV_FAIL" ]; then
        echo "ALERT: IpReasmFails increased to $FAIL (was $PREV_FAIL)"
    fi
    PREV_FAIL=$FAIL
    sleep 30
done
```

## Parse /proc/net/snmp

```bash
# /proc/net/snmp has raw counter values:
cat /proc/net/snmp

# Parse IP fragmentation stats:
python3 << 'EOF'
with open('/proc/net/snmp') as f:
    content = f.read()

lines = content.strip().split('\n')
ip_keys = []
ip_vals = []

for i, line in enumerate(lines):
    if line.startswith('Ip:') and not ip_keys:
        ip_keys = line.split()[1:]
    elif line.startswith('Ip:') and ip_keys:
        ip_vals = [int(x) for x in line.split()[1:]]

if ip_keys and ip_vals:
    ip = dict(zip(ip_keys, ip_vals))
    frag_stats = {k: v for k, v in ip.items() if 'frag' in k.lower() or 'reasm' in k.lower()}
    for k, v in sorted(frag_stats.items()):
        print(f"  {k}: {v}")
EOF
```

## Prometheus/Alerting Integration

```bash
# Export fragmentation metrics to Prometheus:
cat > /usr/local/bin/frag_exporter.sh << 'SCRIPT'
#!/bin/bash
# Simple Prometheus text format exporter

FAIL=$(nstat -az 2>/dev/null | awk '/IpReasmFails/{print $2+0}')
OK=$(nstat -az 2>/dev/null | awk '/IpReasmOKs/{print $2+0}')
CREATES=$(nstat -az 2>/dev/null | awk '/IpFragCreates/{print $2+0}')
REASM=$(nstat -az 2>/dev/null | awk '/IpReasmReqds/{print $2+0}')

echo "# HELP ip_reasm_fails IPv4 reassembly failures"
echo "# TYPE ip_reasm_fails counter"
echo "ip_reasm_fails $FAIL"

echo "# HELP ip_reasm_oks IPv4 successful reassemblies"
echo "# TYPE ip_reasm_oks counter"
echo "ip_reasm_oks $OK"

echo "# HELP ip_frag_creates IPv4 fragments created (this host fragmenting)"
echo "# TYPE ip_frag_creates counter"
echo "ip_frag_creates $CREATES"

echo "# HELP ip_reasm_reqds IPv4 fragments received requiring reassembly"
echo "# TYPE ip_reasm_reqds counter"
echo "ip_reasm_reqds $REASM"
SCRIPT
chmod +x /usr/local/bin/frag_exporter.sh
```

## Interpret the Counters

```nginx
Counter Interpretation:

IpFragCreates > 0:
  This host is creating fragments (UDP sends > path MTU)
  Action: Reduce UDP payload size or check interface MTU

IpFragFails > 0:
  This host tried to fragment a packet with DF bit set
  This generates ICMP Fragmentation Needed back to sender
  Expected behavior: sender will reduce packet size

IpReasmReqds > 0:
  This host is receiving fragmented packets
  Can be normal if upstream is sending large UDP

IpReasmFails > 0:
  Fragments arrived but reassembly failed (timeout or missing fragment)
  This means PACKET LOSS is occurring due to fragmentation
  Action: Investigate why fragmentation is occurring and fix MTU

IpReasmFails / (IpReasmFails + IpReasmOKs) = reassembly failure rate
  > 1%: significant fragmentation-induced packet loss
  > 5%: severe problem requiring immediate attention
```

## Conclusion

Monitor `IpReasmFails` as your primary fragmentation health metric. Any non-zero value means packets are being lost due to incomplete fragment reassembly. `IpFragCreates` indicates your host is fragmenting packets - check which applications are sending oversized UDP or using interfaces with wrong MTU. Set up alerts when `IpReasmFails` increases. The `nstat -d` tool provides per-interval deltas which are more useful than absolute counters for detecting new fragmentation events.
