# Validating Native Routing Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Native Routing, BPF, BGP

Description: How to validate native routing performance in Cilium, covering route configuration, BPF host routing, and BGP integration.

---

## Introduction

Native routing mode in Cilium eliminates tunnel encapsulation overhead by routing pod traffic directly through the underlying network. This provides the best possible throughput and latency, but requires proper route configuration between nodes.

Validating native routing involves comparing pod-to-pod throughput against host-to-host baseline and verifying route completeness across all nodes.

This guide provides the specific steps and commands for native routing performance management.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Native Routing Performance Validation

```bash
#!/bin/bash
# Validate native routing achieves near-hardware throughput

# Host-to-host baseline
HOST_BPS=$(kubectl exec host-iperf -- iperf3 -c $HOST_IP -t 20 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second')

# Pod-to-pod via native routing
POD_BPS=$(kubectl exec pod-iperf -- iperf3 -c $POD_IP -t 20 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second')

EFFICIENCY=$(echo "scale=1; $POD_BPS * 100 / $HOST_BPS" | bc)
echo "Native routing efficiency: ${EFFICIENCY}%"
echo "Expected: > 90%"

if (( $(echo "$EFFICIENCY < 90" | bc -l) )); then
  echo "FAIL: Native routing efficiency below 90%"
  exit 1
fi
echo "PASS"
```

## Route Completeness Validation

```bash
# Verify all nodes have routes to all other nodes' pod CIDRs
NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')
for node in $NODES; do
  ROUTES=$(kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=cilium --field-selector spec.nodeName=$node -o name | head -1) -- ip route show | grep -c "10\.") 
  EXPECTED=$(($(echo $NODES | wc -w) - 1))
  echo "$node: $ROUTES routes (expected >= $EXPECTED)"
done
```

## Verification

```bash
cilium status --verbose | grep -E "DatapathMode|Host Routing|Routing"
ip route show | head -20
```

## Troubleshooting

- **Routes not appearing**: Check autoDirectNodeRoutes and ensure nodes are on the same L2 segment, or use BGP.
- **BPF host routing not activating**: Requires kubeProxyReplacement=true and compatible kernel (5.10+).
- **Asymmetric throughput**: Check for different NIC speeds or route path differences between nodes.
- **BGP peering not establishing**: Verify BGP ASN configuration and firewall rules for TCP port 179.

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

Native routing in Cilium provides the best possible network performance by eliminating tunnel overhead. Validating native routing configuration ensures pods benefit from direct routing with BPF host routing acceleration, achieving 90%+ of bare-metal throughput.
