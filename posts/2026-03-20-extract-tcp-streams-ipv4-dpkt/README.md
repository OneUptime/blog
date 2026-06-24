# How to Extract TCP Streams from IPv4 Traffic with dpkt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dpkt, TCP, IPv4, Packet Analysis, Python, Network Forensics, PCAP

Description: Use the Python dpkt library to parse PCAP files, reassemble TCP streams from IPv4 traffic, and extract application-layer data from raw packet captures.

## Introduction

`dpkt` is a lightweight Python library for packet parsing and creation. Its documentation describes it as fast and simple, which makes it a practical choice for low-level packet analysis. This guide assumes an Ethernet capture containing IPv4/TCP traffic and shows how to extract and rebuild TCP payload data from it.

## Prerequisites

```bash
pip install dpkt
```

## Reading a PCAP File

```python
import dpkt
import socket

def ip_to_str(addr):
    """Convert binary IP address to dotted-decimal string."""
    return socket.inet_ntoa(addr)

# Open and iterate over packets in a PCAP file

with open("capture.pcap", "rb") as f:
    pcap = dpkt.pcap.Reader(f)
    
    for ts, buf in pcap:
        try:
            # Parse Ethernet frame (this example assumes an Ethernet pcap)
            eth = dpkt.ethernet.Ethernet(buf)
            
            # Check for IPv4
            if not isinstance(eth.data, dpkt.ip.IP):
                continue
            
            ip = eth.data
            src = ip_to_str(ip.src)
            dst = ip_to_str(ip.dst)
            
            print(f"{ts:.3f} {src} -> {dst} proto={ip.p} len={ip.len}")
        
        except (dpkt.dpkt.NeedData, dpkt.dpkt.UnpackError):
            continue
```

## Extracting TCP Streams

A TCP flow direction is identified by its 4-tuple (src_ip, src_port, dst_ip, dst_port). Because TCP sequence numbers track bytes in the stream, we collect payloads per direction and rebuild the captured payload in sequence order:

```python
import dpkt, socket
from collections import defaultdict

def reassemble_segments(segments):
    """Best-effort TCP payload reassembly for one direction."""
    if not segments:
        return b''
    
    segments = sorted(segments, key=lambda item: item[0])
    stream = bytearray()
    next_seq = segments[0][0]
    
    for seq, data in segments:
        # Trim retransmitted or overlapping bytes. This simple reassembler
        # assumes the capture does not span TCP's 32-bit sequence wrap-around.
        if seq < next_seq:
            overlap = next_seq - seq
            if overlap >= len(data):
                continue
            data = data[overlap:]
            seq = next_seq
        elif seq > next_seq:
            # Missing packets leave gaps in the capture; resume at the next segment.
            next_seq = seq
        
        stream.extend(data)
        next_seq = seq + len(data)
    
    return bytes(stream)

def extract_tcp_streams(pcap_file):
    """Collect and reassemble TCP payloads from an Ethernet/IPv4 pcap."""
    streams = defaultdict(list)
    
    with open(pcap_file, "rb") as f:
        pcap = dpkt.pcap.Reader(f)
        
        for ts, buf in pcap:
            try:
                eth = dpkt.ethernet.Ethernet(buf)
                if not isinstance(eth.data, dpkt.ip.IP):
                    continue
                
                ip = eth.data
                if not isinstance(ip.data, dpkt.tcp.TCP):
                    continue
                
                tcp = ip.data
                
                # Skip packets without payload
                if len(tcp.data) == 0:
                    continue
                
                src = socket.inet_ntoa(ip.src)
                dst = socket.inet_ntoa(ip.dst)
                
                # Keep each TCP direction separate.
                flow_key = (src, tcp.sport, dst, tcp.dport)
                
                # Store payload with its starting sequence number
                streams[flow_key].append((tcp.seq, bytes(tcp.data)))
            
            except (dpkt.dpkt.NeedData, dpkt.dpkt.UnpackError):
                continue
    
    return {
        flow_key: reassemble_segments(segments)
        for flow_key, segments in streams.items()
    }

# Reassemble each directional flow
streams = extract_tcp_streams("capture.pcap")

for flow_key, stream_data in streams.items():
    src_ip, src_port, dst_ip, dst_port = flow_key
    
    print(f"\n=== Stream: {src_ip}:{src_port} -> {dst_ip}:{dst_port} ===")
    print(f"Total bytes: {len(stream_data)}")
    
    # Try to decode as text
    try:
        text = stream_data.decode('utf-8')
        print(text[:200])
    except UnicodeDecodeError:
        print(f"Binary data (hex preview): {stream_data[:32].hex()}")
```

## Filtering HTTP Streams

```python
def find_http_streams(pcap_file):
    """Find reassembled HTTP/1.x streams on port 80."""
    http_streams = {}
    http_prefixes = (
        b"GET ", b"POST ", b"PUT ", b"DELETE ", b"HEAD ",
        b"OPTIONS ", b"PATCH ", b"CONNECT ", b"TRACE ",
        b"HTTP/",
    )
    
    for flow_key, data in extract_tcp_streams(pcap_file).items():
        src, sport, dst, dport = flow_key
        
        # Only interested in port 80 traffic
        if dport != 80 and sport != 80:
            continue
        
        if not data.startswith(http_prefixes):
            continue
        
        key = f"{src}:{sport}->{dst}:{dport}"
        http_streams[key] = data
    
    return http_streams

http_flows = find_http_streams("capture.pcap")
for key, data in http_flows.items():
    text = data.decode('utf-8', errors='replace')
    print(f"\n--- {key} ---")
    print(text[:300])
```

## Writing Extracted Streams to Files

```python
import os

output_dir = "extracted_streams"
os.makedirs(output_dir, exist_ok=True)

for i, (key, data) in enumerate(http_flows.items()):
    filename = f"{output_dir}/stream_{i:04d}.bin"
    with open(filename, "wb") as f:
        f.write(data)
    print(f"Saved: {filename} ({len(data)} bytes)")
```

## Conclusion

`dpkt` provides efficient, low-level access to packet data for TCP payload extraction. With careful handling of sequence numbers, it works well for stream-oriented analysis tasks such as forensic investigation, protocol debugging, and application-layer inspection.
