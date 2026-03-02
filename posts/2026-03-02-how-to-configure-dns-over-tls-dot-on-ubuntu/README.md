# How to Configure DNS over TLS (DoT) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, Security, Privacy, Networking

Description: Configure DNS over TLS on Ubuntu using systemd-resolved and Stubby to encrypt DNS queries, preventing ISP snooping and man-in-the-middle DNS attacks.

---

Traditional DNS queries are sent in plaintext over UDP port 53. Anyone on the network path - your ISP, a public Wi-Fi operator, or a network attacker - can see every hostname your machine resolves. DNS over TLS (DoT) solves this by wrapping DNS queries in TLS encryption, the same protocol used by HTTPS.

This tutorial covers two approaches: using `systemd-resolved` (which has built-in DoT support) and using `stubby` (a dedicated DNS-over-TLS stub resolver) for more control.

## Understanding DNS over TLS

DoT operates on TCP port 853. When configured, your machine sends DNS queries through an encrypted TLS connection to a supporting resolver like Cloudflare (1.1.1.1), Google (8.8.8.8), or Quad9 (9.9.9.9) rather than sending plaintext UDP queries.

The difference between DoT and DoH (DNS over HTTPS):
- DoT runs on a dedicated port (853), making it easy to block or allow specifically
- DoH uses port 443 alongside regular HTTPS traffic, making it harder to block but also harder to filter at a corporate level
- Both provide equivalent encryption

## Method 1: Using systemd-resolved

Ubuntu 20.04+ ships with a version of `systemd-resolved` that supports DNS-over-TLS natively. This is the simplest approach.

### Configuring systemd-resolved for DoT

```bash
# Edit the resolved configuration
sudo nano /etc/systemd/resolved.conf
```

```ini
[Resolve]
# Specify upstream DNS servers that support DoT
# Format: IP#hostname (the hostname is used for TLS certificate verification)
DNS=1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com
FallbackDNS=8.8.8.8#dns.google 8.8.4.4#dns.google 9.9.9.9#dns.quad9.net

# Enable DNS-over-TLS
# Options: no, opportunistic, yes
# "yes" requires TLS (falls back to failure if TLS unavailable)
# "opportunistic" tries TLS but falls back to plaintext
DNSOverTLS=yes

# Enable DNSSEC validation
DNSSEC=yes

# Multicast DNS (mDNS) for local network discovery
MulticastDNS=yes
```

```bash
# Restart systemd-resolved to apply changes
sudo systemctl restart systemd-resolved

# Verify the configuration was applied
resolvectl status
```

The output should show the DNS servers with "DNS over TLS" listed as active.

### Verifying DoT is Working

```bash
# Check the status of resolved
resolvectl status

# Query a hostname and check it uses DoT
resolvectl query example.com

# Run a packet capture to confirm queries are going to port 853 (not 53)
# Install tcpdump first
sudo apt install -y tcpdump

# Capture DNS traffic - you should see connections to port 853, NOT plaintext port 53 queries
sudo tcpdump -n 'port 853 or port 53' -i any
```

While the capture runs, make DNS queries in another terminal:

```bash
# These should show up as port 853 connections, not port 53
nslookup google.com
curl -s https://api.ipify.org
```

You should see TLS handshakes on port 853 and no plaintext port 53 traffic to external servers (some local port 53 traffic to `127.0.0.53` is expected for the stub resolver).

## Method 2: Using Stubby

Stubby is a dedicated DNS-over-TLS stub resolver from the getdns project. It provides more granular control over which resolvers to use and supports features like certificate pinning.

### Installing Stubby

```bash
sudo apt update
sudo apt install -y stubby
```

### Configuring Stubby

```bash
# View the default configuration
cat /etc/stubby/stubby.yml

# Edit the configuration
sudo nano /etc/stubby/stubby.yml
```

