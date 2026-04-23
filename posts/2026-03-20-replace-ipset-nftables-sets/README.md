# How to Replace ipset with nftables Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Ipset, Firewall, Migration, Set, Networking

Description: Migrate from ipset and iptables to nftables native sets, replacing IP blocklists and allowlists with built-in set functionality that requires no separate tools.

## Introduction

`ipset` was the solution for managing large collections of IPs in iptables rules. With nftables, sets are built into the framework natively - no separate `ipset` package is needed. nftables sets cover common ipset use cases including IP lists, port lists, IP-port combinations, and interval (CIDR) sets.

## ipset vs nftables Sets Comparison

| Feature | ipset + iptables | nftables sets |
|---|---|---|
| Installation | Separate package | Built into nftables |
| IP lists | `hash:ip` | `type ipv4_addr` |
| CIDR ranges | `hash:net` | `type ipv4_addr; flags interval` |
| Port lists | `hash:port` | `type inet_service` |
| IP+Port | `hash:ip,port` | Concatenation type |
| Runtime updates | `ipset add` | `nft add element` |
| Persistence | `ipset save/restore` | Ruleset file (`nft list ruleset` / `nft -f`) |

## Migrating a Simple IP Blocklist

**Old iptables + ipset approach:**

```bash
# Old way

ipset create blocklist hash:ip
ipset add blocklist 198.51.100.1
iptables -I INPUT -m set --match-set blocklist src -j DROP
```

**New nftables approach:**

```bash
# New way - no ipset needed
# Assumes the inet filter table and input base chain already exist
nft add set inet filter blocklist { type ipv4_addr \; }
nft add element inet filter blocklist { 198.51.100.1 }
nft add rule inet filter input ip saddr @blocklist drop
```

## Migrating a Network/CIDR Blocklist

**Old way (`hash:net`):**

```bash
ipset create netblock hash:net
ipset add netblock 198.51.100.0/24
iptables -I INPUT -m set --match-set netblock src -j DROP
```

**New nftables way:**

```bash
# Use 'flags interval' to support CIDR prefixes
# Assumes the inet filter table and input base chain already exist
nft add set inet filter netblock { type ipv4_addr \; flags interval \; }
nft add element inet filter netblock { 198.51.100.0/24 }
nft add rule inet filter input ip saddr @netblock drop
```

## Migrating an IP + Port Allowlist

**Old way (`hash:ip,port`):**

```bash
ipset create web_allow hash:ip,port
ipset add web_allow 10.0.0.1,tcp:80
iptables -A INPUT -m set --match-set web_allow src,dst -j ACCEPT
```

**New nftables way using concatenation:**

```bash
# Concatenated set: match source IP and destination port together
# Assumes the inet filter table and input base chain already exist
nft add set inet filter web_allow { type ipv4_addr . inet_service \; }
nft add element inet filter web_allow { 10.0.0.1 . 80 }
nft add rule inet filter input ip saddr . tcp dport @web_allow accept
```

## Complete Migration Example

```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    # Replaces: ipset create blocklist hash:ip
    set blocklist {
        type ipv4_addr
        elements = { 198.51.100.1, 203.0.113.200 }
    }

    # Replaces: ipset create netblock hash:net
    set netblock {
        type ipv4_addr
        flags interval
        elements = { 198.51.100.0/24, 203.0.113.0/28 }
    }

    chain input {
        type filter hook input priority 0; policy drop;

        # Replaces iptables rules referencing the ipsets
        ip saddr @blocklist drop
        ip saddr @netblock drop

        iif lo accept
        ct state established,related accept
        tcp dport 22 accept
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

## Runtime Element Management

```bash
# Add elements (like ipset add)
nft add element inet filter blocklist { 192.0.2.10 }

# Remove elements (like ipset del)
nft delete element inet filter blocklist { 198.51.100.1 }

# List set contents (like ipset list)
nft list set inet filter blocklist
```

## Conclusion

nftables sets are a direct, more integrated replacement for ipset. The syntax is different, but nftables covers the common ipset-style use cases directly. Named sets support runtime updates, CIDR ranges, and concatenated types - all without requiring a separate tool. Migrating to native nftables sets simplifies your stack and reduces dependencies.
