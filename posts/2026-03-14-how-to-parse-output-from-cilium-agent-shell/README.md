# Parsing Output from Cilium Agent Shell Commands

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Parsing, Kubernetes, Shell, Scripting, JSON

Description: Learn how to parse and process the output of cilium-agent shell commands to extract structured data for monitoring, reporting, and automated analysis.

---

## Introduction

Commands executed through the cilium-agent shell produce output in various formats: plain text tables, JSON, and mixed-format strings. Parsing this output programmatically is essential for building automated monitoring, generating reports, and integrating Cilium state data with external systems.

Different cilium-dbg subcommands produce different output formats, and understanding how to handle each one enables you to build robust automation that does not break when output formatting changes between versions.

This guide covers parsing techniques for the most common cilium-agent shell output formats.

## Prerequisites

- Access to a Cilium pod for generating output
- `jq`, `awk`, `sed`, and `grep` available
- Python 3.x for structured parsing
- Basic familiarity with cilium-dbg commands

## Parsing JSON Output

Many cilium-dbg commands support `-o json` for structured output:

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

# Get endpoints as JSON
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg endpoint list -o json > /tmp/endpoints.json

# Parse with jq - extract endpoint IDs and states
jq '.[] | {id: .id, state: .status.state, identity: .status.identity.id}' \
  /tmp/endpoints.json

# Count endpoints by state
jq -r '.[].status.state' /tmp/endpoints.json | \
  sort | uniq -c | sort -rn

# Filter endpoints in a specific state
jq '[.[] | select(.status.state == "ready")]' /tmp/endpoints.json | \
  jq length
```

## Parsing Table Output

Some commands only produce table-formatted text:

```bash
# Capture table output
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg endpoint list > /tmp/endpoints-table.txt

# Parse the table with awk
# Skip header lines, extract fields by position
awk 'NR>2 {print $1, $3, $4}' /tmp/endpoints-table.txt

# Convert table to CSV
head -1 /tmp/endpoints-table.txt | \
  sed 's/  \+/,/g' > /tmp/endpoints.csv
tail -n +3 /tmp/endpoints-table.txt | \
  sed 's/  \+/,/g' >> /tmp/endpoints.csv
```

## Parsing Status Output

The `cilium-dbg status` command produces multi-section output:

```bash
#!/bin/bash
# parse-cilium-status.sh
# Parse cilium-dbg status output into structured data

CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

STATUS=$(kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg status 2>/dev/null)

# Extract KVStore status
KVSTORE=$(echo "$STATUS" | grep "KVStore:" | awk -F: '{print $2}' | xargs)
echo "KVStore: $KVSTORE"

# Extract ContainerRuntime status
RUNTIME=$(echo "$STATUS" | grep "ContainerRuntime:" | awk -F: '{print $2}' | xargs)
echo "ContainerRuntime: $RUNTIME"

# Extract Kubernetes status
K8S=$(echo "$STATUS" | grep "Kubernetes:" | awk -F: '{print $2}' | xargs)
echo "Kubernetes: $K8S"

# Extract controller counts
CONTROLLERS=$(echo "$STATUS" | grep "controllers" | grep -oP '\d+')
echo "Controller count: $CONTROLLERS"

# Check overall health
if echo "$STATUS" | grep -q "Overall Health.*OK"; then
  echo "Overall: HEALTHY"
else
  echo "Overall: UNHEALTHY"
fi
```

## Python-Based Comprehensive Parser

```python
#!/usr/bin/env python3
"""Parse various cilium-agent output formats into structured JSON."""

import json
import re
import subprocess
import sys

def run_cilium_cmd(pod, namespace, cmd):
    """Execute a cilium-dbg command and return output."""
    full_cmd = [
        'kubectl', '-n', namespace, 'exec', pod, '-c', 'cilium-agent',
        '--', 'cilium-dbg'
    ] + cmd.split()

    result = subprocess.run(full_cmd, capture_output=True, text=True)
    return result.stdout, result.stderr

