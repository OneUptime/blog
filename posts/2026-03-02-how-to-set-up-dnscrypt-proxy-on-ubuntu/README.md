# How to Set Up dnscrypt-proxy on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, Privacy, Networking, Security

Description: Learn how to install and configure dnscrypt-proxy on Ubuntu to encrypt DNS queries using DNSCrypt and DNS-over-HTTPS protocols, protecting your DNS traffic from surveillance and tampering.

---

dnscrypt-proxy is a flexible DNS proxy that supports both the DNSCrypt protocol and DNS-over-HTTPS (DoH). It sits between your applications and upstream DNS resolvers, encrypts all DNS traffic, and provides additional features like query logging, ad blocking via DNS, and load balancing across multiple resolvers. It's more feature-rich than stubby, making it a good choice when you want more control over your DNS infrastructure.

## Installing dnscrypt-proxy

### From the Ubuntu Repository

```bash
sudo apt update
sudo apt install dnscrypt-proxy

# Check the version
dnscrypt-proxy --version
```

### From GitHub (Latest Version)

The apt package may be outdated. For the latest version:

```bash
# Find the latest release at https://github.com/DNSCrypt/dnscrypt-proxy/releases
DNSCRYPT_VERSION="2.1.5"
ARCH="linux_amd64"

wget https://github.com/DNSCrypt/dnscrypt-proxy/releases/download/${DNSCRYPT_VERSION}/dnscrypt-proxy-${ARCH}-${DNSCRYPT_VERSION}.tar.gz \
  -O /tmp/dnscrypt-proxy.tar.gz

tar -xzf /tmp/dnscrypt-proxy.tar.gz -C /tmp

# Move to system path
sudo mv /tmp/${ARCH}/dnscrypt-proxy /usr/local/bin/
sudo chmod +x /usr/local/bin/dnscrypt-proxy

# Copy the example config
sudo mkdir -p /etc/dnscrypt-proxy
sudo cp /tmp/${ARCH}/example-dnscrypt-proxy.toml /etc/dnscrypt-proxy/dnscrypt-proxy.toml
```

## Understanding the Configuration

The main configuration file is `/etc/dnscrypt-proxy/dnscrypt-proxy.toml`. The default config has many commented-out options - here are the key sections to understand:

```bash
sudo nano /etc/dnscrypt-proxy/dnscrypt-proxy.toml
```

### Listening Address

```toml
# Listen on localhost port 53
listen_addresses = ['127.0.0.1:53', '[::1]:53']

# Or on a non-standard port to avoid conflicts with systemd-resolved
listen_addresses = ['127.0.0.1:5300']
```

### Selecting Resolvers

The simplest approach is to use the public resolvers list:

```toml
# Use resolvers from the public list that have these properties
server_names = ['cloudflare', 'quad9', 'nextdns']

# Or let dnscrypt-proxy automatically pick the fastest resolvers
# (leave server_names empty and set this)
# server_names = []   # Empty = use all matching resolvers
```

Or filter by capabilities:

```toml
[sources]
  [sources.'public-resolvers']
  url = ['https://raw.githubusercontent.com/DNSCrypt/dnscrypt-resolvers/master/v3/public-resolvers.md', 'https://download.dnscrypt.info/resolvers-list/v3/public-resolvers.md']
  cache_file = '/var/cache/dnscrypt-proxy/public-resolvers.md'
  minisign_key = 'RWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3'
  refresh_delay = 72

# Require servers with these properties:
require_dnssec = true       # Only use resolvers with DNSSEC support
require_nolog = true        # Only use non-logging resolvers
require_nofilter = true     # Only use non-censoring resolvers
```

## Configuring Specific Resolvers

### Cloudflare DoH

```toml
server_names = ['cloudflare']

# Cloudflare configuration is in the resolvers list, but you can also add manually:
[static]
  [static.'cloudflare-manual']
  stamp = 'sdns://AgcAAAAAAAAABzEuMS4xLjGgENk8mGSlIfMGXMOlIlCcKvq7AVgcrZxtjon911-ep0cPZG5zLmNsb3VkZmxhcmUuY29tCi9kbnMtcXVlcnk'
```

### DNS-over-HTTPS with Multiple Providers

```toml
server_names = [
  'cloudflare',
  'cloudflare-ipv6',
  'quad9-doh-ip4-filter-pri',
  'nextdns',
]
```

### DNSCrypt Protocol

DNSCrypt uses UDP/TCP with a different encryption mechanism than DoH:

```toml
# Use only DNSCrypt resolvers (not DoH)
server_names = ['quad9-dnscrypt-ip4-filter-pri', 'cloudflare-dnscrypt']

# Or specify protocols in the filter
[filters]
  ipv4 = true
  ipv6 = true
  # Only use DNSCrypt protocol (not DoH)
  # This filters resolvers by protocol
```

## DNS Query Logging

Logging helps with debugging and gives you visibility into what's being resolved:

```toml
[query_log]
  file = '/var/log/dnscrypt-proxy/query.log'
  format = 'tsv'

  # Log format fields available: tsv, ltsv
  # TSV format: timestamp, client_ip, qname, qtype, rcode, server, duration
```

### Ignored Domains (Don't Log Certain Queries)

```toml
[query_log]
  file = '/var/log/dnscrypt-proxy/query.log'
  format = 'tsv'
  # Don't log queries matching these patterns
  ignored_qtypes = ['PTR']
```

