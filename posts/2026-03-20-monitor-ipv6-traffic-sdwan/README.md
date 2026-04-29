# How to Monitor IPv6 Traffic in SD-WAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SD-WAN, Monitoring, NetFlow, IPFIX, Prometheus, Traffic Analysis

Description: Monitor IPv6 traffic flows in SD-WAN networks using NetFlow v9/IPFIX, flow collectors, Prometheus metrics, and SD-WAN vendor dashboards to gain visibility into IPv6 traffic patterns.

---

Monitoring IPv6 in SD-WAN requires flow telemetry (IPFIX/NetFlow v9 with IPv6 extensions), path quality metrics per IPv6 flow, and integration with monitoring platforms. Modern SD-WAN platforms export IPv6 flow data natively, but proper collection infrastructure is needed.

## IPFIX IPv6 Flow Collection

```bash
# Configure nProbe for IPv6 flow collection

# nProbe is a NetFlow/IPFIX probe for Linux

# Install nProbe
apt install nprobe -y

# /etc/nprobe/nprobe.conf - Collect IPv6 flows
# nProbe uses short-form flags; long-form aliases are not all supported.
cat > /etc/nprobe/nprobe.conf << 'EOF'
# Capture interface
-i eth0

# Listen for incoming flows on this port (when acting as a collector)
--collector-port=2055

# IPFIX export (NetFlow version 10 = IPFIX)
-V 10

# Custom template ID (default is 257)
-U 257

# Export to flow collector at host:port
-n 127.0.0.1:9995

# IPv6 specific information elements (IANA IPFIX registry):
# sourceIPv6Address (27)
# destinationIPv6Address (28)
# ipNextHopIPv6Address (62)
# bgpNextHopIPv6Address (63)
EOF

systemctl enable --now nprobe
```

## Python IPFIX IPv6 Flow Processor

```python
#!/usr/bin/env python3
# ipfix_ipv6_monitor.py - Process IPFIX records with IPv6 flows

import socket
import struct
import ipaddress
from collections import defaultdict
from datetime import datetime

COLLECTOR_PORT = 9995
IPFIX_SET_ID_TEMPLATE = 2
IPFIX_SET_ID_DATA = 256

# IPFIX field types for IPv6
IPFIX_SRC_IPV6 = 27
IPFIX_DST_IPV6 = 28
IPFIX_BYTES = 1
IPFIX_PACKETS = 2
IPFIX_SRC_PORT = 7
IPFIX_DST_PORT = 11
IPFIX_DSCP = 195  # ipDiffServCodePoint

def parse_ipv6_address(data, offset):
    """Parse 16-byte IPv6 address from IPFIX record."""
    addr_bytes = data[offset:offset+16]
    return str(ipaddress.IPv6Address(addr_bytes)), offset + 16

class IPFixIPv6Monitor:
    def __init__(self):
        self.templates = {}
        self.flow_stats = defaultdict(lambda: {'bytes': 0, 'packets': 0})

    def collect(self, port=COLLECTOR_PORT):
        """Listen for IPFIX records."""
        sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
        sock.bind(('::', port))
        print(f"IPFIX collector listening on [::]: {port}")

        while True:
            data, addr = sock.recvfrom(65535)
            self.process_ipfix(data, addr[0])

    def process_ipfix(self, data, exporter):
        """Parse IPFIX message."""
        if len(data) < 16:
            return

        # IPFIX header
        version, length, export_time, seq_num, obs_domain = struct.unpack(
            '!HHIII', data[:16]
        )

        if version != 10:
            return

        offset = 16
        while offset < length:
            set_id, set_length = struct.unpack('!HH', data[offset:offset+4])
            offset += 4

            if set_id >= 256:  # Data set
                self.process_data_set(data[offset:offset+set_length-4], set_id, exporter)

            offset += set_length - 4

    def process_data_set(self, data, template_id, exporter):
        """Process IPv6 flow records."""
        # Simplified: assume known template
        if len(data) < 36:
            return

        src_ipv6, off = parse_ipv6_address(data, 0)
        dst_ipv6, off = parse_ipv6_address(data, off)

        if off + 20 <= len(data):
            bytes_count, packets, src_port, dst_port = struct.unpack(
                '!QQHH', data[off:off+20]
            )

            flow_key = (src_ipv6, dst_ipv6, src_port, dst_port)
            self.flow_stats[flow_key]['bytes'] += bytes_count
            self.flow_stats[flow_key]['packets'] += packets

            # Top talkers
            if bytes_count > 1_000_000:  # > 1MB flow
                print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                      f"Large IPv6 flow: {src_ipv6}:{src_port} → "
                      f"{dst_ipv6}:{dst_port} = {bytes_count/1024/1024:.1f}MB")

    def print_top_flows(self, n=10):
        """Print top IPv6 flows by bytes."""
        sorted_flows = sorted(
            self.flow_stats.items(),
            key=lambda x: x[1]['bytes'],
            reverse=True
        )[:n]

        print(f"\nTop {n} IPv6 Flows:")
        for flow_key, stats in sorted_flows:
            src_ip, dst_ip, src_port, dst_port = flow_key
            print(f"  {src_ip}:{src_port} → {dst_ip}:{dst_port} "
                  f"| {stats['bytes']/1024/1024:.2f}MB | "
                  f"{stats['packets']} pkts")

if __name__ == '__main__':
    monitor = IPFixIPv6Monitor()
    monitor.collect()
```

