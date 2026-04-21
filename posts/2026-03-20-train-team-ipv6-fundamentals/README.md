# How to Train Your Team on IPv6 Fundamentals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Training, Team Learning, Network Engineering, Migration

Description: Build an IPv6 training program for engineering and operations teams covering address formats, SLAAC/DHCPv6, routing, security, and hands-on labs.

## Introduction

IPv6 training is often overlooked in migration planning, leading to configurations that technically work but use anti-patterns, or to troubleshooting delays because engineers misread compressed addresses. An effective training program covers address syntax, configuration patterns, security differences from IPv4, and hands-on lab practice.

## Training Curriculum by Role

### Network Engineers (16 hours)

| Module | Duration | Topics |
|--------|----------|--------|
| IPv6 Address Format | 2h | Hex notation, groups, :: compression, EUI-64, interface IDs |
| Address Types | 2h | Global unicast, link-local, multicast, anycast, ULA |
| SLAAC and DHCPv6 | 2h | RA M/O flags, Prefix Information A flag, stateless vs stateful, prefix delegation |
| Routing | 2h | OSPFv3, BGP4+, route summarization differences |
| Transition Mechanisms | 2h | Dual-stack, NAT64/DNS64, legacy 6to4/Teredo |
| Security | 2h | RA Guard, DHCPv6 snooping, ICMPv6 policy, NDP |
| Hands-on Lab | 4h | Configure dual-stack on routers and switches |

### Developers (8 hours)

| Module | Duration | Topics |
|--------|----------|--------|
| Address Basics | 1h | What IPv6 looks like, URI format, zone IDs |
| Socket Programming | 2h | AF_INET6, IPV6_V6ONLY, dual-stack servers |
| DNS Changes | 1h | AAAA records, getaddrinfo(), Happy Eyeballs |
| Common Pitfalls | 2h | Hardcoding, string parsing, regex patterns |
| Hands-on Lab | 2h | Fix a sample application for IPv6 support |

### Operations/SRE (4 hours)

| Module | Duration | Topics |
|--------|----------|--------|
| Reading IPv6 Addresses | 1h | Compressed form, recognizing address types |
| Troubleshooting Tools | 1h | ping -6, traceroute -6, ss, ip -6, dig AAAA |
| Log Analysis | 1h | Parsing IPv6 in logs, filter commands |
| Monitoring | 1h | Updating alert rules for IPv6 addresses |

## Hands-On Lab: IPv6 Quick Reference

Provide this cheat sheet during training:

```bash
# Check your IPv6 address

ip -6 addr show scope global

# Ping IPv6 (loopback test)
ping -6 ::1
ping -6 -c 4 2001:4860:4860::8888

# Traceroute over IPv6
traceroute -6 2001:4860:4860::8888

# DNS: look up AAAA record
dig AAAA google.com
nslookup -type=AAAA google.com

# Check if a service listens on IPv6
ss -6 -tlnp

# Test HTTP over IPv6
curl -6 https://ipv6.google.com
curl -v http://[fd00:10ab::10]/

# Check IPv6 routing table
ip -6 route show
ip -6 route get 2001:4860:4860::8888

# NDP neighbor table (like ARP for IPv6)
ip -6 neigh show
```

## Training Lab Environment

Set up a practice environment using Docker:

```yaml
# docker-compose.yml for IPv6 training lab

networks:
  ipv6-lab:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "fd00:10ab::/64"

services:
  router:
    image: ubuntu:22.04
    command: bash -c "apt-get update -q && apt-get install -y iproute2 iputils-ping traceroute curl dnsutils && sleep infinity"
    networks:
      ipv6-lab:
        ipv6_address: "fd00:10ab::1"
    cap_add:
      - NET_ADMIN

  client1:
    image: ubuntu:22.04
    command: bash -c "apt-get update -q && apt-get install -y iproute2 iputils-ping traceroute curl dnsutils && sleep infinity"
    networks:
      - ipv6-lab

  webserver:
    image: nginx:alpine
    networks:
      ipv6-lab:
        ipv6_address: "fd00:10ab::10"
```

```bash
# Start the lab
docker compose up -d

# Connect to client
docker compose exec client1 bash

# Try exercises:
# 1. ping -6 fd00:10ab::1
# 2. curl http://[fd00:10ab::10]/
# 3. ip -6 addr show
# 4. ip -6 route show
```

## Common Misconceptions to Address

| Misconception | Correct Understanding |
|--------------|----------------------|
| "IPv6 is just IPv4 with longer addresses" | Different header format, no broadcast, no routine NAT requirement, new concepts (NDP, RA, SLAAC) |
| ":: means unknown" | By itself, `::` is the unspecified address; inside an address, it compresses one or more zero groups; `::1` is loopback |
| "IPv6 is optional" | IPv4 exhaustion and public IPv4 scarcity mean new Internet-facing growth should plan for IPv6 |
| "IPv6 is slower" | IPv6 is not inherently slower; performance depends on network paths, hardware, and policy |
| "We can skip training" | Misconfiguration is a common IPv6 issue source |

## Conclusion

IPv6 training investment pays off in fewer configuration errors and faster troubleshooting. Tailor training depth to each role - network engineers need full protocol knowledge, developers need socket API and URI format awareness, and operations staff need reading and troubleshooting skills. Always include hands-on lab time: theory alone does not build the pattern recognition needed to confidently read `2001:db8:cafe:1::ff00` or debug an NDP neighbor discovery failure.
