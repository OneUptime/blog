# How to Configure IPv6 SLAAC on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, FreeBSD, SLAAC, Rtsold, Router Advertisement

Description: Learn how to configure Stateless Address Autoconfiguration (SLAAC) on FreeBSD using rtsold to process Router Advertisements and automatically assign IPv6 addresses.

## How SLAAC Works on FreeBSD

```text
Router sends RA with prefix 2001:db8::/64
  │
  └─► rtsold (on client) processes the RA
         │
         └─► kernel generates IPv6 address:
             prefix (2001:db8::) + interface ID (from MAC or random)
             = 2001:db8::1234:5678:9abc:def0/64
```

## Configure SLAAC via rc.conf

```bash
# /etc/rc.conf settings for SLAAC

cat >> /etc/rc.conf << 'EOF'
# Accept Router Advertisements on em0

ifconfig_em0_ipv6="inet6 accept_rtadv"

# Enable Router Solicitation daemon
rtsold_enable="YES"
rtsold_flags="-aF"
# -a: auto-detect interfaces
# -F: explicitly configure the kernel to accept RAs and disable IPv6 forwarding
EOF

# Apply
service netif restart em0
service rtsold start
```

## Manual SLAAC Configuration

```bash
# Enable RA acceptance on an interface
ifconfig em0 inet6 accept_rtadv

# Start rtsold to send Router Solicitations and process RAs
/usr/sbin/rtsold -aF

# Or send a single RS and wait for RA
rtsol em0

# Verify SLAAC address was assigned
ifconfig em0 | grep inet6
# Should show global address with 'autoconf' flag
```

## Understanding rtsold Flags

```bash
# rtsold flags:
# -a     = auto-detect interfaces (don't need to specify interface)
# -F     = force kernel to accept RAs and disable IPv6 forwarding
# -d     = enable debugging
# -D     = enable more debugging
# -f     = foreground (don't daemonize)
# -1     = send only one solicitation per interface and exit

# Example with interface specified explicitly
rtsold em0

# Example with debugging
rtsold -d em0
```

## Verify SLAAC is Working

```bash
# Check for autoconf-generated IPv6 address
ifconfig em0 | grep 'inet6.*autoconf'

# Expected output:
# inet6 2001:db8::1234:5678:9abc:def0 prefixlen 64 autoconf

# Check that default route was learned from RA
netstat -rn -f inet6 | grep default
# default   fe80::1%em0   UG   em0

# Test connectivity
ping6 -c 3 2001:4860:4860::8888

# Check rtsold is running
pgrep rtsold
service rtsold status
```

## Privacy Extensions on FreeBSD SLAAC

```bash
# Enable RFC 4941 temporary addresses
sysctl -w net.inet6.ip6.use_tempaddr=1

# Prefer temporary addresses for outgoing connections
sysctl -w net.inet6.ip6.prefer_tempaddr=1

# Make persistent
cat >> /etc/sysctl.conf << 'EOF'
net.inet6.ip6.use_tempaddr=1
net.inet6.ip6.prefer_tempaddr=1
EOF

# Verify temporary addresses are generated after SLAAC
ifconfig em0 | grep 'inet6.*temporary'
```

## Combine SLAAC with Static DNS

```bash
# SLAAC provides address and default route
# Configure DNS manually

cat > /etc/resolv.conf << 'EOF'
nameserver 2001:4860:4860::8888
nameserver 2001:4860:4860::8844
nameserver 8.8.8.8
search example.com
EOF
```

## Summary

Configure SLAAC on FreeBSD by adding `ifconfig_em0_ipv6="inet6 accept_rtadv"` and `rtsold_enable="YES"` to `/etc/rc.conf`. The `rtsold` daemon sends Router Solicitations and processes Router Advertisements to assign addresses and default routes. Verify with `ifconfig em0 | grep 'autoconf'`. Enable privacy extensions with `net.inet6.ip6.use_tempaddr=1` in `/etc/sysctl.conf`.
