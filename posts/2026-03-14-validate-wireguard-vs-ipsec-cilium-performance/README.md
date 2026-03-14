# Validating WireGuard vs IPsec Performance Differences in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, WireGuard, IPsec, Encryption, Performance

Description: A validation framework for comparing WireGuard and IPsec encryption performance in Cilium, with automated benchmarking and acceptance criteria.

---

## Introduction

Validating the encryption choice between WireGuard and IPsec requires comprehensive benchmarking across multiple dimensions, statistical analysis, and comparison against acceptance criteria. A one-time benchmark is not sufficient; the validation must be repeatable and automated.

This guide provides the validation framework for encryption protocol selection and ongoing performance verification.

The validation answers: Which protocol is faster for our hardware? Is the performance consistent? And does it meet our minimum requirements?

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Both WireGuard and IPsec capability
- `iperf3` and `netperf`
- CI/CD pipeline

## Protocol Comparison Validation

```bash
#!/bin/bash
# validate-encryption-protocol.sh
PROTOCOLS=("wireguard" "ipsec")

for PROTO in "${PROTOCOLS[@]}"; do
  echo "=== Testing $PROTO ==="
  if [ "$PROTO" = "wireguard" ]; then
    helm upgrade cilium cilium/cilium --namespace kube-system \
      --set encryption.enabled=true \
      --set encryption.type=wireguard
  else
    helm upgrade cilium cilium/cilium --namespace kube-system \
      --set encryption.enabled=true \
      --set encryption.type=ipsec \
      --set encryption.ipsec.keyFile=/etc/ipsec/keys
  fi
  kubectl rollout status ds/cilium -n kube-system
  sleep 30

  # Run 5 iterations
  for i in $(seq 1 5); do
    BPS=$(kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 1 -J | \
      jq '.end.sum_sent.bits_per_second / 1000000000')
    RR=$(kubectl exec netperf-client -- \
      netperf -H $SERVER_IP -t TCP_RR -l 15 2>/dev/null | tail -1 | awk '{print $1}')
    echo "$PROTO run $i: $BPS Gbps, $RR trans/s"
    sleep 5
  done
done
```

## Acceptance Criteria

```bash
# Both protocols must meet:
MIN_THROUGHPUT_GBPS=7  # On 10G NIC with encryption
MIN_TCP_RR=15000       # Transactions per second
MAX_CV=10              # Maximum coefficient of variation %
```

## Automated CI Validation

```bash
#!/bin/bash
set -euo pipefail

CURRENT_PROTO=$(cilium encrypt status | grep -oE "wireguard|ipsec")
echo "Validating $CURRENT_PROTO encryption..."

RESULTS=()
for i in $(seq 1 5); do
  BPS=$(kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 1 -J | \
    jq '.end.sum_sent.bits_per_second')
  RESULTS+=($BPS)
  sleep 5
done

MEAN=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk '{s+=$1} END {printf "%.0f", s/NR}')
MEAN_GBPS=$(echo "scale=2; $MEAN / 1000000000" | bc)
echo "Mean: $MEAN_GBPS Gbps"

if (( $(echo "$MEAN_GBPS < 7" | bc -l) )); then
  echo "FAIL: Below minimum threshold"
  exit 1
fi
echo "PASS"
```

## Verification

```bash
echo "Review comparison table for protocol decision"
cilium encrypt status
```

## Troubleshooting

- **IPsec validation fails on setup**: Ensure IPsec key file is deployed to all nodes before enabling.
- **WireGuard validation inconsistent**: Increase test duration and number of iterations.
- **Both protocols below threshold**: Check for non-encryption-related performance issues first.
- **CI takes too long switching protocols**: Keep a dedicated test cluster for encryption validation.

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

Validating the WireGuard vs IPsec choice in Cilium requires comprehensive benchmarking across throughput, latency, and connection rate, with multiple iterations for statistical validity. The validation framework should be automated and run regularly to ensure the chosen protocol continues to perform well after kernel and Cilium upgrades.
