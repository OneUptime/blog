# How to Capture and Analyze HTTP Traffic over IPv4 Using Scapy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Scapy, HTTP, IPv4, Packet Analysis, Security, Python, Network Monitoring

Description: Use Scapy to capture live HTTP traffic over IPv4, extract request/response data, and analyze headers and payloads for security auditing or debugging.

## Introduction

Scapy can capture and decode HTTP traffic at the packet level, giving you visibility into cleartext HTTP traffic. This is useful for security auditing, debugging, API testing, and understanding application behavior on the network.

Because HTTP messages can span multiple TCP segments, the packet-level examples below inspect individual payloads, while the PCAP example uses Scapy's TCP session support to decode reassembled HTTP messages.

> **Note**: Only capture traffic on networks you own or have authorization to monitor. Intercepting traffic without consent is illegal.

## Prerequisites

```bash
pip install scapy
# Root/sudo or Administrator privileges are typically required for packet capture
# BPF capture filters rely on libpcap/Npcap support on your platform

```

## Capturing HTTP Request Packets

```python
from scapy.all import sniff, IP, TCP, Raw

def analyze_http(pkt):
    """Extract and display HTTP requests from captured packets."""
    if not (pkt.haslayer(IP) and pkt.haslayer(TCP) and pkt.haslayer(Raw)):
        return
    
    payload = pkt[Raw].load
    
    # Identify HTTP requests (methods are ASCII at the start)
    try:
        payload_str = payload.decode('utf-8', errors='replace')
    except Exception:
        return
    
    http_methods = ('GET ', 'POST ', 'PUT ', 'DELETE ', 'HEAD ', 'OPTIONS ', 'PATCH ', 'CONNECT ', 'TRACE ')
    
    if any(payload_str.startswith(m) for m in http_methods):
        src_ip = pkt[IP].src
        dst_ip = pkt[IP].dst
        dst_port = pkt[TCP].dport
        
        # Extract the first line of the request
        first_line = payload_str.split('\r\n')[0]
        
        # Extract the Host header
        host = ''
        for line in payload_str.split('\r\n'):
            if line.lower().startswith('host:'):
                host = line.split(':', 1)[1].strip()
                break
        
        print(f"[HTTP REQUEST] {src_ip} -> {dst_ip}:{dst_port}")
        print(f"  Request: {first_line}")
        print(f"  Host: {host}")
        print()

# Capture HTTP traffic (port 80)
print("Capturing HTTP traffic on port 80... (Ctrl+C to stop)")
sniff(filter="tcp port 80 and ip", prn=analyze_http, store=False)
```

## Capturing HTTP Responses

```python
from scapy.all import sniff, IP, TCP, Raw

def analyze_http_response(pkt):
    """Extract HTTP response status codes from captured traffic."""
    if not (pkt.haslayer(IP) and pkt.haslayer(TCP) and pkt.haslayer(Raw)):
        return
    
    try:
        payload = pkt[Raw].load.decode('utf-8', errors='replace')
    except Exception:
        return
    
    if payload.startswith('HTTP/'):
        src_ip = pkt[IP].src
        dst_ip = pkt[IP].dst
        status_line = payload.split('\r\n')[0]
        
        # Extract Content-Type
        content_type = ''
        for line in payload.split('\r\n'):
            if line.lower().startswith('content-type:'):
                content_type = line.split(':', 1)[1].strip()
                break
        
        print(f"[HTTP RESPONSE] {src_ip} -> {dst_ip}")
        print(f"  Status: {status_line}")
        print(f"  Content-Type: {content_type}")
        print()

sniff(filter="tcp port 80 and ip", prn=analyze_http_response, store=False)
```

## Extracting HTTP Messages from a PCAP File

Analyze previously captured traffic with Scapy's TCP session decoder:

```python
from scapy.all import sniff, IP, TCPSession
from scapy.layers.http import HTTPRequest, HTTPResponse

def decode_field(value):
    if value is None:
        return ''
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='replace')
    return str(value)

# Read a pcap file and let Scapy defragment supported TCP payloads
packets = sniff(offline="capture.pcap", session=TCPSession, store=True)

for pkt in packets:
    if not pkt.haslayer(IP):
        continue
    
    src_ip = pkt[IP].src
    dst_ip = pkt[IP].dst
    
    if pkt.haslayer(HTTPRequest):
        req = pkt[HTTPRequest]
        method = decode_field(req.Method)
        path = decode_field(req.Path)
        host = decode_field(req.Host)
        request_line = f"{method} {path}".strip()
        
        print(f"[HTTP REQUEST] {src_ip} -> {dst_ip}")
        print(f"  Request: {request_line}")
        print(f"  Host: {host}")
        print()
    elif pkt.haslayer(HTTPResponse):
        resp = pkt[HTTPResponse]
        version = decode_field(resp.Http_Version)
        status = decode_field(resp.Status_Code)
        reason = decode_field(resp.Reason_Phrase)
        content_type = decode_field(resp.Content_Type)
        status_line = " ".join(part for part in (version, status, reason) if part)
        
        print(f"[HTTP RESPONSE] {src_ip} -> {dst_ip}")
        print(f"  Status: {status_line}")
        print(f"  Content-Type: {content_type}")
        print()
```

## Extracting URLs and Headers to a CSV

```python
import csv
from scapy.all import sniff, IP, TCP, Raw
from datetime import datetime

output_file = "http_log.csv"
fieldnames = ['timestamp', 'src_ip', 'dst_ip', 'method', 'host', 'path', 'user_agent']

with open(output_file, 'w', newline='') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    
    def log_http(pkt):
        if not (pkt.haslayer(IP) and pkt.haslayer(TCP) and pkt.haslayer(Raw)):
            return
        try:
            payload = pkt[Raw].load.decode('utf-8', errors='replace')
        except Exception:
            return
        
        if not any(payload.startswith(m) for m in ('GET ', 'POST ', 'PUT ', 'DELETE ', 'HEAD ', 'OPTIONS ', 'PATCH ', 'CONNECT ', 'TRACE ')):
            return
        
        lines = payload.split('\r\n')
        req_parts = lines[0].split(' ')
        headers = {l.split(':', 1)[0].lower(): l.split(':', 1)[1].strip()
                   for l in lines[1:] if ':' in l}
        
        writer.writerow({
            'timestamp': datetime.now().isoformat(),
            'src_ip': pkt[IP].src,
            'dst_ip': pkt[IP].dst,
            'method': req_parts[0],
            'host': headers.get('host', ''),
            'path': req_parts[1] if len(req_parts) > 1 else '',
            'user_agent': headers.get('user-agent', '')
        })
        csvfile.flush()
    
    sniff(filter="tcp port 80 and ip", prn=log_http, store=False)
```

## Conclusion

Scapy provides a powerful Python interface for HTTP traffic analysis. For encrypted HTTPS traffic, you would need TLS key logging or a MITM proxy. Use these capabilities only for authorized security testing, debugging, and network monitoring.
