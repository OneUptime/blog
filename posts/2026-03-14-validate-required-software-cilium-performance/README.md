# Validating Required Software for Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Software, Validation

Description: A validation checklist and automated framework for verifying all required software for Cilium performance testing.

---

## Introduction

Validating required software ensures every component needed for reliable performance testing is present, correctly configured, and compatible. This validation should run before every benchmark suite to catch drift or degradation.

The validation covers kernel features, BPF support, benchmarking tools, Cilium status, and node-level software. Each check has a clear pass/fail criterion.

This guide provides the complete validation framework for Cilium performance testing software dependencies.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI and `kubectl` access
- Node-level root access
- Prometheus monitoring (recommended)

## Comprehensive Validation Script

```bash
#!/bin/bash
# validate-software.sh
set -euo pipefail
PASS=true

echo "=== Kernel Validation ==="
KVER=$(uname -r | cut -d. -f1-2)
if (( $(echo "$KVER >= 5.10" | bc -l) )); then
  echo "PASS: Kernel $KVER >= 5.10"
else
  echo "FAIL: Kernel $KVER < 5.10"
  PASS=false
fi

echo "=== BPF Validation ==="
if mount | grep -q "type bpf"; then
  echo "PASS: BPF filesystem mounted"
else
  echo "FAIL: BPF filesystem not mounted"
  PASS=false
fi

echo "=== Cilium Validation ==="
if cilium status | grep -q "OK"; then
  echo "PASS: Cilium is healthy"
else
  echo "FAIL: Cilium is not healthy"
  PASS=false
fi

echo "=== Tools Validation ==="
for tool in bpftool ethtool perf; do
  if command -v $tool &>/dev/null; then
    echo "PASS: $tool available"
  else
    echo "FAIL: $tool not found"
    PASS=false
  fi
done

if [ "$PASS" = true ]; then
  echo "OVERALL: PASS"
else
  echo "OVERALL: FAIL"
  exit 1
fi
```

## CI/CD Integration

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: software-validation
  namespace: monitoring
spec:
  template:
    spec:
      hostNetwork: true
      containers:
      - name: validator
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          echo "Validating node software..."
          # Kernel modules
          for mod in wireguard br_netfilter; do
            lsmod | grep -q $mod && echo "PASS: $mod" || echo "FAIL: $mod"
          done
          # BPF
          mount | grep -q bpf && echo "PASS: BPF" || echo "FAIL: BPF"
      restartPolicy: Never
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

## Conclusion

Properly validatinging required software for cilium performance is essential for reliable Cilium performance testing. Each component plays a role in the accuracy and reproducibility of benchmark results.
