# Validating Packet Server Configuration in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Packet Processing, Validation

Description: A validation framework for packet server configuration in Cilium performance testing environments.

---

## Introduction

Validating packet servers ensures they are not the bottleneck in your performance tests. A properly validated server should be able to generate or receive traffic at rates higher than what Cilium's datapath can handle, so that the benchmark truly measures Cilium's performance.

The validation tests server throughput capacity, resource utilization under load, and consistency across multiple runs. If the server validates successfully, you can be confident that test results reflect Cilium's performance rather than server limitations.

This guide provides the validation methodology for performance test servers.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI and `kubectl` access
- Node-level root access
- Prometheus monitoring (recommended)

## Server Capacity Validation

```bash
#!/bin/bash
# Validate server can handle expected traffic rates

# Test 1: Server not CPU-bound at expected throughput
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 8 &
sleep 5
SERVER_CPU=$(kubectl top pod iperf-server --no-headers | awk '{print $2}')
echo "Server CPU during 8-stream test: $SERVER_CPU"
# Should be below 80% of allocated CPU

# Test 2: Server handles connection rate
kubectl exec netperf-client -- netperf -H $SERVER_IP -t TCP_CRR -l 10
# Should be > expected test rates

# Test 3: Server consistency
for i in $(seq 1 5); do
  kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 1 -J | \
    jq '.end.sum_sent.bits_per_second / 1000000000'
done
# CV should be < 5%
```

## Resource Validation

```bash
# Verify server has adequate resources
kubectl describe pod iperf-server | grep -A5 "Limits"
echo "CPU limit should be >= 4 cores"
echo "Memory limit should be >= 2Gi"

# Check socket buffers
kubectl exec iperf-server -- sysctl net.core.rmem_max
echo "Should be >= 16777216"
```

## Verification

```bash
# Run the validation checks above
# All items should show PASS
cilium status --verbose
```

## Troubleshooting

- **Validation fails on specific nodes**: Check if nodes were provisioned from different images.
- **Kernel module load fails**: Verify the module is available for your kernel version.
- **Cilium status unhealthy**: Check agent logs with `kubectl logs -n kube-system ds/cilium`.
- **Tools missing in containers**: Use an image that includes the required tools or mount from host.

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

Properly validatinging packet server configuration in cilium performance is essential for reliable Cilium performance testing. Each component plays a role in the accuracy and reproducibility of benchmark results.
