# How to Use Network Firewall Stateful and Stateless Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Security, Firewall

Description: A deep dive into AWS Network Firewall rule types, covering stateless rules for fast packet-level filtering and stateful rules for connection tracking, domain filtering, and Suricata-compatible IDS signatures.

---

AWS Network Firewall gives you two distinct rule engines to work with: stateless and stateful. They serve different purposes, have different performance characteristics, and are evaluated in a specific order. Understanding how each one works - and when to use which - is key to building an effective firewall configuration.

Here's the evaluation order: stateless rules run first. If a stateless rule matches, it takes action immediately (pass, drop, or forward to the stateful engine). Traffic that gets forwarded to the stateful engine then goes through your stateful rule groups.

## Stateless Rules

Stateless rules are fast and simple. They look at individual packets without any awareness of connection state. Think of them as turbocharged NACLs - they can match on source/destination IP, port, protocol, and TCP flags, but they don't track connections.

Each stateless rule has a priority number (lower = evaluated first), match conditions, and an action.

Available actions for stateless rules:
- `aws:pass` - Allow the packet through without further inspection
- `aws:drop` - Silently drop the packet
- `aws:forward_to_sfe` - Forward to the stateful rule engine for deeper inspection

Here's a stateless rule group that handles some quick decisions before handing everything else to the stateful engine.

```bash
# Create a stateless rule group with multiple rules
aws network-firewall create-rule-group \
  --rule-group-name "quick-decisions" \
  --type STATELESS \
  --capacity 100 \
  --rule-group '{
    "RulesSource": {
      "StatelessRulesAndCustomActions": {
        "StatelessRules": [
          {
            "Priority": 1,
            "RuleDefinition": {
              "MatchAttributes": {
                "Sources": [{"AddressDefinition": "198.51.100.0/24"}],
                "Protocols": [6, 17]
              },
              "Actions": ["aws:drop"]
            }
          },
          {
            "Priority": 2,
            "RuleDefinition": {
              "MatchAttributes": {
                "Sources": [{"AddressDefinition": "10.0.0.0/8"}],
                "Destinations": [{"AddressDefinition": "10.0.0.0/8"}],
                "Protocols": [6, 17]
              },
              "Actions": ["aws:pass"]
            }
          },
          {
            "Priority": 10,
            "RuleDefinition": {
              "MatchAttributes": {
                "Protocols": [1]
              },
              "Actions": ["aws:pass"]
            }
          }
        ]
      }
    }
  }'
```

This rule group does three things: drops all TCP/UDP traffic from a known-bad CIDR (priority 1), passes internal VPC-to-VPC traffic without stateful inspection (priority 2), and passes all ICMP/ping traffic (priority 10). Everything else hits the default action, which should be `aws:forward_to_sfe`.

### When to Use Stateless Rules

Stateless rules are best for:
- Dropping traffic from known-bad IP ranges (faster than stateful processing)
- Passing trusted internal traffic that doesn't need deep inspection
- Simple protocol-based filtering (block all UDP, allow ICMP, etc.)
- High-throughput scenarios where you want to minimize latency

## Stateful Rules

Stateful rules are where the real power lives. They track connection state, can inspect application-layer protocols, and support complex matching conditions. The stateful engine is based on Suricata, which gives you three ways to write rules.

### Option 1: Domain List Rules

The simplest stateful rule type. You specify a list of domains and whether to allow or deny them. The firewall inspects HTTP Host headers and TLS SNI fields to match traffic.

```bash
# Allow only specific domains for outbound HTTPS traffic
aws network-firewall create-rule-group \
  --rule-group-name "approved-domains" \
  --type STATEFUL \
  --capacity 100 \
  --rule-group '{
    "RulesSource": {
      "RulesSourceList": {
        "Targets": [
          ".amazonaws.com",
          ".github.com",
          ".docker.io",
          ".ubuntu.com",
          "pypi.org",
          ".pypi.org"
        ],
        "TargetTypes": ["HTTP_HOST", "TLS_SNI"],
        "GeneratedRulesType": "ALLOWLIST"
      }
    }
  }'
```

With `ALLOWLIST`, only traffic to the listed domains is permitted - everything else gets dropped. With `DENYLIST`, the listed domains are blocked and everything else passes.

Domain filtering is extremely useful for locking down egress traffic. Instead of trying to maintain lists of IP ranges for every service you use (which change constantly), you filter by domain name.

### Option 2: 5-Tuple Rules

These rules match on the classic five-tuple: protocol, source IP, source port, destination IP, and destination port. They're connection-aware though, so you don't need separate rules for return traffic.

