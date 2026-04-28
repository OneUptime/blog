# How to Use nftables Sets for IP Whitelisting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, IP Whitelisting, Set, Security, Networking

Description: Use nftables named sets and anonymous sets to efficiently whitelist IP addresses and subnets, allowing only trusted sources to access your services.

## Introduction

nftables sets are collections of IP addresses, subnets, ports, or other values that can be referenced in rules. Instead of writing one rule per allowed IP, you maintain a single set and reference it in one rule. This makes IP whitelisting scalable and easy to update without reloading your entire ruleset.

## Prerequisites

- nftables installed and running
- An existing `inet filter` table with input chain
- Root access

## Anonymous Sets (Inline)

Anonymous sets are defined directly in a rule using `{ }`. They are useful when the list is small and unlikely to change.

```bash
# Allow SSH from a small set of known IPs

nft add rule inet filter input ip saddr { 10.0.0.1, 10.0.0.2, 203.0.113.50 } tcp dport 22 accept
```

## Named Sets (Persistent and Updatable)

Named sets are defined separately from rules. You can add or remove elements without touching the rules that reference them.

```bash
# Create a named set called "ssh_whitelist" containing IPv4 addresses
nft add set inet filter ssh_whitelist { type ipv4_addr \; }

# Add trusted IPs to the set
nft add element inet filter ssh_whitelist { 10.0.0.1, 10.0.0.2, 203.0.113.50 }

# Reference the set in a rule (prefix with @)
nft add rule inet filter input ip saddr @ssh_whitelist tcp dport 22 accept
```

## Sets with CIDR Subnets

To use subnet prefixes in a set, declare it with the `interval` flag:

```bash
# Create a set for CIDR ranges
nft add set inet filter trusted_subnets { type ipv4_addr \; flags interval \; }

# Add subnets
nft add element inet filter trusted_subnets { 10.0.0.0/8, 192.168.0.0/16, 203.0.113.0/24 }

# Use the set in a rule
nft add rule inet filter input ip saddr @trusted_subnets tcp dport { 80, 443 } accept
```

## Full Configuration with Named Sets

```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    # Whitelisted IPs for SSH access
    set ssh_whitelist {
        type ipv4_addr
        elements = { 10.0.0.1, 10.0.0.2, 203.0.113.50 }
    }

    # Trusted subnets for web access
    set trusted_subnets {
        type ipv4_addr
        flags interval
        elements = { 10.0.0.0/8, 192.168.0.0/16 }
    }

    chain input {
        type filter hook input priority 0; policy drop;

        iif lo accept
        ct state established,related accept
        ct state invalid drop

        # Allow SSH only from whitelisted IPs
        ip saddr @ssh_whitelist tcp dport 22 accept

        # Allow web traffic from trusted subnets
        ip saddr @trusted_subnets tcp dport { 80, 443 } accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

## Dynamic Updates to Sets

The power of named sets is that you can add or remove IPs without reloading the full ruleset:

```bash
# Add a new IP to the whitelist at runtime
nft add element inet filter ssh_whitelist { 198.51.100.5 }

# Remove an IP from the whitelist
nft delete element inet filter ssh_whitelist { 10.0.0.2 }

# List the current set contents
nft list set inet filter ssh_whitelist
```

## Conclusion

nftables sets provide an efficient and scalable way to manage IP whitelists. Named sets with the `interval` flag support CIDR ranges and can be updated at runtime without disrupting active connections. Reference sets with the `@` prefix in rules to keep your ruleset clean and maintainable.
