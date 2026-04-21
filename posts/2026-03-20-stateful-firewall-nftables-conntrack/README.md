# How to Create a Stateful Firewall with nftables Connection Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Connection Tracking, Stateful Firewall, Security, Networking

Description: Build a stateful nftables firewall using connection tracking states to allow established sessions while blocking unsolicited inbound connections.

## Introduction

A stateful firewall tracks the state of network connections and makes decisions based on whether a packet belongs to a new, established, or related connection. nftables integrates with the Linux conntrack subsystem to provide this capability. Stateful filtering is more secure than stateless rules because it allows replies to outbound connections without opening blanket inbound ports.

## Connection Tracking States

Common nftables connection tracking states include:

| State | Meaning |
|---|---|
| `new` | Packets for a connection that has only been seen in one direction so far |
| `established` | Packets for a connection where traffic has been seen in both directions |
| `related` | Related to an existing connection (e.g., FTP data channel) |
| `invalid` | Does not follow the expected behavior of a tracked connection |

## Basic Stateful Firewall

```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Always allow loopback
        iif lo accept

        # Allow established and related (permits replies to outbound connections)
        ct state established,related accept

        # Allow essential IPv6 neighbor discovery
        icmpv6 type { nd-neighbor-solicit, nd-router-advert, nd-neighbor-advert } accept

        # Drop invalid packets (protects against some attacks)
        ct state invalid drop

        # Allow new connections only on specific ports
        tcp dport 22 ct state new accept
        tcp dport { 80, 443 } ct state new accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        # Accept all outbound traffic - conntrack will track it
        type filter hook output priority 0; policy accept;
    }
}
```

## Why `established,related` Comes First

The order matters for performance. `established` and `related` packets represent the bulk of traffic on a busy server. Matching them early avoids evaluating subsequent rules for every reply packet.

```bash
# Efficient: check established state early

nft add rule inet filter input ct state established,related accept
nft add rule inet filter input ct state invalid drop
nft add rule inet filter input tcp dport 22 ct state new accept
```

## Stateful Forwarding for a Router

On a NAT router, stateful tracking allows outbound-initiated connections to return:

```bash
table inet filter {
    chain forward {
        type filter hook forward priority 0; policy drop;

        # Allow new connections from LAN to WAN
        iif "eth1" oif "eth0" ct state new,established,related accept

        # Allow established/related return traffic from WAN to LAN
        iif "eth0" oif "eth1" ct state established,related accept
    }
}
```

## Monitor Connection Tracking Table

```bash
# View current tracked connections
conntrack -L

# Filter by protocol
conntrack -L -p tcp

# Watch connections in real time
conntrack -E

# Count total tracked connections
conntrack -C
```

## Flush the Connection Tracking Table

```bash
# Remove all tracked connections (use with caution - may disrupt active sessions)
conntrack -F

# Flush only connections from a specific host
conntrack -D -s 198.51.100.100
```

## Conntrack Limits and Tuning

```bash
# Check maximum tracked connections
sysctl net.netfilter.nf_conntrack_max

# Increase the limit for high-traffic servers
sysctl -w net.netfilter.nf_conntrack_max=131072
echo "net.netfilter.nf_conntrack_max = 131072" >> /etc/sysctl.d/99-conntrack.conf
```

## Conclusion

A stateful nftables firewall using connection tracking states provides robust security with simple rules. The key pattern is: accept `established,related` early, drop `invalid`, then selectively allow `new` connections on needed ports. This approach allows all outbound-initiated traffic to return while blocking unsolicited inbound connections.
