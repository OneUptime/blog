# How to Use systemd-resolved for DNS Configuration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, DNS, Networking, systemd-resolved

Description: Configure systemd-resolved for DNS on Ubuntu, set up DNS over TLS, manage per-link DNS, troubleshoot resolution issues, and understand the stub resolver.

---

`systemd-resolved` is the DNS resolver that comes with systemd and is enabled by default on Ubuntu 18.04 and later. It provides a caching, DNS-over-TLS capable, and DNSSEC-validating resolver that integrates with the rest of the systemd stack. Understanding how it works - and how to configure it - is essential for anyone managing Ubuntu systems.

## Understanding How systemd-resolved Works

systemd-resolved provides DNS resolution through several mechanisms:

1. **Stub resolver**: Listens on `127.0.0.53:53` (and `127.0.0.54:53` for link-local). All DNS queries from the system go here first.
2. **NSS plugin**: The `nss-resolve` module integrates with the glibc name resolution system.
3. **D-Bus API**: Applications can query systemd-resolved directly via D-Bus.

The symlink `/etc/resolv.conf -> /run/systemd/resolve/stub-resolv.conf` points applications that use `/etc/resolv.conf` to the stub resolver at `127.0.0.53`.

```bash
# Check the status of systemd-resolved
sudo systemctl status systemd-resolved

# See current DNS configuration
resolvectl status

# Check what /etc/resolv.conf points to
ls -la /etc/resolv.conf
# Should show: /etc/resolv.conf -> ../run/systemd/resolve/stub-resolv.conf
```

## Checking Current DNS Configuration

```bash
# Full status with all links and DNS servers
resolvectl status

# Short summary
resolvectl dns

# Check LLMNR and mDNS status
resolvectl llmnr
resolvectl mdns

# See the DNS servers in use
resolvectl dns eth0

# View statistics
resolvectl statistics
```

## Global DNS Configuration

Edit `/etc/systemd/resolved.conf` to configure global DNS settings:

```bash
sudo nano /etc/systemd/resolved.conf
```

```ini
[Resolve]
# Primary and fallback DNS servers
DNS=1.1.1.1 1.0.0.1 2606:4700:4700::1111

# Fallback DNS (used when per-link DNS fails)
FallbackDNS=8.8.8.8 8.8.4.4

# Search domains
Domains=example.com ~corp.internal

# Enable DNSSEC validation
DNSSEC=yes

# Enable DNS over TLS
DNSOverTLS=yes

# Enable caching
Cache=yes

# LLMNR (Link-Local Multicast Name Resolution)
LLMNR=no

# mDNS (Multicast DNS - for .local resolution)
MulticastDNS=yes

# Read /etc/hosts
ReadEtcHosts=yes
```

Restart after changes:

```bash
sudo systemctl restart systemd-resolved
```

## DNS over TLS (DoT)

DNS over TLS encrypts DNS queries, preventing ISP and network-level surveillance:

```ini
# /etc/systemd/resolved.conf

[Resolve]
# Cloudflare DNS with DoT
DNS=1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com

# Or Google DNS with DoT
DNS=8.8.8.8#dns.google 8.8.4.4#dns.google

# Require TLS (don't fall back to plain DNS)
DNSOverTLS=yes
```

The `#hostname` syntax pins the TLS certificate hostname, preventing MITM attacks.

Verify DoT is working:

```bash
# After restarting resolved, check if TLS is active
resolvectl status | grep -i "dns over tls\|tls"
```

## Per-Link DNS Configuration

Different network interfaces can use different DNS servers. This is useful for split-horizon DNS where corporate internal domains resolve differently than public domains:

```bash
# Set DNS servers for a specific interface
sudo resolvectl dns eth0 10.0.0.1 10.0.0.2

# Set search domains for an interface
sudo resolvectl domain eth0 corp.internal

# Set a routing domain (queries for .corp.internal go to this interface's DNS)
sudo resolvectl domain eth0 ~corp.internal

# These settings are temporary (lost on interface restart)
# For persistent per-link settings, use networkd or NetworkManager
```

### Persistent Per-Link DNS with systemd-networkd

```ini
# /etc/systemd/network/20-wired.network
[Match]
Name=eth0

[Network]
DHCP=yes
DNS=10.0.0.1 10.0.0.2

[DHCP]
# Don't use DNS from DHCP, use our configured ones
UseDNS=no
```

### Persistent Per-Link DNS with NetworkManager

