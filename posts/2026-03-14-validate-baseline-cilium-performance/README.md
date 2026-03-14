# Validating Baseline Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Baseline, Benchmarking

Description: How to validate baseline performance issues in Cilium by comparing pod-to-pod performance against host-to-host hardware baselines.

---

## Introduction

Baseline performance represents the maximum achievable throughput and minimum latency of your hardware without any CNI overhead. Every Cilium performance analysis should start with establishing this baseline, because it sets the upper bound for what is achievable.

Validating baseline performance confirms that pod-to-pod throughput meets minimum efficiency targets compared to host-to-host hardware baselines.

This guide provides the methodology and commands for baseline performance management in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Baseline Validation Suite

```bash
#!/bin/bash
set -euo pipefail

echo "=== Cilium Baseline Validation ==="

# Step 1: Measure host baseline
HOST_BPS=$(kubectl exec host-iperf -- iperf3 -c $HOST_IP -t 20 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second')
echo "Host baseline: $(echo "scale=2; $HOST_BPS / 1000000000" | bc) Gbps"

# Step 2: Measure pod performance
POD_BPS=$(kubectl exec pod-iperf -- iperf3 -c $POD_IP -t 20 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second')
echo "Pod throughput: $(echo "scale=2; $POD_BPS / 1000000000" | bc) Gbps"

# Step 3: Calculate efficiency
EFF=$(echo "scale=1; $POD_BPS * 100 / $HOST_BPS" | bc)
echo "Efficiency: ${EFF}%"

# Step 4: Validate
MIN_EFF=90
if (( $(echo "$EFF < $MIN_EFF" | bc -l) )); then
  echo "FAIL: Efficiency below ${MIN_EFF}%"
  exit 1
fi
echo "PASS: Baseline validation successful"
```

## Multi-Metric Validation

```bash
# Validate throughput, latency, and connection rate against baselines
echo "Throughput: $(kubectl exec pod-iperf -- iperf3 -c $SERVER_IP -t 15 -P 1 -J | jq '.end.sum_sent.bits_per_second / 1000000000') Gbps"
echo "TCP_RR: $(kubectl exec pod-netperf -- netperf -H $SERVER_IP -t TCP_RR -l 15 2>/dev/null | tail -1 | awk '{print $1}') trans/s"
echo "TCP_CRR: $(kubectl exec pod-netperf -- netperf -H $SERVER_IP -t TCP_CRR -l 15 2>/dev/null | tail -1 | awk '{print $1}') conn/s"
```

## Verification

```bash
cilium status --verbose
echo "Compare pod throughput vs host baseline"
```

## Troubleshooting

- **Host baseline lower than expected**: Check NIC link speed, CPU governor, and kernel TCP tuning.
- **Pod performance much lower than host**: Check Cilium datapath mode -- tunnel mode adds significant overhead.
- **Inconsistent baseline measurements**: Increase test duration, check for background workloads.
- **Baseline changes after kernel update**: Re-run host baseline and update reference values.

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

Validating baseline performance in Cilium establishes the reference point for all performance optimization. With optimal Cilium configuration (native routing, BPF host routing, XDP acceleration), pod-to-pod throughput should achieve 90-98% of host-to-host baseline, confirming minimal CNI overhead.
