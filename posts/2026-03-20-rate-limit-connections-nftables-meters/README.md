# How to Rate Limit Connections Per IP with nftables Meters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Rate Limiting, DDoS Protection, Meter, Security

Description: Use nftables meters to track and rate-limit new connections per source IP address, protecting services from connection floods and brute-force attacks.

## Introduction

nftables meters attach state to dynamic keys (such as source IP addresses). They enable per-IP rate limiting without predefining every IP. This is essential for protecting SSH from brute-force attacks and web servers from connection floods.

## Prerequisites

- nftables installed
- Root access
- Basic nftables table and chain setup

## Basic Rate Limiting with `limit rate`

The simplest form of rate limiting applies a global rate to all traffic matching a rule, regardless of source IP:

```bash
# Limit all new SSH connections to 5 per minute globally

nft add rule ip filter input tcp dport 22 ct state new limit rate 5/minute accept
nft add rule ip filter input tcp dport 22 ct state new drop
```

## Per-IP Rate Limiting with Meters

Meters track rate-limit state per source IP, enabling true per-IP limits:

```bash
# Rate limit new SSH connections to 3 per minute per source IP
# Over-limit IPs must be dropped by a later rule or chain policy
nft add rule ip filter input tcp dport 22 ct state new \
    meter ssh_ratelimit { ip saddr limit rate 3/minute } accept
```

Any new connection from an IP that exceeds 3 per minute will not match `accept` and must be handled by a later drop rule or a chain with `policy drop`.

## Rate Limiting HTTP Connections Per IP

```bash
# Limit HTTP new connections to 50 per second per source IP
nft add rule ip filter input tcp dport 80 ct state new \
    meter http_ratelimit { ip saddr limit rate 50/second } accept
```

## Full Configuration with Per-IP Rate Limiting

```bash
#!/usr/sbin/nft -f

flush ruleset

table ip filter {
    chain input {
        type filter hook input priority 0; policy drop;

        iif lo accept
        ct state established,related accept
        ct state invalid drop

        # Rate limit SSH: max 3 new connections per minute per source IP
        tcp dport 22 ct state new \
            meter ssh_limit { ip saddr limit rate 3/minute } accept

        # Rate limit HTTP: max 100 new connections per second per source IP
        tcp dport 80 ct state new \
            meter http_limit { ip saddr limit rate 100/second } accept

        # Rate limit HTTPS: max 100 new connections per second per source IP
        tcp dport 443 ct state new \
            meter https_limit { ip saddr limit rate 100/second } accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

## Logging Rate-Limited Drops

To log which IPs are being rate-limited:

```bash
# Log then drop when rate limit is exceeded
nft add rule ip filter input tcp dport 22 ct state new \
    meter ssh_limit2 { ip saddr limit rate 3/minute } accept
nft add rule ip filter input tcp dport 22 ct state new \
    log prefix "SSH rate limit exceeded: " level warn drop
```

## Inspect Meter State

```bash
# List all meters and their current state
nft list meters

# View a specific meter
nft list meter ip filter ssh_limit
```

## Conclusion

nftables meters offer per-IP rate limiting without requiring preallocation of IP state. Combine them with connection tracking (`ct state new`) to limit only new connections, leaving established sessions unaffected. This technique effectively mitigates brute-force attacks and connection floods with minimal configuration.
