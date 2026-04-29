# How to Set Up DNS Server for IPv4 on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, DNS, IPv4, Network Configuration, Caching

Description: Configure the MikroTik RouterOS DNS server to provide IPv4 caching, static DNS entries, and DNS forwarding for LAN clients, with optional DNS over HTTPS.

## Introduction

MikroTik includes a built-in DNS caching resolver. When enabled, it handles DNS queries from LAN clients, caches results, and forwards unresolved queries to upstream DNS servers. You can also add static DNS entries for local hostname resolution.

## Enable DNS Server

```mikrotik
# Configure upstream DNS servers and enable local caching

/ip dns set \
  servers=8.8.8.8,1.1.1.1 \
  allow-remote-requests=yes \
  cache-size=4096 \
  cache-max-ttl=1d

# Verify
/ip dns print
```

## Add Static DNS Entries

```mikrotik
# Static hostname → IPv4 mapping
/ip dns static add name=router.local address=192.168.1.1 ttl=1d
/ip dns static add name=nas.local address=192.168.1.50 ttl=1d
/ip dns static add name=printer.local address=192.168.1.60 ttl=1d

# Wildcard entry (all subdomains of .corp → internal IP)
/ip dns static add name=corp match-subdomain=yes address=10.1.1.1 ttl=300

# List all static entries
/ip dns static print
```

## Configure DHCP to Use Router as DNS

```mikrotik
/ip dhcp-server network set 0 dns-server=192.168.1.1
# Now all DHCP clients use the router as their DNS server
```

## Firewall Rule - Block External DNS Queries from LAN

```mikrotik
# Prevent LAN clients from bypassing the router's DNS
/ip firewall nat add \
  chain=dstnat \
  src-address=192.168.1.0/24 \
  protocol=udp \
  dst-port=53 \
  dst-address=!192.168.1.1 \
  action=dst-nat \
  to-addresses=192.168.1.1 \
  to-ports=53 \
  comment="Redirect all DNS to router"

/ip firewall nat add \
  chain=dstnat \
  src-address=192.168.1.0/24 \
  protocol=tcp \
  dst-port=53 \
  dst-address=!192.168.1.1 \
  action=dst-nat \
  to-addresses=192.168.1.1 \
  to-ports=53
```

## DNS over HTTPS (DoH)

```mikrotik
# RouterOS v7 supports DoH
/ip dns set \
  use-doh-server=https://cloudflare-dns.com/dns-query \
  verify-doh-cert=yes

# Import DoH CA certificate first
/certificate import file-name=cloudflare.pem
```

## Monitor DNS Cache

```mikrotik
# Show cached DNS records
/ip dns cache print

# Flush DNS cache
/ip dns cache flush

# Show DNS statistics
/ip dns print
```

## Conclusion

Enable MikroTik DNS with `allow-remote-requests=yes` and point DHCP clients to the router as their DNS server. Add static entries for local hostnames, redirect all LAN DNS traffic to the router with a NAT rule to prevent DNS bypass, and use DoH (RouterOS v7) for encrypted upstream resolution.
