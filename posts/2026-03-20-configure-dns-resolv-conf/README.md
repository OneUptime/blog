# How to Configure DNS Servers in /etc/resolv.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Linux, resolv.conf, Configuration, Networking, Resolver

Description: Configure DNS resolver settings in /etc/resolv.conf including multiple nameservers, search domains, and timeout options for reliable DNS resolution.

## Introduction

`/etc/resolv.conf` is the traditional configuration file for the Linux DNS stub resolver. It specifies which DNS servers to query and in what order, along with search domain suffixes and timeout behaviors. On modern systems with `systemd-resolved` or `NetworkManager`, this file is often managed automatically, but understanding and manually configuring it remains essential for servers and containers.

## Basic Configuration

```bash
# Minimal /etc/resolv.conf with two nameservers:

cat > /etc/resolv.conf << 'EOF'
nameserver 8.8.8.8
nameserver 8.8.4.4
EOF

# With organization's DNS plus public fallback:
cat > /etc/resolv.conf << 'EOF'
# Internal DNS (primary)
nameserver 10.20.0.1
# Internal DNS (secondary)
nameserver 10.20.0.2
# Public fallback
nameserver 8.8.8.8
EOF
# Note: glibc uses up to 3 nameserver entries; additional entries are ignored
```

## Common Configuration Options

```text
# /etc/resolv.conf common options reference:

nameserver <IP>
  # DNS server to query. Up to 3 allowed.
  # Queried in order; if first doesn't respond, try next.

domain <domain>
  # Obsolete single-entry form of 'search'.
  # If both 'domain' and 'search' appear, the last one wins.

search <domain1> [domain2] ...
  # Search list for short hostname lookups.
  # "ping db" tries: db.domain1, db.domain2, db.domain3, db
  # glibc 2.26+: unlimited. glibc 2.25 and earlier: 6 domains, 256 chars total.

options timeout:<n>
  # Seconds to wait for each nameserver response. Default: 5.
  # Lower (1-2) for faster failover.

options attempts:<n>
  # Total query attempts before giving up. Default: 2.
  # Lower for faster failure.

options rotate
  # Rotate through nameservers for load balancing.
  # Default: always try first server first.

options ndots:<n>
  # Minimum dots before an initial absolute query is tried first.
  # Default: 1. api.example.com (1 dot) = try absolute first.
  # With ndots:2, api.example.com is searched first.
```

## Example Configurations

```bash
# Enterprise with internal DNS and fast failover:
cat > /etc/resolv.conf << 'EOF'
nameserver 10.20.0.10
nameserver 10.20.0.11
nameserver 8.8.8.8
search company.internal us.company.internal
options timeout:2 attempts:2
EOF

# Docker custom network (embedded DNS):
cat > /etc/resolv.conf << 'EOF'
nameserver 127.0.0.11
options timeout:3
EOF

# Kubernetes pod DNS:
cat > /etc/resolv.conf << 'EOF'
# Example cluster DNS Service IP; varies by cluster
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
EOF
# Kubernetes sets ndots:5 by default so search paths work for generated service names
```

## Protect Against Overwriting

```bash
# NetworkManager and DHCP often overwrite /etc/resolv.conf
# Methods to prevent:

# Method 1: Make file immutable (prevents normal writes until you remove the bit):
chattr +i /etc/resolv.conf
# Undo with: chattr -i /etc/resolv.conf

# Method 2: NetworkManager - configure to not manage DNS:
# /etc/NetworkManager/NetworkManager.conf:
# [main]
# dns=none    ← NM won't touch resolv.conf

# Method 3: Link to your managed file:
# Create your config elsewhere and symlink:
cp /etc/resolv.conf /etc/resolv.conf.manual
ln -sf /etc/resolv.conf.manual /etc/resolv.conf
# Then protect the target:
chattr +i /etc/resolv.conf.manual
```

## Verify Configuration Works

```bash
# Test resolution with configured servers:
dig google.com
# Should use nameservers from resolv.conf

# Test search domain behavior:
# With 'search company.internal':
ping db         # Tries db.company.internal first
getent hosts db  # Shows what resolves to

# Check whether libc-based lookups read resolv.conf:
strace -e trace=file getent hosts google.com 2>&1 | grep /etc/resolv.conf
# Shows whether /etc/resolv.conf is being read

# Check if /etc/resolv.conf is a real file or a symlink:
ls -l /etc/resolv.conf

# On systemd-resolved systems, inspect effective DNS settings:
resolvectl status
```

## Conclusion

`/etc/resolv.conf` controls which DNS servers Linux queries and how. Always specify 2-3 nameservers for redundancy. Use the `search` directive to allow short hostnames in Kubernetes and corporate environments. Set `options timeout:2 attempts:2` for faster failover when the primary DNS server is unreachable. On systemd-resolved systems, `resolvectl status` shows the effective DNS configuration regardless of how `/etc/resolv.conf` is managed.
