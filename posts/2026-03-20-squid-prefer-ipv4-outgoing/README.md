# How to Configure Squid to Prefer IPv4 Over IPv6 for Outgoing Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, IPv4, IPv6, Dns_v4_first, Outgoing, Networking

Description: Configure Squid to prefer IPv4 connections to origin servers using the dns_v4_first and related directives, avoiding IPv6 connectivity issues on dual-stack hosts.

## Introduction

On dual-stack systems, Squid 4 and older may prefer IPv6 for outgoing connections when both A and AAAA records exist, which can cause connectivity failures if IPv6 routing is incomplete. In those releases, `dns_v4_first` changes the connection preference so IPv4 addresses are tried first for dual-stack origins. `tcp_outgoing_address` binds the source address for matching destination address families; it does not turn an IPv6 destination into IPv4.

Squid 5 and later removed `dns_v4_first`. For those versions, IP family usage is primarily controlled by DNS response timing and Squid's Happy Eyeballs behavior, so use firewall rules, DNS recursive-resolver policy, or a Squid build without IPv6 support for strict IPv4-only behavior.

## Using dns_v4_first

```bash
# /etc/squid/squid.conf

# Squid 4.x and older only.
# Prefer IPv4 addresses before IPv6 addresses for dual-stack origin
# connections. Squid still performs both A and AAAA lookups.

dns_v4_first on

# Standard proxy configuration
http_port 10.0.0.1:3128

acl internal src 10.0.0.0/8
http_access allow internal
http_access deny all
```

## Forcing IPv4-Only Operation

For complete IPv6 avoidance, do not rely on `dns_v4_first` or public IPv4 DNS resolver addresses. `dns_v4_first` still performs both A and AAAA lookups in Squid 4, and `dns_nameservers 8.8.8.8` only selects the DNS server transport address. Use a local recursive resolver that filters AAAA answers when you need DNS-level IPv4-only policy.

```bash
# /etc/squid/squid.conf

# Send Squid DNS queries to a local resolver whose policy returns only
# A records for destinations that must be IPv4-only.
dns_nameservers 127.0.0.1

# Listen for proxy clients on IPv4 only. This does not force outgoing
# origin-server connections to use IPv4.
http_port 0.0.0.0:3128
```

For Squid 5 and later, use firewall policy, recursive-resolver configuration, or a build with IPv6 disabled if you need to prevent IPv6 origin connections entirely.

## Verifying Outgoing Connection IP Version

```bash
# Validate the configuration before reload
sudo squid -k parse

# Squid 4-6: inspect DNS cache and internal DNS reports
squidclient -h 127.0.0.1 mgr:ipcache
squidclient -h 127.0.0.1 mgr:idns

# Squid 7 and later: use the HTTP cache manager endpoint instead
curl http://127.0.0.1:3128/squid-internal-mgr/ipcache

# Or use cache log to see DNS resolution
sudo tail -f /var/log/squid/cache.log

# Test: request a dual-stack site and check in access log
curl -x http://10.0.0.1:3128 http://www.google.com/

# Check access log for connection details
sudo tail -5 /var/log/squid/access.log

# Use tcpdump to verify IPv4 is used for outgoing
sudo tcpdump -i eth0 -n -c 5 '(ip or ip6) and host www.google.com'
# Should show IPv4 packets (IP) not IPv6 (IP6)
```

## OS-Level IPv4 Preference

Complement Squid settings with OS-level address preference for applications that use glibc `getaddrinfo()` address sorting. Squid normally uses its internal DNS resolver, and Squid 5 and later have their own Happy Eyeballs behavior, so treat this as a system-wide complement rather than a Squid-only control.

```bash
# /etc/gai.conf - control getaddrinfo() address selection
# If you add any label or precedence lines, keep the rest of the table
# because glibc does not use the default table for that keyword.
label      ::1/128       0
label      ::/0          1
label      2002::/16     2
label      ::/96         3
label      ::ffff:0:0/96 4

precedence ::1/128       50
precedence ::/0          40
precedence 2002::/16     30
precedence ::/96         20
precedence ::ffff:0:0/96 100  # Higher precedence for IPv4-mapped addresses
```

## Testing IPv4 Preference

```bash
# Verify dns_v4_first is set only on Squid 4 and older
squid -v
sudo grep dns_v4_first /etc/squid/squid.conf

# Validate and reload Squid
sudo squid -k parse
sudo squid -k reconfigure

# Test with a dual-stack host
curl -x http://10.0.0.1:3128 http://www.google.com/

# Check DNS resolution
squidclient -h 127.0.0.1 mgr:ipcache | grep -A5 -i "www.google.com"
```

## Conclusion

Setting `dns_v4_first on` in Squid 4 and older causes it to try IPv4 addresses before IPv6 addresses when connecting to dual-stack origin servers. It does not disable AAAA lookups, and it does not guarantee IPv4-only operation. For Squid 5 and later, use firewall policy, recursive-resolver policy, or a build without IPv6 support for strict IPv4-only operation. Binding `http_port` to `0.0.0.0:3128` only limits client connections to the proxy's IPv4 listener.
