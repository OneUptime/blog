# How to Monitor Calico Node Health for Diagnostics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Diagnostic, Monitoring

Description: Monitor per-node Calico health using Felix Prometheus metrics, DaemonSet rollout status, and node-level alerts to detect individual node failures before they cause application connectivity issues.

---

## Introduction

Monitoring Calico at the node level requires tracking Felix health metrics per node, alerting when a calico-node pod is not Running on any node, and detecting dataplane programming failures on individual nodes. Node-level monitoring complements cluster-wide TigeraStatus monitoring by catching issues that affect only a subset of nodes.

## Felix Prometheus Metrics for Node Monitoring

```yaml
# Enable Felix metrics and expose them through a ServiceMonitor

apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  prometheusMetricsEnabled: true
---
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics-svc
  namespace: calico-system
  labels:
    k8s-app: calico-node
spec:
  clusterIP: None
  selector:
    k8s-app: calico-node
  ports:
    - name: felix-metrics
      port: 9091
      targetPort: 9091
---

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: felix-per-node
  namespace: calico-system
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  endpoints:
    - port: felix-metrics
      path: /metrics
      interval: 30s
  namespaceSelector:
    matchNames: ["calico-system"]
```

## Alert Rules for Node-Level Health

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-node-alerts
  namespace: calico-system
spec:
  groups:
    - name: calico.node
      rules:
        - alert: CalicoNodePodNotRunning
          expr: |
            kube_daemonset_status_desired_number_scheduled{daemonset="calico-node"}
            - kube_daemonset_status_number_ready{daemonset="calico-node"} > 0
          for: 5m
          annotations:
            summary: "{{ $value }} calico-node pods are not ready"

        - alert: CalicoFelixDataplaneFailuresIncreasing
          expr: |
            increase(felix_int_dataplane_failures[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Felix dataplane failures increased on {{ $labels.instance }}"

        - alert: CalicoFelixDataplaneErrors
          expr: |
            rate(felix_int_dataplane_failures[5m]) > 0
          for: 5m
          annotations:
            summary: "Felix dataplane failures on node {{ $labels.instance }}"
```

## Node Health Monitoring Dashboard

```json
{
  "title": "Calico Per-Node Health",
  "panels": [
    {
      "title": "calico-node Pods Ready",
      "type": "stat",
      "targets": [{
        "expr": "kube_daemonset_status_number_ready{daemonset='calico-node'}"
      }]
    },
    {
      "title": "Felix Dataplane Failures by Node",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(felix_int_dataplane_failures[5m])",
        "legendFormat": "{{instance}}"
      }]
    }
  ]
}
```

## Monitoring Architecture

```mermaid
flowchart LR
    A[Felix :9091/metrics\nper node] --> B[Prometheus]
    C[kube-state-metrics\nDaemonSet status] --> B
    B --> D[Grafana per-node dashboard]
    B --> E[Alertmanager]
    E -->|Node pod not ready| F[PagerDuty]
    E -->|Dataplane failures| G[Slack Warning]
```

## Conclusion

Node-level Calico monitoring requires two data sources: Felix Prometheus metrics for per-node health signals and kube-state-metrics for DaemonSet pod readiness. The most critical alert is `CalicoNodePodNotRunning` - a missing calico-node pod means one node is not receiving current network policy or dataplane updates and pods on that node may have connectivity issues. Combine this with the Felix dataplane failures alert to catch iptables programming errors before they cause visible outages.
