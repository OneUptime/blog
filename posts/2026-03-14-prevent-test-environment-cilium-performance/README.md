# Preventing Test Environment Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Testing, Environment Setup

Description: How to prevent test environment issues that affect Cilium performance benchmarking accuracy and reliability.

---

## Introduction

Preventing test environment issues requires building a purpose-designed performance testing infrastructure from the start. Retrofitting a production cluster for performance testing invariably introduces variables that reduce result reliability.

The preventive approach covers dedicated test node pools, automated environment validation, and CI/CD integration that ensures consistent test conditions for every benchmark run.

This guide covers the infrastructure and processes needed to prevent test environment contamination.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Multiple worker nodes for testing
- `kubectl`, `cilium` CLI, and node-level access
- Understanding of your hardware specifications

## Dedicated Test Node Pool

```bash
# Label nodes for dedicated testing
kubectl label nodes node-perf-1 node-perf-2 node-role=perf-testing




# Enforce kernel parameters




```

## Automated Environment Validation

```bash
# Pre-benchmark validation script
#!/bin/bash
set -euo pipefail

# Verify no non-system pods on test nodes
PODS=$(kubectl get pods --all-namespaces --field-selector spec.nodeName=node-perf-1 -o json | jq "[.items[] | select(.metadata.namespace != \"kube-system\" and .metadata.namespace != \"monitoring\")] | length")
if [ "$PODS" -gt 0 ]; then echo "FAIL: Non-system pods on test node"; exit 1; fi
```

## CI/CD Integration

```bash
# Run as part of CI before benchmarks
echo "Validating test environment..."
./validate-test-env.sh || exit 1
echo "Environment validated. Starting benchmarks..."


```

## Verification

```bash
# Verify automation
kubectl get cronjobs -n monitoring
```

## Troubleshooting

- **CI environment differs from manual testing**: Use identical node images and Cilium versions in CI.
- **Test results still inconsistent**: Check for hardware issues like thermal throttling.
- **Environment validation too slow**: Parallelize checks and cache results.

## Building a Prevention Framework

A comprehensive prevention framework combines multiple layers of protection to ensure issues are caught before they impact production:

### Layer 1: Configuration Management

Store all Cilium and cluster configurations in version control. Use GitOps tools like Flux or ArgoCD to enforce desired state:

```bash
# Store Cilium values in Git
git add cilium-values.yaml
git commit -m "Cilium performance configuration baseline"

# Use Flux HelmRelease for automatic reconciliation
cat > cilium-helmrelease.yaml << 'YAML'
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cilium
  namespace: kube-system
spec:
  interval: 5m
  chart:
    spec:
      chart: cilium
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: cilium
  valuesFrom:
  - kind: ConfigMap
    name: cilium-values
YAML
```

### Layer 2: Automated Testing

Run performance regression tests on every change:

```bash
#!/bin/bash
# perf-gate.sh - Run as part of CI/CD pipeline

echo "Running performance regression gate..."

# Quick smoke test
BPS=$(kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second')
MIN_BPS=8000000000

if (( $(echo "$BPS < $MIN_BPS" | bc -l) )); then
  echo "FAIL: Performance below minimum threshold"
  echo "Measured: $BPS, Required: $MIN_BPS"
  exit 1
fi

echo "PASS: Performance within acceptable range"
```

### Layer 3: Observability

Maintain dashboards and alerts that provide real-time visibility into performance metrics. The monitoring should be checked daily and alerts should be acted upon within the SLA defined by your team.

Regular performance reviews (weekly or biweekly) where the team examines trends and proactively addresses any degradation before it becomes critical are highly recommended.

## Change Management Integration

Integrate performance prevention into your change management process:

### Pre-Change Performance Snapshot

Before any cluster change, capture a performance snapshot:

```bash
#!/bin/bash
# pre-change-snapshot.sh
SNAPSHOT="/tmp/perf-snapshot-$(date +%Y%m%d-%H%M%S)"
mkdir -p $SNAPSHOT

# Throughput
kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 15 -P 1 -J > $SNAPSHOT/throughput.json

# Latency
kubectl exec netperf-client -- netperf -H netperf-server.monitoring -t TCP_RR -l 15 > $SNAPSHOT/latency.txt

# Connection rate
kubectl exec netperf-client -- netperf -H netperf-server.monitoring -t TCP_CRR -l 15 > $SNAPSHOT/connrate.txt

# Cilium state
cilium status --verbose > $SNAPSHOT/cilium-status.txt
cilium config view > $SNAPSHOT/cilium-config.txt

echo "Snapshot saved to $SNAPSHOT"
echo "Run post-change-compare.sh after the change to detect regressions"
```

### Post-Change Comparison

```bash
#!/bin/bash
# post-change-compare.sh <pre-change-snapshot-dir>
PRE=$1
POST="/tmp/perf-snapshot-post-$(date +%Y%m%d-%H%M%S)"
mkdir -p $POST

kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 15 -P 1 -J > $POST/throughput.json

PRE_BPS=$(jq '.end.sum_sent.bits_per_second' $PRE/throughput.json)
POST_BPS=$(jq '.end.sum_sent.bits_per_second' $POST/throughput.json)
CHANGE=$(echo "scale=2; ($POST_BPS - $PRE_BPS) / $PRE_BPS * 100" | bc)

echo "Throughput change: ${CHANGE}%"
if (( $(echo "$CHANGE < -5" | bc -l) )); then
  echo "WARNING: >5% throughput regression detected"
fi
```

### Runbook Updates

Maintain a living runbook that documents all known performance issues and their resolutions. Update it after every incident.


## Best Practices Summary

Following these best practices ensures long-term success with your Cilium deployment:

- Always measure before and after changes to quantify impact accurately
- Use version-controlled configuration files to prevent drift and enable rollback
- Automate recurring tasks like benchmarking and validation with CronJobs
- Keep kernel, Cilium, and tooling versions consistent across all nodes in the cluster
- Document every performance-related decision and its measured outcome for future reference
- Review performance metrics weekly as part of your operational routine to catch slow regressions


## Conclusion

Preventing test environment issues requires dedicated test node pools, automated pre-benchmark validation, and CI/CD integration that ensures every test run starts from a known-good state.
