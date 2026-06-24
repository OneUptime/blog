# Parsing Cilium BGP Debug Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, BGP, Parsing, Scripting, Networking

Description: Extract and analyze BGP state data from cilium-dbg bgp command output for monitoring dashboards and automated route validation.

---

## Introduction

Cilium supports BGP for advertising pod CIDRs and service VIPs to external network infrastructure. The `cilium-dbg bgp peers` command provides visibility into BGP peer state on each Cilium node.



This guide covers parsing output from cilium-dbg bgp peers for structured data extraction and analysis.

## Prerequisites

- Kubernetes cluster with Cilium and BGP enabled
- BGP peering configured via CiliumBGPClusterConfig and CiliumBGPPeerConfig
- `kubectl` access to cilium pods
- Python 3.x for structured parsing

## Capturing the Output

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp peers > /tmp/bgp-output.txt 2>/dev/null
```

## Shell-Based Parsing

```bash
#!/bin/bash
# parse-bgp.sh

INPUT="${1:-/tmp/bgp-output.txt}"

# Extract data rows (skip header)
echo "=== Data Rows ==="
tail -n +2 "$INPUT" | head -20

# Count entries
TOTAL=$(tail -n +2 "$INPUT" | grep -c . || echo 0)
echo "Total entries: $TOTAL"

# Extract unique values from first column
echo "=== First Column Values ==="
awk 'NR>1 {print $1}' "$INPUT" | sort -u
```

## Python Parser

```python
#!/usr/bin/env python3
"""Parse cilium-dbg bgp peers output into structured JSON."""

import json
import sys

def parse_table(filepath):
    with open(filepath) as f:
        lines = [l.rstrip('\n') for l in f.readlines() if l.strip()]
    
    if not lines:
        return {'error': 'empty output', 'entries': []}
    
    # Parse the fixed-width peer table headers used by Cilium.
    possible_headers = [
        'Node', 'VRouter', 'Local AS', 'Peer AS', 'Peer Address',
        'Session State', 'Uptime', 'Family', 'Received', 'Advertised'
    ]
    header_line = lines[0]
    columns = []
    search_from = 0
    for name in possible_headers:
        pos = header_line.find(name, search_from)
        if pos >= 0:
            columns.append((name.lower().replace(' ', '_'), pos))
            search_from = pos + len(name)
    
    if not columns:
        return {'error': 'missing header', 'entries': []}
    
    entries = []
    previous = {}
    for line in lines[1:]:
        if line.startswith('-'):
            continue
        entry = {}
        for i, (key, start) in enumerate(columns):
            end = columns[i + 1][1] if i + 1 < len(columns) else None
            value = line[start:end].strip()
            entry[key] = value or previous.get(key, '')
        entries.append(entry)
        previous = entry
    
    return {'total': len(entries), 'entries': entries}

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bgp-output.txt'
    result = parse_table(path)
    print(json.dumps(result, indent=2))
```

## Converting to Prometheus Metrics

```bash
#!/bin/bash
# bgp-metrics.sh
NAMESPACE="kube-system"
CILIUM_POD=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')
NODE=$(kubectl -n "$NAMESPACE" get pod "$CILIUM_POD" -o jsonpath='{.spec.nodeName}')

COUNT=$(kubectl -n "$NAMESPACE" exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp peers 2>/dev/null | tail -n +2 | grep -c . || echo 0)

cat << METRICS
# HELP cilium_bgp_total Total bgp entries
# TYPE cilium_bgp_total gauge
cilium_bgp_total{node="$NODE"} $COUNT
METRICS
```

## Generating JSON Reports

```bash
#!/bin/bash
# Generate JSON report from all nodes
NAMESPACE="kube-system"
echo '{"nodes": ['

FIRST=true
PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{range .items[*]}{.metadata.name},{.spec.nodeName}{"\n"}{end}')

while IFS=',' read -r pod node; do
  [ -z "$pod" ] && continue
  COUNT=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg bgp peers 2>/dev/null | tail -n +2 | grep -c . || echo 0)
  [ "$FIRST" = true ] && FIRST=false || echo ","
  echo "  {\"node\": \"$node\", \"entries\": $COUNT}"
done <<< "$PODS"

echo ']}'
```

## Verification

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

# Verify command works
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp peers 2>/dev/null && echo "Command succeeded"

# Verify automation/parsing
python3 parse_bgp.py /tmp/bgp-output.txt | head -10
```

## Troubleshooting

- **"BGP is not enabled"**: Enable the BGP control plane with the Helm value `bgpControlPlane.enabled=true`.
- **Empty output**: No BGP cluster configuration or peers may be configured. Check `kubectl get ciliumbgpclusterconfigs,ciliumbgppeerconfigs`.
- **Command fails**: Check agent health with cilium-dbg status.
- **Timeout on large clusters**: Add `--request-timeout=120s` to kubectl commands.

## Conclusion

Parsing `cilium-dbg bgp peers` extracts structured data from BGP peer state on Cilium nodes. This enables monitoring dashboards, compliance reporting, and automated validation.
