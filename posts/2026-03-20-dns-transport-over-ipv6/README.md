# How to Understand DNS Transport over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, DNS Transport, UDP, TCP

Description: An explanation of how DNS query and response transport works over IPv6, including UDP vs TCP usage, port numbers, and IPv6-specific considerations.

## DNS Transport Basics

DNS uses UDP port 53 for most queries due to its low overhead, but TCP support is also required. TCP port 53 is used for:
- Full zone transfers (AXFR)
- Some IXFR transfers
- Queries or responses that do not fit within the client's advertised UDP size (512 bytes without EDNS0; larger sizes are possible with EDNS0)

DNS-over-TLS (DoT) uses TCP port 853, not port 53.

These rules apply equally to IPv4 and IPv6. The transport protocol (IPv4 or IPv6) is independent of DNS query behavior.

## IPv6 DNS Query Format

A DNS query over IPv6 uses the same DNS message format as IPv4. The only differences are at the IP layer:

```text
Outer IPv6 Header:
  Source: 2001:db8:1::1
  Destination: 2001:db8::53 (DNS server IPv6 address)
  Next Header: UDP (17) or TCP (6)

UDP Header:
  Source Port: 12345 (random ephemeral)
  Destination Port: 53

DNS Message: (identical format to IPv4)
  Query: AAAA www.example.com
```

## UDP vs TCP in IPv6 DNS

```bash
# Most DNS queries use UDP

# dig uses UDP by default
dig AAAA example.com @2001:4860:4860::8888

# Force TCP for DNS query
dig AAAA example.com @2001:4860:4860::8888 +tcp

# Check whether the exchange is using UDP or TCP
tcpdump -i any -n 'host 2001:4860:4860::8888 and port 53' -c 10 &
TCPDUMP_PID=$!
dig AAAA example.com @2001:4860:4860::8888 +tcp
wait $TCPDUMP_PID
# Look for TCP vs UDP in the captured packets
```

## EDNS0 and IPv6

EDNS0 (Extension Mechanisms for DNS) lets a client advertise a UDP payload size larger than 512 bytes. A common starting value is 4096 bytes, although lower values such as 1232 are often used in practice. This is important for DNSSEC responses which can be large:

```bash
# Advertise a 4096 byte EDNS0 UDP buffer
dig AAAA example.com @2001:4860:4860::8888 +bufsize=4096

# Check if EDNS0 is being used in responses
dig AAAA example.com @2001:4860:4860::8888 | grep "EDNS"
# OPT PSEUDOSECTION with version and size info

# Disable EDNS0 (forces 512 byte limit)
dig AAAA example.com @2001:4860:4860::8888 +noedns
```

## IPv6 Fragmentation and DNS

IPv6 does not fragment packets in transit (only at the source). Large DNS responses over UDP may require fragmentation, but IPv6 fragmentation is unreliable in practice because many firewalls drop fragmented IPv6 packets.

The recommended approach:
- Use EDNS0 buffer size of 1232 bytes (to stay within typical IPv6 MTU) for UDP
- Fall back to TCP for responses that exceed the buffer size

```bash
# Use conservative EDNS0 buffer size (RIPE recommendation: 1232)
dig AAAA example.com @2001:4860:4860::8888 +bufsize=1232

# Check if a UDP response is truncated
dig DNSKEY . @2001:4860:4860::8888 +dnssec +bufsize=512 +ignore
# A "tc" flag in the header means the UDP response was truncated
# A resolver should retry over TCP automatically
```

## IPv6 Source Address Selection for DNS Queries

When a client has multiple IPv6 addresses, the OS uses RFC 6724 address selection to pick the source:

```bash
# Check which source address is used for DNS queries
tcpdump -i eth0 -n 'ip6 and port 53' -c 2 &
TCPDUMP_PID=$!
dig AAAA google.com @2001:4860:4860::8888
wait $TCPDUMP_PID

# The source IPv6 address in the captured packets shows what was selected
```

## DNS over IPv6 with Link-Local Addresses

Link-local addresses require specifying the interface:

```bash
# Query DNS server at link-local address (must specify interface with %)
dig AAAA example.com @fe80::1%eth0

# BIND listening on link-local
# In named.conf:
# listen-on-v6 { fe80::1%eth0; };
# (Not recommended for production - use global addresses)
```

## Verifying Full DNS Stack over IPv6

```bash
# Complete end-to-end test: client → resolver → authoritative → response

# 1. Client to recursive resolver over IPv6
dig AAAA example.com @2001:db8::53

# 2. Recursive resolver to authoritative over IPv6
# Enable query logging on resolver to verify
# Unbound: verbosity 3
# BIND: rndc querylog on

# 3. Check the resolver's outbound interface
# For Internet authoritative servers, it should use a global IPv6 address
# Link-local addresses are only valid on the local link
```

## MTU and Fragmentation Issues with IPv6 DNS

```bash
# Test if large DNS responses work (DNSSEC adds signature records)
dig DNSKEY . @2001:4860:4860::8888 +dnssec +bufsize=4096

# If this fails but small queries work: fragmentation problem
# Check whether path MTU discovery is working over IPv6
ping6 -M do -s 1400 2001:4860:4860::8888

# Workaround: reduce EDNS0 buffer size to avoid fragmentation
# /etc/unbound/unbound.conf:
# edns-buffer-size: 1232
```

## Summary

DNS transport over IPv6 uses the same DNS message format as IPv4, just with IPv6 source and destination addresses. UDP port 53 handles most queries, while TCP port 53 is required for cases such as AXFR and truncated UDP responses; DoT uses TCP port 853 instead. Key IPv6-specific concerns include fragmentation (use conservative EDNS0 buffer size of 1232 bytes) and source address selection (RFC 6724 determines which IPv6 address is used for queries). Always allow ICMPv6 through firewalls to enable proper MTU path discovery for DNS.
