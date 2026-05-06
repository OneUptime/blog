# How to Configure DNS-over-TLS (DoT) with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, DNS-over-TLS, DoT, Security

Description: A guide to setting up DNS-over-TLS (DoT) servers and clients over IPv6, providing encrypted DNS queries on port 853 using IPv6 transport.

## What Is DNS-over-TLS?

DNS-over-TLS (DoT), defined in RFC 7858, wraps DNS queries in TLS on TCP port 853. Unlike DoH (which uses HTTPS), DoT is a simpler protocol that is easier to deploy on dedicated DNS servers. Both IPv4 and IPv6 transport are supported.

## Setting Up a DoT Server with Unbound

Unbound supports DoT natively:

```bash
# Install Unbound

apt install unbound

# Generate a TLS certificate (or use Let's Encrypt)
openssl req -x509 -newkey rsa:4096 -keyout /etc/unbound/dot.key \
    -out /etc/unbound/dot.crt -days 365 -nodes \
    -subj "/CN=dns.example.com" \
    -addext "subjectAltName = DNS:dns.example.com"

# Or get a certificate from Let's Encrypt
certbot certonly --standalone -d dns.example.com
```

```yaml
# /etc/unbound/unbound.conf

server:
    # Standard DNS on all interfaces
    interface: 0.0.0.0
    interface: ::0
    port: 53

    # DoT on all interfaces (port 853)
    interface: 0.0.0.0@853
    interface: ::0@853          # IPv6 DoT listener

    # TLS certificate configuration
    tls-service-key: "/etc/unbound/dot.key"
    tls-service-pem: "/etc/unbound/dot.crt"

    # Allow queries from all clients (adjust as needed)
    access-control: 0.0.0.0/0 allow
    access-control: ::/0 allow

    # IPv6 support
    do-ip6: yes

    # DNSSEC validation
    auto-trust-anchor-file: "/var/lib/unbound/root.key"

    # Module order
    module-config: "validator iterator"
```

## Setting Up a DoT Server with dnsdist

```lua
-- /etc/dnsdist/dnsdist.conf

-- Standard DNS on all interfaces
addLocal("0.0.0.0:53")
addLocal("[::]:53")

-- DoT on IPv6
addTLSLocal("[::]:853", "/etc/ssl/certs/server.crt", "/etc/ssl/private/server.key", {
    -- TLS minimum version
    minTLSVersion = "tls1.2"
})

-- Upstream resolvers
newServer({address="2001:4860:4860::8888"})
newServer({address="8.8.8.8"})

-- Allow all clients
setACL({"0.0.0.0/0", "::/0"})
```

## Configuring Clients for DoT over IPv6

### Using Unbound as a DoT Client

```yaml
# /etc/unbound/unbound.conf - forward to DoT servers over IPv6

server:
    interface: ::0
    do-ip6: yes
    # Load system CA certificates for upstream TLS validation
    tls-system-cert: yes

# Forward all queries to upstream DoT servers
forward-zone:
    name: "."
    # Google DoT over IPv6
    forward-addr: 2001:4860:4860::8888@853#dns.google
    forward-addr: 2001:4860:4860::8844@853#dns.google
    # Cloudflare DoT over IPv6
    forward-addr: 2606:4700:4700::1111@853#cloudflare-dns.com
    # Enable TLS for forwarding
    forward-tls-upstream: yes
```

### Using systemd-resolved with DoT

```ini
# /etc/systemd/resolved.conf

[Resolve]
# IPv6 DoT server
DNS=2001:4860:4860::8888#dns.google 2606:4700:4700::1111#cloudflare-dns.com
DNSOverTLS=yes
```

```bash
# Restart systemd-resolved
systemctl restart systemd-resolved

# Verify DoT is being used
resolvectl status
# Should show "DNS over TLS setting: yes"
```

## Testing DoT over IPv6

```bash
# Test DoT connection using kdig (from knot-dnsutils)
kdig -6 @2001:4860:4860::8888 +tls-ca +tls-hostname=dns.google AAAA example.com

# Test using openssl to verify TLS certificate
openssl s_client -connect [2001:4860:4860::8888]:853 \
    -servername dns.google -verify_hostname dns.google -brief </dev/null

# Test using ncat (netcat with TLS and certificate verification)
ncat -6 --ssl-verify dns.google 853 < /dev/null
```

## Firewall Rules for DoT over IPv6

```bash
# Allow DoT port 853 TCP over IPv6
ip6tables -A INPUT -p tcp --dport 853 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 853 -j ACCEPT

# Allow established connections
ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Save rules (for example, on Debian with iptables-persistent)
ip6tables-save > /etc/ip6tables/rules.v6
```

## Monitoring DoT Service Health

```bash
# Check that Unbound DoT is listening on IPv6
ss -6 -tlnp | grep ':853'
# Expected: LISTEN ... [::]:853 ... unbound

# Test DoT certificate validity
openssl s_client -connect [2001:db8::53]:853 \
    -servername dns.example.com -verify_hostname dns.example.com \
    </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates

# Monitor with OneUptime: create a TCP monitor for [2001:db8::53]:853
# Alert if port 853 is unreachable
```

## Well-Known DoT Providers with IPv6

| Provider | IPv6 Address | Hostname |
|---|---|---|
| Google | `2001:4860:4860::8888` | `dns.google` |
| Cloudflare | `2606:4700:4700::1111` | `cloudflare-dns.com` |
| Quad9 | `2620:fe::fe` | `dns.quad9.net` |

## Summary

DNS-over-TLS with IPv6 listens on port 853 using TLS. Configure Unbound to listen on `::0@853` with a TLS certificate. Clients use Unbound, dnsdist, or systemd-resolved to forward queries over DoT to IPv6-addressed upstream resolvers. Test with `kdig -6 @<ipv6-addr> +tls-ca +tls-hostname=<auth-name>` and ensure port 853/TCP is open in IPv6 firewall rules.
