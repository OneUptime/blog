# Monitoring Calico IPAM Split Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Monitoring, Prometheus, Networking, IP Pools

Description: Set up monitoring for Calico IPAM after pool splits — tracking IP utilization per pool, detecting exhaustion early, and alerting when IPAM consistency checks fail in a multi-pool cluster.

---

## Introduction

After splitting a Calico IP pool into zone-specific sub-pools, you need ongoing visibility into how each pool is being used. A pool that approaches exhaustion silently will start causing pod scheduling failures — not Typha issues, but workload disruptions that are equally impactful. IPAM monitoring closes this gap.

This post covers using `calicoctl` commands to inspect IPAM state, configuring Prometheus with the Calico IPAM metrics that Calico exposes, and setting up alerts for pool exhaustion and IPAM inconsistency.

---

## Prerequisites

- Calico v3.x with multi-pool IPAM configured (post-split setup)
- `calicoctl` v3.x installed and configured
- Prometheus running in the cluster (optional but recommended)
- Understanding of the post-split IP pool structure from the setup post

---

## Step 1: Check IPAM Utilization Per Pool

The primary tool for IPAM visibility is `calicoctl ipam show`. Use it to see utilization per pool:

```bash
# Show IP block allocation summary per pool
calicoctl ipam show --show-blocks

# Show all allocated IP addresses (verbose — use for investigation, not routine monitoring)
calicoctl ipam show --show-all-ips 2>/dev/null | head -50

# Check overall IPAM consistency — run this regularly
calicoctl ipam check
```

The `show --show-blocks` output shows each CIDR block, which pool it belongs to, how many IPs are in use, and how many are available. Look for blocks approaching 100% utilization.

---

## Step 2: Script Regular IPAM Utilization Checks

Create a monitoring script that can be run as a CronJob or from a CI pipeline:

```bash
#!/bin/bash
# ipam-utilization-check.sh
# Checks IPAM utilization across all pools and reports pools above threshold

WARN_THRESHOLD=70   # Warn at 70% utilization
CRIT_THRESHOLD=85   # Critical at 85% utilization

echo "=== Calico IPAM Utilization Check: $(date -u) ==="

# Check overall consistency first
if ! calicoctl ipam check 2>&1 | grep -q "IPAM is consistent"; then
  echo "[CRITICAL] IPAM is NOT consistent — investigate immediately"
  exit 2
fi
echo "[OK] IPAM consistency check passed"
echo ""

# List all IP pools with their CIDR
echo "=== IP Pool Summary ==="
calicoctl get ippool -o wide
echo ""

# Show block-level utilization
echo "=== Block Utilization ==="
calicoctl ipam show --show-blocks
```

```bash
chmod +x ipam-utilization-check.sh
# Run manually during and after a split
./ipam-utilization-check.sh
```

---

## Step 3: Configure a CronJob for Regular IPAM Checks

```yaml
# ipam-monitor-cronjob.yaml
# CronJob that runs IPAM consistency and utilization checks every hour
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-ipam-monitor
  namespace: kube-system
spec:
  # Run every hour
  schedule: "0 * * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calico-ipam-monitor
          restartPolicy: OnFailure
          containers:
            - name: monitor
              # Use the calicoctl image for direct API access
              image: calico/ctl:v3.27.0
              command:
                - /bin/sh
                - -c
                - |
                  echo "=== IPAM Consistency Check: $(date -u) ==="
                  calicoctl ipam check
                  echo ""
                  echo "=== Pool Utilization ==="
                  calicoctl ipam show --show-blocks
              env:
                # In-cluster configuration
                - name: DATASTORE_TYPE
                  value: kubernetes
              resources:
                requests:
                  cpu: 50m
                  memory: 32Mi
                limits:
                  cpu: 200m
                  memory: 64Mi
```

---

## Step 4: Use Prometheus Node-Level IPAM Metrics

Calico's Felix component exposes IPAM-related metrics via Prometheus on port 9091 of each calico-node pod. Key metrics to monitor:

```bash
# Port-forward to any calico-node pod to inspect metrics
NODE_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node -o name | head -1)
kubectl port-forward -n kube-system $NODE_POD 9091:9091 &
sleep 2

# Check for IPAM-related Felix metrics
curl -s http://localhost:9091/metrics | grep -E "ipam|route_table|endpoint" | head -20

kill %1
```

For pool-level utilization, use the `kube_pod_info` and `kube_node_info` metrics combined with cluster IP range knowledge, or build a custom exporter that wraps `calicoctl ipam show`.

---

## Step 5: Set Up IPAM Exhaustion Alerts

Create Prometheus alert rules for IPAM issues. These rules require Calico's metrics or a custom exporter that exposes pool utilization:

```yaml
# ipam-alertrules.yaml
# PrometheusRule for Calico IPAM pool monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-ipam-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
    - name: calico-ipam
      rules:
        # Alert when Felix fails to program routes (may indicate IPAM issues)
        - alert: CalicoIPAMRouteProgrammingErrors
          expr: |
            increase(felix_int_dataplane_failures_total[10m]) > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Felix dataplane programming failures detected"
            description: "{{ $value }} failures in the last 10 minutes on {{ $labels.instance }}. May indicate IPAM exhaustion or misalignment."

        # Alert when Felix is not running on some nodes
        - alert: CalicoNodeNotReady
          expr: |
            up{job="calico-node"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "calico-node is down on {{ $labels.instance }}"
            description: "Felix is not running on this node. IPAM allocations and policy enforcement are stopped."
```

```bash
kubectl apply -f ipam-alertrules.yaml
```

---

## Best Practices

- Run `calicoctl ipam check` every hour via a CronJob and alert on any failure output.
- Monitor the ratio of allocated to available IPs in each pool; alert at 70% to give time for expansion before exhaustion.
- After every node scale-up event, run `calicoctl ipam show --show-blocks` to confirm new allocations are going to the correct sub-pool.
- After a split, run the utilization check daily for the first week to detect any unexpected allocation patterns.
- Keep a record of the expected utilization growth rate per pool so you can project when expansion will be needed.

---

## Conclusion

IPAM monitoring after a pool split is primarily about two things: consistency and utilization. Run `calicoctl ipam check` regularly to catch any consistency problems early, and track per-pool block utilization to prevent unexpected exhaustion. Combined with Prometheus alerts on Felix failures, you will catch IPAM-related issues well before they impact running workloads.

---

*Get alerted on IPAM failures and Felix programming errors with [OneUptime](https://oneuptime.com).*
