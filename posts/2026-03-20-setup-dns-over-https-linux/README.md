# How to Set Up DNS over HTTPS (DoH) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, DoH, HTTPS, Privacy, Security, Linux, Systemd-resolved

Description: Configure DNS over HTTPS on Linux using systemd-resolved, dnscrypt-proxy, or cloudflared to encrypt DNS queries and prevent eavesdropping.

## Introduction

DNS over HTTPS (DoH) sends DNS queries inside HTTPS traffic on port 443, preventing local network observers and attackers from seeing or modifying the DNS message contents between your host and the resolver. Unlike regular DNS (usually UDP/TCP port 53), DoH blends in with HTTPS traffic on port 443, although the upstream resolver can still see your queries. This guide covers configuring encrypted DNS on Linux using multiple approaches.

## Method 1: systemd-resolved with DoT (DNS over TLS)

```bash
# systemd-resolved supports DNS over TLS (DoT), not DoH:

# /etc/systemd/resolved.conf:
cat > /etc/systemd/resolved.conf << 'EOF'
[Resolve]
DNS=1.1.1.1#cloudflare-dns.com 8.8.8.8#dns.google
FallbackDNS=9.9.9.9#dns.quad9.net
# Prefer these DNS servers for all domains
Domains=~.
# Force encrypted DNS
DNSOverTLS=yes
# Also validate DNSSEC
DNSSEC=yes
EOF

systemctl restart systemd-resolved

# Verify DoT is working:
resolvectl status | grep -E 'DNSOverTLS|DNS Servers|Current DNS Server|Protocols'
# Should show DNSOverTLS enabled, such as +DNSOverTLS or DNSOverTLS=yes

# Test resolution still works:
resolvectl query google.com
```

## Method 2: dnscrypt-proxy for DoH

```bash
# Install dnscrypt-proxy:
apt-get install dnscrypt-proxy -y   # Ubuntu
# or: dnf install dnscrypt-proxy -y  # RHEL

# Configure dnscrypt-proxy:
cat > /etc/dnscrypt-proxy/dnscrypt-proxy.toml << 'EOF'
# Listen on localhost:5053 (so systemd-resolved still handles port 53)
listen_addresses = ['127.0.0.1:5053']

# Use DoH servers:
server_names = ['cloudflare', 'google', 'quad9-doh-ip4-port443-filter-pri']

# Enable DoH specifically:
doh_servers = true
dnscrypt_servers = false  # Only DoH, no DNScrypt

# Logging:
log_level = 2
log_file = '/var/log/dnscrypt-proxy.log'
EOF

# Start dnscrypt-proxy:
systemctl start dnscrypt-proxy
systemctl enable dnscrypt-proxy

# Point systemd-resolved to dnscrypt-proxy:
cat > /etc/systemd/resolved.conf << 'EOF'
[Resolve]
DNS=127.0.0.1:5053
Domains=~.
DNSStubListener=yes
EOF

systemctl restart systemd-resolved
```

## Method 3: cloudflared (legacy only)

```bash
# Cloudflare removed cloudflared proxy-dns from new cloudflared releases starting
# February 2, 2026. Use dnscrypt-proxy above for new setups; only existing
# pre-removal cloudflared installations support this command.

# Run as DNS proxy:
cloudflared proxy-dns \
  --port 5053 \
  --upstream https://1.1.1.1/dns-query \
  --upstream https://1.0.0.1/dns-query

# Or create systemd service:
cat > /etc/systemd/system/cloudflared-dns.service << 'EOF'
[Unit]
Description=Cloudflare DNS over HTTPS proxy
After=network.target

[Service]
ExecStart=/usr/bin/cloudflared proxy-dns --port 5053 \
  --upstream https://1.1.1.1/dns-query \
  --upstream https://1.0.0.1/dns-query
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl start cloudflared-dns
systemctl enable cloudflared-dns

# Configure systemd-resolved to use it:
# DNS=127.0.0.1:5053 in /etc/systemd/resolved.conf
```

## Verify Encrypted DNS is Working

```bash
# For local proxy methods, test that DNS resolution still works:
dig @127.0.0.1 -p 5053 google.com

# Check if DNS traffic is encrypted (no plaintext port 53 queries should leave host):
# Method 1: Capture on external interface, should see NO port 53 traffic
tcpdump -i eth0 -n 'port 53' -c 5
# If you get captures: some DNS is still going out unencrypted on that interface

# Method 2: Verify with Cloudflare's browser test:
# Open https://1.1.1.1/help in a browser.
# Should show: "Using DNS over HTTPS (DoH): Yes" when using Cloudflare DoH

# Method 3: If using systemd-resolved DoT, check the active protocol:
resolvectl status | grep -E 'DNSOverTLS|DNS Servers|Current DNS Server|Protocols'

# Verify no plaintext DNS leaks:
sudo tcpdump -i eth0 -n 'port 53' -c 30 &
# Browse for 10 seconds:
for i in $(seq 1 10); do dig google.com > /dev/null; sleep 1; done
# If no packets are captured on port 53: encrypted DNS is not leaking plaintext DNS on that interface
```

## Public DoH Servers

```text
Provider      | URL                                      | Notes
--------------|------------------------------------------|------------------
Cloudflare    | https://cloudflare-dns.com/dns-query     | Standard resolver; malware filtering uses security.cloudflare-dns.com
Google        | https://dns.google/dns-query             | Temporary IP logs are deleted within 24-48 hours
Quad9         | https://dns.quad9.net/dns-query          | Malware filtering
NextDNS       | https://dns.nextdns.io/<config-id>       | Custom filtering
Mullvad       | https://adblock.dns.mullvad.net/dns-query | Ad-blocking resolver
```

## Conclusion

DNS over HTTPS encrypts your DNS queries inside standard HTTPS, preventing observation by local network monitors. Use `systemd-resolved` with `DNSOverTLS=yes` for the simplest setup (though this is technically DoT, not DoH). For true DoH on current Linux systems, use `dnscrypt-proxy` as a local proxy, then point your resolver to it. `cloudflared proxy-dns` only applies to older pre-February 2026 cloudflared releases. Verify there are no DNS leaks by capturing on the external interface and confirming no port 53 traffic leaves the host.
