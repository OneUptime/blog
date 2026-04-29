# How to Monitor VoIP Quality over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VoIP, IPv6, Monitoring, MOS, Jitter, Latency, RTCP, Quality Metric

Description: Monitor and measure VoIP call quality metrics including MOS score, jitter, latency, and packet loss for calls traversing IPv6 networks using RTCP and active probing tools.

---

VoIP quality monitoring over IPv6 uses RTCP (RTP Control Protocol) reports embedded in the call stream, active SIP/RTP probes, and passive packet capture analysis. Key metrics are MOS (Mean Opinion Score), jitter, one-way delay, and packet loss rate.

## VoIP Quality Metrics Reference

```text
Quality Thresholds for Good VoIP:
┌─────────────────┬─────────────┬─────────────┬──────────────┐
│ Metric          │ Good        │ Acceptable  │ Poor         │
├─────────────────┼─────────────┼─────────────┼──────────────┤
│ One-way latency │ < 100ms     │ < 150ms     │ > 200ms      │
│ Jitter          │ < 10ms      │ < 30ms      │ > 50ms       │
│ Packet Loss     │ < 0.1%      │ < 1%        │ > 3%         │
│ MOS Score       │ 4.0 - 5.0   │ 3.5 - 4.0   │ < 3.5        │
└─────────────────┴─────────────┴─────────────┴──────────────┘
```

## Capture and Analyze RTCP over IPv6

```bash
# Capture RTCP packets (RTP port + 1, typically odd ports)

sudo tcpdump -i eth0 -nn ip6 and udp and portrange 10000-20000 \
  -w /tmp/voip_ipv6.pcap

# Analyze RTCP Sender/Receiver Reports with tshark
tshark -r /tmp/voip_ipv6.pcap -Y "rtcp" \
  -T fields \
  -e rtcp.pt \
  -e rtcp.ssrc.identifier \
  -e rtcp.ssrc.fraction \
  -e rtcp.ssrc.cum_nr \
  -e rtcp.ssrc.jitter \
  -e rtcp.ssrc.dlsr

# Show complete RTCP report
tshark -r /tmp/voip_ipv6.pcap -Y "rtcp" -V | grep -A20 "Receiver Report"

# RTP stream analysis
tshark -r /tmp/voip_ipv6.pcap -q -z "rtp,streams"
```

## Python RTCP Monitor for IPv6

```python
#!/usr/bin/env python3
# rtcp_monitor_ipv6.py - Monitor RTCP statistics over IPv6

import socket
import struct
import json
import time
from datetime import datetime

RTCP_PORT = 5005  # Example RTCP port

def parse_rtcp_rr(data):
    """Parse RTCP Receiver Report."""
    if len(data) < 8:
        return None

    # RTCP header
    byte1 = data[0]
    pt = data[1]  # Packet type: 201 = RR
    length = struct.unpack('!H', data[2:4])[0]
    ssrc = struct.unpack('!I', data[4:8])[0]

    if pt != 201 or len(data) < 32:  # 8 + 24 bytes per report block
        return None

    # Report block
    rb_ssrc = struct.unpack('!I', data[8:12])[0]
    fraction_lost = data[12]
    cum_lost = struct.unpack('!I', b'\x00' + data[13:16])[0]
    ext_seq = struct.unpack('!I', data[16:20])[0]
    jitter = struct.unpack('!I', data[20:24])[0]
    lsr = struct.unpack('!I', data[24:28])[0]
    dlsr = struct.unpack('!I', data[28:32])[0]

    # Convert jitter from RTP timestamp units to ms (assuming 8kHz G.711)
    jitter_ms = jitter / 8.0  # 8000 Hz = 8 samples/ms

    # Packet loss percentage
    loss_pct = (fraction_lost / 256.0) * 100

    return {
        'ssrc': ssrc,
        'rb_ssrc': rb_ssrc,
        'fraction_lost': fraction_lost,
        'cumulative_lost': cum_lost,
        'jitter_ms': round(jitter_ms, 2),
        'loss_percent': round(loss_pct, 2),
        'timestamp': datetime.utcnow().isoformat()
    }

def monitor_rtcp_ipv6(listen_port=RTCP_PORT, duration=60):
    """Listen for RTCP reports on IPv6."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('::', listen_port))
    sock.settimeout(5.0)

    print(f"Listening for RTCP on [::]:{ listen_port}")
    start = time.time()
    stats = []

    while time.time() - start < duration:
        try:
            data, addr = sock.recvfrom(1500)
            report = parse_rtcp_rr(data)
            if report:
                report['from'] = addr[0]
                stats.append(report)
                print(f"[{addr[0]}] Jitter: {report['jitter_ms']}ms | "
                      f"Loss: {report['loss_percent']}% | "
                      f"Cum lost: {report['cumulative_lost']}")
        except socket.timeout:
            continue

    sock.close()
    return stats

if __name__ == '__main__':
    stats = monitor_rtcp_ipv6(listen_port=5005, duration=60)
    # Summarize
    if stats:
        avg_jitter = sum(s['jitter_ms'] for s in stats) / len(stats)
        max_jitter = max(s['jitter_ms'] for s in stats)
        avg_loss = sum(s['loss_percent'] for s in stats) / len(stats)
        print(f"\nSummary: Avg jitter {avg_jitter:.2f}ms | "
              f"Max jitter {max_jitter:.2f}ms | Avg loss {avg_loss:.2f}%")
```