## Prometheus Metrics for SD-WAN IPv6

```bash
# Configure Prometheus to scrape SD-WAN IPv6 metrics

# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'sdwan_ipv6'
    static_configs:
      - targets:
        - 'sdwan-edge-a:9100'
        - 'sdwan-edge-b:9100'
    metrics_path: '/metrics'

# Example metrics to track (from node_exporter + custom)
# sdwan_ipv6_bytes_total{interface, direction}
# sdwan_ipv6_packets_total{interface, direction}
# sdwan_ipv6_path_latency_ms{site, path}
# sdwan_ipv6_path_loss_percent{site, path}
```

```python
# sdwan_ipv6_exporter.py - Export SD-WAN IPv6 metrics to Prometheus
from prometheus_client import start_http_server, Gauge, Counter
import subprocess
import re
import time

ipv6_bytes = Counter('sdwan_ipv6_bytes_total', 'IPv6 bytes', ['iface', 'direction'])
ipv6_packets = Counter('sdwan_ipv6_packets_total', 'IPv6 packets', ['iface', 'direction'])
path_latency = Gauge('sdwan_path_latency_ms', 'Path latency', ['path'])
path_loss = Gauge('sdwan_path_loss_pct', 'Path loss %', ['path'])

def collect_interface_stats():
    result = subprocess.run(['ip', '-6', '-s', 'link'], capture_output=True, text=True)
    # Parse IPv6 interface statistics
    # ...

def probe_path_quality(dest_ipv6, path_name):
    result = subprocess.run(
        ['ping', '-6', '-c', '10', '-i', '0.2', dest_ipv6],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        loss_match = re.search(r'(\d+)% packet loss', result.stdout)
        rtt_match = re.search(r'min/avg/max.*= ([\d.]+)/([\d.]+)', result.stdout)
        if loss_match:
            path_loss.labels(path=path_name).set(float(loss_match.group(1)))
        if rtt_match:
            path_latency.labels(path=path_name).set(float(rtt_match.group(2)))

if __name__ == '__main__':
    start_http_server(9100)
    while True:
        collect_interface_stats()
        probe_path_quality('2001:4860:4860::8888', 'broadband')
        time.sleep(30)
```

## Vendor-Specific IPv6 Monitoring

```bash
# Cisco SD-WAN vManage - Monitor IPv6
# Dashboard > Monitor > Real Time > IP Route Table
# Filter: Family=IPv6

# FortiGate SD-WAN - IPv6 health check / member status
diagnose sys sdwan health-check | grep -i ipv6
diagnose sys sdwan member

# Silver Peak Orchestrator - IPv6 visibility
# Monitor > Flows > IP Version: IPv6 > Top Applications
```

SD-WAN IPv6 monitoring requires IPFIX/NetFlow v9 export with IPv6 template elements (fields 27/28 for source/destination IPv6), a flow collector that understands IPv6 records, and path quality probing to IPv6 targets for latency/loss measurement to ensure SD-WAN steering decisions for IPv6 flows are based on accurate telemetry.
