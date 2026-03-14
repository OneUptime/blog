# Validating Identity-Relevant Labels Configuration in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Configuration, Performance

Description: How to validate identity-relevant labels configuration issues in Cilium that impact performance and scalability.

---

## Introduction

The identity-relevant labels configuration in Cilium determines which Kubernetes labels are used to compute security identities. This configuration directly impacts the total number of identities, BPF map sizes, policy computation time, and ultimately network performance.

Validating the configuration ensures labels are properly restricted, identity count is reasonable, and network policies continue to function correctly.

This guide provides the specific steps for managing identity-relevant labels configuration.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Configuration Validation

```bash
#!/bin/bash
# validate-label-config.sh

echo "=== Identity Label Configuration Validation ==="

# Check configuration exists
LABELS=$(cilium config view | grep "^labels" | awk '{$1=""; print $0}' | xargs)
if [ -z "$LABELS" ]; then
  echo "FAIL: No label restriction configured (all labels are identity-relevant)"
  exit 1
fi
echo "PASS: Labels configured: $LABELS"

# Check identity-to-pod ratio
IDS=$(cilium identity list | wc -l)
PODS=$(kubectl get pods --all-namespaces --no-headers | wc -l)
RATIO=$(echo "scale=2; $IDS / $PODS" | bc)
echo "Identity/Pod ratio: $RATIO"

if (( $(echo "$RATIO > 0.5" | bc -l) )); then
  echo "WARN: Ratio above 0.5, consider further label optimization"
fi

# Verify policies still work
cilium policy get -o json | jq 'length'
echo "Active policies: $(cilium policy get -o json | jq 'length')"
```

## Verification

```bash
cilium config view | grep labels
cilium identity list | wc -l
```

## Troubleshooting

- **Policies stop working after label change**: A required label was excluded. Add it back to the configuration.
- **Identity count not decreasing**: Restart Cilium agents and wait for GC cycle.
- **High-cardinality label needed for policy**: Consider restructuring policies to use namespace-level rules instead.
- **Configuration lost after upgrade**: Ensure labels are set in Helm values file, not just runtime config.

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

Validating identity-relevant labels configuration is a critical scalability optimization in Cilium. The right label configuration can reduce identity count by orders of magnitude, directly improving policy computation performance and reducing BPF map pressure in large clusters.
