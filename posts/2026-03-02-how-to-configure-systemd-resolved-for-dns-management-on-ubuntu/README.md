# How to Configure systemd-resolved for DNS Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, Systemd-resolved, Networking, Security

Description: Configure systemd-resolved for DNS management on Ubuntu, including DNS-over-TLS, DNSSEC, per-interface DNS, and split-DNS routing.

---

`systemd-resolved` is the local DNS resolver that ships with Ubuntu. It provides DNS resolution, DNSSEC validation, DNS-over-TLS, and per-interface DNS routing through a stub resolver at `127.0.0.53`. Understanding how to configure it properly lets you improve DNS privacy, security, and performance on Ubuntu systems.

## How systemd-resolved Works

When an application makes a DNS query, it hits the stub resolver at `127.0.0.53:53`. The stub resolver checks the local cache, then forwards uncached queries to the configured upstream DNS servers. Results are cached for future queries.

The stub resolver is accessible at two addresses:
- `127.0.0.53` - the main stub resolver (recommended)
- `127.0.0.54` - direct-query interface, bypasses some routing logic

`/etc/resolv.conf` on Ubuntu is typically a symlink to `systemd-resolved`'s generated file:

```bash
ls -la /etc/resolv.conf
# Should show something like:
# /etc/resolv.conf -> ../run/systemd/resolve/stub-resolv.conf
```

Check the service status:

```bash
systemctl status systemd-resolved
```

## Main Configuration File

The primary configuration file is `/etc/systemd/resolved.conf`. The defaults are contained in `/usr/lib/systemd/resolved.conf` which you should not edit directly.

```bash
# View current resolved configuration
cat /etc/systemd/resolved.conf

# The effective config merges default + your overrides
```

Override settings by creating drop-in files in `/etc/systemd/resolved.conf.d/`:

```bash
sudo mkdir -p /etc/systemd/resolved.conf.d/
```

## Configuring Upstream DNS Servers

### System-Wide Fallback DNS

```ini
# /etc/systemd/resolved.conf.d/dns.conf
[Resolve]
# Primary and secondary DNS servers
# Separate with spaces
DNS=9.9.9.9 149.112.112.112

# Fallback if the above are unreachable
FallbackDNS=1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4
```

Apply the configuration:

```bash
sudo systemctl restart systemd-resolved
```

Verify:

```bash
resolvectl status | head -20
```

These system-wide DNS servers are used as fallback when no interface-specific DNS is configured.

## Enabling DNS-over-TLS

DNS-over-TLS (DoT) encrypts DNS queries between your system and the upstream resolver. This prevents ISPs and network observers from reading your DNS queries.

```ini
# /etc/systemd/resolved.conf.d/dot.conf
[Resolve]
# DNS servers that support DoT
DNS=9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9.net

# opportunistic = try TLS, fall back to plaintext if unavailable
# yes = require TLS, fail if not available
DNSOverTLS=opportunistic
```

The `#hostname` suffix tells `systemd-resolved` what hostname to expect in the TLS certificate for that server. Without it, resolved cannot verify the server's identity.

Popular DoT-compatible servers:

```ini
# Quad9 (privacy-focused, malware blocking)
DNS=9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9.net

# Cloudflare (performance-focused)
DNS=1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com

# Google
DNS=8.8.8.8#dns.google 8.8.4.4#dns.google
```

Verify DoT is working:

```bash
resolvectl status | grep "DNS over TLS"
```

## Enabling DNSSEC Validation

DNSSEC validates that DNS responses are authentic and have not been tampered with.

```ini
# /etc/systemd/resolved.conf.d/dnssec.conf
[Resolve]
# yes = require DNSSEC, fail for unsigned zones
# allow-downgrade = use DNSSEC when available, fall back if not
# no = disable DNSSEC (default in some Ubuntu versions)
DNSSEC=allow-downgrade
```

Test DNSSEC validation:

```bash
# Query a DNSSEC-signed domain
resolvectl query --type=DNSKEY cloudflare.com

# Check validation result
resolvectl query --legend example.com
```

If DNSSEC is working, queries to signed domains will show `(authenticated)` in the output.

Note: `DNSSEC=yes` can cause resolution failures for domains with misconfigured DNSSEC records. `allow-downgrade` is a more practical choice for most environments.

## Per-Interface DNS Configuration

