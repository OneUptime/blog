# How to Configure NeuVector Network Visualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Network Visualization, Container Security, Kubernetes, Security Monitoring

Description: Use NeuVector's network visualization to map container communications, identify unexpected connections, and build an accurate security policy based on real traffic patterns.

## Introduction

NeuVector's Network Activity view provides a real-time, interactive visualization of network communications between containers and external services. This visualization is invaluable for understanding your application's architecture, discovering unexpected connections, and building accurate security policies. This guide explains how to use and interpret the network visualization effectively.

## What Network Visualization Shows

The network map displays:

- Container-to-container connections within the cluster
- Connections to external IP addresses and services
- Protocol and port information for each connection
- Policy action (allowed, blocked, alerted)
- Traffic volume (bytes transferred)
- Policy violations highlighted in red/orange

## Prerequisites

- NeuVector installed with Enforcer running
- Workloads actively communicating
- NeuVector Manager access

## Step 1: Access the Network Activity View

1. Log in to the NeuVector Manager
2. Click **Network Activity** in the left navigation
3. The network map loads showing your cluster topology

## Step 2: Navigate the Network Map

The network map has several controls:

```text
Navigation:
- Scroll/Pinch to zoom
- Click and drag to pan
- Double-click a node to expand it

Filters (top bar):
- Namespace selector
- Time range filter
- Group filter
- Show/Hide external connections

Node types:
- Blue circle: Container group
- Orange circle: External IP
- Purple circle: Namespace
```

## Step 3: Filter the Visualization

Focus on specific parts of your environment:

```bash
# Get network connection data via API

curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | jq '{
    total_connections: .conversations | length,
    by_protocol: [.conversations[] | .ports] | flatten | group_by(.) | map({port: .[0], count: length})
  }'

# Get connections involving a specific group
GROUP="nv.webapp.production"
curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | jq --arg g "${GROUP}" '.conversations[] | select(.from == $g or .to == $g) | {
    from: .from,
    to: .to,
    ports: .ports,
    bytes: .bytes,
    action: .policy_action
  }'
```

## Step 4: Identify Unexpected Connections

Look for connections that shouldn't exist:

```bash
# Find connections to external IPs (potential data exfiltration)
curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.conversations[] | select(.to | startswith("nv.ip."))] | {
    external_connections: length,
    destinations: [.[].to] | unique
  }'

# Find connections on unexpected ports
curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.conversations[] | select(.ports // [] | any(test("4444|1337|31337")))]'
```

## Step 5: Export Network Topology Data

Export the network map for documentation or analysis:

```bash
#!/bin/bash
# export-network-topology.sh

# Export all connections
curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.conversations[] | [.from, .to, (.ports // [] | join(",")), .bytes, .policy_action] | @csv' | \
  awk 'BEGIN{print "\"From\",\"To\",\"Ports\",\"Bytes\",\"Action\""}{print}' \
  > network-topology.csv

echo "Network topology exported to network-topology.csv"

# Generate a Mermaid diagram of the connections
echo "## Network Topology Diagram" > network-diagram.md
echo "" >> network-diagram.md
echo "```mermaid" >> network-diagram.md
echo "graph LR" >> network-diagram.md

curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.conversations[] |
    (.from | gsub("nv\\."; "") | gsub("\\."; "_")) as $from |
    (.to | gsub("nv\\."; "") | gsub("\\."; "_")) as $to |
    "    \($from) -->|\((.ports // []) | join(","))| \($to)"' >> network-diagram.md

echo "```" >> network-diagram.md

echo "Network diagram generated: network-diagram.md"
```

## Step 6: Use Network Visualization to Build Policies

Use the observed connections to create accurate network rules:

```bash
#!/bin/bash
# connections-to-policy.sh
# Converts observed connections into NeuVector network rules

TOKEN="your-token"

# Get all allow connections
curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.conversations[] | select(.policy_action == "allow")' > observed-connections.json

# Generate policy rules from observed connections
cat observed-connections.json | jq -r '[.from, .to, ((.ports // []) | join(","))] | @tsv' | \
while IFS=$'\t' read -r FROM TO PORTS; do
  echo "Creating rule: ${FROM} -> ${TO} (${PORTS})"
  curl -sk -X PATCH \
    "https://neuvector-manager:8443/v1/policy/rule" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: ${TOKEN}" \
    -d "{
      \"insert\": {
        \"after\": 0,
        \"rules\": [{
          \"comment\": \"Auto-generated from observed traffic\",
          \"from\": \"${FROM}\",
          \"to\": \"${TO}\",
          \"ports\": \"${PORTS}\",
          \"action\": \"allow\",
          \"cfg_type\": \"user_created\"
        }]
      }
    }"
done
```

## Step 7: Monitor for New Connections

Set up alerts when new unexpected connections appear:

```bash
# Check for connections in "Discover" that didn't exist before
# This script compares current connections against a baseline

# First, capture the baseline
curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.conversations[] | {from: .from, to: .to, ports: .ports}]' \
  > baseline-connections.json

echo "Baseline captured with $(cat baseline-connections.json | jq length) connections"

# Later, compare against the baseline to find new connections
curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq --slurpfile baseline baseline-connections.json '
    [.conversations[] | {from: .from, to: .to, ports: .ports}] as $current |
    $current - $baseline[0] | {new_connections: length, connections: .}
  '
```

## Step 8: Analyze Traffic Anomalies

Look for unusual traffic patterns:

```bash
# Find high-volume connections (potential data exfiltration)
curl -sk \
  "https://neuvector-manager:8443/v1/conversation" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.conversations[] | select(.bytes > 1073741824)] |
    sort_by(.bytes) | reverse | .[0:10] |
    .[] | {from: .from, to: .to, bytes_gb: (.bytes / 1073741824 | round), ports: .ports}'
```

## Conclusion

NeuVector's network visualization transforms the complexity of microservices communication into an understandable, interactive map. By regularly reviewing the network map, you can quickly identify unexpected connections, understand your application's actual communication patterns, and use this insight to build accurate, minimal-privilege network policies. The visualization also serves as an excellent documentation tool for teams trying to understand how their applications communicate.
