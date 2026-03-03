# How to Configure systemd-resolved with DoT on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, systemd-resolved, Privacy, Networking

Description: Learn how to configure systemd-resolved with DNS over TLS (DoT) on Ubuntu to encrypt DNS queries using the built-in resolver without installing additional software.

---

Ubuntu 18.04 and later ships with `systemd-resolved` as the default DNS resolver. Starting with systemd version 239, it gained native support for DNS over TLS (DoT), meaning you can encrypt your DNS queries without installing additional software like stubby or dnscrypt-proxy. If you're already on Ubuntu 20.04 or newer, you likely already have everything you need.

## Checking What You Have

```bash
# Check systemd version (need 239+ for DoT, 243+ for strict mode)
systemd --version

# Check if systemd-resolved is running
sudo systemctl status systemd-resolved

# Check current DNS configuration
resolvectl status
```

The output of `resolvectl status` shows the current DNS servers and whether DoT is active.

## How systemd-resolved Works

`systemd-resolved` manages DNS resolution for the system. Applications can query it via:
- The stub resolver at `127.0.0.53` (the standard path)
- D-Bus API
- NSS module

When DoT is configured, `systemd-resolved` connects to upstream DNS servers over TLS instead of plain UDP.

## Configuring DoT in resolved.conf

The main configuration file is `/etc/systemd/resolved.conf`:

```bash
sudo nano /etc/systemd/resolved.conf
```

### Basic DoT Configuration with Cloudflare

```ini
[Resolve]
# Upstream DNS servers
# Format: IP#hostname (hostname is used for TLS certificate verification)
DNS=1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com
DNS=2606:4700:4700::1111#cloudflare-dns.com 2606:4700:4700::1001#cloudflare-dns.com

# Enable DNS over TLS
# yes = use DoT if available, fall back to plaintext
# opportunistic = same as yes
# no = never use DoT (default)
DNSOverTLS=yes

# Fallback DNS if the primary is unreachable
FallbackDNS=9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9.net
```

### Strict DoT Mode (Recommended for Maximum Privacy)

```ini
[Resolve]
DNS=1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com
FallbackDNS=9.9.9.9#dns.quad9.net

# Strict mode: only use DoT, fail if TLS can't be established
# This prevents fallback to plaintext DNS
DNSOverTLS=opportunistic

# Enable DNSSEC validation
DNSSEC=yes

# Negative trust anchors (domains to not validate with DNSSEC)
# Leave empty for full DNSSEC enforcement
```

The `#hostname` suffix after the IP address is the TLS Authentication Name. `systemd-resolved` uses it to verify the server's TLS certificate, ensuring you're connecting to the intended resolver.

## Popular DoT Providers

### Cloudflare

```ini
DNS=1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com
```

### Quad9 (with malware blocking)

```ini
DNS=9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9.net
```

### Google

```ini
DNS=8.8.8.8#dns.google 8.8.4.4#dns.google
```

### NextDNS (customizable filtering)

```ini
# Get your personal NextDNS hostname from nextdns.io
DNS=45.90.28.0#abc123.dns.nextdns.io
```

## Applying the Configuration

```bash
# Restart systemd-resolved to apply changes
sudo systemctl restart systemd-resolved

# Verify the new configuration took effect
resolvectl status
```

Look for these lines in the output:

```text
Global
         DNS Servers: 1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com
DNS Over TLS setting: yes
    DNSSEC setting: yes
  DNSSEC supported: yes
```

## Verifying DoT is Active

### Using resolvectl

```bash
# Check if DoT is being used
resolvectl status | grep -A 5 "DNS Over TLS"

# Run a test query and check the statistics
resolvectl statistics
```

### Watching Network Traffic

```bash
# Open a terminal and watch for DoT traffic (port 853)
sudo tcpdump -i any -n "tcp port 853"

# In another terminal, trigger some DNS queries
nslookup google.com
nslookup github.com

# You should see encrypted TCP traffic to port 853 on your resolver's IP
# NOT UDP traffic to port 53 on external IPs
```