Different network interfaces can have different DNS servers. This is the mechanism for split-DNS and VPN DNS routing.

Configure per-interface DNS via Netplan:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      nameservers:
        addresses: [9.9.9.9, 149.112.112.112]
        search: [example.com]
    vpn0:
      dhcp4: false
      addresses: [10.0.0.2/24]
      nameservers:
        # Internal DNS for VPN
        addresses: [10.0.0.1]
        search: [internal.company.com]
```

Or set per-interface DNS temporarily with resolvectl:

```bash
sudo resolvectl dns eth0 9.9.9.9 149.112.112.112
sudo resolvectl domain eth0 example.com
```

View per-interface DNS settings:

```bash
resolvectl status eth0
```

## Split-DNS with Routing Domains

Routing domains (prefixed with `~`) route specific domain queries to specific DNS servers without adding them as search domains:

```bash
# Route internal.company.com queries to internal DNS
sudo resolvectl domain eth0 "~internal.company.com"
sudo resolvectl dns eth0 10.0.0.1

# Route everything else to public DNS on eth1
sudo resolvectl domain eth1 "~."  # ~ dot = "all other domains"
sudo resolvectl dns eth1 9.9.9.9
```

The `~.` routing domain means "route all queries here unless a more specific routing domain exists on another interface." This is the standard way to set up split-DNS with VPNs.

## mDNS and LLMNR Configuration

`systemd-resolved` supports multicast DNS (for `.local` names) and LLMNR (Link-Local Multicast Name Resolution):

```ini
# /etc/systemd/resolved.conf.d/mdns.conf
[Resolve]
# Enable mDNS for .local names
MulticastDNS=yes

# Enable LLMNR (Windows-compatible name resolution)
LLMNR=yes
```

mDNS is useful in home and development environments for discovering services without a DNS server. For security-sensitive server environments, consider disabling both:

```ini
[Resolve]
MulticastDNS=no
LLMNR=no
```

## Cache Configuration

```ini
# /etc/systemd/resolved.conf.d/cache.conf
[Resolve]
# Cache negative responses (NXDOMAIN) for a shorter time
# Default is up to the NXDOMAIN's own TTL

# Disable caching (not recommended for production)
# Cache=no

# Cache NXDOMAIN responses
CacheFromLocalhost=yes
```

## Checking Configuration Status

```bash
# Full status with all per-interface settings
resolvectl status

# Just the global settings
resolvectl status | head -30

# Statistics including cache hit rate
resolvectl statistics

# Show which DNS server would be used for a query
resolvectl query --legend google.com
```

## Managing the Cache

```bash
# Flush all cached DNS entries
sudo resolvectl flush-caches

# Reset all statistics counters
sudo resolvectl reset-statistics
```

## Testing DNS Resolution

```bash
# Basic query
resolvectl query example.com

# Query a specific record type
resolvectl query --type=MX example.com
resolvectl query --type=AAAA example.com

# Query through a specific interface's DNS
resolvectl query --interface=eth0 internal.company.com
```

## Enabling Complete Debugging

When troubleshooting resolution issues:

```bash
# Enable debug logging
sudo systemctl edit systemd-resolved
```

Add:

```ini
[Service]
Environment=SYSTEMD_LOG_LEVEL=debug
```

Then restart and watch logs:

```bash
sudo systemctl restart systemd-resolved
sudo journalctl -u systemd-resolved -f
```

Disable debug logging after troubleshooting by removing the drop-in file.

## Complete Example Configuration

A hardened configuration for a server with privacy and security enabled:

```ini
# /etc/systemd/resolved.conf.d/hardened.conf
[Resolve]
# Privacy-respecting, malware-blocking DNS
DNS=9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9.net

# Fallback to Cloudflare
FallbackDNS=1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com

# Require DNS-over-TLS
DNSOverTLS=yes

# DNSSEC validation
DNSSEC=allow-downgrade

# Disable multicast DNS and LLMNR on servers
MulticastDNS=no
LLMNR=no

# Enable DNS caching
Cache=yes
```

Apply and verify:

```bash
sudo systemctl restart systemd-resolved
resolvectl status
resolvectl query --legend example.com
```

`systemd-resolved` is a capable resolver that handles the vast majority of DNS requirements. The per-interface routing, DoT support, and DNSSEC validation make it well-suited for both development machines and production servers.
