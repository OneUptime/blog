# How to Troubleshoot DNS Server IPv6 Binding Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, IPv6, Troubleshooting, BIND, Unbound, Binding, Debugging

Description: Diagnose and resolve common DNS server IPv6 binding failures including address-not-available errors, interface not ready issues, and dual-stack conflicts.

## Introduction

DNS servers fail to bind to IPv6 addresses for several reasons: the address is not yet assigned, IPv6 is disabled on the interface, explicit listen-address configuration conflicts with wildcard listening, or the OS does not have IPv6 enabled. This guide covers the most common failures and their fixes.

## Common Error Messages

```text
# BIND

named: IPv6 is not supported
named: could not listen on UDP socket: address in use
named: OS reports: Can't assign requested address

# Unbound
[error] could not bind: Address not available
[error] bind: Cannot assign requested address ::

# CoreDNS
listen tcp6 [::]:53: bind: address already in use
```

## Step 1: Verify IPv6 is Enabled

```bash
# Check IPv6 is not disabled for new interfaces
sysctl net.ipv6.conf.default.disable_ipv6
# Should be 0

# Check the target interface
sysctl net.ipv6.conf.eth0.disable_ipv6
# Should be 0

# Re-enable if disabled
sysctl -w net.ipv6.conf.all.disable_ipv6=0
sysctl -w net.ipv6.conf.default.disable_ipv6=0
sysctl -w net.ipv6.conf.eth0.disable_ipv6=0

# Persist
echo "net.ipv6.conf.all.disable_ipv6=0" >> /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6=0" >> /etc/sysctl.conf
```

## Step 2: Check IPv6 Address is Assigned

```bash
# List all IPv6 addresses
ip -6 addr show

# If the address BIND wants to bind to is not listed:
# 1. The interface may not have IPv6 configured
# 2. SLAAC/DHCPv6 may not have completed yet
# 3. The address may be in "tentative" state (DAD in progress)

ip -6 addr show | grep tentative
# If tentative, wait for DAD to complete (usually < 1 second)

# Manually add a static IPv6 address
ip -6 addr add 2001:db8::53/64 dev eth0
```

## Step 3: Address Already in Use

```bash
# Check what is listening on port 53
ss -lnup | grep :53
ss -lntp | grep :53

# Common culprit: systemd-resolved
systemctl status systemd-resolved
# If active and listening on 127.0.0.53:53
# or an extra IPv6 stub listener, disable the stub listener

# /etc/systemd/resolved.conf
# [Resolve]
# DNSStubListener=no
systemctl restart systemd-resolved

# Then start your DNS server
systemctl start bind9
```

## Step 4: BIND-Specific Fixes

```bash
# Check BIND compilation for IPv6 support
named -V | grep -i "ipv6\|use-v6"

# Modern BIND listens on IPv6 by default.
# If named.conf.options explicitly disables IPv6, replace:
# named.conf.options:
# listen-on-v6 { none; };
# with:
# listen-on-v6 { any; };

# If binding to a specific IPv6 address, ensure the address exists before named starts
# Add a delay or use systemd ordering
# /etc/systemd/system/bind9.service.d/override.conf:
# [Service]
# ExecStartPre=/bin/sh -c 'until ip -6 addr show scope global | grep -q inet6; do sleep 1; done'
# Run systemctl daemon-reload after creating or changing the drop-in.
```

```nginx
# Common mistake: IPv6 listening is explicitly disabled
options {
    listen-on    { 127.0.0.1; };
    # listen-on-v6 { none; };  # disables IPv6
    listen-on-v6 { any; };     # replace "none" with "any"
};
```

## Step 5: Unbound-Specific Fixes

```bash
# Error: bind: Cannot assign requested address
# Fix: ensure interface exists

# unbound.conf
# interface: 2001:db8::53  ← fails if address not yet assigned

# Solution: bind to :: instead
# interface: ::0

# Or add a pre-start check
mkdir -p /etc/systemd/system/unbound.service.d
cat > /etc/systemd/system/unbound.service.d/wait-ipv6.conf << 'EOF'
[Service]
ExecStartPre=/bin/sh -c 'until ip -6 addr show | grep "2001:db8::53"; do sleep 1; done'
EOF
systemctl daemon-reload
```

## Step 6: Firewall Blocking DNS on IPv6

```bash
# Check if ip6tables is dropping DNS
ip6tables -L INPUT -n -v | grep -E "53|dns"

# Add rules to allow DNS
ip6tables -A INPUT -p udp --dport 53 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 53 -j ACCEPT

# Test DNS queries over UDP and TCP
dig +tries=1 +timeout=2 AAAA google.com @2001:db8::53
dig +tcp +tries=1 +timeout=2 AAAA google.com @2001:db8::53
```

## Step 7: Debug with strace

```bash
# Trace BIND system calls to find binding failure
strace -f -e trace=bind,socket named -g 2>&1 | grep -E "bind|AF_INET6"

# Look for:
# bind(5, {sa_family=AF_INET6, sin6_port=htons(53), ...}, ...) = -1 EADDRNOTAVAIL
# This means the IPv6 address doesn't exist on the system
```

## Conclusion

IPv6 DNS binding issues stem from disabled IPv6, unassigned addresses, port conflicts with systemd-resolved, or `listen-on-v6` directives that explicitly disable IPv6. Systematically check: IPv6 enabled → address assigned → port free → firewall open → DNS server config. Use OneUptime to continuously monitor DNS server availability on IPv6 and alert before users are impacted.