```yaml
# Stubby DNS-over-TLS configuration

# Logging level (0=critical, 1=error, 2=warn, 3=info, 4=debug, 7=trace)
resolution_type: GETDNS_RESOLUTION_STUB
dns_transport_list:
  - GETDNS_TRANSPORT_TLS

# Require TLS - if TLS fails, the query fails (no plaintext fallback)
tls_authentication: GETDNS_AUTHENTICATION_REQUIRED

# Validate DNSSEC
dnssec: GETDNS_EXTENSION_TRUE

# Listen on localhost only (systemd-resolved or other local resolver will forward to stubby)
listen_addresses:
  - address_data: 127.0.0.1
    port: 5353
  - address_data: 0::1
    port: 5353

# Round-robin across available upstream servers
round_robin_upstreams: 1

# Upstream DoT resolvers
upstream_recursive_servers:
  # Cloudflare
  - address_data: 1.1.1.1
    port: 853
    tls_auth_name: "cloudflare-dns.com"
  - address_data: 1.0.0.1
    port: 853
    tls_auth_name: "cloudflare-dns.com"

  # Google
  - address_data: 8.8.8.8
    port: 853
    tls_auth_name: "dns.google"
  - address_data: 8.8.4.4
    port: 853
    tls_auth_name: "dns.google"

  # Quad9 (with DNSSEC and malware blocking)
  - address_data: 9.9.9.9
    port: 853
    tls_auth_name: "dns.quad9.net"
```

### Starting Stubby

```bash
sudo systemctl start stubby
sudo systemctl enable stubby
sudo systemctl status stubby
```

### Integrating Stubby with systemd-resolved

Now configure `systemd-resolved` to forward queries to stubby (running on port 5353) rather than going directly to external servers. This gives you the full stub resolver stack on 127.0.0.53 while stubby handles the TLS encryption.

```bash
sudo nano /etc/systemd/resolved.conf
```

```ini
[Resolve]
# Point to stubby running on localhost:5353
# Note: systemd-resolved always uses port 53, so we need dnsmasq or similar
# for the port 5353 workaround, OR use stubby on port 53 directly

# Simpler: just use resolved's built-in DoT (Method 1) or
# disable resolved and use stubby directly as the system resolver
DNS=127.0.0.1
DNSStubListener=no
```

If using Stubby directly (disabling resolved's stub listener):

```bash
# Point /etc/resolv.conf to stubby
sudo rm /etc/resolv.conf
echo "nameserver 127.0.0.1" | sudo tee /etc/resolv.conf
sudo chattr +i /etc/resolv.conf
```

But stubby needs to listen on port 53 for this to work:

```yaml
# In stubby.yml, change to port 53
listen_addresses:
  - address_data: 127.0.0.1
    port: 53
```

## Combining Stubby with dnsmasq

A more flexible setup uses dnsmasq as the local resolver (handling caching and local names) and forwards to stubby for upstream resolution:

```
Applications -> dnsmasq (127.0.0.1:53) -> stubby (127.0.0.1:5353) -> DoT Upstream
```

Configure dnsmasq to forward to stubby:

```bash
sudo nano /etc/dnsmasq.conf
```

```
# Forward all external queries to stubby
server=127.0.0.1#5353

# Handle local names locally
addn-hosts=/etc/dnsmasq.hosts
domain=local.example.com

# Don't forward local names upstream
domain-needed
bogus-priv

cache-size=1000
```

## Testing DoT Encryption

Verify queries are actually encrypted:

```bash
# Test with stubby's built-in test tool
stubby -l -C /etc/stubby/stubby.yml &
dig @127.0.0.1 -p 5353 example.com

# Use the online Cloudflare DoT test
curl -s https://1.1.1.1/help | grep -i "using dns over tls"

# Check if any plaintext DNS leaks exist
sudo tcpdump -n 'udp port 53 and not src 127.0.0.1' -i any
```

If you see traffic going to external IPs on UDP port 53, there's a DNS leak somewhere. Check that `/etc/resolv.conf` points only to your local resolver and that applications aren't hardcoding their own DNS servers.

## Potential Issues

Some applications, particularly containers and VMs, bypass the system resolver entirely and use hardcoded DNS servers (often 8.8.8.8). For full coverage, you need firewall rules to intercept this traffic:

```bash
# Redirect all DNS queries to the local DoT-enabled resolver
# This uses iptables to intercept port 53 traffic
sudo iptables -t nat -A OUTPUT -p udp --dport 53 -j REDIRECT --to-port 53
sudo iptables -t nat -A OUTPUT -p tcp --dport 53 -j REDIRECT --to-port 53
```

DNS over TLS provides meaningful privacy for DNS queries on untrusted networks. The systemd-resolved approach is the quickest to deploy on Ubuntu servers, while the stubby + dnsmasq stack gives more flexibility for complex network environments.
