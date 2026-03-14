# Validating Encryption Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Encryption, WireGuard, IPsec, Performance

Description: How to validate encryption performance in Cilium, covering both WireGuard and IPsec overhead analysis and optimization.

---

## Introduction

Encryption in Cilium adds CPU overhead to every packet, reducing throughput and increasing latency compared to unencrypted networking. The magnitude of the overhead depends on the encryption protocol (WireGuard vs IPsec), hardware crypto support, and the workload characteristics.

Validating encryption performance ensures that throughput and latency meet minimum requirements with encryption active and that all node pairs are properly encrypted.

This guide covers the specific steps for managing encryption performance in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Encryption Validation Suite

```bash
#!/bin/bash
set -euo pipefail

echo "=== Encryption Validation ==="
# Verify encryption is active
cilium encrypt status | grep -q "Encryption:" || { echo "FAIL: No encryption"; exit 1; }

# Throughput validation
BPS=$(kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000')
echo "Encrypted throughput: $BPS Gbps"

MIN_GBPS=6  # Minimum for 10G NIC with encryption
if (( $(echo "$BPS < $MIN_GBPS" | bc -l) )); then
  echo "FAIL: Below minimum encrypted throughput"
  exit 1
fi

# Latency validation
RR=$(kubectl exec netperf-client -- netperf -H $SERVER_IP -t TCP_RR -l 15 2>/dev/null | tail -1 | awk '{print $1}')
echo "Encrypted TCP_RR: $RR trans/s"

# Verify all node pairs are encrypted
PEERS=$(cilium encrypt status | grep -c "peer")
NODES=$(($(kubectl get nodes --no-headers | wc -l) - 1))
if [ "$PEERS" -lt "$NODES" ]; then
  echo "FAIL: Not all peers encrypted ($PEERS < $NODES)"
  exit 1
fi

echo "PASS: Encryption validation successful"
```

## Verification

```bash
cilium encrypt status
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
```

## Troubleshooting

- **Encryption not active**: Verify Cilium helm values include encryption.enabled=true.
- **Overhead > 40%**: Check for userspace WireGuard or missing AES-NI for IPsec.
- **Some nodes not encrypted**: Check Cilium agent logs for key exchange errors.
- **Performance varies by node pair**: Different hardware capabilities across nodes.

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

Validating encryption performance in Cilium ensures that the security benefits of transparent encryption come with acceptable performance overhead. With proper protocol selection, hardware utilization, and continuous monitoring, encryption overhead can be kept below 20-30%, making it practical for production deployments.
