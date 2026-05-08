# Parsing Cilium BGP Peers Command Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, BGP, Peer, Parsing, Scripting

Description: Parse cilium-dbg bgp peers output to extract session states, peer addresses, and AS numbers for automated BGP monitoring.

---

## Introduction

Cilium supports BGP for advertising pod and service CIDRs to external network infrastructure. The `cilium-dbg bgp peers` command provides visibility into BGP peer session information on each Cilium node.



This guide covers parsing output from cilium-dbg bgp peers for structured data extraction and analysis.

## Prerequisites

- Kubernetes cluster with Cilium and BGP enabled
- BGP peering configured via CiliumBGPClusterConfig and CiliumBGPPeerConfig
- `kubectl` access to cilium pods
- `jq` for JSON processing
- Python 3.x for structured parsing

## Capturing the Output

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp peers > /tmp/bgp-peers-output.txt 2>/dev/null
```

## Shell-Based Parsing

```bash
#!/bin/bash
# parse-bgp-peers.sh

INPUT="${1:-/tmp/bgp-peers-output.txt}"

# Extract data rows (skip header)
echo "=== Data Rows ==="
tail -n +2 "$INPUT" | head -20

# Count peer rows (continuation rows for extra address families are skipped)
TOTAL=$(awk 'NR>1 && $1 ~ /^[0-9]+$/ {count++} END {print count+0}' "$INPUT")
echo "Total peers: $TOTAL"

# Extract unique local ASNs
echo "=== Local ASNs ==="
awk 'NR>1 && $1 ~ /^[0-9]+$/ {print $1}' "$INPUT" | sort -u
```

## Python Parser

```python
#!/usr/bin/env python3
"""Parse cilium-dbg bgp peers output into structured JSON."""

import re
import json
import sys

def parse_table(filepath):
    with open(filepath) as f:
        lines = [l.strip() for l in f.readlines() if l.strip()]
    
    if not lines:
        return {'error': 'empty output', 'entries': []}

    # Prefer native JSON when the command is run with: cilium-dbg bgp peers -o json
    if lines[0].startswith(('{', '[')):
        with open(filepath) as f:
            data = json.load(f)
        return {'total': len(data) if isinstance(data, list) else 1, 'entries': data}
    
    entries = []
    for line in lines[1:]:
        if line.startswith('-'):
            continue
        # Continuation rows list additional address families for the previous peer.
        if not re.match(r'^\d+\s+\d+\s+', line):
            if entries:
                fields = line.split()
                if len(fields) >= 3:
                    entries[-1].setdefault('families', []).append({
                        'family': fields[0],
                        'received': fields[1],
                        'advertised': fields[2],
                    })
            continue

        fields = line.split()
        if len(fields) < 8:
            continue

        entries.append({
            'local_as': fields[0],
            'peer_as': fields[1],
            'peer_address': fields[2],
            'session': fields[3],
            'uptime': fields[4],
            'families': [{
                'family': fields[5],
                'received': fields[6],
                'advertised': fields[7],
            }],
        })
    
    return {'total': len(entries), 'entries': entries}

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bgp-peers-output.txt'
    result = parse_table(path)
    print(json.dumps(result, indent=2))
```

## Converting to Prometheus Metrics

```bash
#!/bin/bash
# bgp-peers-metrics.sh
NAMESPACE="kube-system"
CILIUM_POD=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')
NODE=$(kubectl -n "$NAMESPACE" get pod "$CILIUM_POD" -o jsonpath='{.spec.nodeName}')

COUNT=$(kubectl -n "$NAMESPACE" exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp peers 2>/dev/null | awk 'NR>1 && $1 ~ /^[0-9]+$/ {count++} END {print count+0}')

cat << METRICS
# HELP cilium_bgp_peers_total Total bgp peers entries
# TYPE cilium_bgp_peers_total gauge
cilium_bgp_peers_total{node="$NODE"} $COUNT
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
    cilium-dbg bgp peers 2>/dev/null | awk 'NR>1 && $1 ~ /^[0-9]+$/ {count++} END {print count+0}')
  [ "$FIRST" = true ] && FIRST=false || echo ","
  printf '  {"node": "%s", "entries": %s}\n' "$node" "$COUNT"
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
python3 parse_bgp_peers.py /tmp/bgp-peers-output.txt | head -10
```

## Troubleshooting

- **"BGP is not enabled"**: Enable the BGP Control Plane with the Helm value `bgpControlPlane.enabled=true`.
- **Empty output**: No BGP configuration may be configured. Check `kubectl get ciliumbgpclusterconfigs,ciliumbgppeerconfigs,ciliumbgpadvertisements`.
- **Peers not establishing**: Verify network connectivity to peer on TCP/179 and ASN configuration.
- **Timeout on large clusters**: Add `--request-timeout=120s` to kubectl commands.

## Conclusion

Parsing `cilium-dbg bgp peers` extracts structured data from BGP peer sessions on Cilium nodes. This enables monitoring dashboards, compliance reporting, and automated validation.