## Blocking Ads and Malware via DNS

dnscrypt-proxy has a built-in blocklist feature:

```toml
[blocked_names]
  blocked_names_file = '/etc/dnscrypt-proxy/blocklist.txt'
  log_file = '/var/log/dnscrypt-proxy/blocked.log'
  log_format = 'tsv'

[blocked_ips]
  blocked_ips_file = '/etc/dnscrypt-proxy/blocked-ips.txt'
```

Download a blocklist:

```bash
# Create the directory
sudo mkdir -p /etc/dnscrypt-proxy

# Download a popular ad/malware blocking list
sudo curl -L https://raw.githubusercontent.com/nicehash/NiceHashQuickMiner/master/blocklists/blocklist.txt \
  -o /etc/dnscrypt-proxy/blocklist.txt

# Or use Steven Black's hosts list
sudo curl -L https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts \
  | awk '/^0\.0\.0\.0/{print $2}' | grep -v "^0\.0\.0\.0$" \
  > /etc/dnscrypt-proxy/blocklist.txt

# Count blocked domains
wc -l /etc/dnscrypt-proxy/blocklist.txt
```

## Cloaking (Local DNS Overrides)

Point specific domains to custom IP addresses - useful for local development or split DNS:

```toml
[cloaking_rules]
  cloaking_rules_file = '/etc/dnscrypt-proxy/cloaking-rules.txt'
```

```bash
sudo nano /etc/dnscrypt-proxy/cloaking-rules.txt
```

```
# Override dev.example.com to point to your local development server
dev.example.com  192.168.1.50

# Redirect a blocked domain
ads.tracking-domain.com  0.0.0.0

# Wildcard - match all subdomains
*.internal.company.com  10.0.0.1
```

## Creating the Systemd Service

If you installed from GitHub (not apt), create the service manually:

```bash
sudo nano /etc/systemd/system/dnscrypt-proxy.service
```

```ini
[Unit]
Description=DNSCrypt-proxy client
Documentation=https://github.com/DNSCrypt/dnscrypt-proxy/wiki
After=network.target
Before=nss-lookup.target
Wants=nss-lookup.target

[Service]
Type=simple
NonBlocking=true
ExecStart=/usr/local/bin/dnscrypt-proxy -config /etc/dnscrypt-proxy/dnscrypt-proxy.toml
Restart=always
RestartSec=10
User=_dnscrypt-proxy
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

```bash
# Create the service user
sudo useradd -r -s /usr/sbin/nologin _dnscrypt-proxy

# Create log directory
sudo mkdir -p /var/log/dnscrypt-proxy /var/cache/dnscrypt-proxy
sudo chown _dnscrypt-proxy:_dnscrypt-proxy /var/log/dnscrypt-proxy /var/cache/dnscrypt-proxy

sudo systemctl daemon-reload
sudo systemctl enable dnscrypt-proxy
sudo systemctl start dnscrypt-proxy
sudo systemctl status dnscrypt-proxy
```

For the apt-installed version:

```bash
sudo systemctl enable dnscrypt-proxy
sudo systemctl start dnscrypt-proxy
```

## Pointing the System at dnscrypt-proxy

If `systemd-resolved` is running on port 53, first stop it or reconfigure it:

```bash
# Option 1: Stop systemd-resolved and point directly at dnscrypt-proxy
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

# Update /etc/resolv.conf
echo "nameserver 127.0.0.1" | sudo tee /etc/resolv.conf
sudo chattr +i /etc/resolv.conf

# Option 2: Keep systemd-resolved but have it forward to dnscrypt-proxy on port 5300
sudo nano /etc/systemd/resolved.conf
```

```ini
[Resolve]
DNS=127.0.0.1:5300
FallbackDNS=
DNSOverTLS=no
```

## Testing the Setup

```bash
# Test basic resolution
dig @127.0.0.1 example.com

# Check which resolver is being used
dig @127.0.0.1 resolver.dnscrypt.info TXT

# Run dnscrypt-proxy's built-in check
sudo dnscrypt-proxy -config /etc/dnscrypt-proxy/dnscrypt-proxy.toml -check

# Check resolution latency
dig @127.0.0.1 google.com | grep "Query time"
```

### Verify Encryption

```bash
# Watch network traffic - you should see no plain UDP on port 53 to external IPs
sudo tcpdump -i any -n "udp port 53 and not host 127.0.0.1"

# You should see HTTPS traffic to DoH resolvers
sudo tcpdump -i any -n "tcp port 443 and host 1.1.1.1"
```

## Performance Tuning

```toml
# Use parallel queries to multiple resolvers and take the fastest response
lb_strategy = 'p2'   # p2 = pick 2 random servers, use the faster one
lb_estimator = true   # Learn which servers are fastest over time

# Cache DNS responses locally
[cache]
  size = 4096          # Cache up to 4096 entries
  min_ttl = 2400       # Minimum TTL for cached entries (40 minutes)
  max_ttl = 86400      # Maximum TTL (24 hours)
  neg_min_ttl = 60     # TTL for negative responses (NXDOMAIN)
  neg_max_ttl = 600    # Max TTL for negative responses
```

With caching enabled, repeated queries for the same domain return instantly without any network round-trip.

dnscrypt-proxy is more complex to configure than stubby, but that complexity comes with more capability. The ad blocking, local cloaking, query logging, and flexible resolver selection make it the better choice when you want more than basic DNS encryption.
