# How to Analyze IPv6 DNS Queries in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, DNS, AAAA Records, Packet Analysis, Network Debugging

Description: A guide to analyzing DNS queries for IPv6 AAAA records and DNS queries sent over IPv6 transport in Wireshark.

IPv6 DNS analysis in Wireshark covers two distinct scenarios: (1) DNS AAAA record queries (asking for IPv6 addresses) regardless of transport, and (2) DNS queries transported over IPv6 connections. This guide covers both.

## Scenario 1: Filter for AAAA DNS Queries (IPv6 Address Lookups)

```wireshark
# Show all DNS queries for AAAA records (regardless of transport)

dns.qry.type == 28

# Show AAAA queries and their responses
dns.qry.type == 28 || (dns.flags.response == 1 && dns.resp.type == 28)

# Show AAAA queries for a specific domain
dns.qry.type == 28 && dns.qry.name == "www.example.com"

# Show AAAA responses that contain actual addresses
dns.resp.type == 28 && dns.aaaa

# Show AAAA queries that get a NXDOMAIN response
dns.qry.type == 28 && dns.flags.rcode == 3
```

## Scenario 2: DNS Queries Sent Over IPv6

```wireshark
# Show all DNS traffic transported over IPv6
ipv6 && dns

# Show only DNS queries (not responses) over IPv6
ipv6 && dns && dns.flags.response == 0

# Show DNS responses over IPv6
ipv6 && dns && dns.flags.response == 1

# Show DNS queries to a specific IPv6 resolver
ipv6.dst == 2001:4860:4860::8888 && dns
```

## Combining Both Scenarios

```wireshark
# AAAA queries sent over IPv6 transport
ipv6 && dns.qry.type == 28

# All IPv6-related DNS activity
(ipv6 && dns) || dns.qry.type == 28 || dns.resp.type == 28
```

## Analyzing Specific DNS Fields

```wireshark
# Show queries with specific query name
dns.qry.name == "api.example.com"

# Show DNS AAAA responses with specific IPv6 address
dns.aaaa == 2001:db8::1

# Show DNS with EDNS0 (Client Subnet extension showing IPv6 client prefix)
dns.opt.client.family == 2   # IPv6 address family in ECS

# Show negative responses (NXDOMAIN or NOERROR/no-data) for AAAA
dns.qry.type == 28 && (dns.flags.rcode == 3 || dns.count.answers == 0)
```

## Diagnose Missing AAAA Records

```bash
# Find domains queried for AAAA that got NXDOMAIN
tshark -r capture.pcap \
  -Y "dns.qry.type == 28 && dns.flags.rcode == 3" \
  -T fields -e dns.qry.name | sort | uniq -c | sort -rn | head -20
```

## Measure DNS Response Time for AAAA Queries

```wireshark
# Show DNS response time field
dns.time && dns.qry.type == 28
```

```bash
# Extract AAAA query response times
tshark -r capture.pcap \
  -Y "dns.qry.type == 28 && dns.time" \
  -T fields -e dns.qry.name -e dns.time | \
  sort -k2 -rn | head -20
```

## Extract All AAAA Records Seen in Capture

```bash
# List all AAAA records resolved in the capture
tshark -r capture.pcap \
  -Y "dns.resp.type == 28" \
  -T fields -e dns.qry.name -e dns.aaaa | \
  sort | uniq
```

## Detect DNS over IPv6 vs IPv4 Split Brain

When your DNS server returns different AAAA responses to IPv4 vs IPv6 clients:

```bash
# Compare AAAA responses from IPv4 DNS queries
tshark -r capture.pcap \
  -Y "ip && dns.resp.type == 28" \
  -T fields -e dns.qry.name -e dns.aaaa | sort > ipv4-aaaa-responses.txt

# Compare AAAA responses from IPv6 DNS queries
tshark -r capture.pcap \
  -Y "ipv6 && dns.resp.type == 28" \
  -T fields -e dns.qry.name -e dns.aaaa | sort > ipv6-aaaa-responses.txt

diff ipv4-aaaa-responses.txt ipv6-aaaa-responses.txt
```

## Follow a DNS Exchange

```wireshark
# Follow the UDP stream for a specific DNS query
dns.qry.name == "www.example.com" && dns.qry.type == 28
# Then: Analyze → Follow → UDP Stream
```

Analyzing DNS AAAA queries in Wireshark is essential for diagnosing IPv6 service reachability issues - most IPv6 connectivity problems start with DNS, and Wireshark makes it easy to verify that AAAA records are being requested and correctly returned.
