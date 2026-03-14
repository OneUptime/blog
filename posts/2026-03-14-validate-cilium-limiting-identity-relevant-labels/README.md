# Validating Cilium Limiting Identity-Relevant Labels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Scalability, Performance

Description: How to validate issues with Cilium's identity-relevant labels configuration, which directly impacts scalability and policy computation performance.

---

## Introduction

Cilium's security identity system assigns a unique numeric identity to each distinct set of security-relevant labels. When too many labels are identity-relevant, the number of unique identities can explode, causing increased memory usage, slower policy computation, and larger BPF maps.

Validating identity label configuration ensures the identity-to-pod ratio stays within acceptable bounds and policy computation time remains low.

This guide provides the specific steps for managing identity-relevant labels in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Identity Count Validation

```bash
#!/bin/bash
set -euo pipefail

# Check identity count
IDS=$(cilium identity list | wc -l)
PODS=$(kubectl get pods --all-namespaces --no-headers | wc -l)
RATIO=$(echo "scale=2; $IDS / $PODS" | bc)

echo "Identities: $IDS"
echo "Pods: $PODS"
echo "Ratio: $RATIO"

MAX_RATIO="0.5"
if (( $(echo "$RATIO > $MAX_RATIO" | bc -l) )); then
  echo "FAIL: Identity-to-pod ratio exceeds $MAX_RATIO"
  exit 1
fi
echo "PASS: Identity count is well-optimized"
```

## Label Configuration Validation

```bash
# Verify label configuration
LABELS=$(cilium config view | grep "^labels" | awk '{print $2}')
echo "Identity-relevant labels: $LABELS"

# Verify expected labels are included
for EXPECTED in "k8s:app" "k8s:io.kubernetes.pod.namespace"; do
  if echo "$LABELS" | grep -q "$EXPECTED"; then
    echo "PASS: $EXPECTED is included"
  else
    echo "FAIL: $EXPECTED is missing"
  fi
done
```

## Performance Impact Validation

```bash
# Verify policy computation time is reasonable
POLICY_TIME=$(kubectl exec -n kube-system ds/cilium -- cilium metrics list | grep policy_computation | awk '{print $2}')
echo "Policy computation time: $POLICY_TIME"
```

## Verification

```bash
cilium identity list | wc -l
cilium config view | grep labels
```

## Troubleshooting

- **Identity count not decreasing after label change**: Wait for garbage collection (up to 15 minutes).
- **Policies broken after label restriction**: Add the missing label to the identity-relevant list.
- **Cannot reduce below certain count**: Namespace-level identities are the minimum.
- **Agent memory still high**: Identity reduction takes effect gradually as endpoints regenerate.

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

## Validation Report Generation

Generate a formal validation report for stakeholder review:

```bash
#!/bin/bash
# generate-validation-report.sh

REPORT="/tmp/validation-report-$(date +%Y%m%d).md"

cat > $REPORT << HEADER
# Cilium Performance Validation Report
Date: $(date)
Cilium Version: $(cilium version --client 2>/dev/null || echo "N/A")
Cluster: $(kubectl config current-context)

## Test Environment
- Nodes: $(kubectl get nodes --no-headers | wc -l)
- Pods: $(kubectl get pods --all-namespaces --no-headers | wc -l)
- Identities: $(cilium identity list 2>/dev/null | wc -l)

## Results
HEADER

# Run tests and append results
echo "### Throughput" >> $REPORT
for i in $(seq 1 5); do
  BPS=$(kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 15 -P 1 -J | \
    jq '.end.sum_sent.bits_per_second / 1000000000')
  echo "- Run $i: $BPS Gbps" >> $REPORT
  sleep 3
done

echo "" >> $REPORT
echo "### Validation Status" >> $REPORT
echo "- [ ] Throughput meets minimum requirement" >> $REPORT
echo "- [ ] Latency within acceptable bounds" >> $REPORT
echo "- [ ] Consistency (CV) below threshold" >> $REPORT
echo "- [ ] All node pairs validated" >> $REPORT

echo "Report saved to $REPORT"
```

### Continuous Validation

Validation is not a one-time activity. Schedule regular validation runs:

```yaml
# Weekly full validation
# Daily quick smoke test
# On every Cilium upgrade
# On every kernel upgrade
# After any network configuration change
```

This continuous validation approach ensures performance requirements are met at all times, not just during initial deployment.

## Conclusion

Validating Cilium's identity-relevant labels is essential for scalability. By carefully selecting which labels contribute to security identities, you can reduce identity count by 10x or more in large clusters, directly improving policy computation time and reducing resource consumption.
