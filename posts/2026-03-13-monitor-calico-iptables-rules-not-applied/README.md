# How to Monitor for Calico iptables Rules Not Applied

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Monitoring, iptables, Felix, Prometheus

Description: Set up monitoring to detect when Calico iptables rules are not being applied using Felix metrics, Prometheus alerts, and periodic validation checks.

---

## Introduction

Calico iptables rule application failures are particularly dangerous because they can be silent - traffic may continue to flow while network policies are not fully up to date, creating security gaps. Monitoring for this condition requires tracking Felix's iptables programming metrics and validating that Calico chains exist on nodes.

The Felix Prometheus metrics endpoint exposes counters specifically for iptables failures, making it the primary monitoring target for this scenario.

## Prerequisites

- Calico cluster with Prometheus deployed
- Felix metrics enabled in FelixConfiguration
- Access to create PrometheusRule resources

## Step 1: Enable Felix Metrics

Ensure Felix is exporting Prometheus metrics that include iptables error counters.

```bash
# Check if Felix metrics are enabled

calicoctl get felixconfiguration default -o yaml | grep -E "prometheus|metrics"

# Enable Felix metrics if not already enabled
calicoctl patch felixconfiguration default \
  --patch '{"spec": {"prometheusMetricsEnabled": true, "prometheusMetricsPort": 9091}}'

# Verify metrics endpoint is accessible from the calico-node pod
kubectl exec -n calico-system \
  $(kubectl get pods -n calico-system -l k8s-app=calico-node -o name | head -1) -- \
  wget -qO- http://localhost:9091/metrics | grep "iptables" | head -10
```

## Step 2: Create Prometheus Alerts for iptables Errors

Set up alerts for iptables restore failures and missing Calico chains.

```yaml
# calico-iptables-alerts.yaml
# Prometheus rules to detect Calico iptables programming failures
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-iptables-monitoring
  namespace: monitoring
spec:
  groups:
    - name: calico.iptables
      rules:
        # Alert when iptables restore errors are increasing
        - alert: CalicoIptablesRestoreErrors
          expr: |
            increase(felix_iptables_restore_errors[5m]) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Calico iptables restore errors on {{ $labels.instance }}"
            description: "Felix is failing to apply iptables rules. Network policy enforcement may be broken."

        # Alert when iptables save errors occur
        - alert: CalicoIptablesSaveErrors
          expr: |
            increase(felix_iptables_save_errors[5m]) > 0
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Calico iptables save errors on {{ $labels.instance }}"

        # Alert when the active iptables chain count drops unexpectedly
        - alert: CalicoIptablesChainsMissing
          expr: |
            felix_iptables_chains < 5
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Calico iptables chain count is low on {{ $labels.instance }}"
            description: "Felix reports fewer than 5 active iptables chains. Network policy enforcement may be incomplete on this node."
```

```bash
# Apply the alert rules
kubectl apply -f calico-iptables-alerts.yaml
```

## Step 3: Create a Periodic Validation CronJob

Schedule a periodic spot check that verifies Calico iptables chains exist on the node where the Job pod runs.

```yaml
# calico-iptables-validation-cronjob.yaml
# Periodically validates that Calico iptables chains exist on the scheduled node
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-iptables-validator
  namespace: calico-system
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          hostPID: true
          serviceAccountName: calico-node
          containers:
            - name: validator
              image: calico/node:v3.32.0  # Match your installed Calico version
              securityContext:
                privileged: true
              command:
                - /bin/bash
                - -c
                - |
                  # Count Calico iptables chains
                  CHAIN_COUNT=$(iptables -L -n 2>/dev/null | grep -c "^Chain cali-")
                  if [ "${CHAIN_COUNT}" -lt 5 ]; then
                    echo "ALERT: Only ${CHAIN_COUNT} Calico iptables chains found (expected 20+)"
                    exit 1
                  fi
                  echo "OK: ${CHAIN_COUNT} Calico iptables chains present"
          restartPolicy: Never
          tolerations:
            - operator: Exists
```

```bash
# Apply the CronJob
kubectl apply -f calico-iptables-validation-cronjob.yaml
```

## Step 4: Monitor Key Felix iptables Metrics

Track these specific Felix metrics in your Grafana dashboard.

```bash
# Key metrics to include in Grafana dashboard

# iptables restore error rate (should normally be 0)
# rate(felix_iptables_restore_errors[5m])

# dataplane apply latency
# felix_int_dataplane_apply_time_seconds

# Number of active Calico iptables chains (should be stable)
# felix_iptables_chains

# Felix policy sync status
# felix_active_local_policies

# Check current values
kubectl exec -n calico-system \
  $(kubectl get pods -n calico-system -l k8s-app=calico-node -o name | head -1) -- \
  wget -qO- http://localhost:9091/metrics 2>/dev/null | \
  grep -E "felix_iptables|felix_ipsets|felix_active"
```

## Step 5: Set Up Dashboard for iptables Health

```mermaid
graph TD
    A[Felix Metrics Port 9091] --> B[Prometheus Scrape]
    B --> C[felix_iptables_restore_errors]
    B --> D[felix_iptables_save_errors]
    B --> E[felix_active_local_policies]
    C --> F[Alert: iptables errors increasing]
    D --> F
    E --> G[Dashboard: Policy count over time]
    H[CronJob: iptables chain count] --> I[Alert: chains below threshold]
```

## Best Practices

- Alert on rapid increases in `felix_iptables_restore_errors`
- Include iptables chain count validation in your periodic cluster health checks
- Monitor Felix policy sync metrics (`felix_active_local_policies`) to detect stale policy programming
- Use OneUptime to run synthetic network policy enforcement tests as an end-to-end check

## Conclusion

Monitoring for Calico iptables rule application failures requires Felix Prometheus metrics (especially `felix_iptables_restore_errors`), periodic iptables chain count validation, and end-to-end network policy enforcement tests. Zero iptables errors is the target state - rapid increases in error counters should trigger immediate investigation.
