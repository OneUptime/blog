# How to Configure AdGuard Home for IPv6 DNS Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AdGuard Home, DNS, IPv6, Filtering, DoH, DoT, Ad Blocking

Description: Configure AdGuard Home to listen on IPv6, serve encrypted DNS (DoH/DoT) over IPv6, and filter ads and trackers for dual-stack and IPv6-only clients.

## Introduction

AdGuard Home is a self-hosted DNS ad-blocker with a web UI, support for DNS-over-HTTPS, DNS-over-TLS, and DNS-over-QUIC. It can listen on IPv6 and route IPv6 clients through filtering upstream resolvers.

## Installation

```bash
# Download and install

curl -s -S -L https://raw.githubusercontent.com/AdguardTeam/AdGuardHome/master/scripts/install.sh | sh -s -- -v

# Or via Docker
docker run -d \
    --name adguardhome \
    -v /opt/adguardhome/work:/opt/adguardhome/work \
    -v /opt/adguardhome/conf:/opt/adguardhome/conf \
    -p 53:53/udp -p 53:53/tcp \
    -p 3000:3000/tcp \
    -p 443:443/tcp \
    -p 853:853/tcp -p 853:853/udp \
    adguard/adguardhome
```

## Step 1: Configure IPv6 Listening

```yaml
# /opt/AdGuardHome/AdGuardHome.yaml

dns:
  # Bind to all interfaces
  bind_hosts:
    - "::"
  port: 53

  # Or specific IPv6 address
  # bind_hosts:
  #   - "2001:db8::1"
  #   - "127.0.0.1"
```

## Step 2: IPv6 Upstream Resolvers

```yaml
# /opt/AdGuardHome/AdGuardHome.yaml

dns:
  upstream_dns:
    - "https://dns.cloudflare.com/dns-query"        # DoH
    - "tls://1dot1dot1dot1.cloudflare-dns.com"      # DoT
    - "2606:4700:4700::1111"                        # Plain IPv6
    - "2606:4700:4700::1001"
    - "8.8.8.8"                                      # IPv4 fallback

  # Use parallel queries for speed
  upstream_mode: parallel

  # Bootstrap resolvers (to resolve DoH hostnames)
  bootstrap_dns:
    - "2606:4700:4700::1111"
    - "8.8.8.8"
  bootstrap_prefer_ipv6: true
```

## Step 3: Enable DoH and DoT on IPv6

```yaml
# /opt/AdGuardHome/AdGuardHome.yaml

tls:
  enabled: true
  server_name: "dns.example.com"
  force_https: false
  port_https: 443       # DoH
  port_dns_over_tls: 853  # DoT
  port_dns_over_quic: 853  # DoQ

  # Certificate (Let's Encrypt or self-signed)
  certificate_path: /etc/ssl/dns.example.com.crt
  private_key_path: /etc/ssl/dns.example.com.key
```

```bash
# Publish an AAAA record for dns.example.com that points to 2001:db8::1.

# Access DoH over IPv6:
# https://dns.example.com/dns-query

# Access DoT over IPv6:
# tls://dns.example.com

# Test DoH
curl -6 \
    --resolve dns.example.com:443:[2001:db8::1] \
    --doh-url https://dns.example.com/dns-query \
    -I https://example.com
```

## Step 4: Filtering Lists

```yaml
# /opt/AdGuardHome/AdGuardHome.yaml

filters:
  - enabled: true
    url: "https://adguardteam.github.io/HostlistsRegistry/assets/filter_1.txt"
    name: AdGuard DNS filter
    id: 1
  - enabled: true
    url: "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts"
    name: StevenBlack Hosts
    id: 2
```

## Step 5: Local AAAA Records

```yaml
# /opt/AdGuardHome/AdGuardHome.yaml

filtering:
  # Custom DNS rewrites (local AAAA)
  rewrites:
    - domain: "homeserver.home.arpa"
      answer: "2001:db8::50"
    - domain: "nas.home.arpa"
      answer: "2001:db8::51"
    - domain: "*.home.arpa"
      answer: "2001:db8::1"
```

## Step 6: Test

```bash
# Restart AdGuard Home
systemctl restart AdGuardHome

# Test AAAA query filtering
dig AAAA doubleclick.net @2001:db8::1
# With the default blocking mode, blocked AAAA queries return ::

# Test local record
dig AAAA homeserver.home.arpa @2001:db8::1

# Check web UI
curl http://127.0.0.1:3000
```

## Conclusion

AdGuard Home supports IPv6 listening and upstream resolution natively. Set `bind_hosts: ["::"]`, add IPv6 upstream resolvers, and publish an AAAA record for your DoH/DoT hostname so dual-stack and IPv6-only clients can reach it over IPv6. Monitor AdGuard Home query throughput and filter hit rates with OneUptime.
