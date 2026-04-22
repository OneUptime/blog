# How to Set Up a Local DNS Resolver with Unbound

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Unbound, Resolver, Linux, Privacy, Performance

Description: Install and configure Unbound as a local validating, recursive DNS resolver to improve DNS privacy, reduce latency, and add DNSSEC validation.

## Introduction

Unbound is a high-performance validating, recursive DNS resolver. Running Unbound locally means DNS queries are resolved by walking the DNS hierarchy from root servers to authoritative servers rather than going through a third-party recursive resolver. Benefits include: privacy (you are not sending every query to your ISP's or another public resolver, though standard DNS traffic can still be visible on the network), faster responses for frequently queried domains (local cache), and DNSSEC validation for security.

## Installation

```bash
# Ubuntu/Debian:

apt-get install unbound unbound-anchor dnsutils curl -y

# CentOS/RHEL:
dnf install unbound bind-utils curl -y

# Check version and features:
unbound -V

# Enable; start after configuration:
systemctl enable unbound
```

## Basic Configuration

```bash
# Main config file:
cat > /etc/unbound/unbound.conf << 'EOF'
server:
    # Listen on loopback (use a LAN address for LAN resolver use):
    interface: 127.0.0.1
    interface: ::1
    port: 5335     # Use non-standard port to avoid conflict with systemd-resolved

    # Allow queries from localhost:
    access-control: 127.0.0.0/8 allow
    access-control: ::1 allow

    # For LAN resolver, also allow local network:
    # access-control: 192.168.1.0/24 allow

    # DNSSEC validation:
    auto-trust-anchor-file: "/var/lib/unbound/root.key"

    # Prefetch popular records before they expire:
    prefetch: yes

    # Cache settings:
    cache-max-ttl: 86400   # 24 hours max cache time
    cache-min-ttl: 60      # 60 seconds min

    # Hide version and identity:
    hide-version: yes
    hide-identity: yes

    # Logging:
    verbosity: 1
    logfile: "/var/log/unbound/unbound.log"

    # Performance:
    num-threads: 2
    msg-cache-size: 50m
    rrset-cache-size: 100m

# Use root hints to resolve from authoritative servers:
root-hints: "/var/lib/unbound/root.hints"

remote-control:
    control-enable: yes
EOF
```

## Download Root Hints and Trust Anchor

```bash
# Create directories:
mkdir -p /var/lib/unbound /var/log/unbound

# Download current root hints:
curl -o /var/lib/unbound/root.hints \
  https://www.internic.net/domain/named.root

# Initialize DNSSEC trust anchor:
unbound-anchor -a /var/lib/unbound/root.key

# Set ownership:
chown unbound:unbound /var/lib/unbound/root.key
chown unbound:unbound /var/lib/unbound/root.hints
chown unbound:unbound /var/lib/unbound

# Set log directory ownership:
chown unbound:unbound /var/log/unbound

# Generate TLS keys for unbound-control:
unbound-control-setup

# Check config and start Unbound with the new settings:
unbound-checkconf
systemctl restart unbound
```

## Integrate with systemd-resolved

```bash
# Configure systemd-resolved to use Unbound as a system DNS server on port 5335:
# /etc/systemd/resolved.conf:
cat > /etc/systemd/resolved.conf << 'EOF'
[Resolve]
DNS=127.0.0.1:5335
DNSStubListener=yes
EOF

# Restart resolved:
systemctl restart systemd-resolved

# If DHCP-provided per-link DNS servers are still active, disable them in your network manager.

# Test that it works through the chain:
dig @127.0.0.1 -p 5335 google.com    # Direct to Unbound
dig google.com                         # Through systemd-resolved to Unbound
```

## Add Local DNS Overrides

```bash
# Add local zone for internal hostnames:
cat >> /etc/unbound/unbound.conf << 'EOF'

server:
    # Local zone for internal network:
    local-zone: "internal.example.com." static
    local-data: "server1.internal.example.com. IN A 10.20.0.10"
    local-data: "server2.internal.example.com. IN A 10.20.0.11"
    local-data: "db.internal.example.com. IN A 10.20.0.20"

    # Reverse DNS for internal network:
    local-zone: "20.10.in-addr.arpa." static
    local-data-ptr: "10.20.0.10 server1.internal.example.com"
    local-data-ptr: "10.20.0.11 server2.internal.example.com"
EOF

# Reload Unbound:
unbound-control reload
```

## Verify and Monitor

```bash
# Check Unbound is working:
unbound-control status

# Query directly:
dig @127.0.0.1 -p 5335 google.com

# Check cache statistics:
unbound-control stats | grep -E "total|cache|prefetch"

# Verify DNSSEC validation:
dig @127.0.0.1 -p 5335 +dnssec google.com | grep -E "flags:.* ad|RRSIG"

# Watch queries in real time (increase verbosity temporarily):
unbound-control verbosity 3
tail -f /var/log/unbound/unbound.log
unbound-control verbosity 1
```

## Conclusion

Unbound provides a private, fast, DNSSEC-validating DNS resolver. Install it, point it at root hints, initialize the DNSSEC trust anchor, and configure systemd-resolved to forward to it. Add local zones for internal hostnames. Monitor with `unbound-control stats` to see cache hit rates - high cache hits mean lower latency for repeated queries. For privacy, Unbound with root resolution eliminates the need to trust a third-party recursive resolver with your DNS query history, though standard recursive DNS is not encrypted on the wire.
