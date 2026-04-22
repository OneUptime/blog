# How to Use SNMP to Monitor Interface Bandwidth Utilization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, Bandwidth Monitoring, Interface Utilization, Python, Network Management

Description: Learn how to use SNMP to poll interface counters and calculate real-time bandwidth utilization on network devices, including a Python script for continuous monitoring.

## SNMP OIDs for Interface Monitoring

The IF-MIB provides counters for interface statistics:

| OID | Name | Description |
|---|---|---|
| `1.3.6.1.2.1.2.2.1.2.N` | ifDescr | Interface name |
| `1.3.6.1.2.1.2.2.1.5.N` | ifSpeed | Interface speed (bits/sec; capped at 4,294,967,295) |
| `1.3.6.1.2.1.2.2.1.8.N` | ifOperStatus | 1=up, 2=down, etc. |
| `1.3.6.1.2.1.2.2.1.10.N` | ifInOctets | Inbound bytes (32-bit) |
| `1.3.6.1.2.1.2.2.1.16.N` | ifOutOctets | Outbound bytes (32-bit) |
| `1.3.6.1.2.1.31.1.1.1.6.N` | ifHCInOctets | Inbound bytes (64-bit, for high-speed interfaces) |
| `1.3.6.1.2.1.31.1.1.1.10.N` | ifHCOutOctets | Outbound bytes (64-bit) |
| `1.3.6.1.2.1.31.1.1.1.15.N` | ifHighSpeed | Interface speed in Mbps for high-speed interfaces |

**Use 64-bit counters (ifHCInOctets/ifHCOutOctets)** for high-speed interfaces to avoid counter wrap-around. IF-MIB requires high-capacity octet counters for compliant interfaces faster than 20 Mbps.

## Step 1: Discover Interface Indices

First, map interface names to their SNMP indices:

```bash
# Walk all interface descriptions to find index numbers

snmpwalk -v2c -c public 192.168.1.1 ifDescr

# Output:
# IF-MIB::ifDescr.1 = STRING: GigabitEthernet0/0
# IF-MIB::ifDescr.2 = STRING: GigabitEthernet0/1
# IF-MIB::ifDescr.3 = STRING: Loopback0

# GigabitEthernet0/0 = index 1
```

## Step 2: Poll Interface Counters Manually

```bash
# Get current byte counters for interface index 1 (GigE0/0)
snmpget -v2c -c public 192.168.1.1 \
  ifHCInOctets.1 \
  ifHCOutOctets.1 \
  ifSpeed.1 \
  ifHighSpeed.1

# Wait 60 seconds, then poll again
# Calculate: (bytes2 - bytes1) * 8 / 60 = bits/second
```

## Step 3: Python Script for Continuous Bandwidth Monitoring

```python
#!/usr/bin/env python3
"""
snmp_bandwidth.py - Monitor interface bandwidth via SNMP
Requires: Python 3.10+ and pip install pysnmp
"""
import asyncio
import time
from pysnmp.hlapi.v1arch.asyncio import (
    CommunityData,
    ObjectIdentity,
    ObjectType,
    SnmpDispatcher,
    UdpTransportTarget,
    get_cmd,
)

# Configuration
ROUTER_IP = '192.168.1.1'
COMMUNITY = 'public'
INTERFACE_INDEX = 1       # Interface index (from ifDescr discovery)
POLL_INTERVAL = 60        # Seconds between measurements
INTERFACE_SPEED = 1000000000  # 1 Gbps in bits
COUNTER_MODULUS = 2 ** 64

async def get_snmp_counter(dispatcher, target, community, oid):
    """Poll a single SNMP OID and return its integer value."""
    error_indication, error_status, error_index, var_binds = await get_cmd(
        dispatcher,
        CommunityData(community, mpModel=1),  # mpModel=1 = SNMPv2c
        target,
        ObjectType(ObjectIdentity(oid))
    )
    if error_indication:
        raise Exception(f"SNMP error: {error_indication}")
    if error_status:
        raise Exception(f"SNMP error: {error_status.prettyPrint()} at {error_index}")
    return int(var_binds[0][1])

def counter_delta(current, previous):
    """Return a positive delta for a 64-bit wrapping counter."""
    return (current - previous) % COUNTER_MODULUS

# OIDs for 64-bit counters
in_oid  = f'1.3.6.1.2.1.31.1.1.1.6.{INTERFACE_INDEX}'
out_oid = f'1.3.6.1.2.1.31.1.1.1.10.{INTERFACE_INDEX}'

async def main():
    dispatcher = SnmpDispatcher()
    target = await UdpTransportTarget.create((ROUTER_IP, 161))

    print(f"Monitoring interface index {INTERFACE_INDEX} on {ROUTER_IP}")
    print(f"Poll interval: {POLL_INTERVAL}s\n")

    # Initial poll
    prev_in  = await get_snmp_counter(dispatcher, target, COMMUNITY, in_oid)
    prev_out = await get_snmp_counter(dispatcher, target, COMMUNITY, out_oid)

    while True:
        await asyncio.sleep(POLL_INTERVAL)

        curr_in  = await get_snmp_counter(dispatcher, target, COMMUNITY, in_oid)
        curr_out = await get_snmp_counter(dispatcher, target, COMMUNITY, out_oid)

        # Calculate bits per second (handle counter wrap for 64-bit counters)
        in_bps  = (counter_delta(curr_in, prev_in) * 8) / POLL_INTERVAL
        out_bps = (counter_delta(curr_out, prev_out) * 8) / POLL_INTERVAL

        # Calculate utilization percentages
        in_util  = (in_bps / INTERFACE_SPEED) * 100
        out_util = (out_bps / INTERFACE_SPEED) * 100

        print(f"{time.strftime('%H:%M:%S')} | "
              f"IN: {in_bps/1000000:.2f} Mbps ({in_util:.1f}%) | "
              f"OUT: {out_bps/1000000:.2f} Mbps ({out_util:.1f}%)")

        prev_in  = curr_in
        prev_out = curr_out

if __name__ == '__main__':
    asyncio.run(main())
```

## Step 4: Run the Script

```bash
pip install pysnmp
python3 snmp_bandwidth.py

# Output:
# 14:30:00 | IN: 45.23 Mbps (4.5%) | OUT: 12.80 Mbps (1.3%)
# 14:31:00 | IN: 52.10 Mbps (5.2%) | OUT: 15.40 Mbps (1.5%)
```

## Step 5: Store Results in a Time Series Database

Extend the script to write to InfluxDB for Grafana visualization:

```python
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

client = InfluxDBClient(url="http://localhost:8086",
                        token="your-token",
                        org="your-org")
write_api = client.write_api(write_options=SYNCHRONOUS)

# In the loop, add:
point = (Point("interface_bandwidth")
         .tag("device", ROUTER_IP)
         .tag("interface", f"index_{INTERFACE_INDEX}")
         .field("in_bps", in_bps)
         .field("out_bps", out_bps)
         .field("in_utilization", in_util)
         .field("out_utilization", out_util))
write_api.write(bucket="network", record=point)
```

## Conclusion

SNMP interface bandwidth monitoring works by polling 64-bit octet counters (ifHCInOctets/ifHCOutOctets) at regular intervals and calculating the delta. Use Python with pysnmp for custom monitoring scripts, store results in InfluxDB for Grafana visualization, or use a purpose-built NMS like Zabbix or LibreNMS that handles counter polling and graphing automatically.
