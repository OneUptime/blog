# How to Configure DNS over HTTPS with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DoH, DNS over HTTPS, IPv6, Unbound, Nginx, Privacy, RFC 8484

Description: Configure DNS over HTTPS (DoH) servers that listen on IPv6, including NGINX reverse proxy setup and Unbound backend, with TLS certificate configuration.

## Introduction

DNS over HTTPS (RFC 8484) encrypts DNS queries inside HTTPS traffic, preventing eavesdropping. A DoH server can listen on an IPv6 address, allowing IPv6 clients to query it securely. This post covers deploying a DoH server using NGINX as the HTTPS frontend and Unbound as the DNS backend.

## Architecture

```text
IPv6 Client
    → HTTPS GET/POST https://dns.example.com/dns-query
    → NGINX (TLS termination, IPv6)
    → Unbound (DoH backend on localhost)
    → Authoritative servers
```

## Step 1: Obtain TLS Certificate

```bash
# Let's Encrypt for a DNS server (must have public IPv6 + domain)

certbot certonly --standalone \
    -d dns.example.com \
    --preferred-challenges http \
    --http-01-address 2001:db8::1

# Or use acme.sh
acme.sh --issue -d dns.example.com \
    --standalone \
    --listen-v6
```

## Step 2: Configure NGINX as DoH Proxy

```nginx
# /etc/nginx/sites-available/doh

server {
    # Listen on IPv6 (and IPv4) for HTTPS
    listen [::]:443 ssl;
    listen 443 ssl;
    http2 on;

    server_name dns.example.com;

    ssl_certificate     /etc/letsencrypt/live/dns.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dns.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # DoH endpoint - RFC 8484
    location /dns-query {
        proxy_pass http://127.0.0.1:5380;  # Local Unbound DoH backend
        proxy_http_version 2;
        proxy_set_header Connection "";
        proxy_set_header Host $host;

        # Accept both GET and POST
        limit_except GET POST { deny all; }
    }
}
```

## Step 3: Configure Unbound as the DoH Backend

```conf
# /etc/unbound/unbound.conf

server:
    interface: 127.0.0.1@5380
    access-control: 127.0.0.1/32 allow
    prefer-ip6: yes
    auto-trust-anchor-file: "/var/lib/unbound/root.key"
    https-port: 5380
    http-endpoint: "/dns-query"
    http-notls-downstream: yes
    tls-service-pem: "/etc/letsencrypt/live/dns.example.com/fullchain.pem"
    tls-service-key: "/etc/letsencrypt/live/dns.example.com/privkey.pem"

# Or use CoreDNS as a native DoH server instead:
```

```corefile
# Corefile for a native CoreDNS DoH server
https://.:443 {
    bind 2001:db8::1
    tls /etc/letsencrypt/live/dns.example.com/fullchain.pem /etc/letsencrypt/live/dns.example.com/privkey.pem
    forward . 2606:4700:4700::1111 8.8.8.8
    cache 300
    log
}
```

## Step 4: Native DoH in dnsdist

```lua
-- /etc/dnsdist/dnsdist.conf

-- Listen for DoH on IPv6
addDOHLocal("[::]:443", "/etc/ssl/doh.crt", "/etc/ssl/doh.key", { "/dns-query" }, {
    reusePort=true,
    minTLSVersion="tls1.2"
})

-- Listen for plain DNS from local resolvers
addLocal("127.0.0.1:53")
addLocal("[::1]:53")

-- Route to upstream
newServer({address="[2606:4700:4700::1111]:53", name="cloudflare-v6"})
newServer({address="8.8.8.8", name="google-v4"})
```

## Step 5: Test DoH over IPv6

```bash
# Test with curl (RFC 8484 GET method)
DNS_QUERY='AAABAAABAAAAAAAAB2V4YW1wbGUDY29tAAABAAE'

curl --ipv6 -s "https://dns.example.com/dns-query?dns=${DNS_QUERY}" \
    -H "Accept: application/dns-message" \
    --resolve "dns.example.com:443:[2001:db8::1]" \
    -o /dev/null -w "%{http_code}\n"

# Use kdig (from Knot DNS utils)
kdig @dns.example.com +https=/dns-query google.com AAAA

# Use dog (modern DNS client)
dog google.com AAAA --https --nameserver dns.example.com
```

## Step 6: Configure Firefox to Use Custom DoH

```text
about:config
network.trr.mode = 2  (prefer DoH)
network.trr.uri = https://dns.example.com/dns-query
network.trr.bootstrapAddress = 2001:db8::1  (optional if dns.example.com already resolves)
```

## Conclusion

A DoH server on IPv6 requires a TLS certificate, HTTPS listener bound to `[::]:443`, and a DNS backend (Unbound, CoreDNS, or dnsdist). Clients with IPv6 connectivity can use DoH at `https://dns.example.com/dns-query`, with `dns.example.com` resolving to your IPv6 address. Monitor DoH endpoint availability and latency with OneUptime's HTTPS checks.
