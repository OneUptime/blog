# How to Monitor Calico on OpenShift Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, Upgrade, Monitoring

Description: Monitor Calico upgrades on OpenShift with additional visibility into OCP-specific components including MachineConfigPool status and cluster operator health during the upgrade window.

---

## Introduction

Monitoring Calico upgrades on OpenShift requires watching both Calico's upgrade progress and OpenShift's own infrastructure changes that can interact with the upgrade. The additional monitoring targets are MachineConfigPool status (node reboots affecting upgrade), cluster operators (especially the network operator), and OpenShift's built-in cluster monitoring.

## OpenShift-Enhanced Upgrade Monitor

```bash
#!/bin/bash
# monitor-calico-ocp-upgrade.sh

TARGET_VERSION="${1:?Provide target version}"

while true; do
  clear
  echo "=== Calico OCP Upgrade Monitor $(date) ==="
  echo ""

  # Calico progress
  echo "--- Calico Upgrade Progress ---"
  TOTAL=$(kubectl get nodes --no-headers | wc -l)
  UPDATED=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
    -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | \
    grep -c "${TARGET_VERSION}" || true)
  echo "Nodes updated: ${UPDATED}/${TOTAL}"

  # TigeraStatus
  echo ""
  echo "--- TigeraStatus ---"
  kubectl get tigerastatus 2>/dev/null

  # OCP-specific
  echo ""
  echo "--- OpenShift MachineConfigPools ---"
  oc get mcp --no-headers 2>/dev/null | \
    awk '{print $1, "UPDATED=" $3, "UPDATING=" $4}' | head -10

  echo ""
  echo "--- Cluster Operators ---"
  oc get co --no-headers 2>/dev/null | awk '
    $3!="True" || $4!="False" || $5!="False" { print "UNHEALTHY:", $0; found=1 }
    END { if (!found) print "All operators healthy" }
  ' | head -5

  sleep 15
done
```

## OpenShift Built-in Monitoring Integration

```bash
# OpenShift's built-in monitoring stack (user-workload monitoring)
# can also scrape Calico metrics without external Prometheus

# Enable user-workload monitoring
oc apply -f - <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    enableUserWorkload: true
EOF

# Apply Calico ServiceMonitors to calico-system
# (Note: ServiceMonitors go in calico-system, not openshift-monitoring)
```

## Alert for OCP-Calico Interaction Issues

```yaml
apiVersion: monitoring.openshift.io/v1
kind: AlertingRule
metadata:
  name: calico-ocp-upgrade-alerts
  namespace: openshift-monitoring
spec:
  groups:
    - name: calico.ocp.upgrade
      rules:
        - alert: OCPMCPUpdatingDuringCalicoUpgrade
          expr: |
            (mco_updated_machine_count < mco_machine_count)
            and on()
            (kube_daemonset_status_updated_number_scheduled{namespace="calico-system", daemonset="calico-node"} <
             kube_daemonset_status_desired_number_scheduled{namespace="calico-system", daemonset="calico-node"})
          for: 5m
          labels:
            severity: warning
          annotations:
            message: "MachineConfigPool updating while Calico upgrade is in progress. Concurrent MCP and Calico updates may interfere. Consider pausing one."
```

## Conclusion

Monitoring Calico upgrades on OpenShift adds MachineConfigPool status and cluster operator health to the standard upgrade monitoring. The enhanced monitor script watches both Calico's rolling update progress and OCP's infrastructure updates simultaneously. The concurrent update alert is particularly important - when both MCPs and Calico are updating at the same time, nodes may restart multiple times, extending the upgrade window and making it harder to diagnose issues.
