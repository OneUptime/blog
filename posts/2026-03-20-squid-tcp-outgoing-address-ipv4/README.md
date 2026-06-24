# How to Configure tcp_outgoing_address in Squid for IPv4 Source IP Selection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, IPv4, Tcp_outgoing_address, Source IP, Proxy, Outbound

Description: Use Squid's tcp_outgoing_address directive to control which IPv4 source address is used when making outbound connections to origin servers.

## Introduction

On multi-homed servers running Squid 7 or earlier, Squid can be configured to use a specific IPv4 address as the source IP for outbound connections. This is useful for routing outbound traffic through specific interfaces, applying different source IPs for different client groups, or meeting allowlisting requirements at destination servers.

## Basic tcp_outgoing_address

```bash
# /etc/squid/squid.conf

# Use specific IPv4 as source for all outbound connections

tcp_outgoing_address 203.0.113.10

# Combined with listening on internal interface
http_port 10.0.0.1:3128
```

## Different Source IPs for Different Client Groups

Use ACLs to assign different outbound IPs per client subnet. Because these ACLs are client-dependent, disable server-side persistent connections:

```bash
# /etc/squid/squid.conf

http_port 10.0.0.1:3128

server_persistent_connections off

# Define client groups
acl dept_engineering src 10.0.1.0/24
acl dept_marketing   src 10.0.2.0/24
acl dept_finance     src 10.0.3.0/24

# Assign different outbound IPv4 per department
# (company has multiple public IPs for IP-based rate limiting at SaaS providers)
tcp_outgoing_address 203.0.113.10 dept_engineering
tcp_outgoing_address 203.0.113.11 dept_marketing
tcp_outgoing_address 203.0.113.12 dept_finance

# Default outbound IP for everyone else
tcp_outgoing_address 203.0.113.5

# Access control
acl internal src 10.0.0.0/8
http_access allow internal
http_access deny all
```

## Routing Around Blocked Destinations

Use different source IPs when accessing specific destinations:

```bash
acl blocked_for_ip1 dstdomain .restricted-site.com

# Use alternate IP for restricted destinations
tcp_outgoing_address 203.0.113.20 blocked_for_ip1
tcp_outgoing_address 203.0.113.10
```

## Combining with Routing Tables

When using multiple public IPs, ensure the OS routes outbound traffic correctly:

```bash
# Add secondary IP to interface
sudo ip addr add 203.0.113.11/24 dev eth0

# Add policy routing: traffic from 203.0.113.11 uses table 100
sudo ip rule add from 203.0.113.11 lookup 100
sudo ip route add default via 203.0.113.1 table 100

# Verify routing
sudo ip route get 8.8.8.8 from 203.0.113.11
```

## Verifying Source IP

```bash
# From a client using the proxy, check what source IP reaches the destination
curl -x http://10.0.0.1:3128 https://httpbin.org/ip

# Expected: shows the tcp_outgoing_address IPv4
# { "origin": "203.0.113.10" }

# Check Squid logs for outgoing connections
sudo tail -f /var/log/squid/access.log
```

## Conclusion

`tcp_outgoing_address` in Squid 7 and earlier controls the source IPv4 for outbound proxy connections. Use it without ACLs for a global source IP override, or combine with ACLs to apply different source addresses per client group, destination domain, or time of day. Ensure the OS routing table is configured to route traffic from each source IP through the correct gateway.
