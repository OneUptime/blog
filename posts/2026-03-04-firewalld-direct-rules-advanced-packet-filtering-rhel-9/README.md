# How to Use Firewalld Direct Rules for Advanced Packet Filtering on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, firewalld, Direct Rules, Packet Filtering, Linux

Description: How to use firewalld direct rules on RHEL for advanced packet filtering scenarios that go beyond what zones and rich rules can handle.

---

Firewalld's zones, services, and rich rules cover most use cases. But sometimes you need to drop down to raw iptables-style rules for advanced filtering. That is where direct rules come in. They let you insert rules directly into the underlying packet filter chains, giving you the same power as raw iptables but within the firewalld framework.

**Important note**: The firewalld direct interface is deprecated. Use rich rules, firewalld policies, or nftables rules where possible. However, direct rules still work and are sometimes needed for filtering goals that firewalld's higher-level abstractions do not cover.

## When to Use Direct Rules

Use direct rules when you need:

- Rules that do not fit the zone model
- Custom chain management
- Packet marking for policy routing
- Advanced connection tracking rules
- Integration with fail2ban or other tools that need raw rule access

## Direct Rule Syntax

```bash
firewall-cmd --permanent --direct --add-rule ipv4 <table> <chain> <priority> <rule>
```

- **ipv4/ipv6/eb**: Protocol family
- **table**: filter, nat, or mangle
- **chain**: INPUT, OUTPUT, FORWARD, etc.
- **priority**: Lower numbers are processed first. Priority 0 adds the rule at the top, and higher priorities are added further down.
- **rule**: Standard iptables rule syntax (without -A/-I and chain name)

## Basic Direct Rule Examples

### Block a Specific IP

```bash
# Block all traffic from a specific IP

firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 -s 203.0.113.50 -j DROP
firewall-cmd --reload
```

### Limit ICMP Rate

```bash
# Rate limit incoming ping requests to 1 per second
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 -p icmp --icmp-type echo-request -m limit --limit 1/s --limit-burst 4 -j ACCEPT
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 1 -p icmp --icmp-type echo-request -j DROP
firewall-cmd --reload
```

### Log New Connections

```bash
# Log all new incoming TCP connections
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 -p tcp -m state --state NEW -j LOG --log-prefix "NEW-CONN: " --log-level info
firewall-cmd --reload
```

## Working with Custom Chains

You can create custom chains for better organization:

```bash
# Create a custom chain for web traffic filtering
firewall-cmd --permanent --direct --add-chain ipv4 filter WEB_FILTER

# Add rules to the custom chain
firewall-cmd --permanent --direct --add-rule ipv4 filter WEB_FILTER 0 -m string --string "wp-login" --algo bm -j DROP
firewall-cmd --permanent --direct --add-rule ipv4 filter WEB_FILTER 1 -m connlimit --connlimit-above 50 --connlimit-mask 32 -j DROP

# Jump to the custom chain from INPUT for unencrypted HTTP traffic
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 -p tcp --dport 80 -j WEB_FILTER

firewall-cmd --reload
```

## Connection Limiting

```bash
# Limit concurrent connections per IP to port 22
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 -p tcp --dport 22 -m connlimit --connlimit-above 3 --connlimit-mask 32 -j REJECT
firewall-cmd --reload
```

## Packet Marking for QoS

```bash
# Mark packets for different QoS classes
firewall-cmd --permanent --direct --add-rule ipv4 mangle OUTPUT 0 -p tcp --dport 22 -j MARK --set-mark 1
firewall-cmd --permanent --direct --add-rule ipv4 mangle OUTPUT 1 -p tcp --dport 80 -j MARK --set-mark 2
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
firewall-cmd --permanent --direct --get-all-rules
```

## Removing Direct Rules

```bash
# Remove a specific rule (must match exactly)
firewall-cmd --permanent --direct --remove-rule ipv4 filter INPUT 0 -s 203.0.113.50 -j DROP

# Remove a custom chain (must be empty first)
firewall-cmd --permanent --direct --remove-chain ipv4 filter WEB_FILTER

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
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 -m state --state INVALID -j DROP

# Protect against SYN floods by accepting a limited rate and dropping the rest
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 1 -p tcp --syn -m limit --limit 25/s --limit-burst 50 -j ACCEPT
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 2 -p tcp --syn -j DROP

# Limit connections per IP on port 80
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 3 -p tcp --dport 80 -m connlimit --connlimit-above 100 --connlimit-mask 32 -j REJECT

# Limit connections per IP on port 443
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 3 -p tcp --dport 443 -m connlimit --connlimit-above 100 --connlimit-mask 32 -j REJECT

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

Direct rules are processed in a specific order relative to zone rules. Rules added for built-in chains such as INPUT are placed in internal chains such as INPUT_direct. A direct rule that drops packets takes effect before zone accepts, but direct ACCEPT rules can still be subject to the nftables-based firewalld ruleset when the nftables backend is in use.

```bash
# This direct rule blocks port 80 even if the zone allows http
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 -p tcp --dport 80 -s 10.0.1.50 -j DROP
```

## Migration Path

Since direct rules are deprecated, consider migrating to:

- **Rich rules** for source-based filtering and basic rate limiting
- **Firewalld policies** for inter-zone traffic control
- **Custom services** for port grouping
- **nftables rules** for low-level filtering that cannot be represented in firewalld

But if you need connection limiting, string matching, or packet marking inside firewalld, direct rules may still be useful while you plan a migration to rich rules, policies, or nftables.

## Summary

Direct rules give you raw iptables power within the firewalld framework. Use them for advanced scenarios like connection limiting, string matching, packet marking, and custom chain management. They are deprecated, but they still work on RHEL and may remain useful for certain advanced filtering tasks while you plan a migration to rich rules, policies, or nftables. Always use `--permanent` and `--reload`, and be aware that direct rules interact with zone rules in specific ways.
