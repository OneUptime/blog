# Automate Cilium Status Checks for Continuous Health Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF

Description: Learn how to automate Cilium status checks in scripts and CI/CD pipelines to continuously monitor the health of your CNI layer and detect degraded agents before they impact workloads.

---

## Introduction

Cilium's `cilium status` command provides a comprehensive health snapshot of the entire CNI installation - including agent status, BPF map health, Kubernetes connectivity, and policy enforcement state. Running this check manually is insufficient for production clusters; you need automated, continuous monitoring that alerts when Cilium agents degrade.

This post shows how to build automated Cilium status checks using the `cilium` CLI and standard Kubernetes tooling, integrate them into monitoring pipelines, and create actionable alerts when components fall out of health.

## Prerequisites

- Kubernetes cluster with Cilium installed (v1.12+)
- `cilium` CLI installed
- `kubectl` configured with cluster access
- A monitoring system (Prometheus, Grafana) or CI/CD pipeline

## Step 1: Understand the Status Check Output

Run a manual status check to understand the structure before automating it.

```bash
# Full Cilium status check with all component details
cilium status --verbose

# Wait for Cilium to become ready (useful in scripts after installation or upgrades)
# --wait-duration sets the maximum time to wait
cilium status --wait --wait-duration 120s

# Output status in JSON format for programmatic parsing
cilium status -o json

# Check status of a specific Cilium agent pod
kubectl exec -n kube-system ds/cilium -- cilium status
```

## Step 2: Create a Health Check Script

Write a reusable health check script that parses Cilium status and exits with an appropriate code.

```bash
#!/bin/bash
# scripts/check-cilium-health.sh
# Performs a comprehensive Cilium health check and reports any failures
# Exit code 0 = healthy, 1 = degraded, 2 = critical failure

set -uo pipefail

CILIUM_NAMESPACE="${CILIUM_NAMESPACE:-kube-system}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-60s}"
FAILURE_COUNT=0

echo "=== Cilium Health Check ==="
echo "Namespace: ${CILIUM_NAMESPACE}"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Check overall Cilium status and wait for readiness
echo ""
echo "--- Checking Cilium Status ---"
if ! cilium status --wait --wait-duration "${WAIT_TIMEOUT}"; then
  echo "ERROR: Cilium status check failed - one or more components are not ready"
  FAILURE_COUNT=$((FAILURE_COUNT + 1))
fi

# Check that all Cilium DaemonSet pods are running on every node
echo ""
echo "--- Checking Cilium Agent Pods ---"
TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)
READY_AGENTS=$(kubectl get pods -n "${CILIUM_NAMESPACE}" -l k8s-app=cilium \
  --field-selector=status.phase=Running --no-headers | wc -l)

if [ "${READY_AGENTS}" -lt "${TOTAL_NODES}" ]; then
  echo "ERROR: Only ${READY_AGENTS}/${TOTAL_NODES} Cilium agents are running"
  FAILURE_COUNT=$((FAILURE_COUNT + 1))
else
  echo "OK: All ${READY_AGENTS}/${TOTAL_NODES} Cilium agents are running"
fi

# Check Cilium Operator health
echo ""
echo "--- Checking Cilium Operator ---"
OPERATOR_READY=$(kubectl get deployment cilium-operator -n "${CILIUM_NAMESPACE}" \
  -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
if [ "${OPERATOR_READY}" -lt 1 ]; then
  echo "ERROR: Cilium Operator is not ready (readyReplicas=${OPERATOR_READY})"
  FAILURE_COUNT=$((FAILURE_COUNT + 1))
else
  echo "OK: Cilium Operator is ready (${OPERATOR_READY} replicas)"
fi

# Summary
echo ""
echo "=== Health Check Summary ==="
if [ "${FAILURE_COUNT}" -gt 0 ]; then
  echo "FAILED: ${FAILURE_COUNT} check(s) failed"
  exit 1
fi
echo "PASSED: All Cilium health checks passed"
exit 0
```

## Step 3: Add Agent-Level Status Checks

For deeper inspection, check the status of each Cilium agent pod individually.

```bash
#!/bin/bash
# scripts/check-all-cilium-agents.sh
# Runs 'cilium status' inside each Cilium agent pod to detect per-node issues

CILIUM_NAMESPACE="${CILIUM_NAMESPACE:-kube-system}"

# Get the list of all Cilium agent pod names
CILIUM_PODS=$(kubectl get pods -n "${CILIUM_NAMESPACE}" -l k8s-app=cilium \
  --no-headers -o custom-columns=NAME:.metadata.name)

echo "Checking status of all Cilium agents..."
FAILURES=0

for POD in ${CILIUM_PODS}; do
  NODE=$(kubectl get pod "${POD}" -n "${CILIUM_NAMESPACE}" \
    -o jsonpath='{.spec.nodeName}')
  echo -n "  Agent on node ${NODE} (${POD}): "

  # Run cilium status inside the agent pod
  if kubectl exec -n "${CILIUM_NAMESPACE}" "${POD}" -- cilium status --brief 2>/dev/null; then
    echo "OK"
  else
    echo "FAILED"
    FAILURES=$((FAILURES + 1))
  fi
done

echo ""
echo "Total failures: ${FAILURES}"
[ "${FAILURES}" -eq 0 ] && exit 0 || exit 1
```

## Step 4: Schedule with a CronJob

Run automated status checks on a schedule using a Kubernetes CronJob.

```yaml
# cilium-health-check-cronjob.yaml
# Runs the Cilium health check every 5 minutes and logs results
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-health-check
  namespace: kube-system
spec:
  schedule: "*/5 * * * *"            # Every 5 minutes
  concurrencyPolicy: Forbid           # Don't run overlapping checks
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cilium-health-checker
          restartPolicy: Never
          containers:
            - name: checker
              image: quay.io/cilium/cilium-cli:latest
              command:
                - /bin/sh
                - -c
                # Use cilium-cli to check cluster-wide Cilium status
                - "cilium status --wait --wait-duration 30s || exit 1"
```

## Best Practices

- Always use `--wait` in scripts that run immediately after cluster changes; Cilium agents need time to restart.
- Parse `cilium status -o json` for structured monitoring integrations rather than scraping text output.
- Alert on per-node agent failures, not just cluster-level status - a single degraded node can cause widespread connectivity issues.
- Include `cilium status` output in incident runbooks so on-call engineers know how to interpret it.
- Check `cilium-operator` health separately from agent health - operator failures affect policy management but not immediately existing traffic.

## Conclusion

Automating Cilium status checks gives you continuous visibility into the health of your cluster's CNI layer. By combining CLI-based health scripts with scheduled CronJobs and CI pipeline integration, you create multiple layers of detection for Cilium degradation - catching issues proactively rather than waiting for user-reported connectivity failures.
