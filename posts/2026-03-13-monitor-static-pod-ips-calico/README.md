# How to Monitor Static Pod IPs in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Static IPs, Monitoring, Networking, StatefulSet

Description: Learn how to monitor static pod IP assignments in Calico to ensure that pods maintain consistent IP addresses across restarts, which is critical for stateful workloads.

---

## Introduction

Static pod IPs are essential for stateful workloads like databases, message brokers, and applications that are referenced by IP in external firewall rules or DNS configurations. Calico supports static IP assignment through pod annotations, but ensuring these assignments persist across pod restarts and node migrations requires active monitoring.

Without monitoring, a pod restart might silently receive a different IP—especially if the originally assigned IP was claimed by another workload during downtime. This breaks external connectivity and can cause data loss in clustered applications that rely on peer IP addresses.

This guide covers how to monitor static pod IP assignments in Calico and alert on unexpected IP changes.

## Prerequisites

- Calico v3.20+ with Calico IPAM enabled
- `calicoctl` CLI installed and configured
- `kubectl` access
- Prometheus (optional, for alerting)

## Step 1: Assign Static IPs to Pods

Use the Calico annotation to request a static IP for a pod or StatefulSet.

```yaml
# statefulset-static-ip.yaml
# StatefulSet with static IP annotations for consistent addressing
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
      annotations:
        cni.projectcalico.org/ipAddrs: '["10.48.10.5"]'  # Static IP for this pod
    spec:
      containers:
        - name: postgres
          image: postgres:15
```

## Step 2: Verify Static IP Persistence After Restart

Check that the pod retains its IP after being restarted.

```bash
# Record the current IP before restart
kubectl get pod postgres-0 -n database -o jsonpath='{.status.podIP}'

# Delete the pod to trigger a restart
kubectl delete pod postgres-0 -n database

# Wait for pod to come back and verify IP
kubectl wait --for=condition=Ready pod/postgres-0 -n database --timeout=60s
kubectl get pod postgres-0 -n database -o jsonpath='{.status.podIP}'
```

## Step 3: Monitor WorkloadEndpoint IP Assignments

Use `calicoctl` to track WorkloadEndpoint IP assignments over time.

```bash
# List all WorkloadEndpoints with their IPs
calicoctl get workloadendpoints -A -o yaml | grep -A5 "ipNetworks"

# Check if a specific static IP is in use
calicoctl ipam show --ip=10.48.10.5

# Audit all IPAM assignments
calicoctl ipam show --show-blocks
```

## Step 4: Detect Static IP Changes with a Monitoring Script

Use a script to periodically validate that static IP pods retain their expected IPs.

```bash
#!/bin/bash
# check-static-ips.sh
# Script to validate that pods with static IP annotations retain their expected IPs

set -euo pipefail

# Map of pod/namespace to expected IP
declare -A EXPECTED_IPS=(
  ["database/postgres-0"]="10.48.10.5"
  ["database/redis-0"]="10.48.10.6"
)

FAILED=0
for pod_key in "${!EXPECTED_IPS[@]}"; do
  namespace=$(echo "${pod_key}" | cut -d'/' -f1)
  pod=$(echo "${pod_key}" | cut -d'/' -f2)
  expected_ip="${EXPECTED_IPS[$pod_key]}"

  actual_ip=$(kubectl get pod "${pod}" -n "${namespace}" \
    -o jsonpath='{.status.podIP}' 2>/dev/null || echo "NOT_FOUND")

  if [[ "${actual_ip}" != "${expected_ip}" ]]; then
    echo "ERROR: ${pod_key} has IP ${actual_ip}, expected ${expected_ip}"
    FAILED=1
  else
    echo "OK: ${pod_key} has correct IP ${actual_ip}"
  fi
done

exit ${FAILED}
```

## Step 5: Prometheus Alert for IP Mismatch

```yaml
# prometheusrule-static-ip.yaml
# Alert when pods with expected static IPs are not in the running state
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-static-ip-alerts
  namespace: monitoring
spec:
  groups:
    - name: calico.ipam.static
      rules:
        - alert: CalicoStaticIPPodNotRunning
          expr: |
            kube_pod_status_phase{namespace="database", pod=~"postgres.*", phase!="Running"} > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Pod with static IP in namespace 'database' is not running"
```

## Best Practices

- Maintain a registry of static IP allocations to prevent conflicts across teams
- Use `calicoctl ipam show --ip=<ip>` before assigning to verify IPs are not already in use
- Run the static IP validation script in a CronJob for continuous verification
- Combine static IPs with NetworkPolicies that reference specific IPs for defense in depth
- Reserve static IP ranges in dedicated IPPools to prevent overlap with dynamic allocation

## Conclusion

Monitoring static pod IPs in Calico ensures stateful workloads consistently receive their expected addresses and that IP changes are detected immediately. By combining annotation validation, `calicoctl` IPAM audits, and automated verification scripts, you can maintain IP address stability for critical workloads. Prometheus alerting on pod state changes provides the final safety net to catch unexpected IP reassignments before they impact production services.
