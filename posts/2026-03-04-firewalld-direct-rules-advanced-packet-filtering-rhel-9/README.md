# How to Use Firewalld Direct Rules for Advanced Packet Filtering on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Firewalld, Direct Rules, Packet Filtering, Linux

Description: How to use firewalld direct rules on RHEL for advanced packet filtering scenarios that go beyond what zones and rich rules can handle.

---

Firewalld's zones, services, and rich rules cover most use cases. But sometimes you need to drop down to raw iptables-style rules for advanced filtering. That is where direct rules come in. They let you insert rules directly into the underlying packet filter chains, giving you the same power as raw iptables but within the firewalld framework.

**Important note**: Direct rules using iptables syntax are deprecated in RHEL in favor of policies and rich rules. However, they still work and are sometimes the only way to achieve certain filtering goals. Consider using rich rules or firewalld policies first.

## When to Use Direct Rules

Use direct rules when you need:

- Rules that do not fit the zone model
- Custom chain management
- Packet marking for policy routing
- Advanced connection tracking rules
- Integration with fail2ban or other tools that need raw rule access

## Direct Rule Syntax

```bash
firewall-cmd --direct --add-rule ipv4 <table> <chain> <priority> <rule>
```

- **ipv4/ipv6/eb**: Protocol family
- **table**: filter, nat, or mangle
- **chain**: INPUT, OUTPUT, FORWARD, etc.
- **priority**: Lower numbers are processed first (0 is default)
- **rule**: Standard iptables rule syntax (without -A/-I and chain name)

## Basic Direct Rule Examples

### Block a Specific IP

```bash
# Block all traffic from a specific IP
firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -s 203.0.113.50 -j DROP --permanent
firewall-cmd --reload
```

### Limit ICMP Rate

```bash
# Rate limit ping replies to 1 per second
firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -p icmp --icmp-type echo-request -m limit --limit 1/s --limit-burst 4 -j ACCEPT --permanent
firewall-cmd --reload
```

### Log New Connections

```bash
# Log all new incoming TCP connections
firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -p tcp -m state --state NEW -j LOG --log-prefix "NEW-CONN: " --log-level info --permanent
firewall-cmd --reload
```

## Working with Custom Chains

You can create custom chains for better organization:

```bash
# Create a custom chain for web traffic filtering
firewall-cmd --direct --add-chain ipv4 filter WEB_FILTER --permanent

# Add rules to the custom chain
firewall-cmd --direct --add-rule ipv4 filter WEB_FILTER 0 -m string --string "wp-login" --algo bm -j DROP --permanent
firewall-cmd --direct --add-rule ipv4 filter WEB_FILTER 1 -m connlimit --connlimit-above 50 --connlimit-mask 32 -j DROP --permanent

# Jump to the custom chain from INPUT
firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -p tcp --dport 80 -j WEB_FILTER --permanent
firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -p tcp --dport 443 -j WEB_FILTER --permanent

firewall-cmd --reload
```

## Connection Limiting

```bash
# Limit concurrent connections per IP to port 22
firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -p tcp --dport 22 -m connlimit --connlimit-above 3 --connlimit-mask 32 -j REJECT --permanent
firewall-cmd --reload
```

## Packet Marking for QoS

```bash
# Mark packets for different QoS classes
firewall-cmd --direct --add-rule ipv4 mangle OUTPUT 0 -p tcp --dport 22 -j MARK --set-mark 1 --permanent
firewall-cmd --direct --add-rule ipv4 mangle OUTPUT 1 -p tcp --dport 80 -j MARK --set-mark 2 --permanent
firewall-cmd --reload
```

## Listing Direct Rules

```bash
# List all direct rules
firewall-cmd --direct --get-all-rules

# List rules in a specific chain
firewall-cmd --direct --get-rules ipv4 filter INPUT

# List all custom chains
firewall-cmd --direct --get-all-chains

# List permanent direct rules
firewall-cmd --direct --get-all-rules --permanent
```

## Removing Direct Rules

```bash
# Remove a specific rule (must match exactly)
firewall-cmd --direct --remove-rule ipv4 filter INPUT 0 -s 203.0.113.50 -j DROP --permanent

# Remove a custom chain (must be empty first)
firewall-cmd --direct --remove-chain ipv4 filter WEB_FILTER --permanent

firewall-cmd --reload
```

## Direct Rules vs Rich Rules

Here is when to use each:

| Scenario | Use Rich Rules | Use Direct Rules |
|---|---|---|
| Source-based filtering | Yes | Overkill |
| Service/port filtering | Yes | Overkill |
| Connection limiting | Limited | Yes |
| String matching | No | Yes |
| Custom chains | No | Yes |
| Packet marking | No | Yes |
| Rate limiting | Yes (basic) | Yes (advanced) |

## Practical Example: Protecting a Web Server

```bash
# Drop invalid packets
firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -m state --state INVALID -j DROP --permanent

# Protect against SYN floods
firewall-cmd --direct --add-rule ipv4 filter INPUT 1 -p tcp --syn -m limit --limit 25/s --limit-burst 50 -j ACCEPT --permanent

# Limit connections per IP on port 80
firewall-cmd --direct --add-rule ipv4 filter INPUT 2 -p tcp --dport 80 -m connlimit --connlimit-above 100 --connlimit-mask 32 -j REJECT --permanent

# Limit connections per IP on port 443
firewall-cmd --direct --add-rule ipv4 filter INPUT 2 -p tcp --dport 443 -m connlimit --connlimit-above 100 --connlimit-mask 32 -j REJECT --permanent

firewall-cmd --reload
```

## Direct Rules File

Direct rules are stored in XML when saved permanently:

```bash
# View the direct rules file
cat /etc/firewalld/direct.xml
```

You can edit this file directly if you prefer:

```xml
<?xml version="1.0" encoding="utf-8"?>
<direct>
  <rule priority="0" table="filter" ipv="ipv4" chain="INPUT">-s 203.0.113.50 -j DROP</rule>
  <rule priority="0" table="filter" ipv="ipv4" chain="INPUT">-p tcp --dport 22 -m connlimit --connlimit-above 3 --connlimit-mask 32 -j REJECT</rule>
</direct>
```

After editing, reload:

```bash
firewall-cmd --reload
```

## Interaction with Zone Rules

Direct rules are processed in a specific order relative to zone rules. Generally, direct rules in the INPUT chain are processed before zone rules, which means a direct rule DROP will take precedence over a zone ACCEPT.

```bash
# This direct rule blocks port 80 even if the zone allows http
firewall-cmd --direct --add-rule ipv4 filter INPUT 0 -p tcp --dport 80 -s 10.0.1.50 -j DROP --permanent
```

## Migration Path

Since direct rules are deprecated, consider migrating to:

- **Rich rules** for source-based filtering and basic rate limiting
- **Firewalld policies** for inter-zone traffic control
- **Custom services** for port grouping

But if you need connection limiting, string matching, or packet marking, direct rules remain the tool for the job until firewalld adds native support.

## Summary

Direct rules give you raw iptables power within the firewalld framework. Use them for advanced scenarios like connection limiting, string matching, packet marking, and custom chain management. They are deprecated in favor of rich rules and policies, but they still work on RHEL and remain necessary for certain advanced filtering tasks. Always use `--permanent` and `--reload`, and be aware that direct rules interact with zone rules in specific ways.
