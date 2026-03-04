# How to Configure DNS Settings with NetworkManager on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, NetworkManager, Networking, Linux

Description: A complete guide to managing DNS configuration through NetworkManager on RHEL, covering per-connection DNS, global settings, split DNS, and resolv.conf management.

---

DNS configuration on RHEL is tightly integrated with NetworkManager. Gone are the days of just editing `/etc/resolv.conf` by hand - NetworkManager manages that file and will overwrite your changes. Understanding how to properly configure DNS through NetworkManager is essential for keeping your name resolution working correctly.

## How DNS Works with NetworkManager

On RHEL, NetworkManager is responsible for generating `/etc/resolv.conf`. Each network connection can specify its own DNS servers and search domains, and NetworkManager merges them based on priority rules.

```mermaid
flowchart TD
    A[Connection: ens192] -->|DNS: 10.0.1.2| C[NetworkManager]
    B[Connection: ens224] -->|DNS: 172.16.0.2| C
    C -->|Generates| D[/etc/resolv.conf]
    D --> E[Applications]
```

## Setting DNS Servers Per Connection

The most common approach is to configure DNS servers on each connection profile:

```bash
# Set DNS servers for a connection
nmcli connection modify ens192 ipv4.dns "10.0.1.2,10.0.1.3"

# Set DNS search domains
nmcli connection modify ens192 ipv4.dns-search "example.com,internal.example.com"

# Apply the changes
nmcli connection up ens192
```

To add or remove DNS servers from the existing list:

```bash
# Add a DNS server
nmcli connection modify ens192 +ipv4.dns "8.8.8.8"

# Remove a DNS server
nmcli connection modify ens192 -ipv4.dns "8.8.8.8"
```

## Verifying DNS Configuration

```bash
# Check what DNS servers are active for a device
nmcli device show ens192 | grep DNS

# Check the generated resolv.conf
cat /etc/resolv.conf

# Test DNS resolution
dig example.com
nslookup example.com
host example.com
```

## DNS Priority

When multiple connections are active (e.g., a primary and a management interface), NetworkManager uses DNS priority to determine which connection's DNS servers appear first in `/etc/resolv.conf`:

```bash
# Set DNS priority (lower values = higher priority, default is 0)
nmcli connection modify ens192 ipv4.dns-priority 10
nmcli connection modify ens224 ipv4.dns-priority 100

# Apply changes
nmcli connection up ens192
nmcli connection up ens224
```

With the above configuration, DNS servers from `ens192` will be listed before those from `ens224` in resolv.conf.

Special priority values:
- **Negative values** - Only this connection's DNS servers are used (exclusive mode)
- **0** (default) - Standard priority, uses the route metric as a tiebreaker
- **Positive values** - Lower number means higher priority

```bash
# Make ens192's DNS servers the only ones used
nmcli connection modify ens192 ipv4.dns-priority -1
nmcli connection up ens192
```

## Global DNS Configuration

For settings that should apply regardless of which connections are active, use NetworkManager's global DNS configuration:

```bash
# Create a global DNS configuration file
cat > /etc/NetworkManager/conf.d/dns.conf << 'EOF'
[global-dns-domain-*]
servers=8.8.8.8,8.8.4.4

[global-dns]
searches=example.com
EOF

# Reload NetworkManager to apply
systemctl reload NetworkManager
```

Global DNS overrides per-connection DNS settings when configured.

## DNS Processing Modes

NetworkManager supports different DNS processing modes that control how it manages `/etc/resolv.conf`:

```bash
# Check the current DNS processing mode
nmcli general | grep DNS
```

You can configure the mode in NetworkManager's configuration:

```bash
# Set the DNS processing mode
cat > /etc/NetworkManager/conf.d/dns-mode.conf << 'EOF'
[main]
dns=default
EOF
```

Available modes:

| Mode | Behavior |
|---|---|
| `default` | NM updates /etc/resolv.conf directly |
| `none` | NM does not touch /etc/resolv.conf |
| `systemd-resolved` | NM pushes DNS config to systemd-resolved |

