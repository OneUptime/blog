# Parsing Cilium BGP Route Policies Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, BGP, Route Policies, Parsing, Scripting

Description: Extract route policy definitions from cilium-dbg bgp route-policies output for documentation and compliance.

---

## Introduction

Cilium supports BGP for advertising pod and service CIDRs to external network infrastructure. The `cilium-dbg bgp route-policies` command provides visibility into BGP route policy configuration on each Cilium node.



This guide covers parsing output from cilium-dbg bgp route-policies for structured data extraction and analysis.

## Prerequisites

- Kubernetes cluster with Cilium and BGP enabled
- BGP peering configured via CiliumBGPClusterConfig, CiliumBGPPeerConfig, and CiliumBGPAdvertisement
- `kubectl` access to cilium pods
- `jq` for JSON processing
- Python 3.x for structured parsing

## Capturing the Output

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp route-policies -o json > /tmp/bgp-route-policies-output.json 2>/dev/null
```

## Shell-Based Parsing

```bash
#!/bin/bash
# parse-bgp-route-policies.sh

INPUT="${1:-/tmp/bgp-route-policies-output.json}"

# Extract policy names
echo "=== Policy Names ==="
jq -r '.[].name // empty' "$INPUT" | head -20

# Count entries
TOTAL=$(jq 'length' "$INPUT")
echo "Total entries: $TOTAL"

# Extract unique values from router ASN fields when present
echo "=== Router ASNs ==="
jq -r '.[] | .routerAsn // .router_asn // empty' "$INPUT" | sort -u
```

## Python Parser

```python
#!/usr/bin/env python3
"""Parse cilium-dbg bgp route-policies JSON output into structured JSON."""

import json
import sys

def parse_policies(filepath):
    with open(filepath) as f:
        policies = json.load(f)
    
    if not policies:
        return {'error': 'empty output', 'entries': []}
    
    return {'total': len(policies), 'entries': policies}

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bgp-route-policies-output.json'
    result = parse_policies(path)
    print(json.dumps(result, indent=2))
```

## Converting to Prometheus Metrics

```bash
#!/bin/bash
# bgp-route-policies-metrics.sh
NAMESPACE="kube-system"
CILIUM_POD=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')
NODE=$(kubectl -n "$NAMESPACE" get pod "$CILIUM_POD" -o jsonpath='{.spec.nodeName}')

COUNT=$(kubectl -n "$NAMESPACE" exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp route-policies -o json 2>/dev/null | jq 'length')

cat << METRICS
# HELP cilium_bgp_route_policies_total Total bgp route-policies entries
# TYPE cilium_bgp_route_policies_total gauge
cilium_bgp_route_policies_total{node="$NODE"} $COUNT
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
    cilium-dbg bgp route-policies -o json 2>/dev/null | jq 'length')
  [ "$FIRST" = true ] && FIRST=false || echo ","
  jq -n --arg node "$node" --argjson entries "$COUNT" \
    '  {node: $node, entries: $entries}'
done <<< "$PODS"

echo ']}'
```

## Verification

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

# Verify command works
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp route-policies -o json 2>/dev/null && echo "Command succeeded"

# Verify automation/parsing
python3 parse_bgp_route_policies.py /tmp/bgp-route-policies-output.json | head -10
```

## Troubleshooting

- **"BGP is not enabled"**: Enable the BGP control plane with Helm or Cilium CLI by setting `bgpControlPlane.enabled=true`.
- **Empty output**: No BGP control plane resources may be configured. Check `kubectl get ciliumbgpclusterconfigs,ciliumbgppeerconfigs,ciliumbgpadvertisements`.
- **No policies displayed**: Ensure advertisements are selected by the `families[].advertisements` selector in the CiliumBGPPeerConfig.
- **Timeout on large clusters**: Add `--request-timeout=120s` to kubectl commands.

## Conclusion

Parsing `cilium-dbg bgp route-policies` extracts structured data from BGP route policies on Cilium nodes. This enables monitoring dashboards, compliance reporting, and automated validation.
