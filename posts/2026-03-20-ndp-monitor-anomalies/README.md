# How to Monitor NDP Anomalies on IPv6 Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP Monitoring, IPv6 Security, Network Monitoring, Anomaly Detection, NDP Security

Description: Monitor IPv6 Neighbor Discovery Protocol traffic for anomalies including rogue RAs, NA spoofing, and NDP exhaustion using tcpdump, NDPMon, and custom detection scripts.

## Introduction

Continuous monitoring of NDP traffic is essential for detecting IPv6 first-hop attacks before they cause outages. NDP anomalies include rogue Router Advertisements, Neighbor Advertisement spoofing, DAD conflicts, NDP flooding, and unexpected changes to neighbor cache entries. This guide covers tools and techniques for ongoing NDP monitoring in production environments.

## Key NDP Metrics to Monitor

```text
NDP Anomaly Indicators:

1. RA Rate (should be ~1 per 200 seconds per router):
   Alert if: More than 5 RAs/sec from any source
   Indicates: RA flooding attack

2. RA Source Address:
   Alert if: RA from address not in known-router list
   Indicates: Rogue RA from a host

3. NA Rate (should be low, proportional to traffic):
   Alert if: More than 100 NAs/sec from one source
   Indicates: NA flooding or spoofing

4. NA Override from unexpected source:
   Alert if: Unsolicited NA with Override=1 from non-router
   Indicates: Neighbor cache poisoning attempt

5. DAD Failures:
   Alert if: NS with unspecified source answered by NA
   Indicates: DAD conflict (address collision or DAD DoS)

6. Neighbor Cache Size:
   Alert if: Cache size > 80% of gc_thresh3
   Indicates: NDP exhaustion attack in progress

7. MAC Address Changes:
   Alert if: Same IPv6 address maps to different MAC within 60s
   Indicates: Possible NA spoofing / address migration
```

## Monitoring with tcpdump and Shell Scripts

```bash
#!/bin/bash
# NDP Anomaly Monitor

# Run as: sudo bash ndp-monitor.sh eth0

IFACE=${1:-eth0}
KNOWN_ROUTERS="fe80::1 fe80::2"
RA_THRESHOLD=5     # Alert if more than 5 RAs/sec
NA_THRESHOLD=100   # Alert if more than 100 NAs/sec

echo "Monitoring NDP on $IFACE..."
echo "Known routers: $KNOWN_ROUTERS"

# Monitor RA sources
sudo tcpdump -i $IFACE -l -n "icmp6 and ip6[40] == 134" 2>/dev/null | \
while read line; do
    SRC=$(echo "$line" | grep -oP 'fe80::[a-f0-9:]+(?= >)')
    if [ -n "$SRC" ]; then
        if ! echo "$KNOWN_ROUTERS" | grep -q "$SRC"; then
            echo "[$(date)] ALERT: Rogue RA from $SRC"
        fi
    fi
done &

# Monitor NA rate
sudo tcpdump -i $IFACE -l -n "icmp6 and ip6[40] == 136" 2>/dev/null | \
awk -v threshold=$NA_THRESHOLD '
BEGIN { t = systime(); count = 0 }
{
    count++
    now = systime()
    if (now > t) {
        if (count > threshold) {
            print "[" strftime("%H:%M:%S") "] ALERT: NA rate " count "/sec"
        }
        count = 0
        t = now
    }
}'
```

## NDPMon: Dedicated NDP Monitoring Daemon

NDPMon provides comprehensive NDP traffic analysis with alerting.

```bash
# Install NDPMon
sudo apt-get install ndpmon   # Debian/Ubuntu
# or build from source: https://ndpmon.sourceforge.net/

# Configure NDPMon (/etc/ndpmon/config_ndpmon.xml)
# Specify known routers, expected prefixes, and alert thresholds.
# See ndpmon's sample config for the full schema.

# Key NDPMon configuration (excerpt from config_ndpmon.xml):
# <config_ndpmon>
#   <routers>
#     <router>
#       <mac>00:11:22:33:44:55</mac>
#       <lla>fe80::1</lla>
#       <param name="router_lifetime" value="1800"/>
#       <prefixes>
#         <prefix>
#           <address>2001:db8::</address>
#           <mask>64</mask>
#           <param name="param_curlft" value="2592000"/>
#         </prefix>
#       </prefixes>
#     </router>
#   </routers>
# </config_ndpmon>

# Start NDPMon
sudo ndpmon

# NDPMon alerts on:
# - New router seen (not in config)
# - Known router changed (different MAC or prefix)
# - NA spoofing (address claimed by unexpected MAC)
# - DAD conflict (NS for your address)
# - Suspicious RA parameters change
```

