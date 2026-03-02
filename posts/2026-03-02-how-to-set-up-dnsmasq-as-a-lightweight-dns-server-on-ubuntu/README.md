# How to Set Up dnsmasq as a Lightweight DNS Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, dnsmasq, DHCP, Networking

Description: Set up dnsmasq as a lightweight DNS forwarder and DHCP server on Ubuntu for small networks, home labs, and development environments where BIND9 is overkill.

---

BIND9 is powerful but brings significant complexity for environments that just need local DNS resolution and DHCP. dnsmasq fills that gap - it's a lightweight DNS forwarder and DHCP server designed specifically for small networks. It's widely used in home labs, development environments, and as the DNS component in tools like libvirt and Docker.

dnsmasq handles local hostname resolution, forwards external DNS queries to upstream resolvers, and can serve DHCP addresses - all from a single straightforward configuration file.

## When to Use dnsmasq vs. BIND9

Use dnsmasq when:
- You need a simple DNS cache and forwarder for a small network
- You want to resolve local hostnames without full zone management
- You need integrated DNS and DHCP in one lightweight service
- You're running a home lab or development environment

Stick with BIND9 when:
- You're running an authoritative DNS server for a public domain
- You need full zone management with secondary servers
- You require advanced features like DNSSEC signing or split-horizon DNS with complex ACLs

## Handling systemd-resolved Conflicts

Ubuntu uses `systemd-resolved` by default, which runs a stub resolver on `127.0.0.53:53`. This will conflict with dnsmasq if both try to bind port 53 on all interfaces.

The cleanest solution is to disable `systemd-resolved`'s stub listener and use dnsmasq exclusively:

```bash
# Check the current status
sudo systemctl status systemd-resolved

# Edit resolved.conf to disable the stub listener
sudo nano /etc/systemd/resolved.conf
```

```ini
[Resolve]
# Disable the stub listener so dnsmasq can use port 53
DNSStubListener=no
```

```bash
# Restart resolved to apply the change
sudo systemctl restart systemd-resolved

# Update /etc/resolv.conf to point at dnsmasq (127.0.0.1)
sudo rm /etc/resolv.conf
echo "nameserver 127.0.0.1" | sudo tee /etc/resolv.conf

# Make it immutable so NetworkManager doesn't overwrite it
sudo chattr +i /etc/resolv.conf
```

## Installing dnsmasq

```bash
sudo apt update
sudo apt install -y dnsmasq

# Check the service status
sudo systemctl status dnsmasq
```

## Basic Configuration

The main configuration file is `/etc/dnsmasq.conf`. The default file contains extensive comments explaining every option. It's easier to create a clean configuration rather than uncomment settings throughout:

```bash
# Back up the original
sudo cp /etc/dnsmasq.conf /etc/dnsmasq.conf.bak

# Create a clean configuration
sudo nano /etc/dnsmasq.conf
```

```
# Basic dnsmasq configuration

# Listen on specific interfaces only (safer than listening on all)
interface=eth0
# Also listen on loopback
listen-address=127.0.0.1

# Don't forward plain names (no dots) to upstream
domain-needed

# Don't forward queries for private IP ranges
bogus-priv

# Use /etc/hosts for local name resolution
expand-hosts

# Local domain name for the network
domain=local.example.com

# Cache size (number of entries, default 150)
cache-size=1000

# Upstream DNS servers to forward unresolved queries
server=8.8.8.8
server=1.1.1.1

# Log queries for debugging (disable in production for performance)
# log-queries
# log-facility=/var/log/dnsmasq.log
```

## Adding Local Host Entries

dnsmasq reads `/etc/hosts` for local hostname resolution. Add internal hostnames there:

```bash
sudo nano /etc/hosts
```

```
127.0.0.1       localhost
127.0.1.1       ubuntu-server

# Internal network hosts
192.168.1.10    ns1.local.example.com ns1
192.168.1.20    ns2.local.example.com ns2
192.168.1.50    server1.local.example.com server1
192.168.1.51    server2.local.example.com server2
192.168.1.60    db1.local.example.com db1
192.168.1.100   www.local.example.com www
```

dnsmasq automatically provides both forward (hostname to IP) and reverse (IP to hostname) lookups based on `/etc/hosts` entries when `expand-hosts` is enabled.

