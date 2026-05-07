# How to Allow HTTP and HTTPS Traffic with nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, HTTP, HTTPS, Networking, Security

Description: Add nftables rules to allow inbound HTTP (port 80) and HTTPS (port 443) traffic for web servers while maintaining a secure firewall policy.

## Introduction

Running a web server requires opening ports 80 and 443 in your firewall. nftables makes it straightforward to allow both ports in a single rule using a set literal. This guide covers how to do this correctly in an `inet` table so the same TCP rule applies to both IPv4 and IPv6 traffic.

## Prerequisites

- nftables installed and running
- An existing `inet filter` table with an `input` chain
- Root or sudo access

## Allow HTTP and HTTPS in a Single Rule

nftables supports matching multiple port values in one rule using a set literal `{ }`, which is more efficient than two separate rules.

```bash
# Allow HTTP (80) and HTTPS (443) in one rule

nft add rule inet filter input tcp dport { 80, 443 } accept
```

## Allow HTTPS and Redirect HTTP

For a modern security posture, you may want to serve content only over HTTPS and allow HTTP only so your application can return an HTTP-to-HTTPS redirect:

```bash
# Accept HTTPS
nft add rule inet filter input tcp dport 443 accept

# Accept HTTP so the web server can return a redirect to HTTPS
nft add rule inet filter input tcp dport 80 accept
```

## Restrict Web Traffic to Specific Source Ranges

You can combine source IP filtering with port matching. In an `inet` table, `ip saddr` matches IPv4 sources only; use `ip6 saddr` for IPv6 source filtering.

```bash
# Allow web traffic only from a specific subnet
nft add rule inet filter input ip saddr 192.168.1.0/24 tcp dport { 80, 443 } accept
```

## Full Example Configuration

A minimal nftables configuration for a web server:

```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow loopback interface
        iif lo accept

        # Allow established and related traffic
        ct state established,related accept

        # Drop invalid packets
        ct state invalid drop

        # Allow ICMPv6 neighbor discovery so IPv6 connectivity works
        icmpv6 type { nd-neighbor-solicit, nd-router-advert, nd-neighbor-advert } accept

        # Allow SSH (management access)
        tcp dport 22 accept

        # Allow HTTP and HTTPS
        tcp dport { 80, 443 } accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

## Apply and Verify

```bash
# Apply the configuration file
nft -f /etc/nftables.conf

# Verify web ports are open
nft list ruleset | grep -E "80|443"

# Test from another machine
curl -I http://your-server-ip
curl -I https://your-server-name
```

## Rate Limiting Web Traffic

To protect against simple floods, add a rate limit to the web rule:

```bash
# Allow HTTP/HTTPS with a rate limit of 100 new connections per second
nft add rule inet filter input tcp dport { 80, 443 } \
    ct state new limit rate 100/second accept
```

## Save and Enable

```bash
# Save the current ruleset to a configuration file commonly loaded by nftables
echo "flush ruleset" > /etc/nftables.conf
nft list ruleset >> /etc/nftables.conf

# Enable nftables at boot if your distribution provides the nftables service
systemctl enable nftables
```

## Conclusion

Allowing HTTP and HTTPS with nftables is concise thanks to set literals that match multiple ports in one rule. Combine this with rate limiting and source filtering to build a hardened web server firewall. Save your ruleset to the configuration file used by your distribution, commonly `/etc/nftables.conf`, and enable the service to persist rules across reboots.
