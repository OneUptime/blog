# How to Set Up Flow-Based Monitoring on a MikroTik Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, NetFlow, Traffic Flows, Monitoring, IPv4, RouterOS, Network Visibility

Description: Learn how to enable and configure Traffic Flow (NetFlow-compatible) on a MikroTik router to export IPv4 flow data to a collector for bandwidth analysis and network visibility.

---

MikroTik RouterOS includes a built-in Traffic Flow feature compatible with NetFlow v5, v9, and IPFIX. This allows you to export per-flow statistics to an external collector for traffic analysis.

## Enabling Traffic Flow via CLI

```routeros
# Enable Traffic Flow on the router

/ip traffic-flow
set enabled=yes interfaces=all

# Configure the NetFlow collector
/ip traffic-flow target
add dst-address=10.0.0.50 port=2055 version=9
```

## Enabling Traffic Flow via WinBox

```text
IP → Traffic Flow → Enable: ✓
Interfaces: all (or specify individual interfaces)

IP → Traffic Flow → Targets → Add:
  Dst. Address: 10.0.0.50
  Port: 2055
  Version: 9 (recommended; supports IPv6 and custom templates)
```

## Selecting Specific Interfaces

To reduce collector load, export flows only from WAN-facing interfaces:

```routeros
/ip traffic-flow
set enabled=yes interfaces=ether1,ether2

# Verify
/ip traffic-flow print
```

## Flow Cache and Active Timeout Tuning

```routeros
/ip traffic-flow
set cache-entries=64k \
    active-flow-timeout=1m \
    inactive-flow-timeout=15s

# Recommended for high-traffic routers (32k-1M entries)
# active-flow-timeout: how long an active flow is held before export
# inactive-flow-timeout: how long idle before export
```

## Verifying Flow Export

```bash
# On the collector server, use nfdump/nfcapd to receive flows
apt install nfdump -y

# Capture flows from MikroTik (replace with your collector IP)
nfcapd -w -D -l /var/cache/nfcapd -p 2055 -b 10.0.0.50

# View captured flows
nfdump -R /var/cache/nfcapd -s record/bytes -n 20
```

## Using ntopng as the Collector

ntopng does not collect NetFlow directly; it ingests flows from nProbe over ZMQ.

```bash
# Install nProbe (NetFlow collector) and ntopng (visualizer)
apt install nprobe ntopng -y

# Run nProbe to collect NetFlow on UDP 2055 and forward to ntopng via ZMQ
nprobe --zmq "tcp://*:5556" -i none -n none --collector-port 2055 &

# Configure ntopng to receive flows from nProbe over ZMQ
# /etc/ntopng/ntopng.conf
-i=tcp://127.0.0.1:5556
-w=3000
```

Access `http://10.0.0.50:3000` for real-time traffic dashboards.

## Key Takeaways

- MikroTik Traffic Flow supports NetFlow v5, v9, and IPFIX; use v9 for best compatibility.
- Limit flow export to WAN interfaces to reduce collector processing overhead.
- Tune `active-flow-timeout` and `inactive-flow-timeout` based on traffic volume and analysis granularity.
- Use nfdump, ntopng, or Elastiflow as the collector to analyze and visualize exported flows.