## Using Additional Hosts Files

Instead of putting all hosts in `/etc/hosts`, you can use the `addn-hosts` option to maintain separate files:

```bash
sudo nano /etc/dnsmasq.conf
```

Add:
```
# Additional hosts files
addn-hosts=/etc/dnsmasq.hosts
```

```bash
sudo nano /etc/dnsmasq.hosts
```

```
192.168.1.200   jumpbox.local.example.com jumpbox
192.168.1.201   monitoring.local.example.com monitoring
192.168.2.10    storage1.local.example.com storage1
```

This keeps your main `/etc/hosts` clean while managing internal hosts separately.

## Forwarding Specific Domains

You can route queries for specific domains to specific DNS servers. This is useful for split-horizon setups where internal domains should go to an internal DNS server:

```bash
sudo nano /etc/dnsmasq.conf
```

```
# Forward .corp.example.com queries to the internal DNS server
server=/corp.example.com/10.0.0.1

# Forward reverse lookups for internal ranges to the internal DNS
server=/168.192.in-addr.arpa/10.0.0.1

# Forward everything else to external resolvers
server=8.8.8.8
server=1.1.1.1
```

## Adding Custom DNS Records

For hosts that aren't in `/etc/hosts`, you can add records directly in the config:

```bash
sudo nano /etc/dnsmasq.conf
```

```
# Custom A records
address=/custom-app.local.example.com/192.168.1.150

# Wildcard - all subdomains of dev.local resolve to the same IP
address=/.dev.local/192.168.1.200

# CNAME records
cname=alias.local.example.com,server1.local.example.com
```

The wildcard `address` option is particularly useful for development environments where you want all `*.dev.local` requests to go to a single development server or reverse proxy.

## Using a Configuration Directory

For cleaner organization, use the `conf-dir` option to load additional configuration files:

```bash
sudo nano /etc/dnsmasq.conf
```

Add:
```
# Load all .conf files from this directory
conf-dir=/etc/dnsmasq.d/,*.conf
```

```bash
# Create separate config files for different purposes
sudo nano /etc/dnsmasq.d/upstream.conf
```

```
# Upstream DNS servers
server=8.8.8.8
server=8.8.4.4
server=1.1.1.1
```

```bash
sudo nano /etc/dnsmasq.d/local-hosts.conf
```

```
# Local address overrides
address=/mail.local/192.168.1.110
address=/git.local/192.168.1.120
```

## Validating and Starting dnsmasq

```bash
# Test configuration for syntax errors
sudo dnsmasq --test

# If no errors, restart the service
sudo systemctl restart dnsmasq
sudo systemctl enable dnsmasq

# Check the status and any error messages
sudo systemctl status dnsmasq
sudo journalctl -u dnsmasq -n 30
```

## Testing Resolution

```bash
# Test local hostname resolution
dig @127.0.0.1 server1.local.example.com A
dig @127.0.0.1 -x 192.168.1.50

# Test forwarding to upstream
dig @127.0.0.1 google.com A

# Test that external DNS is working from the host
nslookup google.com 127.0.0.1

# Check cache statistics
dig @127.0.0.1 bind.version CHAOS TXT
```

## DNS Caching Benefits

One of dnsmasq's main advantages is DNS caching. Repeated queries for the same hostname are answered from cache rather than going to the upstream resolver. The default cache size of 150 entries is conservative - increasing it to 1000 or more improves performance on busy networks.

Monitor cache hits and misses by enabling query logging temporarily:

```bash
# Enable logging temporarily
sudo dnsmasq --log-queries --log-facility=/tmp/dnsmasq.log --no-daemon &

# Make queries and watch the log
dig example.com
dig example.com  # This should be served from cache
tail -f /tmp/dnsmasq.log
```

Log entries marked with `cached` indicate a cache hit, while `query[A]` indicates a forwarded query.

## Firewall Configuration

If other machines on the network will use this dnsmasq instance:

```bash
# Allow DNS queries from the local network
sudo ufw allow from 192.168.1.0/24 to any port 53
```

dnsmasq is an excellent fit for lab and development environments where the overhead of BIND9 isn't justified. The combination of DNS caching, local name resolution, and domain-specific forwarding in a single lightweight process makes it easy to operate and troubleshoot.
