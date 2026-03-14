# Validating 32-Process Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Multi-Process, Validation

Description: A validation framework for 32-process parallel workloads in Cilium, ensuring linear scaling, even CPU distribution, and consistent aggregate throughput.

---

## Introduction

Validating 32-process performance in Cilium requires testing that aggregate throughput scales properly with process count, that all CPUs contribute evenly, and that results are statistically stable. The validation is more rigorous than lower-parallelism tests because the interaction of 32 concurrent flows creates emergent behavior that single tests cannot predict.

This guide provides a comprehensive validation framework covering scaling efficiency, CPU utilization balance, and consistency across multiple runs and node pairs.

The validation must answer three questions: Does throughput scale linearly? Is the scaling consistent? Does it hold across all node pairs?

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Nodes with 32+ CPU cores
- `iperf3` and `jq` available
- Prometheus for metrics
- CI/CD pipeline

## Scaling Efficiency Validation

```bash
#!/bin/bash
# validate-32p-scaling.sh

SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')

echo "Processes | Throughput (Gbps) | Efficiency"
SINGLE=""

for P in 1 2 4 8 16 32; do
  TOTAL=0
  for i in 1 2 3; do
    BPS=$(kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 15 -P $P -J 2>/dev/null | \
      jq '.end.sum_sent.bits_per_second')
    TOTAL=$(echo "$TOTAL + $BPS" | bc)
    sleep 3
  done
  AVG=$(echo "scale=0; $TOTAL / 3" | bc)
  GBPS=$(echo "scale=2; $AVG / 1000000000" | bc)

  if [ "$P" -eq 1 ]; then
    SINGLE=$AVG
    EFF="100%"
  else
    EXPECTED=$(echo "$SINGLE * $P" | bc)
    EFF=$(echo "scale=1; $AVG * 100 / $EXPECTED" | bc)
    EFF="${EFF}%"
  fi
  echo "$P         | $GBPS             | $EFF"
done
```

## Consistency Validation

```bash
#!/bin/bash
# validate-32p-consistency.sh
RUNS=10
RESULTS=()

for i in $(seq 1 $RUNS); do
  BPS=$(kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 32 -J | \
    jq '.end.sum_sent.bits_per_second')
  RESULTS+=($BPS)
  echo "Run $i: $(echo "scale=2; $BPS / 1000000000" | bc) Gbps"
  sleep 5
done

# Calculate coefficient of variation
MEAN=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk '{s+=$1} END {printf "%.0f", s/NR}')
CV=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk -v m=$MEAN '{s+=($1-m)^2} END {printf "%.2f", sqrt(s/NR)/m*100}')

echo "Mean: $(echo "scale=2; $MEAN / 1000000000" | bc) Gbps"
echo "CV: ${CV}%"

if (( $(echo "$CV > 5" | bc -l) )); then
  echo "FAIL: Coefficient of variation exceeds 5%"
  exit 1
fi
echo "PASS: Consistency validation successful"
```

## Cross-Node Matrix Validation

```bash
#!/bin/bash
NODES=$(kubectl get nodes -l node-role.kubernetes.io/worker -o jsonpath='{.items[*].metadata.name}')
MIN_GBPS=20

for src in $NODES; do
  for dst in $NODES; do
    [ "$src" = "$dst" ] && continue
    BPS=$(kubectl run "matrix-$src-$dst" --image=networkstatic/iperf3 \
      --overrides="{\"spec\":{\"nodeSelector\":{\"kubernetes.io/hostname\":\"$src\"}}}" \
      --rm -it --restart=Never \
      -- -c $DST_IP -t 15 -P 32 -J 2>/dev/null | \
      jq '.end.sum_sent.bits_per_second / 1000000000')
    echo "$src -> $dst: $BPS Gbps"
    if (( $(echo "$BPS < $MIN_GBPS" | bc -l) )); then
      echo "FAIL: Below minimum"
    fi
  done
done
```

## Verification

```bash
# Verify all validations passed
echo "Scaling: check output above for efficiency > 80% until NIC saturation"
echo "Consistency: CV should be < 5%"
echo "Cross-node: all pairs above minimum"

# Verify test infrastructure health
kubectl get pods -n monitoring -l app=iperf-server
cilium status --verbose | grep -E "Datapath|XDP|Routing"
```

## Troubleshooting

- **Scaling drops off early**: Check NIC speed with `ethtool eth0`. 32 streams on 10G NIC will plateau at ~10 Gbps.
- **High CV**: Check for thermal throttling or other workloads. Use `kubectl cordon` on test nodes.
- **Cross-node asymmetry**: Check for different NIC firmware or kernel versions across nodes.
- **Validation takes too long**: Reduce test duration to 10 seconds and run fewer iterations for quick checks.

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

Validating 32-process performance in Cilium requires testing scaling efficiency, consistency, and cross-node uniformity. The scaling test reveals your hardware ceiling and configuration efficiency, the consistency test confirms reliability, and the cross-node matrix ensures uniform cluster behavior. Together, these validations provide confidence that 32-process workloads will perform predictably in production.
