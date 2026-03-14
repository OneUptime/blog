# Parsing Cilium BGP Routes Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, BGP, Routes, Parsing, Scripting

Description: Parse cilium-dbg bgp routes output to extract route prefixes, next hops, and path attributes for automated analysis.

---

## Introduction

Cilium supports BGP for advertising pod and service CIDRs to external network infrastructure. The `cilium-dbg bgp routes` command provides visibility into the BGP routing table on each Cilium node.



This guide covers parsing output from cilium-dbg bgp routes for structured data extraction and analysis.

## Prerequisites

- Kubernetes cluster with Cilium and BGP enabled
- BGP peering configured via CiliumBGPPeeringPolicy
- `kubectl` access to cilium pods
- `jq` for JSON processing
- Python 3.x for structured parsing

## Capturing the Output

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp routes > /tmp/bgp-routes-output.txt 2>/dev/null
```

## Shell-Based Parsing

```bash
#!/bin/bash
# parse-bgp-routes.sh
INPUT="${1:-/tmp/bgp-routes-output.txt}"

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
"""Parse cilium-dbg bgp routes output into structured JSON."""

import re
import json
import sys

def parse_table(filepath):
    with open(filepath) as f:
        lines = [l.strip() for l in f.readlines() if l.strip()]
    
    if not lines:
        return {'error': 'empty output', 'entries': []}
    
    # Parse header
    header = lines[0].split()
    header = [h.lower().replace(' ', '_') for h in header]
    
    entries = []
    for line in lines[1:]:
        if line.startswith('-'):
            continue
        fields = line.split()
        entry = {}
        for i, field in enumerate(fields):
            key = header[i] if i < len(header) else f'field_{i}'
            entry[key] = field
        entries.append(entry)
    
    return {'total': len(entries), 'entries': entries}

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bgp-routes-output.txt'
    result = parse_table(path)
    print(json.dumps(result, indent=2))
```

## Converting to Prometheus Metrics

```bash
#!/bin/bash
# bgp-routes-metrics.sh
NAMESPACE="kube-system"
CILIUM_POD=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')
NODE=$(kubectl -n "$NAMESPACE" get pod "$CILIUM_POD" -o jsonpath='{.spec.nodeName}')

COUNT=$(kubectl -n "$NAMESPACE" exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp routes 2>/dev/null | tail -n +2 | grep -c . || echo 0)

cat << METRICS
# HELP cilium_bgp_routes_total Total bgp routes entries
# TYPE cilium_bgp_routes_total gauge
cilium_bgp_routes_total{node="$NODE"} $COUNT
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
    cilium-dbg bgp routes 2>/dev/null | tail -n +2 | grep -c . || echo 0)
  [ "$FIRST" = true ] && FIRST=false || echo ","
  echo "  {"node": \"$node\", "entries": $COUNT}"
done <<< "$PODS"

echo ']}'
```

## Verification

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

# Verify command works
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp routes 2>/dev/null && echo "Command succeeded"

# Verify automation/parsing
python3 parse_bgp_routes.py /tmp/bgp-routes-output.txt | head -10
```

## Troubleshooting

- **"BGP is not enabled"**: Set `enable-bgp-control-plane: "true"` in cilium-config.
- **Empty output**: No BGP peering policy may be configured. Check `kubectl get ciliumbgppeeringpolicies`.
- **No routes shown**: Check exportPodCIDR and service selector in the peering policy.
- **Timeout on large clusters**: Add `--request-timeout=120s` to kubectl commands.

## Conclusion

Parsing `cilium-dbg bgp routes` extracts structured data from the BGP routing table on Cilium nodes. This enables monitoring dashboards, compliance reporting, and automated validation.