### Using dns=none to Manage resolv.conf Manually

If you really want to manage `/etc/resolv.conf` yourself:

```bash
# Tell NetworkManager to stop managing resolv.conf
cat > /etc/NetworkManager/conf.d/no-dns.conf << 'EOF'
[main]
dns=none
EOF

# Reload NetworkManager
systemctl reload NetworkManager

# Now you can edit resolv.conf manually
cat > /etc/resolv.conf << 'EOF'
nameserver 10.0.1.2
nameserver 10.0.1.3
search example.com
EOF
```

This is generally not recommended because you lose the automatic DNS updates when connections change, but it is useful in specific scenarios.

## Split DNS Configuration

Split DNS sends queries for specific domains to specific DNS servers. This is common in environments where internal domains use internal DNS servers and everything else goes to public DNS:

```bash
# Configure split DNS - internal domains go to internal DNS
nmcli connection modify ens192 ipv4.dns "10.0.1.2"
nmcli connection modify ens192 ipv4.dns-search "internal.example.com"
nmcli connection modify ens192 ipv4.dns-priority 10

# External queries go to public DNS via VPN or secondary interface
nmcli connection modify vpn-connection ipv4.dns "8.8.8.8"
nmcli connection modify vpn-connection ipv4.dns-search "~."
nmcli connection modify vpn-connection ipv4.dns-priority 100
```

The `~.` in dns-search is a special routing domain that means "use this connection for all domains not matched by other connections."

## Adding DNS Options

You can set custom DNS options that appear in `/etc/resolv.conf`:

```bash
# Set resolv.conf options
nmcli connection modify ens192 ipv4.dns-options "timeout:2 attempts:3 rotate"

# Apply changes
nmcli connection up ens192
```

Common DNS options:

- `timeout:N` - Set DNS query timeout in seconds
- `attempts:N` - Number of times to try each DNS server
- `rotate` - Round-robin between DNS servers
- `edns0` - Enable EDNS0 for larger UDP packets
- `single-request` - Send A and AAAA queries sequentially (helps with some firewalls)

## Preventing DNS Leaks on VPN

When connected to a VPN, you usually want all DNS queries to go through the VPN's DNS server:

```bash
# Set the VPN connection to handle all DNS
nmcli connection modify my-vpn ipv4.dns-priority -1
nmcli connection modify my-vpn ipv4.dns-search "~."

# Apply
nmcli connection up my-vpn
```

The negative priority and `~.` routing domain ensure that all DNS queries go through the VPN connection's DNS servers.

## Using /etc/hosts for Local Overrides

NetworkManager does not manage `/etc/hosts`, so you can always add local overrides there:

```bash
# Add local hostname entries
echo "10.0.1.50 db-primary.internal" >> /etc/hosts
echo "10.0.1.51 db-replica.internal" >> /etc/hosts
```

The order of resolution is controlled by `/etc/nsswitch.conf`. By default, `/etc/hosts` is checked before DNS.

## Troubleshooting DNS Issues

```bash
# Check what DNS servers NetworkManager is using
nmcli device show | grep DNS

# Check the actual resolv.conf content
cat /etc/resolv.conf

# Test resolution with dig (shows which server answered)
dig +short example.com
dig example.com @10.0.1.2

# Check if the DNS mode is correct
grep -r dns /etc/NetworkManager/conf.d/

# Check NetworkManager logs for DNS-related messages
journalctl -u NetworkManager | grep -i dns
```

## Wrapping Up

DNS management on RHEL goes through NetworkManager, and that is actually a good thing once you understand how it works. Per-connection DNS settings, priority-based ordering, and split DNS support give you fine-grained control over name resolution. The key is to stop fighting NetworkManager by editing resolv.conf directly, and instead configure DNS through connection profiles and global settings. This way, your DNS configuration stays consistent and survives network changes, reboots, and connection switches.
