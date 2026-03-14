# Validating Connection Rate (TCP_CRR) in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, TCP_CRR, Validation

Description: A validation framework for TCP connection rate (TCP_CRR) performance in Cilium, including benchmark methodology, acceptance criteria, and automated validation.

---

## Introduction

Validating TCP_CRR performance ensures that your Cilium cluster can handle the connection rates your applications require. Unlike throughput validation that measures sustained bandwidth, TCP_CRR validation tests the transient behavior of connection setup and teardown, which stresses different parts of the datapath.

A proper TCP_CRR validation must confirm that connection rates meet minimum thresholds, that performance is consistent across runs, and that the connection rate does not degrade under sustained load. This guide provides the complete validation framework.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- `netperf` container images
- Prometheus for metrics
- CI/CD system for automation

## Connection Rate Acceptance Criteria

```yaml
# crr-acceptance-criteria.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: crr-criteria
  namespace: monitoring
data:
  min_crr_rate: "15000"       # Minimum connections/sec
  max_variance_pct: "10"       # Maximum variance percentage
  sustained_duration: "300"     # Must sustain for 5 minutes
  degradation_threshold: "5"   # Max 5% degradation over test
```

## Baseline Validation

```bash
#!/bin/bash
# validate-crr-baseline.sh

SERVER_IP=$(kubectl get pod netperf-server -o jsonpath='{.status.podIP}')
MIN_CRR=15000
RUNS=10
RESULTS=()

for i in $(seq 1 $RUNS); do
  CRR=$(kubectl exec netperf-client -- \
    netperf -H $SERVER_IP -t TCP_CRR -l 15 2>/dev/null | tail -1 | awk '{print $1}')
  RESULTS+=($CRR)
  echo "Run $i: $CRR conn/s"
  sleep 3
done

MEAN=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk '{s+=$1} END {printf "%.0f", s/NR}')
MIN_VAL=$(echo "${RESULTS[@]}" | tr ' ' '\n' | sort -n | head -1)
CV=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk -v m=$MEAN '{s+=($1-m)^2} END {printf "%.1f", sqrt(s/NR)/m*100}')

echo "Mean: $MEAN conn/s, Min: $MIN_VAL conn/s, CV: ${CV}%"

if (( $(echo "$MEAN < $MIN_CRR" | bc -l) )); then
  echo "FAIL: Mean CRR below minimum"
  exit 1
fi
echo "PASS: TCP_CRR validation successful"
```

## Sustained Load Validation

```bash
#!/bin/bash
# validate-crr-sustained.sh
# Ensure CRR doesn't degrade over a 5-minute sustained test

SERVER_IP=$(kubectl get pod netperf-server -o jsonpath='{.status.podIP}')
SAMPLES=()

for i in $(seq 1 10); do
  CRR=$(kubectl exec netperf-client -- \
    netperf -H $SERVER_IP -t TCP_CRR -l 30 2>/dev/null | tail -1 | awk '{print $1}')
  SAMPLES+=($CRR)
  echo "Sample $i (t=${i}x30s): $CRR conn/s"
done

FIRST=${SAMPLES[0]}
LAST=${SAMPLES[9]}
DEGRADATION=$(echo "scale=2; ($FIRST - $LAST) / $FIRST * 100" | bc)

echo "First sample: $FIRST conn/s"
echo "Last sample: $LAST conn/s"
echo "Degradation: ${DEGRADATION}%"

if (( $(echo "$DEGRADATION > 5" | bc -l) )); then
  echo "FAIL: CRR degraded more than 5% during sustained test"
  exit 1
fi
echo "PASS: Sustained load validation successful"
```

## Service Path Validation

Test CRR through different network paths:

```bash
#!/bin/bash
echo "=== Direct Pod-to-Pod ==="
kubectl exec netperf-client -- netperf -H $POD_IP -t TCP_CRR -l 15

echo "=== Via ClusterIP Service ==="
kubectl exec netperf-client -- netperf -H $SVC_IP -t TCP_CRR -l 15

echo "=== Via NodePort Service ==="
kubectl exec netperf-client -- netperf -H $NODE_IP -p $NODE_PORT -t TCP_CRR -l 15

# Each path exercises different NAT and BPF code paths
# All should meet minimum CRR requirements
```

## Verification

```bash
# Verify test infrastructure
kubectl get pods -l app=netperf-server
kubectl get svc netperf-server

# Check validation results
echo "All tests should show PASS status"

# Verify no resource exhaustion during tests
cilium bpf ct list global | wc -l
cilium bpf nat list | wc -l
```

## Troubleshooting

- **CRR varies wildly between runs**: Check CPU governor, increase test duration to 30+ seconds.
- **Sustained test shows degradation**: Likely conntrack table filling up. Monitor with `cilium bpf ct list global | wc -l`.
- **Service path much slower than direct**: This is expected due to NAT. Ensure socket LB is enabled for improvement.
- **Validation flaky in CI**: Use longer test durations and more lenient thresholds for CI environments.

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

TCP_CRR validation in Cilium must cover baseline performance, sustained load stability, and different service path types. The sustained load test is particularly important because it reveals conntrack table and NAT resource exhaustion that short tests miss. By automating these validations in CI/CD, you ensure that connection rate performance is maintained across all configuration changes.