```bash
# Create 5-tuple stateful rules
aws network-firewall create-rule-group \
  --rule-group-name "app-tier-rules" \
  --type STATEFUL \
  --capacity 50 \
  --rule-group '{
    "RulesSource": {
      "StatefulRules": [
        {
          "Action": "PASS",
          "Header": {
            "Protocol": "TCP",
            "Source": "10.0.1.0/24",
            "SourcePort": "ANY",
            "Direction": "FORWARD",
            "Destination": "10.0.2.0/24",
            "DestinationPort": "5432"
          },
          "RuleOptions": [
            {"Keyword": "sid", "Settings": ["1"]}
          ]
        },
        {
          "Action": "DROP",
          "Header": {
            "Protocol": "TCP",
            "Source": "ANY",
            "SourcePort": "ANY",
            "Direction": "FORWARD",
            "Destination": "10.0.2.0/24",
            "DestinationPort": "5432"
          },
          "RuleOptions": [
            {"Keyword": "sid", "Settings": ["2"]}
          ]
        }
      ]
    }
  }'
```

This allows PostgreSQL traffic from the app subnet (10.0.1.0/24) to the database subnet (10.0.2.0/24), and blocks PostgreSQL traffic from everywhere else.

### Option 3: Suricata-Compatible Rules

For maximum flexibility, you can write rules in Suricata's rule language. This gives you access to deep packet inspection, content matching, protocol analysis, and more.

```bash
# Create a rule group using Suricata-compatible rules
aws network-firewall create-rule-group \
  --rule-group-name "advanced-inspection" \
  --type STATEFUL \
  --capacity 200 \
  --rules 'alert tcp any any -> any 80 (msg:"Potential SQL injection in HTTP"; content:"UNION"; nocase; content:"SELECT"; nocase; sid:100001; rev:1;)
drop tcp any any -> any any (msg:"Block outbound SSH"; flow:to_server; dport:22; sid:100002; rev:1;)
alert tls any any -> any 443 (msg:"TLS connection to suspicious domain"; tls.sni; content:"malware"; nocase; sid:100003; rev:1;)'
```

Suricata rules support dozens of keywords for matching packet content, flow direction, protocol-specific fields, and more. If you've used Snort or Suricata before, you can bring your existing rulesets directly into AWS Network Firewall.

## Rule Group Capacity

Each rule group has a capacity that you set at creation time and can't change later. Capacity represents the estimated processing resources needed, not a simple rule count.

For stateless rules, each rule uses capacity based on the number of match conditions. A simple rule with one source CIDR and one protocol uses about 1 unit.

For stateful rules:
- Domain list rules use capacity equal to the number of domain names
- 5-tuple rules use 1 capacity unit per rule
- Suricata rules use 1 capacity unit per rule

Plan ahead and set capacity higher than you currently need, since you can't increase it later without recreating the rule group.

## Rule Evaluation Order for Stateful Rules

By default, stateful rules follow Suricata's strict evaluation order. But you can change this to use action-order evaluation, where pass rules are evaluated before drop/alert rules.

```bash
# Create a firewall policy with action-order evaluation
aws network-firewall create-firewall-policy \
  --firewall-policy-name "action-order-policy" \
  --firewall-policy '{
    "StatelessDefaultActions": ["aws:forward_to_sfe"],
    "StatelessFragmentDefaultActions": ["aws:forward_to_sfe"],
    "StatefulEngineOptions": {
      "RuleOrder": "STRICT_ORDER"
    },
    "StatefulDefaultActions": ["aws:drop_established"],
    "StatefulRuleGroupReferences": [
      {
        "ResourceArn": "arn:aws:network-firewall:us-east-1:123456789012:stateful-rulegroup/approved-domains",
        "Priority": 1
      },
      {
        "ResourceArn": "arn:aws:network-firewall:us-east-1:123456789012:stateful-rulegroup/app-tier-rules",
        "Priority": 2
      }
    ]
  }'
```

With `STRICT_ORDER`, rule groups are evaluated in priority order, and within each group, rules are evaluated by their SID. With `DEFAULT_ACTION_ORDER`, pass rules get priority regardless of rule group order.

## Monitoring Rule Hits

Enable alert logging to see which rules are being triggered.

```bash
# Check Network Firewall CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/NetworkFirewall \
  --metric-name DroppedPackets \
  --dimensions Name=FirewallName,Value=main-firewall \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

For more on the overall Network Firewall architecture, see https://oneuptime.com/blog/post/aws-network-firewall-vpc-traffic-filtering/view.

Getting the balance right between stateless and stateful rules is an art. Use stateless for the obvious, high-volume decisions. Save the stateful engine for traffic that needs real inspection. Your firewall performance - and your AWS bill - will thank you.
