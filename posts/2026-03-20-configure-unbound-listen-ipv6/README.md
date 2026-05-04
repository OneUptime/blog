# How to Configure Unbound to Listen on IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Unbound, Network Configuration, DNS Resolver

Description: A guide to configuring Unbound to listen on IPv6 interfaces and respond to DNS queries from IPv6 clients.

## Default Unbound Behavior

By default, Unbound may listen only on `localhost` (127.0.0.1). To serve IPv6 clients, you must explicitly configure IPv6 interface addresses and access control rules.

## Basic IPv6 Configuration

Edit `/etc/unbound/unbound.conf`:

```yaml
server:
    # Listen on all IPv4 addresses
    interface: 0.0.0.0

    # Listen on all IPv6 addresses
    interface: ::0

    # Or listen on specific IPv6 addresses
    # interface: 2001:db8::53
    # interface: ::1

    # Port (default 53)
    port: 53

    # Allow queries from IPv6 clients
    access-control: ::1 allow          # localhost IPv6
    access-control: ::0/0 refuse       # deny all others by default

    # Uncomment to allow specific IPv6 subnets:
    # access-control: 2001:db8::/32 allow
    # access-control: fe80::/10 allow   # link-local

    # Enable IPv6 support for upstream queries
    do-ip6: yes
```

## Allowing Queries from a Mixed IPv4/IPv6 Network

```yaml
server:
    # Listen on all interfaces
    interface: 0.0.0.0
    interface: ::0

    # Allow queries from local networks (both IPv4 and IPv6)
    access-control: 127.0.0.1/8 allow
    access-control: ::1/128 allow
    access-control: 192.168.0.0/16 allow
    access-control: 10.0.0.0/8 allow
    access-control: 2001:db8::/32 allow    # replace with your IPv6 prefix
    access-control: fd00::/8 allow         # ULA addresses
    access-control: 0.0.0.0/0 refuse       # deny all other IPv4
    access-control: ::0/0 refuse           # deny all other IPv6

    # IPv6 settings
    do-ip6: yes          # Send and receive queries over IPv6
    prefer-ip6: yes      # Prefer IPv6 for outgoing queries when available
```

## Configuring Unbound to Query Upstream Over IPv6

To make Unbound use IPv6 for its upstream recursive queries (not just client-facing):

```yaml
server:
    # Use IPv6 for upstream queries when available
    do-ip6: yes
    prefer-ip6: no   # Set to yes to prefer IPv6 upstreams

    # Specific IPv6 upstream forwarders
    # (if using forwarding mode)

forward-zone:
    name: "."
    forward-addr: 2001:4860:4860::8888  # Google Public DNS IPv6
    forward-addr: 2001:4860:4860::8844  # Google Public DNS IPv6 secondary
    forward-addr: 8.8.8.8               # Google Public DNS IPv4 fallback
```

## Verifying Unbound Listens on IPv6

```bash
# Check configuration syntax

unbound-checkconf

# Restart Unbound
systemctl restart unbound

# Verify Unbound is listening on IPv6
ss -6 -tlnp | grep unbound
# Expected:
# LISTEN  0  0  [::]:53  *:*  users:(("unbound", ...))

# Also check IPv4 and IPv6 together
ss -tlnp | grep unbound
```

## Testing IPv6 DNS Queries Against Unbound

```bash
# Query Unbound over IPv6 loopback
dig A example.com @::1

# Expected: answer from Unbound with status NOERROR

# Test AAAA resolution over IPv6
dig AAAA google.com @::1

# Test from a specific IPv6 client address
dig A example.com @2001:db8::53

# Verify response uses IPv6
dig A example.com @::1 +short +identify
# +identify only takes effect alongside +short, and reveals the
# responding server's address and port
```

## Firewall Rules for IPv6 DNS

```bash
# Allow IPv6 DNS queries (UDP and TCP port 53)
ip6tables -A INPUT -p udp --dport 53 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 53 -j ACCEPT

# Save rules (iptables-persistent on Debian/Ubuntu uses /etc/iptables/)
ip6tables-save > /etc/iptables/rules.v6
```

## Enabling Unbound Statistics for IPv6 Monitoring

```yaml
# /etc/unbound/unbound.conf - statistics section
server:
    statistics-interval: 60
    extended-statistics: yes

# Enable remote control for statistics
remote-control:
    control-enable: yes
    control-interface: 127.0.0.1
    control-interface: ::1
```

```bash
# View statistics including IPv6 queries
unbound-control stats | grep -E 'num.queries|ipv6'
```

## Troubleshooting

**Unbound not responding on IPv6**:
```bash
# Check logs for binding errors
journalctl -u unbound | grep -E 'error|bind|listen'

# Common error: "bind: Cannot assign requested address"
# Cause: IPv6 address not yet assigned when Unbound starts
# Fix: Add After=network-online.target to unbound.service
```

**Queries from IPv6 clients refused**:
```bash
# Validate the active configuration syntax
unbound-checkconf

# Inspect access-control entries in the running config
grep -E '^\s*access-control:' /etc/unbound/unbound.conf
# Ensure an access-control: <client-subnet> allow line covers the client
```

## Summary

Configure Unbound to listen on IPv6 by adding `interface: ::0` and setting `do-ip6: yes` in `unbound.conf`. Add `access-control` entries for your IPv6 client subnets, ensure firewall allows port 53/UDP and 53/TCP over IPv6, then restart Unbound. Verify with `ss -6 -tlnp` and test with `dig @::1`.