def parse_endpoint_json(output):
    """Parse JSON endpoint list."""
    data = json.loads(output)
    return [{
        'id': ep.get('id'),
        'state': ep.get('status', {}).get('state'),
        'identity': ep.get('status', {}).get('identity', {}).get('id'),
        'labels': ep.get('status', {}).get('labels', {}).get(
            'security-relevant', []),
        'policy_enabled': ep.get('status', {}).get('policy', {}).get(
            'realized', {}).get('l4', {}) != {}
    } for ep in data]

def parse_status_text(output):
    """Parse status text output into structured data."""
    result = {}
    current_section = 'general'

    for line in output.split('\n'):
        line = line.strip()
        if not line:
            continue

        # Detect section headers
        if line.endswith(':') and not line.startswith(' '):
            current_section = line.rstrip(':').lower().replace(' ', '_')
            result[current_section] = {}
            continue

        # Parse key-value pairs
        if ':' in line:
            key, _, value = line.partition(':')
            key = key.strip().lower().replace(' ', '_')
            value = value.strip()
            if current_section not in result:
                result[current_section] = {}
            result[current_section][key] = value

    return result

if __name__ == '__main__':
    pod = sys.argv[1] if len(sys.argv) > 1 else 'cilium-xxxxx'
    namespace = sys.argv[2] if len(sys.argv) > 2 else 'kube-system'

    # Parse endpoints
    stdout, _ = run_cilium_cmd(pod, namespace, 'endpoint list -o json')
    if stdout:
        endpoints = parse_endpoint_json(stdout)
        print(json.dumps({'endpoints': endpoints}, indent=2))

    # Parse status
    stdout, _ = run_cilium_cmd(pod, namespace, 'status')
    if stdout:
        status = parse_status_text(stdout)
        print(json.dumps({'status': status}, indent=2))
```

## Building Monitoring Dashboards

Convert parsed data into metrics format:

```bash
#!/bin/bash
# cilium-to-prometheus.sh
# Convert cilium-agent output to Prometheus metrics

CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

NODE=$(kubectl -n kube-system get pod "$CILIUM_POD" \
  -o jsonpath='{.spec.nodeName}')

# Get endpoint counts by state
ENDPOINTS=$(kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg endpoint list -o json 2>/dev/null)

READY=$(echo "$ENDPOINTS" | jq '[.[] | select(.status.state=="ready")] | length')
NOT_READY=$(echo "$ENDPOINTS" | jq '[.[] | select(.status.state!="ready")] | length')

cat << METRICS
# HELP cilium_endpoints_ready Number of ready endpoints
# TYPE cilium_endpoints_ready gauge
cilium_endpoints_ready{node="$NODE"} $READY
# HELP cilium_endpoints_not_ready Number of not-ready endpoints
# TYPE cilium_endpoints_not_ready gauge
cilium_endpoints_not_ready{node="$NODE"} $NOT_READY
METRICS
```

## Verification

```bash
# Verify JSON parsing
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg endpoint list -o json | jq length

# Verify table parsing
bash parse-cilium-status.sh

# Verify metrics output
bash cilium-to-prometheus.sh
```

## Troubleshooting

- **jq parse error**: The command may have written errors to stdout. Use `2>/dev/null` on the kubectl exec command.
- **Table column alignment changes**: Use JSON output (`-o json`) whenever available for stable parsing.
- **Empty output from commands**: The agent may not be fully initialized. Check `cilium-dbg status` first.
- **Python subprocess fails**: Ensure kubectl is in the PATH and has valid credentials.

## Conclusion

Parsing cilium-agent shell output is foundational for building Cilium monitoring and automation. By preferring JSON output where available, handling table formats with awk, and using Python for complex parsing, you can reliably extract structured data from the agent for any downstream use case.