## Wireshark Statistics for NDP

Use Wireshark's statistics features for traffic analysis.

```text
Wireshark NDP Monitoring:

Capture Filter (BPF/libpcap syntax, for live capture):
  icmp6 and (ip6[40] == 133 or ip6[40] == 134 or
             ip6[40] == 135 or ip6[40] == 136 or
             ip6[40] == 137)

Display Filter (Wireshark dfilter syntax, for analysis):
  icmp6.type == 133 or icmp6.type == 134 or
  icmp6.type == 135 or icmp6.type == 136 or
  icmp6.type == 137

Display Filter for Rogue RAs:
  icmp6.type == 134 and not ipv6.src == fe80::1

Display Filter for High NA Rate:
  icmp6.type == 136

Statistics → Conversations → IPv6:
  Sort by packets to find hosts sending most NAs

Statistics → IO Graph:
  Plot icmp6.type==134 (RA) rate over time
  Plot icmp6.type==136 (NA) rate over time

Expert Info (Analyze → Expert Information):
  Shows sequence errors, duplicate addresses, warnings
  Look for: "Duplicate address detected (DAD)"
            "Router advertisement from unexpected source"
```

## Linux Kernel Neighbor Cache Monitoring

```bash
# Monitor neighbor cache size (track for growth indicating exhaustion)
watch -n 5 'ip -6 neigh show | wc -l'

# Show FAILED entries (exhaustion/attack indicators)
ip -6 neigh show | grep FAILED | wc -l
# High FAILED count = NDP exhaustion attack or network issue

# Monitor neighbor cache statistics (values printed in hex)
cat /proc/net/stat/ndisc_cache
# Columns: entries, allocs, destroys, hash_grows, lookups, hits,
#          res_failed, rcv_probes_mcast, rcv_probes_ucast,
#          periodic_gc_runs, forced_gc_runs, unresolved_discards,
#          table_fulls (one row per CPU)

# Check for rapid changes (poll every 10 seconds)
while true; do
    echo "$(date): $(ip -6 neigh show | wc -l) neighbor cache entries"
    echo "  FAILED: $(ip -6 neigh show | grep -c FAILED)"
    echo "  INCOMPLETE: $(ip -6 neigh show | grep -c INCOMPLETE)"
    sleep 10
done

# High INCOMPLETE count = NDP exhaustion attack in progress
# (Many unresolved NS, waiting for NA that never comes)
```

## SNMP/IPFIX-Based Monitoring

```bash
For enterprise monitoring systems (SNMP/IPFIX):

SNMP OIDs for IPv6 NDP (per RFC 2466 IPV6-ICMP-MIB,
appended with ifIndex to identify a specific interface):
  ipv6IfIcmpInMsgs:           1.3.6.1.2.1.56.1.1.1.1  (incoming ICMPv6)
  ipv6IfIcmpOutMsgs:          1.3.6.1.2.1.56.1.1.1.18 (outgoing ICMPv6)
  ipv6IfIcmpInRouterAdvertisements: 1.3.6.1.2.1.56.1.1.1.11 (RA count)
  ipv6IfIcmpInNeighborAdvertisements: 1.3.6.1.2.1.56.1.1.1.13

Alerting thresholds:
  ipv6IfIcmpInRouterAdvertisements: > 5/min = ALERT
  ipv6IfIcmpInNeighborAdvertisements: > 500/min = ALERT

IPFIX/NetFlow:
  Export IPv6 flows, filter on proto=58 (ICMPv6)
  Analyze in flow collector (ELK, Grafana, ntopng)
  Create dashboards for ICMPv6 type distribution

Cisco SNMP example:
  snmp-server enable traps ipv6 nd raguard   ← RA Guard traps
  snmp-server trap-source Loopback0
```

## Conclusion

NDP anomaly monitoring requires tracking RA and NA rates, source addresses, and neighbor cache statistics. Tools range from simple tcpdump shell scripts to dedicated NDPMon daemons and SNMP-based monitoring. Key indicators are rogue RA sources (not in known-router list), excessive NA rates indicating flooding, high INCOMPLETE neighbor cache entries indicating exhaustion attacks, and unexpected MAC address changes for known IPv6 addresses. Continuous monitoring complements static defenses like RA Guard and ND Inspection.