## Active VoIP Quality Probing (SIPp)

```bash
# Install SIPp for active testing
sudo apt install sipp -y

# Send test call over IPv6 and measure quality
sipp [2001:db8::sip-server]:5060 \
  -sf uac_pcap.xml \
  -i [2001:db8::tester] \
  -t un \
  -m 10 \
  -r 1 \
  -trace_stat \
  -fd 1

# Parse SIPp statistics
# Check: Retransmissions, Response times, Call duration
```

## Asterisk VoIP Quality Monitoring

```bash
# Enable RTCP stats in Asterisk
asterisk -rx "rtp set debug on"

# View active call quality
asterisk -rx "core show channels verbose"

# Asterisk RTCP log location
sudo tail -f /var/log/asterisk/messages | grep -E "RTCP|quality|jitter|loss"

# Get call quality report (chan_pjsip)
asterisk -rx "pjsip show channels"

# Check RTP statistics per call
asterisk -rx "rtp show settings"
```

## Prometheus + Grafana for VoIP IPv6 Monitoring

```python
#!/usr/bin/env python3
# voip_exporter.py - Prometheus metrics for VoIP quality over IPv6

from prometheus_client import start_http_server, Gauge
import subprocess
import time
import re

# Metrics
rtp_jitter = Gauge('voip_rtp_jitter_ms', 'RTP jitter in ms', ['endpoint'])
rtp_loss = Gauge('voip_rtp_loss_percent', 'RTP packet loss %', ['endpoint'])
sip_latency = Gauge('voip_sip_latency_ms', 'SIP response latency ms', ['server'])

def probe_sip_latency(server_ipv6, port=5060):
    """Measure SIP OPTIONS round-trip time."""
    cmd = ['sipsak', '-s', f'sip:[{server_ipv6}]:{port}', '-vv']
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        # Parse timing from output
        match = re.search(r'(\d+\.\d+) ms', result.stdout)
        if match:
            return float(match.group(1))
    except Exception:
        pass
    return None

def collect_metrics():
    servers = ['2001:db8::sip1', '2001:db8::sip2']
    for server in servers:
        latency = probe_sip_latency(server)
        if latency:
            sip_latency.labels(server=server).set(latency)

if __name__ == '__main__':
    start_http_server(9187)  # Prometheus scrape port
    print("VoIP exporter listening on :9187")
    while True:
        collect_metrics()
        time.sleep(30)
```

## Monitoring with Homer SIP Capture

```bash
# Homer captures SIP/RTP for quality analysis

# Install HEP capture agent
# Configure Asterisk to send HEP to Homer
# In /etc/asterisk/hep.conf:
cat > /etc/asterisk/hep.conf << 'EOF'
[general]
enabled=yes
capture_id=2001
capture_address=[2001:db8::homer]:9060
capture_password=mypassword
uuid_type=call-id
EOF

# Homer dashboard shows:
# - Call flow diagrams with SIP messages
# - RTP quality statistics from RTCP
# - Jitter/latency/loss per call
# - Geographic distribution of IPv6 endpoints
```

Monitoring VoIP quality over IPv6 requires capturing RTCP receiver reports for real-time jitter and loss data per call, augmented with active SIP probes for signaling latency and passive RTP analysis tools like Wireshark or tshark to detect pattern-based quality degradation.
