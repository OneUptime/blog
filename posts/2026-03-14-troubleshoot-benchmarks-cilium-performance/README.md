# Troubleshooting Benchmarks in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Benchmarking, Troubleshooting

Description: A troubleshooting guide for common benchmark issues in Cilium performance testing, including inconsistent results, tool errors, and methodology problems.

---

## Introduction

When Cilium performance benchmarks produce unexpected or inconsistent results, the issue may be in the benchmark methodology rather than in Cilium itself. Troubleshooting benchmarks requires examining the test tools, environment, and methodology before investigating Cilium configuration.

Common benchmark issues include iperf3 server bottlenecks, netperf version incompatibilities, insufficient test duration, and environmental interference. Each produces characteristic error patterns that can be identified and resolved.

This guide covers the most frequent benchmark troubleshooting scenarios and their solutions.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Inconsistent Results

```bash
# Symptom: Results vary >10% between identical runs
# Check 1: Test duration too short
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 5 -P 1   # May vary
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 -P 1  # More stable

# Check 2: Background load
kubectl top nodes
kubectl get pods --all-namespaces -o wide | grep node-1

# Check 3: CPU frequency scaling
ssh node-1 "cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq" | sort | uniq
```

## iperf3 Server Limitations

```bash
# iperf3 server is single-threaded
# Symptom: Multi-stream throughput doesn't scale
# Solution: Verify server CPU is not saturated
kubectl top pod iperf-server

# If server is CPU-bound, use multiple server pods
for port in 5201 5202 5203 5204; do
  kubectl run iperf-server-$port --image=networkstatic/iperf3 -- -s -p $port
done
```

## netperf Issues

```bash
# Symptom: netperf shows 0 or negative results
# Check: Ensure netserver is running
kubectl exec netperf-server -- ps aux | grep netserver

# Check: Version compatibility
kubectl exec netperf-client -- netperf -V
kubectl exec netperf-server -- netserver -V

# Symptom: TCP_CRR very low
# Check: File descriptor limits
kubectl exec netperf-server -- ulimit -n
# Should be high (65535+)
```

## Network Policy Interference

```bash
# Symptom: Benchmark fails to connect
# Check: Network policies blocking test traffic
kubectl get networkpolicies --all-namespaces
kubectl get ciliumnetworkpolicies --all-namespaces

# Temporarily check without policies
cilium config set policy-audit-mode enabled
# Re-run test
cilium config set policy-audit-mode disabled
```

## MTU Issues

```bash
# Symptom: Throughput much lower than expected
# Check: Path MTU
kubectl exec test-pod -- ping -M do -s 1400 $SERVER_IP
# If fails, MTU is too low

# Check all MTUs in path
kubectl exec -n kube-system ds/cilium -- ip link show | grep mtu
```

## Verification

```bash
# After fixing, run benchmark suite
./comprehensive-benchmark.sh $SERVER_IP
echo "Results should be consistent (CV < 5%)"
```

## Troubleshooting

- **Zero throughput results**: Check pod networking with `kubectl exec -- ping`. Verify Cilium endpoint status.
- **iperf3 "unable to connect"**: Check that the server port is not blocked by network policy or firewall.
- **Results worse than expected for hardware**: Compare with host-networking baseline first.
- **netperf hangs**: Increase test timeout or check for firewall issues with control connection.

## Systematic Troubleshooting Approach

Follow a structured methodology to avoid wasting time on false leads:

### The Five Whys Method

Apply iterative root cause analysis:

```yaml
Problem: Throughput is 50% below baseline
Why 1: BPF programs are running slower (higher avg_ns)
Why 2: Conntrack lookups are taking longer
Why 3: Conntrack table is 90% full (hash collisions)
Why 4: Table size was not increased when cluster grew
Why 5: No monitoring on conntrack utilization
Root Cause: Missing capacity monitoring
```

### Data Collection During Issues

When troubleshooting active performance issues, collect data quickly before conditions change:

```bash
#!/bin/bash
# emergency-diag.sh - Run immediately when performance issues are reported
DIAG="/tmp/perf-issue-$(date +%s)"
mkdir -p $DIAG

# Quick data collection (runs in <30 seconds)
cilium status --verbose > $DIAG/status.txt &
cilium bpf ct list global | wc -l > $DIAG/ct-count.txt &
kubectl top pods -n kube-system -l k8s-app=cilium > $DIAG/agent-resources.txt &
kubectl exec -n kube-system ds/cilium -- cilium metrics list > $DIAG/metrics.txt &
wait

# BPF program stats
bpftool prog show --json > $DIAG/bpf-progs.json 2>/dev/null

# Network stats
kubectl exec -n kube-system ds/cilium -- ip -s link show > $DIAG/interfaces.txt

echo "Emergency diagnostics saved to $DIAG"
```

### Escalation Path

If the issue cannot be resolved through standard troubleshooting:

1. Collect a Cilium bugtool report: `cilium-bugtool`
2. Check Cilium GitHub issues for similar problems
3. Post on the Cilium Slack channel with diagnostic data
4. Open a GitHub issue with the bugtool archive

Include the following in any escalation:
- Cilium version and configuration
- Kernel version
- Cluster size (nodes, pods, identities)
- Timeline of when the issue started
- Any recent changes to the cluster

## Conclusion

Troubleshooting Cilium performance benchmarks requires examining the test tools and methodology before investigating Cilium itself. Most benchmark issues stem from server limitations, insufficient test duration, environmental interference, or MTU misconfiguration. By systematically eliminating benchmark-related causes, you can focus your Cilium tuning efforts on real performance issues.
