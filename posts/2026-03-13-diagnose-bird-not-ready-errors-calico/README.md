# How to Diagnose BIRD Not Ready Errors in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting

Description: A step-by-step guide to diagnosing BIRD not ready errors in Calico by examining BGP daemon state, node conditions, and routing tables.

---

## Introduction

BIRD (BIRD Internet Routing Daemon) is the BGP routing engine used by Calico nodes when Calico BGP networking is enabled. It is responsible for advertising pod CIDRs to peers and maintaining the routing fabric that allows pods across different nodes to communicate. When BIRD enters a not-ready state, the affected node is not healthy from a BGP peering perspective, causing pod-to-pod connectivity to degrade when the cluster depends on BGP for routing.

The error surfaces in multiple ways: the calico-node pod may report a not-ready condition in `kubectl get pods`, calico-node readiness output may report that BIRD is unavailable or that BGP is not established with a peer, or cluster operators may notice route withdrawal events in their BGP monitoring tooling. Because the failure is in a background daemon rather than the workload itself, it is frequently overlooked until application-level timeouts begin.

Understanding how to systematically diagnose BIRD not-ready errors saves significant time during incidents. The diagnosis involves checking the calico-node pod health, inspecting BIRD process logs, verifying IP pool configuration, and confirming BGP peer connectivity.

## Symptoms

- `kubectl get pods -n <calico-namespace>` shows calico-node pods with `0/1` ready containers
- calico-node readiness output contains messages like `BIRD is not ready` or `BGP not established with <peer-ip>`
- Cross-node pod-to-pod traffic drops or becomes intermittent
- `calicoctl node status` shows BGP peers in `Idle` or `Connect` state
- Routes for remote node CIDRs are missing from the node routing table

## Root Causes

- BGP sessions fail to establish because of an unreachable peer address, blocked TCP/179 connectivity, or an incorrect AS number
- IP pool CIDR overlaps with another IP pool or falls outside the Kubernetes pod CIDR, causing IPAM or pod connectivity problems
- Resource exhaustion (CPU throttling or OOM) on the calico-node container killing the BIRD sub-process
- Calico datastore or Typha configuration is incorrect or references an unreachable endpoint
- Kernel routing table is full, preventing BIRD from installing new routes
- Node-to-node mesh is disabled but individual BGP peers are not configured

## Diagnosis Steps

**Step 1: Check calico-node pod readiness**

```bash
CALICO_NS=calico-system # use kube-system for manifest-based installs
kubectl get pods -n "$CALICO_NS" -l k8s-app=calico-node -o wide
```

**Step 2: Inspect calico-node logs for BIRD errors**

```bash
NODE_POD=$(kubectl get pods -n "$CALICO_NS" -l k8s-app=calico-node \
  --field-selector spec.nodeName=<node-name> -o name | head -1)

kubectl logs "$NODE_POD" -n "$CALICO_NS" -c calico-node | grep -i "bird\|BGP\|not ready" | tail -50
```

**Step 3: Check BIRD process state via calicoctl**

```bash
# Run on the affected node; this command checks the local Calico node instance.
sudo calicoctl node status
```

**Step 4: Examine calico-node liveness and readiness probes**

```bash
kubectl describe "$NODE_POD" -n "$CALICO_NS" | grep -A 20 "Liveness\|Readiness\|Conditions"
```

**Step 5: Verify IP pool configuration**

```bash
calicoctl get ippool -o yaml
```

**Step 6: Check node routing table for missing routes**

```bash
# SSH to the affected node

ip route show | grep bird
ip route show table all | grep -v "^default" | head -40
```

**Step 7: Review recent events**

```bash
kubectl get events -n "$CALICO_NS" --sort-by='.lastTimestamp' | grep -i "calico\|bird"
```

```mermaid
flowchart TD
    A[BIRD Not Ready Alert] --> B{calico-node pod Ready?}
    B -- No --> C[Check pod logs for BIRD errors]
    B -- Yes --> D[Check calicoctl node status]
    C --> E{OOM or CPU throttle?}
    E -- Yes --> F[Increase calico-node resource limits]
    E -- No --> G[Check BGP peer config / IP pool overlap]
    D --> H{BGP peers Idle/Connect?}
    H -- Yes --> I[Verify peer address and AS number]
    H -- No --> J[Check kernel routing table capacity]
```

## Solution

After diagnosis, apply the appropriate fix identified above (see the companion Fix post for detailed remediation steps). For immediate triage, restarting the calico-node pod on the affected node often recovers BIRD temporarily:

```bash
kubectl delete "$NODE_POD" -n "$CALICO_NS"
```

## Prevention

- Set appropriate resource requests and limits on calico-node to prevent OOM kills
- Validate IP pool CIDRs against the Kubernetes pod CIDR and existing IP pools before applying
- Use CalicoNodeStatus or Prometheus-based Calico monitoring and alert on peer state changes

## Conclusion

Diagnosing BIRD not-ready errors in Calico requires a layered approach: start with pod readiness, drill into BIRD-specific logs, validate IP pool and BGP peer configuration, and inspect the host routing table. Systematic diagnosis reduces mean time to resolution and prevents misidentifying the root cause as an application or upstream infrastructure problem.
