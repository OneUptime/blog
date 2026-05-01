# How to Export IPv4 Packet Data to CSV Using PyShark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PyShark, Wireshark, IPv4, Packet Analysis, CSV, Python, Network Monitoring

Description: Use PyShark to capture or read IPv4 packets and export structured packet metadata to CSV files for offline analysis, reporting, and data visualization.

## Introduction

PyShark is a Python wrapper for the Wireshark command-line tool `tshark`. It provides access to Wireshark's full protocol dissection engine through Python, making it ideal for exporting rich, parsed packet data to CSV for analysis in Excel, pandas, or dashboards.

## Prerequisites

```bash
# Install tshark (required by PyShark)

sudo apt-get install tshark   # Ubuntu/Debian
# brew install wireshark      # macOS

pip install pyshark pandas
```

## Reading a PCAP File and Exporting to CSV

```python
import pyshark
import csv
from datetime import datetime

def pcap_to_csv(pcap_file, output_csv, packet_limit=None):
    """Export IPv4 packet metadata from a pcap to CSV."""
    
    fieldnames = [
        'timestamp', 'src_ip', 'dst_ip', 'protocol',
        'src_port', 'dst_port', 'packet_length',
        'ttl', 'ip_flags', 'info'
    ]
    
    count = 0
    
    with open(output_csv, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Open the pcap file (only IPv4 packets)
        cap = pyshark.FileCapture(pcap_file, display_filter='ip')
        
        for pkt in cap:
            try:
                row = {
                    'timestamp': pkt.sniff_time.isoformat(),
                    'src_ip': pkt.ip.src,
                    'dst_ip': pkt.ip.dst,
                    'protocol': pkt.highest_layer,
                    'packet_length': int(pkt.length),
                    'ttl': pkt.ip.ttl,
                    'ip_flags': pkt.ip.flags,
                    'src_port': '',
                    'dst_port': '',
                    'info': ''
                }
                
                # Extract transport layer ports
                if hasattr(pkt, 'tcp'):
                    row['src_port'] = pkt.tcp.srcport
                    row['dst_port'] = pkt.tcp.dstport
                    row['info'] = pkt.tcp.flags_str if hasattr(pkt.tcp, 'flags_str') else ''
                elif hasattr(pkt, 'udp'):
                    row['src_port'] = pkt.udp.srcport
                    row['dst_port'] = pkt.udp.dstport
                
                # Add DNS query name if available
                if hasattr(pkt, 'dns') and hasattr(pkt.dns, 'qry_name'):
                    row['info'] = f"DNS: {pkt.dns.qry_name}"
                
                # Add HTTP method if available
                if hasattr(pkt, 'http') and hasattr(pkt.http, 'request_method'):
                    row['info'] = f"HTTP {pkt.http.request_method} {pkt.http.request_uri if hasattr(pkt.http, 'request_uri') else ''}"
                
                writer.writerow(row)
                count += 1
                
                if packet_limit and count >= packet_limit:
                    break
                    
            except AttributeError:
                continue
        
        cap.close()
    
    print(f"Exported {count} IPv4 packets to {output_csv}")
    return count

# Export the first 10000 packets from a capture
pcap_to_csv("network_capture.pcap", "packets.csv", packet_limit=10000)
```

## Live Capture to CSV

```python
import pyshark
import csv
import signal
import sys

def live_capture_to_csv(interface, output_csv, packet_limit=1000):
    """Capture live IPv4 traffic and export to CSV."""
    
    fieldnames = ['timestamp', 'src_ip', 'dst_ip', 'protocol', 
                  'src_port', 'dst_port', 'length']
    
    with open(output_csv, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Capture live traffic
        cap = pyshark.LiveCapture(interface=interface, display_filter='ip')
        
        print(f"Capturing on {interface}... (limit: {packet_limit} packets)")
        
        count = 0
        for pkt in cap.sniff_continuously(packet_count=packet_limit):
            try:
                src_port = ''
                dst_port = ''
                if hasattr(pkt, 'tcp'):
                    src_port = pkt.tcp.srcport
                    dst_port = pkt.tcp.dstport
                elif hasattr(pkt, 'udp'):
                    src_port = pkt.udp.srcport
                    dst_port = pkt.udp.dstport

                row = {
                    'timestamp': pkt.sniff_time.isoformat(),
                    'src_ip': pkt.ip.src,
                    'dst_ip': pkt.ip.dst,
                    'protocol': pkt.highest_layer,
                    'src_port': src_port,
                    'dst_port': dst_port,
                    'length': pkt.length
                }
                writer.writerow(row)
                csvfile.flush()   # Flush after each packet for real-time output
                count += 1
                print(f"\r{count} packets captured", end='')
            except AttributeError:
                continue
        
        cap.close()
    print(f"\nSaved to {output_csv}")

live_capture_to_csv("eth0", "live_capture.csv", packet_limit=500)
```

## Analyzing the CSV with Pandas

```python
import pandas as pd

# Load the exported CSV
df = pd.read_csv("packets.csv")
df['timestamp'] = pd.to_datetime(df['timestamp'])

# Top talkers by source IP
print("Top 10 source IPs:")
print(df['src_ip'].value_counts().head(10))

# Protocol distribution
print("\nProtocol distribution:")
print(df['protocol'].value_counts().head(10))

# Traffic volume by minute
df['minute'] = df['timestamp'].dt.floor('min')
traffic_by_minute = df.groupby('minute')['packet_length'].sum()
print("\nTraffic volume by minute (bytes):")
print(traffic_by_minute)
```

## Conclusion

PyShark leverages Wireshark's dissection engine to provide rich protocol parsing in Python, making it the most comprehensive option for exporting structured packet data to CSV. The CSV output integrates directly with pandas, Excel, or other data analysis tools.
