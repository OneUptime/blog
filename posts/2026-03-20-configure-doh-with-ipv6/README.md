# How to Configure DNS-over-HTTPS (DoH) with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, DNS-over-HTTPS, DoH, Privacy

Description: A guide to configuring DNS-over-HTTPS (DoH) servers and clients with IPv6 support, enabling encrypted DNS queries over HTTPS using IPv6 transport.

## What Is DNS-over-HTTPS?

DNS-over-HTTPS (DoH), defined in RFC 8484, sends DNS queries inside HTTPS requests to port 443. It provides DNS privacy and security by encrypting queries. DoH can use both IPv4 and IPv6 transport - the DNS query is carried inside HTTPS, which runs over TCP/TLS, which can use IPv6.

## Setting Up a DoH Server with dnsdist over IPv6

dnsdist is a DNS load balancer that supports DoH and IPv6:

```bash
# Install dnsdist

apt install dnsdist

# /etc/dnsdist/dnsdist.conf
```

```lua
-- dnsdist configuration for DoH over IPv6

-- Accept DoH connections on all IPv6 addresses, port 443
-- Requires TLS certificate
addDOHLocal("[::]:443", "/etc/ssl/certs/server.crt", "/etc/ssl/private/server.key",
    "/dns-query", {
        -- CORS header for browser compatibility
        customResponseHeaders = {
            ["access-control-allow-origin"] = "*"
        }
    }
)

-- Also accept standard DNS over IPv6
addLocal("[::]:53")
addLocal("0.0.0.0:53")

-- Send queries to upstream resolvers
newServer({address="2001:4860:4860::8888", name="google-v6"})
newServer({address="8.8.8.8", name="google-v4"})

-- Allow all clients
setACL({"0.0.0.0/0", "::/0"})
```

## Setting Up a DoH Server with CoreDNS over IPv6

```corefile
# /etc/coredns/Corefile

https://.:443 {
    # Enable DoH on port 443; the default wildcard bind includes IPv6

    tls /etc/ssl/certs/server.crt /etc/ssl/private/server.key

    # Forward queries to upstream resolvers, preferring IPv6 targets
    forward . 2001:4860:4860::8888 2001:4860:4860::8844 8.8.8.8 {
        prefer_udp
    }

    cache 300
    log
    errors
}
```

## Configuring Clients to Use DoH over IPv6

### Firefox

1. Open **Settings** → **Network Settings** → **Settings**
2. Enable **DNS over HTTPS**
3. Enter the DoH server URL, for example: `https://resolver.example.com/dns-query`

Note: If you use a literal IPv6 address, the URL must use bracket notation, for example `https://[2001:db8::53]/dns-query`, and the TLS certificate must be valid for that IP address.

### curl with DoH

```bash
# Use curl to make a standard DoH GET query over IPv6
# The DoH server must have an AAAA record (or use --resolve)
curl -6 --http2 \
    -H "accept: application/dns-message" \
    "https://dns.google/dns-query?dns=AAABAAABAAAAAAAAB2V4YW1wbGUDY29tAAAcAAE" \
    --output response.bin

# DoH over IPv6 using POST method
# Build a minimal DNS AAAA query for example.com in wire format
python3 - <<'PY'
import base64

query = b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00'
query += b'\x07example\x03com\x00\x00\x1c\x00\x01'

with open("query.bin", "wb") as f:
    f.write(query)

print(base64.urlsafe_b64encode(query).rstrip(b"=").decode())
PY

curl -6 --http2 \
    -H "content-type: application/dns-message" \
    -H "accept: application/dns-message" \
    --data-binary @query.bin \
    "https://dns.google/dns-query" \
    --output response.bin
```

### Unbound as a DoH Server

Unbound can serve DoH to downstream clients:

```yaml
# /etc/unbound/unbound.conf

server:
    interface: ::0@443
    interface: 0.0.0.0@443
    tls-service-key: "/etc/ssl/private/server.key"
    tls-service-pem: "/etc/ssl/certs/server.crt"
    http-endpoint: "/dns-query"
    do-ip6: yes
    access-control: ::/0 allow
    access-control: 0.0.0.0/0 allow
```

## Testing DoH over IPv6

```bash
# Test DoH endpoint with curl over IPv6
curl -6 --http2 \
    -H "accept: application/dns-message" \
    "https://dns.google/dns-query?dns=AAABAAABAAAAAAAAB2V4YW1wbGUDY29tAAAcAAE" \
    --output response.bin

# Using kdig (from knot-dnsutils)
kdig -6 @dns.google +https AAAA example.com

# Using dig with DoH (dig 9.18+)
dig -6 @dns.google +https AAAA example.com
```

## Firewall Rules for DoH over IPv6

```bash
# Allow HTTPS (port 443) over IPv6 for DoH
ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 443 -j ACCEPT

# Allow established connections
ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
```

## DoH Server Discovery with SVCB Records

RFC 9460 defines SVCB/HTTPS records, and RFCs 9461 and 9462 define how SVCB records can advertise DoH support and be used for discovery:

```dns
; Advertise a DoH-capable resolver via SVCB
_dns.doh.example.  7200 IN SVCB 1 doh.example. alpn=h2 dohpath=/dns-query{?dns} ipv6hint=2001:db8::53
```

## Summary

DNS-over-HTTPS with IPv6 uses standard HTTPS over IPv6 transport. Configure DoH servers (dnsdist, CoreDNS, or Unbound) to listen on port 443 with TLS certificates. Clients typically connect to a DoH hostname that resolves to AAAA records; if you use a literal IPv6 address in the URL, it must be bracketed and covered by the server certificate. Test with `curl -6` or a DoH-capable DNS client against your endpoint and ensure port 443/TCP is allowed through IPv6 firewalls.
