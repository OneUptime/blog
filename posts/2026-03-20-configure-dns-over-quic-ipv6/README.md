# How to Configure DNS over QUIC with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DoQ, DNS over QUIC, IPv6, AdGuard, Dnsdist, Privacy, RFC 9250

Description: Configure DNS over QUIC (DoQ) on port 853 with IPv6 support using AdGuard Home or dnsdist, enabling fast, encrypted DNS with 0-RTT connections for IPv6 clients.

## Introduction

DNS over QUIC (RFC 9250) uses QUIC as the transport, providing lower latency through 0-RTT connection resumption and no head-of-line blocking. IPv6 is a natural fit for DoQ since QUIC runs over UDP, which IPv6 handles efficiently.

## Option 1: AdGuard Home with DoQ

```yaml
# /opt/AdGuardHome/AdGuardHome.yaml

dns:
  bind_hosts:
    - "::"
    - "0.0.0.0"
  port: 53

tls:
  enabled: true
  server_name: dns.example.com
  certificate_path: /etc/ssl/certs/dns.example.com.crt
  private_key_path: /etc/ssl/private/dns.example.com.key

  # DNS over QUIC (UDP port 853 is the standard/default DoQ port)
  port_dns_over_quic: 853

  # Also enable DoH and DoT
  port_https: 443
  port_dns_over_tls: 853
```

```bash
# Restart AdGuard Home

systemctl restart AdGuardHome

# Test DoQ (requires a DoQ-capable client such as q or kdig)
# DoQ URI: quic://dns.example.com:853
```

## Option 2: dnsdist with DoQ

```lua
-- /etc/dnsdist/dnsdist.conf

-- DNS-over-QUIC listeners
-- (requires dnsdist 1.9.0+ with incoming DoQ support)
addDOQLocal("[::]:853", "/etc/ssl/certs/dns.crt", "/etc/ssl/private/dns.key", {
    reusePort=true
})
addDOQLocal("0.0.0.0:853", "/etc/ssl/certs/dns.crt", "/etc/ssl/private/dns.key")

-- Optional plain DNS listener on localhost
addLocal("[::1]:53")

-- Upstream resolvers
newServer({address="2606:4700:4700::1111"})
newServer({address="8.8.8.8"})
```

## Step: Certificate Configuration

```bash
# Self-signed certificate with IPv6 SAN
openssl req -x509 -newkey ec \
    -pkeyopt ec_paramgen_curve:P-256 \
    -keyout /etc/ssl/private/dns.key \
    -out /etc/ssl/certs/dns.crt \
    -days 365 -nodes \
    -subj "/CN=dns.example.com" \
    -addext "subjectAltName=DNS:dns.example.com,IP:2001:db8::1"

# Let's Encrypt (for public servers)
certbot certonly --standalone -d dns.example.com
```

## Testing DoQ

```bash
# Using q (DNS client with DoQ support)
go install github.com/natesales/q@latest
q google.com AAAA @quic://[2001:db8::1]:853

# Using kdig (Knot DNS utils with DoQ support)
kdig @2001:db8::1 +quic AAAA google.com
```

## Comparison: DoQ vs DoT vs DoH over IPv6

```python
# Conceptual latency comparison
protocols = {
    "Plain DNS (UDP)":      {"rtt_ms": 5,    "encrypted": False, "0rtt": False},
    "DoT (TCP+TLS)":        {"rtt_ms": 55,   "encrypted": True,  "0rtt": False},
    "DoH (HTTP/2+TLS)":     {"rtt_ms": 60,   "encrypted": True,  "0rtt": False},
    "DoQ (QUIC+TLS)":       {"rtt_ms": 25,   "encrypted": True,  "0rtt": False},
    "DoQ (0-RTT resume)":   {"rtt_ms": 5,    "encrypted": True,  "0rtt": True},
}
# DoQ can reduce latency versus DoT/DoH because QUIC avoids TCP
# head-of-line blocking and can use 0-RTT on resumed sessions
```

## Client Configuration

```bash
# Android 9+ - Private DNS
# Settings → Network → Advanced → Private DNS
# Set to: dns.example.com
# (Private DNS uses DNS-over-TLS, not DoQ)

# systemd-resolved
# systemd-resolved supports DNS-over-TLS via DNSOverTLS=, not DoQ

# Browser (Firefox) - DoH
# about:config → network.trr.uri = https://dns.example.com/dns-query
```

## Firewall

```bash
# Allow DoQ port 853/UDP on IPv6
ip6tables -A INPUT -p udp --dport 853 -j ACCEPT
```

## Conclusion

DNS over QUIC provides the encryption of DoT with lower latency through QUIC's 0-RTT session resumption. IPv6 benefits especially since QUIC natively supports UDP. AdGuard Home and dnsdist 1.9.0+ offer production-ready DoQ with IPv6 listeners. Monitor DoQ endpoint availability with OneUptime's UDP port checks.
