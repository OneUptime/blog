# Validating Tunneling Performance Issues in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Tunneling, VXLAN, GENEVE, Native Routing

Description: How to validate tunneling-related performance issues in Cilium, covering VXLAN/Geneve overhead, MTU configuration, and native routing alternatives.

---

## Introduction

Tunneling (VXLAN or Geneve) in Cilium adds encapsulation overhead to every cross-node packet. This overhead includes additional headers (50-60 bytes), extra processing for encapsulation/decapsulation, and potential MTU-related fragmentation. Validating these issues is critical for achieving optimal network performance.

Validation involves comparing throughput with and without tunneling, verifying MTU configuration prevents fragmentation, and testing across all node pairs for consistency.

This guide provides the specific steps for each aspect of tunnel performance management.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Tunnel vs Native Routing Comparison

```bash
#!/bin/bash
# Run both configurations and compare
for MODE in "tunnel=vxlan" "tunnel=disabled --set routingMode=native --set autoDirectNodeRoutes=true"; do
  echo "=== Testing: $MODE ==="
  helm upgrade cilium cilium/cilium --namespace kube-system --set $MODE
  kubectl rollout status ds/cilium -n kube-system
  sleep 30

  for i in $(seq 1 3); do
    kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 1 -J | \
      jq '.end.sum_sent.bits_per_second / 1000000000'
    sleep 5
  done
done
```

## Validate MTU Is Correct

```bash
# No fragmentation should occur with correct MTU
kubectl exec test-pod -- ping -M do -s 1400 $REMOTE_POD_IP
# Should succeed with native routing
# May need -s 1350 with tunneling

# Verify no fragmentation counters
kubectl exec -n kube-system ds/cilium -- cat /proc/net/snmp | grep -i frag
```

## Cross-Node Tunnel Validation

```bash
# Test all node pairs
NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')
for src in $NODES; do
  for dst in $NODES; do
    [ "$src" = "$dst" ] && continue
    echo "$src -> $dst: $(kubectl exec iperf-client-$src -- iperf3 -c $DST_IP -t 10 -P 1 -J | jq '.end.sum_sent.bits_per_second / 1000000000') Gbps"
  done
done
```

## Verification

```bash
cilium status --verbose | grep -E "Tunnel|DatapathMode"
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
```

## Troubleshooting

- **Cannot switch to native routing**: Cloud provider may require specific network configuration. Check provider documentation.
- **MTU too low causes poor performance**: Verify with ping -M do and adjust MTU in Cilium config.
- **Fragmentation despite correct MTU**: Check for nested encapsulation (tunnel inside tunnel).
- **Native routing breaks cross-node**: Ensure node routes are configured correctly.

## Comprehensive Validation Methodology

A robust validation process follows the scientific method: define hypotheses, control variables, run experiments, and analyze results statistically.

### Controlling Variables

Before running validation tests, ensure all variables except the one being tested are controlled:

```bash
# Create a controlled test environment
kubectl cordon node-test-1 node-test-2
kubectl drain node-test-1 node-test-2 --ignore-daemonsets --delete-emptydir-data

# Verify no non-essential workloads
kubectl get pods --all-namespaces --field-selector spec.nodeName=node-test-1 \
  -o custom-columns=NS:.metadata.namespace,POD:.metadata.name

# Set CPU governor to performance
ssh node-test-1 "for gov in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do echo performance > \$gov; done"
ssh node-test-2 "for gov in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do echo performance > \$gov; done"

# Uncordon for test workloads only
kubectl uncordon node-test-1 node-test-2
kubectl taint nodes node-test-1 node-test-2 dedicated=perf-testing:NoSchedule
```

### Statistical Analysis

Use proper statistical methods to analyze results:

```bash
#!/bin/bash
# Collect 20 samples for statistical significance
SAMPLES=()
for i in $(seq 1 20); do
  RESULT=$(kubectl exec perf-client -- iperf3 -c perf-server -t 15 -P 1 -J | \
    jq '.end.sum_sent.bits_per_second')
  SAMPLES+=($RESULT)
  sleep 5
done

# Calculate statistics
echo "${SAMPLES[@]}" | tr ' ' '\n' | awk '
{
  sum += $1
  sumsq += $1 * $1
  data[NR] = $1
}
END {
  mean = sum / NR
  variance = (sumsq / NR) - (mean * mean)
  stddev = sqrt(variance)
  cv = (stddev / mean) * 100

  # Sort for percentiles
  n = asort(data)
  p50 = data[int(n * 0.5)]
  p95 = data[int(n * 0.95)]
  p99 = data[int(n * 0.99)]

  printf "Samples: %d\n", NR
  printf "Mean: %.2f Gbps\n", mean / 1e9
  printf "StdDev: %.2f Gbps\n", stddev / 1e9
  printf "CV: %.1f%%\n", cv
  printf "P50: %.2f Gbps\n", p50 / 1e9
  printf "P95: %.2f Gbps\n", p95 / 1e9
  printf "P99: %.2f Gbps\n", p99 / 1e9
}'
```

### Acceptance Criteria Documentation

Document your acceptance criteria clearly so that validation results can be objectively evaluated:

| Metric | Minimum | Target | Method |
|--------|---------|--------|--------|
| Throughput | 8 Gbps | 9.5 Gbps | iperf3 single-stream |
| TCP_RR | 15K trans/s | 25K trans/s | netperf TCP_RR |
| TCP_CRR | 10K conn/s | 15K conn/s | netperf TCP_CRR |
| CV | < 5% | < 3% | 20 iterations |

## Conclusion

Validating tunneling performance in Cilium is essential for optimal cross-node communication. Native routing eliminates tunnel overhead entirely and should be the default choice when the network supports it. When tunneling is required, proper MTU configuration and BPF host routing minimize the performance impact.
