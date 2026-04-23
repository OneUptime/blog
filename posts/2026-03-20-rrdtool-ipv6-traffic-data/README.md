# How to Configure RRDtool for IPv6 Traffic Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RRDtool, IPv6, Traffic Data, SNMP, Network Monitoring, Round-Robin Database

Description: Use RRDtool to collect, store, and graph IPv6 traffic data from network devices via SNMP, creating time-series databases for IPv6 interface statistics.

---

RRDtool (Round-Robin Database tool) provides time-series storage and graphing. Building custom IPv6 monitoring with RRDtool involves collecting SNMP data from IPv6 devices and storing it in RRD databases for graphing.

## Installing RRDtool

```bash
# Ubuntu/Debian

sudo apt install rrdtool librrds-perl snmp -y

# Verify installation
rrdtool --version

# Python bindings
sudo apt install python3-rrdtool -y
# Or: pip install rrdtool
```

## Creating RRD Database for IPv6 Traffic

```bash
# Create RRD for IPv6 interface traffic
# Store IPv6 octet/datagram counter rates, with 5-min intervals
sudo mkdir -p /var/lib/rrd
sudo rrdtool create /var/lib/rrd/ipv6_eth0.rrd \
  --step 300 \
  DS:in_octets:COUNTER:600:0:U \
  DS:out_octets:COUNTER:600:0:U \
  DS:in_datagrams:COUNTER:600:0:U \
  DS:out_datagrams:COUNTER:600:0:U \
  RRA:AVERAGE:0.5:1:576 \
  RRA:AVERAGE:0.5:12:336 \
  RRA:AVERAGE:0.5:288:365 \
  RRA:MAX:0.5:1:576

# Verify RRD creation
sudo rrdtool info /var/lib/rrd/ipv6_eth0.rrd
```

## Collecting IPv6 Traffic Data via SNMP

```bash
#!/bin/bash
# /usr/local/bin/collect_ipv6_traffic.sh

DEVICE="2001:db8::1"
COMMUNITY="public"
RRD="/var/lib/rrd/ipv6_eth0.rrd"
IF_INDEX=2  # Interface index for eth0
IP_VERSION=2  # IP-MIB InetVersion value for IPv6

# Get IPv6 64-bit counters from IP-MIB::ipIfStatsTable
IN_OCTETS=$(snmpget -v2c -Oqv -c "$COMMUNITY" \
  "udp6:[${DEVICE}]:161" \
  ".1.3.6.1.2.1.4.31.3.1.6.${IP_VERSION}.${IF_INDEX}" 2>/dev/null)

OUT_OCTETS=$(snmpget -v2c -Oqv -c "$COMMUNITY" \
  "udp6:[${DEVICE}]:161" \
  ".1.3.6.1.2.1.4.31.3.1.33.${IP_VERSION}.${IF_INDEX}" 2>/dev/null)

IN_DATAGRAMS=$(snmpget -v2c -Oqv -c "$COMMUNITY" \
  "udp6:[${DEVICE}]:161" \
  ".1.3.6.1.2.1.4.31.3.1.4.${IP_VERSION}.${IF_INDEX}" 2>/dev/null)

OUT_DATAGRAMS=$(snmpget -v2c -Oqv -c "$COMMUNITY" \
  "udp6:[${DEVICE}]:161" \
  ".1.3.6.1.2.1.4.31.3.1.31.${IP_VERSION}.${IF_INDEX}" 2>/dev/null)

# Update RRD
if [[ "$IN_OCTETS" =~ ^[0-9]+$ && "$OUT_OCTETS" =~ ^[0-9]+$ && \
      "$IN_DATAGRAMS" =~ ^[0-9]+$ && "$OUT_DATAGRAMS" =~ ^[0-9]+$ ]]; then
  rrdtool update "$RRD" \
    "N:${IN_OCTETS}:${OUT_OCTETS}:${IN_DATAGRAMS}:${OUT_DATAGRAMS}"
  echo "$(date): Updated RRD: in=${IN_OCTETS} out=${OUT_OCTETS}"
else
  echo "$(date): ERROR - Could not reach ${DEVICE} via SNMP"
fi
```

```bash
# Make executable and schedule
sudo chmod +x /usr/local/bin/collect_ipv6_traffic.sh

# Add to crontab (every 5 minutes)
(sudo crontab -u root -l 2>/dev/null; \
  echo "*/5 * * * * /usr/local/bin/collect_ipv6_traffic.sh >> /var/log/ipv6_collect.log 2>&1") \
  | sudo crontab -u root -
```

## Generating Graphs from IPv6 RRD Data

```bash
#!/bin/bash
# /usr/local/bin/graph_ipv6_traffic.sh

RRD="/var/lib/rrd/ipv6_eth0.rrd"
GRAPH_DIR="/var/www/html/rrd"
mkdir -p "$GRAPH_DIR"

# Daily graph
rrdtool graph "${GRAPH_DIR}/ipv6_daily.png" \
  --title "IPv6 Traffic - Daily" \
  --start "now-1d" \
  --end "now" \
  --vertical-label "bits/s" \
  --width 800 \
  --height 300 \
  DEF:in_octets=${RRD}:in_octets:AVERAGE \
  DEF:out_octets=${RRD}:out_octets:AVERAGE \
  CDEF:in_bits=in_octets,8,* \
  CDEF:out_bits=out_octets,8,* \
  VDEF:in_last=in_bits,LAST \
  VDEF:out_last=out_bits,LAST \
  AREA:in_bits#00CF00:"In  " \
  LINE1:out_bits#0000CF:"Out" \
  GPRINT:in_last:" Last\: %6.2lf %sbps\n" \
  GPRINT:out_last:" Last\: %6.2lf %sbps\n"

echo "Graph saved to ${GRAPH_DIR}/ipv6_daily.png"
```

## Python-Based IPv6 RRD Collection

```python
#!/usr/bin/env python3
# collect_ipv6_rrd.py

import subprocess
import rrdtool
from datetime import datetime

def snmp_get_ipv6(host, community, oid):
    """Get SNMP value from IPv6 device."""
    cmd = ['snmpget', '-v2c', '-Oqv', '-c', community,
           f'udp6:[{host}]:161', oid]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.split()[-1]
    return None

# Collect data
device = '2001:db8::1'
ip_version = 2
if_index = 2
in_octets = snmp_get_ipv6(
    device, 'public', f'.1.3.6.1.2.1.4.31.3.1.6.{ip_version}.{if_index}')
out_octets = snmp_get_ipv6(
    device, 'public', f'.1.3.6.1.2.1.4.31.3.1.33.{ip_version}.{if_index}')
in_datagrams = snmp_get_ipv6(
    device, 'public', f'.1.3.6.1.2.1.4.31.3.1.4.{ip_version}.{if_index}')
out_datagrams = snmp_get_ipv6(
    device, 'public', f'.1.3.6.1.2.1.4.31.3.1.31.{ip_version}.{if_index}')

if all(value and value.isdigit()
       for value in (in_octets, out_octets, in_datagrams, out_datagrams)):
    rrdtool.update('/var/lib/rrd/ipv6_eth0.rrd',
                   f'N:{in_octets}:{out_octets}:{in_datagrams}:{out_datagrams}')
    print(f"Updated at {datetime.now()}")
```

RRDtool with IPv6 SNMP collection requires specifying the device address in `udp6:[address]:161` format for snmpget commands and using IP-MIB entries indexed by `ipv6(2)` when you want IPv6-only interface statistics; the RRD database structure and graphing commands are otherwise the same as IPv4 deployments.