```ini
# /etc/NetworkManager/system-connections/my-connection.nmconnection
[ipv4]
dns=10.0.0.1;10.0.0.2;
ignore-auto-dns=true
```

## Split-Horizon DNS

For VPN or corporate setups where internal domains should use internal DNS:

```ini
# /etc/systemd/resolved.conf

[Resolve]
# Public DNS for everything
DNS=1.1.1.1

# Internal DNS resolves .corp.internal and .vpn.example.com
# (The ~ prefix makes them "routing domains" - not search domains)
Domains=~corp.internal ~vpn.example.com
```

Or set routing domains on the VPN interface:

```bash
# When VPN comes up, configure its DNS
sudo resolvectl dns tun0 10.10.0.1
sudo resolvectl domain tun0 ~corp.internal ~internal.example.com
```

Now queries for `host.corp.internal` go through `tun0`'s DNS, while everything else uses the default DNS.

## Querying DNS with resolvectl

```bash
# Resolve a hostname
resolvectl query google.com

# Resolve with a specific type
resolvectl query -t MX gmail.com
resolvectl query -t AAAA google.com
resolvectl query -t TXT google.com

# Reverse lookup
resolvectl query 1.1.1.1

# Query a specific interface's DNS
resolvectl query --interface=eth0 host.corp.internal

# Test DNSSEC validation
resolvectl query --validate dnssec-tools.org

# Output:
# dnssec-tools.org: 69.58.208.77                  -- link: eth0
#
#                   -- Information acquired via protocol DNS in 45.4ms.
#                   -- Data is authenticated: yes; Data was acquired via local or encrypted transport: no
```

## DNSSEC Validation

```ini
# /etc/systemd/resolved.conf
[Resolve]
# Strict DNSSEC - reject unauthenticated responses
DNSSEC=yes

# Or allow-downgrade - validate when possible, fall back if not
DNSSEC=allow-downgrade
```

Check DNSSEC status:

```bash
# Test DNSSEC validation
resolvectl query dnssec-works.org
# Should show "Data is authenticated: yes"

resolvectl query dnssec-failed.org
# Should fail with a DNSSEC error
```

## Flushing the DNS Cache

```bash
# Flush the DNS cache
sudo resolvectl flush-caches

# Verify caches were flushed
resolvectl statistics | grep -i cache
```

## Troubleshooting DNS Resolution

```bash
# Check if systemd-resolved is listening
ss -tlnup | grep 53

# Test basic resolution
resolvectl query google.com

# Check which DNS server is being used
resolvectl status | grep "DNS Servers"

# Monitor DNS queries in real time
sudo journalctl -u systemd-resolved -f

# Check for DNSSEC failures
sudo journalctl -u systemd-resolved | grep -i "dnssec\|validation\|fail"
```

**Problem: `/etc/resolv.conf` pointing to the wrong place**

```bash
# Check the current symlink
ls -la /etc/resolv.conf

# The correct setup for stub resolver mode
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf

# Alternative: point to the full resolver file (bypasses stub)
sudo ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf
```

**Problem: Slow DNS resolution**

```bash
# Check if the cache is working
resolvectl statistics
# Look for high cache hit rates vs miss rates

# Check response times
resolvectl query google.com --json | python3 -m json.tool
```

**Problem: mDNS not resolving `.local` hostnames**

```bash
# Enable mDNS
sudo resolvectl mdns eth0 yes

# Check if nss-mdns is installed
dpkg -l | grep libnss-mdns

# Install if missing
sudo apt install libnss-mdns
```

## Monitoring and Logs

```bash
# View resolved logs
journalctl -u systemd-resolved

# Watch for DNS errors in real time
sudo journalctl -u systemd-resolved -f -p warning

# Statistics
resolvectl statistics
```

Output includes cache hits, cache misses, transaction counts, and more.

## Disabling systemd-resolved

If you need to use a different DNS resolver (like a local bind9 or unbound):

```bash
# Disable and stop systemd-resolved
sudo systemctl disable --now systemd-resolved

# Remove the symlink
sudo rm /etc/resolv.conf

# Create a static resolv.conf
sudo tee /etc/resolv.conf << 'EOF'
nameserver 1.1.1.1
nameserver 1.0.0.1
search example.com
EOF

# Protect it from being overwritten
sudo chattr +i /etc/resolv.conf
```

systemd-resolved is a capable resolver that handles most DNS requirements well. Its integration with systemd's network management and support for modern features like DoT and DNSSEC make it a solid choice for Ubuntu systems where DNS security and per-interface routing matter.
