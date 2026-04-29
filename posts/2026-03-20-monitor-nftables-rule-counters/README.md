# How to Monitor nftables Rule Counters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Monitoring, Counter, Networking, Security

Description: Add and read packet and byte counters to nftables rules to monitor traffic volumes and verify which firewall rules are being hit.

## Introduction

nftables rules can track how many packets and bytes they have matched using the `counter` statement. This is invaluable for verifying that rules are working, diagnosing traffic flows, and capacity planning. Counters can be per-rule or named (standalone objects reusable across rules).

## Prerequisites

- nftables installed and running
- Root access

## Add a Counter to a Rule

The `counter` keyword is placed anywhere in a rule. It is a non-terminal statement that records packet and byte counts.

```bash
# Add a counter to an existing rule

nft add rule inet filter input tcp dport 22 counter accept

# Add a counter to a drop rule
nft add rule inet filter input counter drop
```

## View Counter Values

```bash
# List all rules with their counter values
nft list ruleset

# List only a specific chain with counters
nft list chain inet filter input
```

Output example:
```text
table inet filter {
    chain input {
        ...
        tcp dport 22 counter packets 1024 bytes 65536 accept
    }
}
```

## Named Counters

Named counters are standalone objects that can be referenced by multiple rules and monitored independently.

```bash
# Create a named counter
nft add counter inet filter ssh_counter

# Reference the named counter in a rule
nft add rule inet filter input tcp dport 22 counter name ssh_counter accept

# Create a counter for HTTP traffic
nft add counter inet filter http_counter
nft add rule inet filter input tcp dport { 80, 443 } counter name http_counter accept
```

## Full Configuration with Named Counters

```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    # Named counters for per-service monitoring
    counter ssh_counter { }
    counter web_counter { }
    counter drop_counter { }

    chain input {
        type filter hook input priority 0; policy drop;

        iif lo accept
        ct state established,related accept
        ct state invalid drop

        # Count and allow SSH
        tcp dport 22 counter name ssh_counter accept

        # Count and allow web traffic
        tcp dport { 80, 443 } counter name web_counter accept

        # Count all dropped packets
        counter name drop_counter drop
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

## Monitor Counters in Real Time

```bash
# Watch counter values update every 2 seconds
watch -n 2 "nft list counters table inet filter"

# List all named counters
nft list counters table inet filter

# List a specific counter
nft list counter inet filter ssh_counter
```

## Reset Counters

```bash
# Reset all counters in a table
nft reset counters table inet filter

# Reset a specific named counter
nft reset counter inet filter ssh_counter
```

## Export Counter Data for Monitoring

You can pipe counter output to monitoring tools:

```bash
#!/bin/bash
# Script: export-nft-counters.sh
# Exports counter data in a simple format for ingestion by monitoring tools

nft list counters table inet filter | while read line; do
    if [[ "$line" =~ "counter" ]]; then
        name=$(echo $line | awk '{print $2}')
        packets=$(echo $line | grep -oP 'packets \K[0-9]+')
        bytes=$(echo $line | grep -oP 'bytes \K[0-9]+')
        echo "nftables_counter{name=\"$name\"} packets=$packets bytes=$bytes"
    fi
done
```

## Conclusion

nftables counters provide lightweight, built-in traffic accounting without external tools. Use inline `counter` for quick per-rule statistics and named counters when you need to reference the same metric from multiple rules or monitor it independently. Reset counters with `nft reset counters` to get delta measurements over time.
