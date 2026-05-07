# How to Analyze DNS Queries over IPv4 Using dpkt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dpkt, DNS, IPv4, Packet Analysis, Python, Network Security, PCAP

Description: Parse and analyze DNS query and response packets from IPv4 traffic captures using the Python dpkt library to audit DNS usage and detect anomalies.

## Introduction

DNS traffic analysis reveals which domains your hosts are resolving - useful for security auditing (detecting malware C2 domains), capacity planning, and debugging connectivity issues. `dpkt` provides efficient DNS parsing from PCAP files, and you can pair it with Scapy for live capture.

## Prerequisites

```bash
pip install dpkt scapy
```

## Parsing DNS Queries from a PCAP File

```python
import dpkt
import socket
from collections import Counter

def parse_dns_from_pcap(pcap_file):
    """Extract UDP-based DNS queries and responses from IPv4 traffic in an Ethernet pcap."""
    queries = []
    responses = []
    
    with open(pcap_file, "rb") as f:
        pcap = dpkt.pcap.Reader(f)
        
        for ts, buf in pcap:
            try:
                eth = dpkt.ethernet.Ethernet(buf)
                ip = eth.data
                
                # Only process IPv4
                if not isinstance(ip, dpkt.ip.IP):
                    continue
                
                udp = ip.data
                # This example focuses on DNS over UDP on port 53
                if not isinstance(udp, dpkt.udp.UDP):
                    continue
                if udp.dport != 53 and udp.sport != 53:
                    continue
                
                # Parse DNS payload
                dns = dpkt.dns.DNS(udp.data)
                
                src_ip = socket.inet_ntoa(ip.src)
                dst_ip = socket.inet_ntoa(ip.dst)
                
                # Process DNS queries (QR bit = 0)
                if dns.qr == dpkt.dns.DNS_Q:
                    for question in dns.qd:
                        qname = question.name
                        qtype = question.type
                        queries.append({
                            'ts': ts,
                            'src': src_ip,
                            'dst': dst_ip,
                            'name': qname,
                            'type': qtype
                        })
                
                # Process DNS responses (QR bit = 1)
                elif dns.qr == dpkt.dns.DNS_R:
                    for answer in dns.an:
                        if answer.type == dpkt.dns.DNS_A:
                            # Extract A record (IPv4)
                            ip_answer = socket.inet_ntoa(answer.rdata)
                            responses.append({
                                'ts': ts,
                                'name': answer.name,
                                'resolved_ip': ip_answer,
                                'ttl': answer.ttl
                            })
            
            except Exception:
                continue
    
    return queries, responses

queries, responses = parse_dns_from_pcap("capture.pcap")
print(f"Total DNS queries: {len(queries)}")
print(f"Total DNS A responses: {len(responses)}")
```

## Analyzing Top Queried Domains

```python
from collections import Counter

# Count queries per domain

domain_counts = Counter(q['name'] for q in queries)

print("\nTop 20 Queried Domains:")
print(f"{'Domain':<50} {'Count':>8}")
print("-" * 60)
for domain, count in domain_counts.most_common(20):
    print(f"{domain:<50} {count:>8}")
```

## Detecting Suspicious DNS Patterns

```python
import re

def flag_suspicious_dns(queries):
    """Flag potentially suspicious DNS queries."""
    suspicious = []
    
    for q in queries:
        name = q['name']
        flags = []
        
        # Long subdomain chains (possible DGA or tunneling)
        if name.count('.') > 5:
            flags.append("deep_subdomain")
        
        # Long random-looking labels (possible DGA)
        labels = name.split('.')
        for label in labels[:-2]:  # Skip the last two labels as a simple heuristic
            if len(label) > 20:
                flags.append("long_label")
                break
            # High entropy label (many unique chars, possible base64/hex)
            if len(set(label)) > len(label) * 0.7 and len(label) > 10:
                flags.append("high_entropy_label")
                break
        
        # DNS TXT queries (common for tunneling)
        if q['type'] == dpkt.dns.DNS_TXT:
            flags.append("txt_query")
        
        if flags:
            suspicious.append({**q, 'flags': flags})
    
    return suspicious

suspicious_queries = flag_suspicious_dns(queries)
if suspicious_queries:
    print(f"\n=== {len(suspicious_queries)} Suspicious DNS Queries ===")
    for q in suspicious_queries[:20]:
        print(f"  {q['src']} -> {q['name']} ({', '.join(q['flags'])})")
```

## Mapping Domains to IP Addresses

```python
from collections import defaultdict

# Build domain -> IP mapping from responses
domain_to_ips = defaultdict(set)
for r in responses:
    domain_to_ips[r['name']].add(r['resolved_ip'])

# Show domains that resolved to multiple IPs (CDN or load balancing)
print("\nDomains with Multiple A Records (CDN/LB):")
for domain, ips in sorted(domain_to_ips.items(), key=lambda x: -len(x[1])):
    if len(ips) > 2:
        print(f"  {domain}: {', '.join(sorted(ips))}")
```

## Live DNS Capture

```python
from scapy.all import sniff, IP, UDP, DNS, DNSQR

def live_dns_capture(pkt):
    """Callback for live DNS query capture with Scapy."""
    if pkt.haslayer(IP) and pkt.haslayer(DNS) and pkt.haslayer(DNSQR):
        qname = pkt[DNSQR].qname.decode('utf-8').rstrip('.')
        src = pkt[IP].src
        print(f"{src} queried: {qname}")

print("Capturing live DNS queries...")
sniff(filter="ip and udp port 53", prn=live_dns_capture, store=False)
```

## Conclusion

DNS analysis with `dpkt` provides efficient offline packet processing for domain auditing and anomaly detection. Combine it with threat intelligence feeds (checking queried domains against blocklists) for a lightweight DNS-based intrusion detection capability.
