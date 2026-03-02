# How to Configure stubby for DNS over TLS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, Privacy, Networking, Security

Description: Learn how to configure stubby on Ubuntu as a DNS-over-TLS (DoT) stub resolver to encrypt your DNS queries and improve privacy on the network.

---

By default, DNS queries travel in plaintext over UDP. Any device on the path between you and your DNS resolver - your ISP's routers, network appliances, anyone on a shared WiFi network - can see every domain you look up. DNS over TLS (DoT) encrypts this traffic using TLS, the same protocol that protects HTTPS. stubby is a lightweight stub resolver that handles the DoT negotiation, sitting between your applications and your upstream DNS provider.

## How stubby Works

stubby listens on localhost port 53 (or 5353 for non-root operation) and accepts regular unencrypted DNS queries from your applications. When it receives a query, it forwards it encrypted over TLS to a configured upstream resolver (Cloudflare, Quad9, etc.), then returns the answer. Your applications don't need to know about DoT - they just talk to localhost as usual.

## Installing stubby

```bash
sudo apt update
sudo apt install stubby

# Verify the installation
stubby -V
```

Ubuntu's packaged version of stubby comes from the `getdns` project. On newer Ubuntu versions, the package might be called `stubby` directly.

## Understanding the Default Configuration

```bash
# View the default configuration
cat /etc/stubby/stubby.yml
```

The default configuration is functional but worth reviewing. Key sections:

```yaml
# The resolution type - GETDNS_RESOLUTION_STUB means forward queries upstream
resolution_type: GETDNS_RESOLUTION_STUB

# Which address and port stubby listens on
listen_addresses:
  - 127.0.0.1@53   # IPv4 localhost
  - 0::1@53        # IPv6 localhost

# Require DNSSEC validation for all responses
dnssec: GETDNS_EXTENSION_TRUE

# Strict authentication - only connect to servers with matching certificates
tls_authentication: GETDNS_AUTHENTICATION_REQUIRED

# The upstream DoT resolvers to use
upstream_recursive_servers:
  - address_data: 1.1.1.1
    tls_auth_name: "cloudflare-dns.com"
  - address_data: 1.0.0.1
    tls_auth_name: "cloudflare-dns.com"
```

## Configuring Upstream Resolvers

Edit the configuration to select your preferred DNS providers:

```bash
sudo nano /etc/stubby/stubby.yml
```

### Using Cloudflare (1.1.1.1)

```yaml
upstream_recursive_servers:
  - address_data: 1.1.1.1
    tls_auth_name: "cloudflare-dns.com"
  - address_data: 1.0.0.1
    tls_auth_name: "cloudflare-dns.com"
  - address_data: 2606:4700:4700::1111
    tls_auth_name: "cloudflare-dns.com"
  - address_data: 2606:4700:4700::1001
    tls_auth_name: "cloudflare-dns.com"
```

### Using Quad9 (9.9.9.9) - Malware Blocking

```yaml
upstream_recursive_servers:
  - address_data: 9.9.9.9
    tls_auth_name: "dns.quad9.net"
  - address_data: 149.112.112.112
    tls_auth_name: "dns.quad9.net"
  - address_data: 2620:fe::fe
    tls_auth_name: "dns.quad9.net"
```

### Using Multiple Providers for Redundancy

```yaml
upstream_recursive_servers:
  # Cloudflare
  - address_data: 1.1.1.1
    tls_auth_name: "cloudflare-dns.com"
  - address_data: 1.0.0.1
    tls_auth_name: "cloudflare-dns.com"
  # Quad9
  - address_data: 9.9.9.9
    tls_auth_name: "dns.quad9.net"
  - address_data: 149.112.112.112
    tls_auth_name: "dns.quad9.net"
```

### Using Pin-Based Authentication

For maximum security, pin the server's SPKI hash (Subject Public Key Info). This ensures you're talking to the exact server you expect, even if the TLS certificate changes:

```yaml
upstream_recursive_servers:
  - address_data: 1.1.1.1
    tls_auth_name: "cloudflare-dns.com"
    tls_pubkey_pinset:
      - digest: "sha256"
        value: uXku9oKkWWOGAFgBbwX11LtCIVS2oGWsQ5Bk01Bpbj4=
```

You can get the current SPKI hash with:

```bash
# Get the pin for Cloudflare
echo | openssl s_client -connect 1.1.1.1:853 -servername cloudflare-dns.com 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  base64
```

## Configuring stubby to Listen on a Non-Standard Port

If another DNS resolver (like `systemd-resolved`) is already using port 53, run stubby on a different port:

```yaml
listen_addresses:
  - 127.0.0.1@5353
  - 0::1@5353
```

When using a non-standard port, applications won't automatically find stubby. You'll need to point `systemd-resolved` at stubby instead (covered below).

## Enabling and Starting the Service

```bash
# Enable stubby to start on boot
sudo systemctl enable stubby

# Start stubby
sudo systemctl start stubby

# Check its status
sudo systemctl status stubby

# View logs
sudo journalctl -u stubby -f
```

## Testing stubby

```bash
# Test DNS resolution through stubby
dig @127.0.0.1 example.com

# Check that it's using TLS by watching network traffic
sudo tcpdump -i any -n port 853

# While tcpdump is running, do a lookup
dig @127.0.0.1 google.com

# You should see TCP traffic to the upstream resolver on port 853, not port 53
```

## Integrating stubby with the System

### Option 1: Direct /etc/resolv.conf Change

The simplest approach - point the system's resolver directly at stubby:

```bash
# Check current /etc/resolv.conf
cat /etc/resolv.conf

# If managed by NetworkManager, disable its DNS management
sudo nano /etc/NetworkManager/NetworkManager.conf
```

```ini
[main]
# Tell NetworkManager not to manage /etc/resolv.conf
dns=none
```

```bash
# Restart NetworkManager
sudo systemctl restart NetworkManager

# Manually set resolv.conf to point to stubby
sudo nano /etc/resolv.conf
```

```
nameserver 127.0.0.1
```

Make the file immutable to prevent NetworkManager from overwriting it:

```bash
sudo chattr +i /etc/resolv.conf

# To revert later
sudo chattr -i /etc/resolv.conf
```

### Option 2: Integrating with systemd-resolved

If your system uses `systemd-resolved`, configure it to forward to stubby:

Configure stubby to listen on port 5353:

```yaml
# /etc/stubby/stubby.yml
listen_addresses:
  - 127.0.0.1@5353
```

Configure systemd-resolved to forward to stubby:

```bash
sudo nano /etc/systemd/resolved.conf
```

```ini
[Resolve]
DNS=127.0.0.1:5353
FallbackDNS=
DNSOverTLS=no
```

```bash
# Restart both services
sudo systemctl restart stubby
sudo systemctl restart systemd-resolved

# Verify resolved is using stubby
resolvectl status
```

## Verifying DNS Privacy

To confirm your DNS queries are encrypted:

```bash
# Check that no UDP traffic is going to port 53 externally
# While browsing or making DNS lookups, run:
sudo tcpdump -i any -n "udp port 53" and not host 127.0.0.1

# You should see NO traffic (all DNS should go through stubby on TCP/853)

# Verify TLS traffic to the resolver
sudo tcpdump -i any -n "tcp port 853"
# You should see encrypted TCP traffic to your chosen resolver's IP
```

### Using DNS Leak Test Sites

After configuring stubby:

```bash
# Install curl if not present
sudo apt install curl

# Quick DNS leak check
curl https://dnsleaktest.com/results.json

# Or use a command-line DNS test
dig +short TXT whoami.cloudflare.com @1.1.1.1
```

If the IP shown matches your configured upstream resolver (Cloudflare, Quad9, etc.), your DNS queries are being routed correctly through stubby.

## Troubleshooting

### stubby Fails to Start

```bash
# Check for port conflicts
sudo ss -tlnup | grep 53

# If port 53 is in use, either:
# 1. Stop the conflicting service
sudo systemctl stop systemd-resolved

# 2. Or configure stubby to use port 5353
```

### TLS Authentication Failures

```bash
# Check the logs for TLS errors
sudo journalctl -u stubby -n 50

# Common causes:
# - System time is wrong (TLS is time-sensitive)
sudo timedatectl status

# - The tls_auth_name doesn't match the server's certificate
# Verify by connecting manually:
openssl s_client -connect 1.1.1.1:853 -servername cloudflare-dns.com 2>&1 | grep "subject\|CN="
```

### Slow DNS Resolution

If DNS feels slow after enabling stubby:

```bash
# Check average resolution time
time dig @127.0.0.1 google.com

# The first query establishes the TLS connection and may be slower
# Subsequent queries reuse the connection and should be fast

# Enable connection caching in stubby.yml
idle_timeout: 10000   # Keep TLS connections open for 10 seconds
```

stubby is straightforward to set up and provides meaningful privacy benefits with minimal performance impact after the initial TLS handshake overhead. For servers and workstations that handle sensitive domains or operate on untrusted networks, it's worth the few minutes of configuration.
