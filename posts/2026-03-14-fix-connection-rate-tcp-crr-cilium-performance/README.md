# Fixing Connection Rate (TCP_CRR) Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, TCP_CRR, Optimization

Description: Practical fixes to improve TCP connection rate (TCP_CRR) in Cilium, including conntrack tuning, NAT optimization, and socket-level acceleration.

---

## Introduction

TCP_CRR performance in Cilium is dominated by the cost of establishing and tearing down connections. Each transaction requires conntrack entry creation, policy evaluation, NAT processing, and conntrack cleanup. Fixing TCP_CRR performance means reducing the cost of each of these operations.

The most impactful fixes target conntrack efficiency, NAT overhead, and the use of socket-level BPF to bypass the full datapath for service connections. This guide provides the specific configuration changes for each optimization.

Unlike throughput fixes that focus on steady-state packet processing, TCP_CRR fixes must optimize the transient connection setup and teardown paths.

## Prerequisites

- Diagnosed TCP_CRR bottleneck
- Kubernetes cluster with Cilium v1.14+
- `helm` and `kubectl` access
- Understanding of your application's connection patterns

## Optimizing Conntrack for High Connection Rates

```bash
# Increase conntrack table sizes to reduce hash collisions
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.ctGlobalTCPMax=1048576 \
  --set bpf.ctGlobalAnyMax=524288

# Reduce conntrack timeouts to free entries faster
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.ctTCPTimeoutEstablished=21600 \
  --set bpf.ctTCPTimeoutClose=10 \
  --set bpf.ctTCPTimeoutFIN=10
```

## Enabling Socket-Level Load Balancing

Socket-level LB avoids the full TC datapath for service connections:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set socketLB.enabled=true \
  --set socketLB.hostNamespaceOnly=false
```

This dramatically improves TCP_CRR for connections to ClusterIP services because the NAT is performed at connect() time rather than per-packet.

## NAT Table Optimization

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.natMax=1048576

# Reduce NAT mapping timeout
# This is controlled by conntrack timeouts for TCP
```

## Kernel Tuning for Connection Rate

```bash
# Increase local port range for high connection rates
sysctl -w net.ipv4.ip_local_port_range="1024 65535"

# Reduce TIME_WAIT impact
sysctl -w net.ipv4.tcp_tw_reuse=1
sysctl -w net.ipv4.tcp_fin_timeout=10

# Increase SYN backlog
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
sysctl -w net.core.somaxconn=65535

# Enable TCP Fast Open for reduced latency
sysctl -w net.ipv4.tcp_fastopen=3

# Increase file descriptor limits
sysctl -w fs.file-max=2097152
```

## Reducing Policy Evaluation Cost

If policies are complex, simplify them for high-CRR paths:

```bash
# Check current policy count
cilium policy get -o json | jq '[.[] | .rules | length] | add'

# Use CIDR-based L3 policies instead of FQDN where possible
# FQDN policies require DNS resolution per new connection
```

Example optimized policy:

```yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: allow-web
spec:
  endpointSelector:
    matchLabels:
      app: web
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: client
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
```

## Verification

```bash
# Re-run TCP_CRR test
kubectl exec netperf-client -- netperf -H $SERVER_IP -t TCP_CRR -l 30

# Compare with baseline
echo "Before: <baseline> conn/s"
echo "After: <new_result> conn/s"

# Verify socket LB is active
cilium status --verbose | grep "Socket LB"

# Check conntrack utilization
cilium bpf ct list global | wc -l
```

## Troubleshooting

- **No improvement from socket LB**: Ensure the traffic path goes through a Kubernetes Service. Direct pod-to-pod bypasses socket LB.
- **Port exhaustion errors**: Increase `ip_local_port_range` and enable `tcp_tw_reuse`.
- **Conntrack table still filling up**: Reduce timeouts further or increase table size.
- **Policy evaluation still slow**: Check for FQDN policies that require DNS lookups per connection.

## Implementing Changes Safely

When applying performance fixes to a production Cilium cluster, follow a staged rollout approach to minimize risk:

```bash
# Step 1: Test on a single node first
kubectl cordon node-test-1
kubectl drain node-test-1 --ignore-daemonsets --delete-emptydir-data

# Step 2: Apply configuration changes
helm upgrade cilium cilium/cilium --namespace kube-system \
  --reuse-values \
  <your-changes-here>

# Step 3: Wait for the Cilium agent on the test node to restart
kubectl rollout status ds/cilium -n kube-system --timeout=120s

# Step 4: Run a quick benchmark on the test node
kubectl uncordon node-test-1
# Deploy test pods on the node and verify performance

# Step 5: If successful, roll out to remaining nodes
# Cilium DaemonSet will handle the rolling update
```

### Change Tracking

Document every change you make along with its measured impact. Create a log entry for each modification:

```bash
cat >> /tmp/perf-changes.log << LOG
Date: $(date)
Change: <description of change>
Before: <metric before change>
After: <metric after change>
Impact: <percentage improvement or regression>
LOG
```

This change log is invaluable for understanding which optimizations provide the most benefit and for reverting changes if unexpected regressions occur. It also helps when you need to apply the same optimizations to other clusters.

### Rolling Back Changes

If a change causes unexpected behavior, roll back immediately:

```bash
# Rollback to previous Helm release
helm rollback cilium -n kube-system

# Verify the rollback was successful
cilium status --verbose
kubectl rollout status ds/cilium -n kube-system
```

## Conclusion

Fixing TCP_CRR performance in Cilium requires optimizing every step of the connection lifecycle: conntrack entry creation, policy evaluation, NAT translation, and connection teardown. Socket-level BPF load balancing provides the largest single improvement by eliminating per-packet NAT processing. Combined with conntrack tuning and kernel optimizations for high connection rates, Cilium can achieve TCP_CRR performance suitable for connection-heavy microservices workloads.
