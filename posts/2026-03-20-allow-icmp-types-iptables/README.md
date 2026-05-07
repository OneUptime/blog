# How to Allow Specific ICMP Types Through iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, ICMP, Firewall, Linux, Networking, Security

Description: Configure iptables to selectively allow only the necessary ICMP types for operational functionality while blocking unnecessary ICMP traffic.

## Introduction

iptables allows fine-grained control over ICMP traffic using the `--icmp-type` option. Rather than allowing all ICMP or blocking all ICMP, you can permit specific types and codes that are operationally required while dropping the rest. This section covers a practical set of rules for a secure, functional host ICMP policy.

## ICMP Type Names in iptables

iptables accepts both numeric types and symbolic names:

```bash
# List all supported ICMP type names

iptables -p icmp -h

# Common names:
# echo-request         (Type 8)
# echo-reply           (Type 0)
# destination-unreachable (Type 3)
# time-exceeded        (Type 11)
# redirect             (Type 5)
# fragmentation-needed (Type 3 Code 4)
```

## Allow Inbound ICMP Selectively

```bash
# Delete a broad INPUT ICMP drop rule if present (be careful - don't lock yourself out)
iptables -D INPUT -p icmp -j DROP 2>/dev/null

# 1. Allow ping requests (rate-limited to prevent flood)
iptables -A INPUT -p icmp --icmp-type echo-request \
  -m limit --limit 5/sec --limit-burst 10 -j ACCEPT

# 2. Allow ping replies (responses to our pings)
iptables -A INPUT -p icmp --icmp-type echo-reply -j ACCEPT

# 3. MUST ALLOW: fragmentation needed (breaks PMTUD if blocked)
iptables -A INPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT

# 4. Allow time exceeded (traceroute responses from remote routers)
iptables -A INPUT -p icmp --icmp-type time-exceeded -j ACCEPT

# 5. Allow destination unreachable (error reports from routers)
iptables -A INPUT -p icmp --icmp-type destination-unreachable -j ACCEPT

# 6. Block all other ICMP types
iptables -A INPUT -p icmp -j DROP
```

## Allow Outbound ICMP Selectively

```bash
# Allow our ping requests outbound
iptables -A OUTPUT -p icmp --icmp-type echo-request -j ACCEPT

# Allow echo replies (respond to inbound pings we accepted)
iptables -A OUTPUT -p icmp --icmp-type echo-reply -j ACCEPT

# Allow outbound error messages (dest unreachable, time exceeded)
iptables -A OUTPUT -p icmp --icmp-type destination-unreachable -j ACCEPT
iptables -A OUTPUT -p icmp --icmp-type time-exceeded -j ACCEPT

# Drop other outbound ICMP
iptables -A OUTPUT -p icmp -j DROP
```

## Blocking Ping from Specific Sources

```bash
# Block pings from a specific subnet but allow from others
iptables -I INPUT -s 10.50.0.0/24 -p icmp --icmp-type echo-request -j DROP

# Allow pings only from your monitoring server
iptables -D INPUT -p icmp --icmp-type echo-request \
  -m limit --limit 5/sec --limit-burst 10 -j ACCEPT 2>/dev/null
iptables -I INPUT -s 10.0.0.100/32 -p icmp --icmp-type echo-request -j ACCEPT
```

## Saving and Restoring iptables Rules

```bash
# Save current rules to a file
iptables-save > /etc/iptables/rules.v4

# Restore on next boot (Debian/Ubuntu with iptables-persistent)
apt install iptables-persistent
# Rules in /etc/iptables/rules.v4 are auto-loaded

# Restore manually
iptables-restore < /etc/iptables/rules.v4
```

## Verify Rules Are Applied

```bash
# List all INPUT rules with packet/byte counters
iptables -L INPUT -n -v

# Test that ping works (rule 1 passes)
ping -c 3 8.8.8.8

# Test that PMTUD-related ICMP is getting through (rule 3 passes)
tracepath 8.8.8.8

# Test that blocked ICMP types are dropped
# (Type 15 = information request - should be blocked)
hping3 --icmp --icmptype 15 -c 1 <your-server>
```

## Conclusion

Selective ICMP filtering with iptables is straightforward once you know which types to allow. The golden rule: never block Type 3 Code 4 (fragmentation needed). On a host, allowing echo-request rate-limited, echo-reply, destination-unreachable, and time-exceeded covers common operational needs such as ping, PMTUD, and traceroute while blocking older or less commonly needed ICMP types. Routers or specialized systems may require additional ICMP types.
