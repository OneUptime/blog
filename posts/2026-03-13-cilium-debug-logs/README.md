# Cilium Debug Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Troubleshooting, Debugging, eBPF

Description: Enable and analyze Cilium debug logs to investigate data plane issues, policy calculation problems, and control plane errors that are not visible in standard log levels.

---

## Introduction

Cilium's standard log output at the `info` level is optimized for production - it logs significant state changes, errors, and important events without flooding storage systems. But when debugging complex issues like intermittent connectivity failures, subtle policy misconfigurations, or race conditions during endpoint creation, the info-level logs often don't contain enough detail to pinpoint the root cause. Cilium's debug logging fills this gap with detailed subsystem-level output.

Cilium organizes some debug logging into verbose groups that can be enabled independently: `datapath` logs datapath debug messages, `policy` logs policy-related debug output, `kvstore` logs interactions with the key-value store, `envoy` logs Envoy-related debug output, and `flow` enables per-request, per-message, and per-connection debug messages. You can enable specific groups without flooding all channels, focusing the debug output on the area of interest.

This guide covers enabling debug logging, filtering for relevant messages, and interpreting debug output for common Cilium issues.

## Prerequisites

- Cilium installed
- `kubectl` installed
- Sufficient storage for debug log volume (enable only temporarily)

## Step 1: Enable Debug Logging Temporarily

```bash
# Enable debug logging through the Cilium ConfigMap.
# By default, cilium config set restarts Cilium pods so they pick up the change.

cilium config set debug true

# Enable specific verbose debug groups
cilium config set debug-verbose "datapath policy"

# Common verbose groups:
# datapath, policy, kvstore, envoy, flow, tagged
```

## Step 2: Enable Debug Logging via Helm

For persistent debug logging (not recommended in production):

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set debug.enabled=true \
  --set debug.verbose=datapath
```

## Step 3: Capture Relevant Debug Output

```bash
# Stream debug logs in real-time
kubectl logs -n kube-system cilium-xxxxx -f | grep -i debug

# Filter for a specific verbose group
kubectl logs -n kube-system cilium-xxxxx -f | grep -i "POLICY\|policy"

# Filter for specific pod IP or endpoint
kubectl logs -n kube-system cilium-xxxxx -f | grep "10.1.0.5"

# Save debug logs for later analysis
kubectl logs -n kube-system cilium-xxxxx \
  --since=5m > /tmp/cilium-debug-$(date +%Y%m%d-%H%M).log
```

## Step 4: Debug Policy Calculation

```bash
# Enable policy debug
cilium config set debug-verbose policy

# Trigger policy recalculation by touching a pod
kubectl annotate pod my-pod debug-trigger=$(date +%s) --overwrite

# Watch for policy calculation logs
kubectl logs -n kube-system cilium-xxxxx -f | \
  grep -E "regenerat|policy|endpoint" | head -50
```

## Step 5: Debug Datapath Events

```bash
# Enable datapath debug for eBPF program issues
cilium config set debug-verbose datapath

# Use cilium-dbg monitor for real-time event capture
kubectl exec -n kube-system cilium-xxxxx -- \
  cilium-dbg monitor --type drop --type trace

# Monitor events for specific endpoint
kubectl exec -n kube-system cilium-xxxxx -- \
  cilium-dbg monitor --from <endpoint-id> --type drop
```

## Step 6: Disable Debug Logging After Investigation

```bash
# Always disable debug logging when done
cilium config set debug false

cilium config set debug-verbose ""
```

## Debug Log Filtering Reference

```bash
# Policy-related logs
grep -i "policy\|regenerat\|endpoint.*allow\|endpoint.*deny"

# Datapath eBPF logs
grep -i "datapath\|bpf\|program\|map.*error"

# BGP-specific logs
grep -i "bgp\|peer\|session\|gobgp"

# Identity and label logs
grep -i "identity\|label\|selector"

# Kubernetes API watch events
grep -i "k8s\|watch\|namespace\|service"
```

## Debug Architecture

```mermaid
flowchart TD
    A[cilium config set\ndebug-verbose=policy] --> B[Cilium Agent]
    B -->|Detailed policy events| C[Agent Logs]
    C -->|kubectl logs| D[Terminal Analysis]
    C -->|Log shipper| E[Centralized Logging\nElastic/Loki]
    F[cilium-dbg monitor] -->|Real-time eBPF events| G[Drop/Trace events]
```

## Conclusion

Cilium debug logging is a powerful diagnostic tool that should be used selectively and disabled promptly after investigation. The verbose debug controls (`debug-verbose=policy` or `debug-verbose=datapath`) let you focus on the relevant area without overwhelming your log infrastructure. For real-time eBPF-level event capture, `cilium-dbg monitor --type drop` is often more useful than log parsing because it captures datapath events directly from the agent. Always remember to disable debug logging after your investigation - the volume can be substantial and will impact Cilium agent performance.
