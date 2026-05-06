# How to Configure DNS over TLS with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DoT, DNS over TLS, IPv6, Unbound, Stunnel, Privacy, RFC 7858

Description: Configure DNS over TLS (DoT) on port 853 with IPv6 support using Unbound or stunnel, enabling encrypted DNS queries from IPv6 clients.

## Introduction

DNS over TLS (RFC 7858) wraps DNS in a TLS connection on port 853, providing confidentiality and authentication. Configuring it on IPv6 allows IPv6-native clients to query securely without falling back to IPv4.

## Option 1: Unbound Native DoT

```yaml
# /etc/unbound/unbound.conf

server:
    # Plain DNS on localhost
    interface: ::1@53
    interface: 127.0.0.1@53

    # DNS over TLS on IPv6
    interface: 2001:db8::1@853

    access-control: ::/0 allow
    access-control: 0.0.0.0/0 allow

    # TLS certificate
    tls-service-key:  "/etc/ssl/private/dns.example.com.key"
    tls-service-pem:  "/etc/ssl/certs/dns.example.com.crt"
    tls-port: 853

    prefer-ip6: yes
    auto-trust-anchor-file: "/var/lib/unbound/root.key"
```

```bash
# Test

unbound-checkconf
systemctl restart unbound

# Test DoT with kdig
kdig @2001:db8::1 AAAA google.com +tls
# Output: ;; TLS session (TLS1.3)-(ECDHE-...)

# Test with openssl
printf '\x00\x1c\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x06google\x03com\x00\x00\x1c\x00\x01' \
    | openssl s_client -connect [2001:db8::1]:853 -servername dns.example.com -quiet 2>/dev/null | xxd | head
```

## Option 2: stunnel as DoT Wrapper

```ini
# /etc/stunnel/stunnel.conf

[dns-over-tls-ipv6]
accept  = [2001:db8::1]:853
connect = [::1]:53
cert    = /etc/ssl/certs/dns.example.com.crt
key     = /etc/ssl/private/dns.example.com.key
sslVersionMin = TLSv1.2
```

```bash
systemctl restart stunnel4

# Verify
ss -ltnp | grep :853
```

## Option 3: CoreDNS with DoT

```corefile
# Corefile

tls://.:853 {
    tls /etc/ssl/certs/dns.example.com.crt /etc/ssl/private/dns.example.com.key
    forward . 2606:4700:4700::1111 8.8.8.8
    cache 300
    log
}
```

## Certificate Setup

```bash
# Self-signed (for testing)
openssl req -x509 -newkey rsa:4096 \
    -keyout /etc/ssl/private/dns.example.com.key \
    -out /etc/ssl/certs/dns.example.com.crt \
    -days 365 -nodes \
    -subj "/CN=dns.example.com" \
    -addext "subjectAltName=IP:2001:db8::1,DNS:dns.example.com"

# Let's Encrypt
certbot certonly --standalone -d dns.example.com \
    --http-01-address 2001:db8::1

# Update your server config to use
# /etc/letsencrypt/live/dns.example.com/privkey.pem and fullchain.pem
```

## Configure Clients for DoT over IPv6

```bash
# systemd-resolved
# /etc/systemd/resolved.conf

[Resolve]
DNS=2001:db8::1#dns.example.com
DNSOverTLS=yes
DNSSEC=yes

# Restart
systemctl restart systemd-resolved

# Verify
resolvectl status
```

```python
# Python test using dns.query
import dns.message
import dns.query
import ssl

# Query over DoT to IPv6 server
context = ssl.create_default_context()
context.check_hostname = False
context.verify_mode = ssl.CERT_NONE  # For testing only

q = dns.message.make_query("google.com", "AAAA")
r = dns.query.tls(q, "2001:db8::1", port=853, ssl_context=context,
                  server_hostname="dns.example.com")
print(r.answer)
```

## Firewall

```bash
# Allow DoT port 853/TCP on IPv6
ip6tables -A INPUT -p tcp --dport 853 -j ACCEPT
```

## Conclusion

DNS over TLS on IPv6 is straightforward with Unbound: add the IPv6 address with port 853 to `interface:` and provide TLS certificates. Clients using systemd-resolved or Android 9+ can enable DoT natively, and Apple platforms can use encrypted DNS through DNS settings profiles or apps. Monitor DoT endpoint health and certificate expiry with OneUptime's TLS certificate checks.
