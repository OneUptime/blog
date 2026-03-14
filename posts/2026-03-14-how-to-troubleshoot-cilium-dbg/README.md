# Troubleshooting Cilium Debug Command Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Debugging, Troubleshooting, Kubernetes, Networking

Description: Diagnose and fix issues when cilium-dbg commands fail, return unexpected results, or cannot connect to the agent API.

---

## Introduction

The `cilium-dbg` command is the primary debugging interface for the Cilium agent. It provides subcommands for inspecting endpoints, policies, BPF maps, identities, and the overall health of the agent. Understanding how to work with cilium-dbg output is essential for effective Cilium operations.


When cilium-dbg commands fail or return unexpected results, the underlying issues can range from agent connectivity problems to RBAC restrictions and version mismatches. Systematic diagnosis helps identify whether the problem is with the command itself or the agent state.

This guide provides structured troubleshooting for common cilium-dbg failures.


## Prerequisites

- Kubernetes cluster with Cilium installed
- `kubectl` access to cilium pods
- `jq` for JSON processing
- Bash or Python for scripting

## Diagnosing Connection Failures


\`\`\`bash
CILIUM_POD=\$(kubectl -n kube-system get pods -l k8s-app=cilium   -o jsonpath='{.items[0].metadata.name}')

# Check pod status
kubectl -n kube-system get pod "\$CILIUM_POD" -o wide

# Test basic exec
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent -- echo "exec works"

# Test agent API connectivity
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   cilium-dbg status 2>&1 | head -5
\`\`\`

```mermaid
flowchart TD
    A[cilium-dbg command fails] --> B{exec works?}
    B -->|No| C[Check pod state and RBAC]
    B -->|Yes| D{Agent API reachable?}
    D -->|No| E[Check cilium.sock exists]
    D -->|Yes| F{Command returns error?}
    F -->|Yes| G[Check command syntax and version]
    F -->|No| H[Agent may be degraded - check logs]
\`\`\`

### Agent API Socket Issues

\`\`\`bash
# Verify the API socket exists
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   ls -la /var/run/cilium/cilium.sock

# Test direct API access
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   curl -s --unix-socket /var/run/cilium/cilium.sock http://localhost/v1/healthz
\`\`\`

### Version Mismatch

\`\`\`bash
# Check cilium-dbg version
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   cilium-dbg version

# Ensure CLI version matches agent version
# Version mismatch can cause unexpected errors
\`\`\`

### Common Error Messages

\`\`\`bash
# "Unable to reach agent" - agent process may be down
kubectl -n kube-system logs "\$CILIUM_POD" -c cilium-agent --tail=20

# "command not found" - binary may be at different path
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   which cilium-dbg || find / -name cilium-dbg 2>/dev/null

# "permission denied" - check RBAC
kubectl auth can-i create pods/exec -n kube-system
\`\`\`


## Verification

```bash
# Full connectivity test
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent -- cilium-dbg status --brief
kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent -- cilium-dbg endpoint list | head -5
echo "All commands working"
```

## Troubleshooting

- **Commands timeout on large clusters**: Increase `--request-timeout` and consider running commands in parallel.
- **JSON output is empty array**: The agent may have no endpoints yet. Check `cilium-dbg status` first.
- **Table output columns shift**: Use JSON output (`-o json`) for reliable parsing. Tables are for human consumption.
- **Agent unreachable errors**: Verify the cilium-agent container is running and the API socket exists.

## Conclusion


Cilium-dbg failures are usually caused by exec connectivity issues, agent API problems, or version mismatches. Systematic diagnosis from pod state through API socket to command-level errors resolves most issues efficiently.

