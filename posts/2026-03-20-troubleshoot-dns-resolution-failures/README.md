# How to Troubleshoot DNS Resolution Failures on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Linux, Troubleshooting, Resolution, Networking, Debugging

Description: Diagnose DNS resolution failures on Linux by testing each layer from /etc/hosts through stub resolver, recursive resolver, and authoritative nameserver.

## Introduction

DNS resolution failures on Linux manifest as "name not found," "Could not resolve host," or application timeouts. The failure can occur at any layer: malformed `/etc/resolv.conf`, unreachable DNS server, wrong configuration in `systemd-resolved`, upstream resolver failure, or missing DNS records. This guide provides a systematic approach to isolate the failure layer.

## Quick Diagnostic

```bash
# Step 1: Can you resolve at all?

dig google.com
# Works: DNS generally functional for external domains
# Fails: Check resolver connectivity

# Step 2: Is it a specific domain or all DNS?
dig google.com    # External domain
dig internal.company.com  # Internal domain
# If only internal fails: check split-horizon or internal DNS config

# Step 3: Direct resolver query:
dig @8.8.8.8 google.com    # Google Public DNS
dig @1.1.1.1 google.com    # Cloudflare DNS
# If these work but system doesn't: issue with /etc/resolv.conf or stub resolver

# Step 4: Check what resolver is configured:
cat /etc/resolv.conf
resolvectl status  # systemd-resolved
```

## Common Failure: Wrong /etc/resolv.conf

```bash
# Check resolver configuration:
cat /etc/resolv.conf
# Expected: nameserver <valid-ip>

# Common issues:
# Empty or missing nameserver line
# Wrong IP address
# DNS server unreachable

# Test if configured DNS server is reachable:
NAMESERVER=$(grep ^nameserver /etc/resolv.conf | head -1 | awk '{print $2}')
echo "Testing: $NAMESERVER"
ping -c 2 $NAMESERVER
dig @$NAMESERVER google.com

# Fix: manually set a working resolver:
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
```

## systemd-resolved Issues

```bash
# Check systemd-resolved status:
systemctl status systemd-resolved
resolvectl status

# Common issue: /etc/resolv.conf not pointing to systemd-resolved
# Should point to 127.0.0.53 or be a symlink:
ls -la /etc/resolv.conf
# Correct: symlink to /run/systemd/resolve/stub-resolv.conf
#   or:    contains "nameserver 127.0.0.53"

# Fix: recreate the symlink:
ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf

# Check if systemd-resolved is actually listening:
ss -ulnp | grep 53
# Should show: 127.0.0.53:53

# Check for DNS failures in systemd-resolved journal:
journalctl -u systemd-resolved --since "1 hour ago" | tail -30

# Flush systemd-resolved cache:
resolvectl flush-caches

# Restart:
systemctl restart systemd-resolved
```

## DNS Resolver Unreachable

```bash
# Test UDP DNS to the resolver with an actual DNS query:
dig +timeout=2 +tries=1 @8.8.8.8 google.com
# If this times out: network path to 8.8.8.8:53 is blocked or unreachable

# Test TCP port 53 (fallback):
nc -z 8.8.8.8 53 && echo "TCP 53 open" || echo "TCP 53 blocked"

# Check firewall rules blocking DNS:
iptables -L OUTPUT -n | grep -E "REJECT|DROP"
# Any rule matching UDP or TCP port 53 could block DNS

# If UDP fails but TCP works: UDP/53 may be blocked or dropped
```

## NSS (Name Service Switch) Configuration

```bash
# The order of resolution is controlled by /etc/nsswitch.conf:
grep ^hosts /etc/nsswitch.conf
# Common simple setup: hosts: files dns
# files = /etc/hosts checked first
# dns = DNS queried second
# On systemd-resolved systems, 'resolve' may be used instead of 'dns'

# If neither 'dns' nor a resolver module like 'resolve' is present,
# DNS won't be used by NSS:
# hosts: files   ← DNS never queried by NSS!
# Fix for a simple nss-dns setup:
sed -i 's/^hosts:.*/hosts: files dns/' /etc/nsswitch.conf
```

## DNSSEC Validation Failures

```bash
# DNSSEC validation can cause SERVFAIL for correctly configured domains
# if the resolver thinks signatures are invalid:

# Test without DNSSEC validation:
dig +cd cloudflare.com   # +cd = checking disabled

# Compare with validation:
dig cloudflare.com
# If +cd works but normal doesn't: DNSSEC validation is rejecting the response

# Check if your resolver validates DNSSEC:
dig +dnssec cloudflare.com | grep -E "flags:|RRSIG"
# ad in the flags line = Authentic Data (DNSSEC validated by the resolver)
# RRSIG records show DNSSEC records were returned

# Temporarily disable DNSSEC in systemd-resolved:
# /etc/systemd/resolved.conf:
# [Resolve]
# DNSSEC=no
systemctl restart systemd-resolved
```

## Conclusion

DNS resolution failures follow a clear diagnostic path: verify the resolver address in `/etc/resolv.conf`, test direct resolver connectivity with `dig @IP`, check `systemd-resolved` if it's in use, and verify firewall rules allow UDP/53 outbound. For internal domain failures specifically, check split-horizon DNS configuration. DNSSEC validation failures require checking with `dig +cd` to distinguish validation errors from genuine domain problems.