### Using resolvectl query

```bash
# Make a query through systemd-resolved and see details
resolvectl query example.com

# Or using the older dig syntax (also goes through resolved)
dig example.com

# Check DNSSEC validation
resolvectl query --legend=yes example.com
```

## Per-Interface DNS Configuration

systemd-resolved supports different DNS servers per network interface, useful when connecting to VPNs or multiple networks:

```bash
# Set DNS for a specific interface
sudo resolvectl dns eth0 1.1.1.1#cloudflare-dns.com

# Set DoT for a specific interface
sudo resolvectl dnsovertls eth0 yes

# Set DNS search domain for an interface
sudo resolvectl domain eth0 company.internal

# View settings for a specific interface
resolvectl status eth0
```

These settings are lost on reboot. For persistent per-interface settings, configure them in the network configuration (NetworkManager, netplan, or systemd-networkd).

### NetworkManager Integration

When using NetworkManager, configure per-connection DNS in the connection profile:

```bash
# Create or edit a connection
sudo nmcli connection modify "Your Connection Name" \
  ipv4.dns "1.1.1.1 1.0.0.1" \
  ipv4.ignore-auto-dns yes

# Apply changes
sudo nmcli connection up "Your Connection Name"
```

### systemd-networkd Integration

For systems using systemd-networkd:

```bash
sudo nano /etc/systemd/network/20-wired.network
```

```ini
[Match]
Name=eth0

[Network]
DNS=1.1.1.1#cloudflare-dns.com
DNS=1.0.0.1#cloudflare-dns.com
DNSOverTLS=yes
DNSSEC=yes
```

## Enabling the Caching Stub Resolver

systemd-resolved acts as a local caching resolver. Applications should point to `127.0.0.53` to use it:

```bash
# Check if /etc/resolv.conf points to the stub
cat /etc/resolv.conf
```

If it shows `nameserver 127.0.0.53`, the stub is active. If not:

```bash
# Create a symlink to the resolved stub configuration
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf

# Verify
cat /etc/resolv.conf
# Should show: nameserver 127.0.0.53
```

## Checking Cache and Statistics

```bash
# View resolver statistics including cache hits
resolvectl statistics

# Flush the DNS cache
sudo resolvectl flush-caches

# Reset statistics
sudo resolvectl reset-statistics
```

## Troubleshooting

### DoT Not Working

```bash
# Check the resolved log for errors
sudo journalctl -u systemd-resolved -n 50

# Common error: certificate validation failure
# Make sure the #hostname suffix matches the server's actual certificate CN
openssl s_client -connect 1.1.1.1:853 -servername cloudflare-dns.com 2>&1 | grep "subject\|CN="

# Try with a different server
sudo nano /etc/systemd/resolved.conf
# Change DNS= to use Quad9 instead and try again
```

### DNSSEC Validation Failures

Some domains have broken DNSSEC signatures. If resolution fails for specific domains:

```bash
# Check if DNSSEC is causing the failure
resolvectl query --legend=yes failing-domain.com

# Add to negative trust anchors to bypass DNSSEC for this domain
sudo nano /etc/systemd/resolved.conf
```

```ini
[Resolve]
NegativeTrustAnchors=failing-domain.com
```

### Resolv.conf Keeps Getting Reset

If NetworkManager or DHCP keeps overwriting `/etc/resolv.conf`:

```bash
# Tell NetworkManager to not manage DNS
sudo nano /etc/NetworkManager/NetworkManager.conf
```

```ini
[main]
dns=systemd-resolved
```

```bash
sudo systemctl restart NetworkManager
sudo systemctl restart systemd-resolved
```

With NetworkManager configured to use `systemd-resolved`, it will update resolved with DHCP-provided DNS information, but the DoT and DNSSEC settings from `resolved.conf` will still apply.

The built-in DoT support in `systemd-resolved` is the lowest-friction way to get encrypted DNS on Ubuntu. You don't need to install any extra software, there's nothing new to maintain, and the configuration survives system updates without any special handling.
