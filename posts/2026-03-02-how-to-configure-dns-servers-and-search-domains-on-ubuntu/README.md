# How to Configure DNS Servers and Search Domains on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, Networking, Systemd-resolved, Netplan

Description: Configure DNS servers and search domains on Ubuntu using Netplan, systemd-resolved, and direct configuration methods for both desktop and server environments.

---

DNS configuration on Ubuntu has evolved significantly over recent releases. Modern Ubuntu uses `systemd-resolved` as the local DNS resolver, with Netplan managing the configuration for server setups and NetworkManager for desktop installations. Understanding this layered architecture helps you configure DNS correctly and troubleshoot issues when names do not resolve.

## The DNS Resolution Stack on Ubuntu

When an application looks up a hostname on Ubuntu 20.04+, the request flows through several layers:

1. `/etc/hosts` - checked first for static entries
2. `systemd-resolved` - local stub resolver at `127.0.0.53`
3. Upstream DNS servers - configured via Netplan, NetworkManager, or directly

`/etc/resolv.conf` on modern Ubuntu is typically a symlink to `/run/systemd/resolve/stub-resolv.conf`, which points to the `systemd-resolved` stub.

Check what you have:

```bash
ls -la /etc/resolv.conf
cat /etc/resolv.conf
```

## Configuring DNS with Netplan (Server)

Netplan is the standard for Ubuntu server installations. DNS configuration goes in the Netplan YAML file for the interface.

### Static DNS Configuration

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        # Primary and secondary DNS servers
        addresses:
          - 9.9.9.9       # Quad9
          - 149.112.112.112  # Quad9 secondary
        # Search domains - appended to bare hostnames
        search:
          - example.com
          - corp.example.com
```

Apply the configuration:

```bash
sudo netplan apply
```

Verify the DNS configuration was picked up:

```bash
resolvectl status
```

### DNS with DHCP

When using DHCP, DNS servers are typically provided by the DHCP server. You can override or supplement them:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      nameservers:
        # These override DHCP-provided DNS servers
        addresses:
          - 1.1.1.1
          - 1.0.0.1
        search:
          - example.com
```

To accept DHCP-provided DNS but add search domains:

```yaml
ethernets:
  eth0:
    dhcp4: true
    nameservers:
      search:
        - example.com
```

## Configuring DNS with resolvectl (Temporary)

For temporary changes that survive until the next reboot or network reconfiguration:

```bash
# Set DNS servers for a specific interface
sudo resolvectl dns eth0 9.9.9.9 149.112.112.112

# Set search domains for an interface
sudo resolvectl domain eth0 example.com corp.example.com

# Verify the settings
resolvectl status eth0
```

These changes are not persistent. For permanent changes, use Netplan or direct `systemd-resolved` configuration.

## Configuring systemd-resolved Directly

For system-wide fallback DNS (used when no interface-specific DNS is configured):

```bash
# Edit resolved.conf
sudo nano /etc/systemd/resolved.conf
```

```ini
# /etc/systemd/resolved.conf
[Resolve]
# Fallback DNS servers - used when no per-interface DNS is configured
DNS=9.9.9.9 149.112.112.112

# Fallback search domains
Domains=example.com

# Enable DNSSEC validation
DNSSEC=yes

# DNS-over-TLS: no, opportunistic, or yes
DNSOverTLS=opportunistic

# Multicast DNS
MulticastDNS=yes

# LLMNR
LLMNR=yes
```

After editing, restart `systemd-resolved`:

```bash
sudo systemctl restart systemd-resolved
```

## Setting Up Search Domains

Search domains allow you to use short hostnames instead of fully qualified domain names. If your search domain is `example.com`, then `ping webserver` resolves as `ping webserver.example.com`.

Configure search domains in Netplan:

```yaml
nameservers:
  addresses:
    - 192.168.1.53
  search:
    - example.com
    - dev.example.com
    - corp.example.com
```

Multiple search domains are tried in order. If `webserver.example.com` does not resolve, it tries `webserver.dev.example.com`, and so on.

Verify search domain configuration:

```bash
resolvectl status | grep "DNS Domain"
```

## Per-Interface DNS Configuration

Different interfaces can have different DNS servers, which is useful for VPNs and split-DNS scenarios:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      nameservers:
        # Public DNS for the main interface
        addresses: [1.1.1.1, 8.8.8.8]
    vpn0:
      dhcp4: false
      addresses: [10.0.0.2/24]
      nameservers:
        # Internal DNS for VPN interface
        addresses: [10.0.0.1]
        # Route .internal names through VPN DNS
        search: [internal.company.com]
```

`systemd-resolved` handles per-interface DNS routing automatically. Names matching a search domain are routed to that interface's DNS server.

## Split-DNS Configuration

For split-DNS, where internal names go to internal DNS and everything else goes to public DNS:

```bash
# Route internal.example.com to internal DNS server
sudo resolvectl domain eth0 "~internal.example.com"
sudo resolvectl dns eth0 192.168.1.53

# The ~ prefix means this is a routing-only domain, not a search domain
```

In Netplan:

```yaml
nameservers:
  addresses: [192.168.1.53]
  # Tilde prefix = routing domain, not search domain
  search: ["~internal.example.com"]
```

## Testing DNS Resolution

```bash
# Basic lookup
resolvectl query webserver.example.com

# Lookup with verbose output showing which server was used
resolvectl query --legend webserver.example.com

# Check which DNS server is being used for a domain
resolvectl query --type=A google.com

# Test DNSSEC validation
resolvectl query --type=DNSKEY example.com

# Flush the DNS cache
sudo resolvectl flush-caches

# Show DNS cache statistics
resolvectl statistics
```

Use `dig` for more detailed DNS troubleshooting:

```bash
# Query a specific DNS server
dig @9.9.9.9 example.com

# Trace the full resolution path
dig +trace example.com

# Query for a specific record type
dig MX example.com
dig TXT example.com
dig AAAA example.com
```

## NetworkManager DNS Configuration (Desktop)

On desktop Ubuntu, NetworkManager manages DNS. Configure it via the GUI or command line:

```bash
# Show current connection DNS settings
nmcli con show "Connection Name" | grep DNS

# Modify DNS for a connection
nmcli con mod "Connection Name" ipv4.dns "9.9.9.9 149.112.112.112"
nmcli con mod "Connection Name" ipv4.dns-search "example.com"

# Apply changes
nmcli con up "Connection Name"
```

## Verifying Full DNS Configuration

Check the complete DNS picture:

```bash
# Overall resolved status
resolvectl status

# Check what resolv.conf contains
cat /etc/resolv.conf

# Check for DNS issues in logs
sudo journalctl -u systemd-resolved --since "10 minutes ago"

# Test resolution
nslookup example.com 127.0.0.53
```

Proper DNS configuration is foundational to everything else - misonfigured DNS causes a wide variety of mysterious failures that can be hard to trace back to their root cause. Taking time to verify your DNS setup with `resolvectl status` and a few test lookups after any changes is always worth the extra minute.
