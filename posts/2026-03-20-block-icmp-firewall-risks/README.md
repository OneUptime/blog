# How to Block ICMP on a Firewall and Understand the Risks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, Firewall, iptables, Security, Networking, Linux

Description: Learn which ICMP types to block and which to allow, and understand the operational risks of blocking ICMP entirely on a firewall.

## Introduction

Blocking all ICMP traffic is a common but misguided security practice. While it seems protective, it breaks critical network functions including path MTU discovery, ping-based monitoring, and traceroute. The correct approach is to allow specific ICMP types that are operationally necessary while blocking the rest.

## What Breaks When You Block All ICMP

| ICMP Type | Effect of Blocking |
|---|---|
| Type 3 Code 4 (Fragmentation Needed) | Path MTU discovery fails → TCP sessions hang with large data |
| Type 8 Echo Request | Ping monitoring fails, ICMP-based health checks stop working |
| Type 11 TTL Exceeded | Traceroute stops working for path diagnosis |
| Type 0 Echo Reply | Responses to outbound pings are blocked |

**The most dangerous thing to block is Type 3 Code 4 (Fragmentation Needed).** This causes TCP connections to appear established but silently hang when transferring large payloads. This is called an MTU black hole.

## Safe ICMP Firewall Configuration with iptables

```bash
# iptables: allow essential ICMP, block everything else

# Allow ICMP echo request (incoming ping) - rate-limited

iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 10/s -j ACCEPT

# Allow ICMP echo reply (responses to our pings)
iptables -A INPUT -p icmp --icmp-type echo-reply -j ACCEPT

# CRITICAL: Allow fragmentation needed (required for PMTUD)
iptables -A INPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT

# Allow time exceeded (traceroute responses)
iptables -A INPUT -p icmp --icmp-type time-exceeded -j ACCEPT

# Allow destination unreachable (error messages)
iptables -A INPUT -p icmp --icmp-type destination-unreachable -j ACCEPT

# Drop all other ICMP
iptables -A INPUT -p icmp -j DROP
```

## nftables Equivalent

```bash
# /etc/nftables.conf
table ip filter {
  chain input {
    type filter hook input priority 0; policy accept;

    # Allow essential ICMP
    icmp type { echo-reply, destination-unreachable, time-exceeded } accept
    icmp type echo-request limit rate 10/second accept
    # Critical: fragmentation needed for PMTUD
    icmp code frag-needed accept

    # Drop all other ICMP silently
    icmp type != { echo-reply, echo-request, destination-unreachable, time-exceeded } drop
  }
}
```

## Testing That PMTUD Still Works After Firewall Changes

```bash
# After applying ICMP rules, verify PMTUD still works
# tracepath discovers the path MTU and reports PMTU changes
tracepath 8.8.8.8

# Look for "pmtu N" in the output. That confirms PMTUD feedback
# is getting back to the host.

# Check for PMTUD signals directly
tcpdump -i eth0 -n 'icmp[0]=3 and icmp[1]=4'
# You should see these packets when a router sends
# "fragmentation needed" back to a sender
```

## Blocking ICMP on the OUTPUT Chain

```bash
# Prevent your server from replying to pings
# Other outbound ICMP remains subject to your existing OUTPUT policy
iptables -A OUTPUT -p icmp --icmp-type echo-reply -j DROP
# Caution: this means pings to your server won't get replies
# but TCP connections still work normally
```

## Conclusion

Never block all ICMP. The security benefit is minimal (the IP header is still visible to scanners regardless), and the operational cost is high - MTU black holes, broken ICMP-based health checks, and inability to use traceroute for diagnostics. Allow echo-request (rate-limited), echo-reply, fragmentation-needed, time-exceeded, and destination-unreachable. Selectively drop anything else.
