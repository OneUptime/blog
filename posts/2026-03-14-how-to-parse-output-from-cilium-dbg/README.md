# Parsing Output from Cilium Debug Commands

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Debugging, Parsing, Scripting, Monitoring

Description: Extract structured data from cilium-dbg command output for monitoring dashboards, automated analysis, and integration with external systems.

---

## Introduction

The `cilium-dbg` command is the primary debugging interface for the Cilium agent. It provides subcommands for inspecting endpoints, policies, BPF maps, identities, and the overall health of the agent. Understanding how to work with cilium-dbg output is essential for effective Cilium operations.



Most cilium-dbg commands support JSON output with the `-o json` flag, but some only produce table or text format. Knowing how to parse each format enables you to build monitoring and reporting tools that consume cilium-dbg data reliably.

This guide covers parsing techniques for all common cilium-dbg output formats.

## Prerequisites

- Kubernetes cluster with Cilium installed
- `kubectl` access to cilium pods
- `jq` for JSON processing
- Bash or Python for scripting

## JSON Output Parsing



Most cilium-dbg commands support JSON output:

\`\`\`bash
CILIUM_POD=\$(kubectl -n kube-system get pods -l k8s-app=cilium   -o jsonpath='{.items[0].metadata.name}')

# Get endpoint list as JSON
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   cilium-dbg endpoint list -o json > /tmp/endpoints.json

# Parse with jq
jq '.[] | {id: .id, state: .status.state, identity: .status.identity.id}'   /tmp/endpoints.json
\`\`\`

### Parsing Status Output

\`\`\`bash
#!/bin/bash
# parse-cilium-dbg-status.sh

CILIUM_POD=\$(kubectl -n kube-system get pods -l k8s-app=cilium   -o jsonpath='{.items[0].metadata.name}')

STATUS=\$(kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   cilium-dbg status 2>/dev/null)

# Extract health status
echo "\$STATUS" | grep "Overall Health" | awk -F: '{print \$2}' | xargs

# Extract component statuses
echo "\$STATUS" | grep -E "^[A-Z].*:" | while IFS=: read -r key value; do
  echo "{\\"component\\": \\"\$key\\", \\"status\\": \\"\$(echo \$value | xargs)\\"}"
done | jq -s '.'
\`\`\`

### Python Parser

\`\`\`python
#!/usr/bin/env python3
"""Parse cilium-dbg output in various formats."""
import json, subprocess, sys

def get_endpoints(pod, namespace='kube-system'):
    result = subprocess.run([
        'kubectl', '-n', namespace, 'exec', pod, '-c', 'cilium-agent',
        '--', 'cilium-dbg', 'endpoint', 'list', '-o', 'json'
    ], capture_output=True, text=True)
    return json.loads(result.stdout)

def summarize_endpoints(endpoints):
    states = {}
    for ep in endpoints:
        state = ep.get('status', {}).get('state', 'unknown')
        states[state] = states.get(state, 0) + 1
    return {
        'total': len(endpoints),
        'by_state': states,
        'identities': list(set(
            ep.get('status', {}).get('identity', {}).get('id', 0)
            for ep in endpoints
        ))
    }

if __name__ == '__main__':
    pod = sys.argv[1]
    endpoints = get_endpoints(pod)
    summary = summarize_endpoints(endpoints)
    print(json.dumps(summary, indent=2))
\`\`\`

### Converting Table Output to CSV

\`\`\`bash
# For commands without JSON support
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   cilium-dbg bpf ct list global 2>/dev/null |   awk 'NR==1 {gsub(/  +/, ","); print} NR>1 {gsub(/  +/, ","); print}' > /tmp/ct-table.csv
\`\`\`

## Verification

```bash
# Verify JSON parsing
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   cilium-dbg endpoint list -o json | jq length

# Verify Python parser
python3 parse_cilium_dbg.py \$CILIUM_POD | jq .total
```

## Troubleshooting

- **Commands timeout on large clusters**: Increase `--request-timeout` and consider running commands in parallel.
- **JSON output is empty array**: The agent may have no endpoints yet. Check `cilium-dbg status` first.
- **Table output columns shift**: Use JSON output (`-o json`) for reliable parsing. Tables are for human consumption.
- **Agent unreachable errors**: Verify the cilium-agent container is running and the API socket exists.

## Conclusion



Parsing cilium-dbg output unlocks programmatic access to the full range of Cilium agent state data. Preferring JSON output where available and using structured parsers for text output gives you reliable data extraction for monitoring and automation.
