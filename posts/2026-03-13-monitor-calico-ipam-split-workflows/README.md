# Monitoring Calico IPAM Split Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, IPAM

Description: Set up monitoring for Calico IPAM after pool splits - tracking IP utilization per pool, detecting exhaustion early, and alerting when IPAM consistency checks fail in a multi-pool cluster.

---

## Introduction

After splitting a Calico IP pool into zone-specific sub-pools, you need ongoing visibility into how each pool is being used. A pool that approaches exhaustion silently will start causing pod scheduling failures - not Typha issues, but workload disruptions that are equally impactful. IPAM monitoring closes this gap.

This post covers using `calicoctl` commands to inspect IPAM state, configuring Prometheus with the Calico IPAM metrics exposed by calico-kube-controllers, and setting up alerts for pool exhaustion and IPAM inconsistency.

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

# Show all IPs checked during an IPAM consistency check (verbose - use for investigation, not routine monitoring)
calicoctl ipam check --show-all-ips 2>/dev/null | head -50

# Check overall IPAM consistency - run this regularly
calicoctl ipam check
```

The `show --show-blocks` output shows each CIDR block, which pool it belongs to, how many IPs are in use, and how many are available. Look for blocks approaching 100% utilization.

---

## Step 2: Script Regular IPAM Utilization Checks

Create a monitoring script that can be run as a CronJob or from a CI pipeline:

```bash
#!/bin/bash
# ipam-utilization-check.sh
# Checks IPAM consistency and prints utilization across all pools

echo "=== Calico IPAM Utilization Check: $(date -u) ==="

# Check overall consistency first
if ! calicoctl ipam check 2>&1 | grep -q "IPAM is consistent"; then
  echo "[CRITICAL] IPAM is NOT consistent - investigate immediately"
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
apiVersion: v1
kind: ServiceAccount
metadata:
  name: calico-ipam-monitor
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-ipam-monitor
rules:
  - apiGroups: [""]
    resources: ["nodes", "pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["crd.projectcalico.org"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: calico-ipam-monitor
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-ipam-monitor
subjects:
  - kind: ServiceAccount
    name: calico-ipam-monitor
    namespace: kube-system
---
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

## Step 4: Use Prometheus IPAM Metrics

Calico's kube-controllers component exposes IPAM-related metrics via Prometheus on port 9094. Key metrics to monitor include `ipam_allocations_in_use`, `ipam_allocations_borrowed`, `ipam_allocations_gc_candidates`, `ipam_blocks`, and `ipam_ippool_size`.

```bash
# Port-forward to the calico-kube-controllers pod to inspect metrics
CONTROLLERS_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-kube-controllers -o name | head -1)
kubectl port-forward -n kube-system $CONTROLLERS_POD 9094:9094 &
sleep 2

# Check for IPAM-related metrics
curl -s http://localhost:9094/metrics | grep -E "^ipam_" | head -20

kill %1
```

For Felix dataplane health, scrape the calico-node Felix metrics endpoint separately on port 9091. For pool-level utilization, prefer the kube-controllers IPAM metrics above; if they are not available in your deployment, build a custom exporter that wraps `calicoctl ipam show`.

---

## Step 5: Set Up IPAM Exhaustion Alerts

Create Prometheus alert rules for IPAM issues. These rules require Calico's kube-controllers IPAM metrics or a custom exporter that exposes equivalent pool utilization:

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
        # Alert when an IP pool approaches exhaustion
        - alert: CalicoIPAMPoolExhaustion
          expr: |
            (
              sum by (ippool) (ipam_allocations_in_use)
              /
              max by (ippool) (ipam_ippool_size)
            ) > 0.85
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Calico IP pool {{ $labels.ippool }} is over 85% utilized"
            description: "Calico IP pool {{ $labels.ippool }} is {{ $value | humanizePercentage }} utilized. Expand or rebalance pools before pod IP allocation fails."

        # Alert when IPAM garbage collection finds possible leaked allocations
        - alert: CalicoIPAMGCCandidates
          expr: |
            sum by (ippool) (ipam_allocations_gc_candidates) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Calico IPAM has possible leaked allocations in {{ $labels.ippool }}"
            description: "{{ $value }} IPAM allocations are marked as garbage-collection candidates in pool {{ $labels.ippool }}."

        # Alert when Felix is not running on some nodes
        - alert: CalicoNodeNotReady
          expr: |
            up{job="calico-node"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "calico-node is down on {{ $labels.instance }}"
            description: "Felix is not running on this node. Networking and policy enforcement on the node may be impacted."
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

IPAM monitoring after a pool split is primarily about two things: consistency and utilization. Run `calicoctl ipam check` regularly to catch any consistency problems early, and track per-pool block utilization to prevent unexpected exhaustion. Combined with Prometheus alerts on IPAM metrics and calico-node readiness, you will catch IPAM-related issues well before they impact running workloads.

---

*Get alerted on IPAM failures and Felix programming errors with [OneUptime](https://oneuptime.com).*
