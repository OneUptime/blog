# How to Monitor Calico FIPS Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, FIPS, Monitoring, Compliance

Description: Set up continuous monitoring for Calico FIPS mode compliance, detecting algorithm violations, certificate expiry, and configuration drift in real time.

---

## Introduction

Monitoring Calico FIPS mode is about maintaining continuous compliance rather than one-time validation. FIPS configuration can drift in several ways: OS FIPS can be disabled by a kernel update, certificates can expire or be replaced with non-FIPS variants, new Calico versions might introduce non-FIPS images, or cluster administrators might inadvertently change the Installation `fipsMode` setting.

The monitoring strategy for Calico FIPS must be proactive: alert before a certificate expires (not after), detect configuration changes immediately, and provide a continuous compliance posture dashboard for audit teams. This requires combining Kubernetes-native monitoring (Prometheus, events) with custom scripts and scheduled compliance checks.

## Prerequisites

- Calico with `fipsMode: Enabled`
- Prometheus and Alertmanager
- Kubernetes Event Exporter or Falco
- Grafana for dashboards

## Monitor 1: Certificate Expiry Alerts

Expose certificate `NotAfter` values as `calico_cert_expiry_timestamp` with a small certificate checker or your existing certificate exporter, then alert on the actual expiry timestamp:

```yaml
# prometheus-rules-fips-certs.yaml

apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-fips-cert-alerts
  namespace: monitoring
spec:
  groups:
    - name: calico.fips.certificates
      rules:
        - alert: CalicoCertExpiringSoon
          expr: |
            calico_cert_expiry_timestamp{namespace="calico-system", secret=~"calico.*tls.*"} - time() < (30 * 24 * 3600)
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Calico TLS certificate expiring within 30 days"
            description: "Secret {{ $labels.secret }} in calico-system expires soon. FIPS compliance may be at risk."

        - alert: CalicoCertExpired
          expr: |
            calico_cert_expiry_timestamp{namespace="calico-system", secret=~"calico.*tls.*"} - time() < 0
          labels:
            severity: critical
          annotations:
            summary: "Calico TLS certificate has expired"
            description: "FIPS compliance VIOLATED: certificate {{ $labels.secret }} has expired."
```

## Monitor 2: FIPS Mode Configuration Drift

```bash
#!/bin/bash
# monitor-fips-drift.sh - Run as CronJob every 15 minutes
set -euo pipefail

ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://alertmanager.monitoring.svc:9093/api/v2/alerts}"
PUSHGATEWAY_URL="${PUSHGATEWAY_URL:-http://pushgateway.monitoring.svc:9091}"

check_fips_mode() {
  fips_mode=$(kubectl get installation.operator.tigera.io default \
    -o jsonpath='{.spec.fipsMode}' 2>/dev/null)
  fips_enabled=0

  if [[ "${fips_mode}" == "Enabled" ]]; then
    fips_enabled=1
  fi

  cat <<EOF | curl -sS --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/calico_fips_installation" || true
# TYPE calico_installation_fips_mode_enabled gauge
calico_installation_fips_mode_enabled ${fips_enabled}
EOF

  if [[ "${fips_mode}" != "Enabled" ]]; then
    echo "FIPS DRIFT: Installation fipsMode is '${fips_mode}', expected 'Enabled'"

    # Send alert
    curl -s -X POST "${ALERTMANAGER_URL}" \
      -H "Content-Type: application/json" \
      -d '[{
        "labels": {
          "alertname": "CalicoFIPSModeDrift",
          "severity": "critical",
          "current_value": "'"${fips_mode}"'"
        },
        "annotations": {
          "summary": "Calico FIPS mode has been disabled",
          "description": "Installation fipsMode changed from Enabled to '"${fips_mode}"'"
        }
      }]'
    return 1
  fi

  echo "OK: FIPS mode is Enabled"
  return 0
}

check_fips_mode
```

## Monitor 3: OS-Level FIPS Compliance Check

```yaml
# calico-fips-node-monitor-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-fips-os-monitor
  namespace: calico-system
spec:
  selector:
    matchLabels:
      app: calico-fips-os-monitor
  template:
    metadata:
      labels:
        app: calico-fips-os-monitor
    spec:
      tolerations:
        - operator: Exists
      containers:
        - name: fips-checker
          image: registry.internal.example.com/tools/ubi8:latest
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: PUSHGATEWAY_URL
              value: http://pushgateway.monitoring.svc:9091
          command:
            - /bin/bash
            - -c
            - |
              while true; do
                fips_val=$(cat /host/proc/sys/crypto/fips_enabled 2>/dev/null || echo 0)
                if [[ "${fips_val}" != "1" ]]; then
                  echo "ALERT: Node ${NODE_NAME} has FIPS disabled!"
                  fips_val=0
                else
                  echo "OK: Node ${NODE_NAME} FIPS enabled"
                fi

                cat <<EOF | curl -sS --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/calico_fips_os/instance/${NODE_NAME}"
              # TYPE calico_fips_node_enabled gauge
              calico_fips_node_enabled{node="${NODE_NAME}"} ${fips_val}
              EOF

                sleep 1800
              done
          volumeMounts:
            - name: host-proc
              mountPath: /host/proc
              readOnly: true
      volumes:
        - name: host-proc
          hostPath:
            path: /proc
```

## Monitor 4: Grafana FIPS Compliance Dashboard

```mermaid
flowchart LR
    A[DaemonSet: OS FIPS Check] -->|results| B[Prometheus Pushgateway]
    C[Prometheus Rules] -->|alerts| D[Alertmanager]
    B -->|metrics| E[Prometheus]
    E --> F[Grafana Dashboard]
    F --> G[FIPS Compliance Status Panel]
    F --> H[Cert Expiry Timeline Panel]
    F --> I[Component FIPS Images Panel]
    D --> J[PagerDuty / Slack]
```

Key Grafana panels for FIPS compliance:

These panels assume the OS monitor, certificate checker, and Installation configuration checker export the custom metrics shown below.

```promql
# Panel 1: FIPS mode enabled across all nodes
count(calico_fips_node_enabled == 1) / count(calico_fips_node_enabled)

# Panel 2: Days until certificate expiry
(calico_cert_expiry_timestamp - time()) / 86400

# Panel 3: FIPS mode in Installation
calico_installation_fips_mode_enabled
```

## Audit Log Monitoring

```bash
# Monitor Kubernetes audit logs for Installation changes
# (requires audit policy to log operator.tigera.io resources)
kubectl get events -A --field-selector reason=Updated | \
  grep installation

# Watch for any change to Installation spec.fipsMode
kubectl get installation.operator.tigera.io default -w -o jsonpath='{.spec.fipsMode}'
```

## Conclusion

Continuous monitoring of Calico FIPS mode protects against the gradual drift that can erode compliance over time. Certificate expiry alerts with 30-day lead time prevent last-minute scrambles, OS FIPS drift detection catches kernel upgrade side effects, and configuration drift monitoring ensures no one accidentally disables FIPS mode in production. Combine these monitors with a Grafana dashboard to give compliance teams a real-time view of your FIPS posture without requiring them to query Kubernetes directly.
