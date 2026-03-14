# Monitoring Namespace Selector Problems with Unlabeled Namespaces in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Monitoring

Description: Set up monitoring and alerting to detect when Calico network policies fail to match namespaces due to missing labels, preventing silent security gaps.

---

## Introduction

Namespace selector problems caused by unlabeled namespaces in Calico are particularly insidious because they produce no errors or warnings. The policy evaluates successfully, but it does not match the namespaces you intended. Without active monitoring, these gaps can persist for weeks or months.

Effective monitoring for this issue combines two approaches: detecting namespaces that lack expected labels and detecting traffic patterns that suggest policies are not matching correctly. Together, these approaches provide early warning before a misconfigured namespace becomes a security incident.

This guide walks through setting up both namespace label monitoring and traffic-based anomaly detection for Calico policy mismatches.

## Prerequisites

- A Kubernetes cluster with Calico CNI installed
- Prometheus and Grafana deployed for monitoring
- `kubectl` with cluster-admin access
- Familiarity with PromQL and Calico network policy concepts

## Monitoring Namespace Labels with a Custom Exporter

Deploy a lightweight exporter that exposes namespace label information as Prometheus metrics:

```yaml
# namespace-label-exporter.yaml
# Deployment that exposes namespace label metrics to Prometheus
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ns-label-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ns-label-exporter
  template:
    metadata:
      labels:
        app: ns-label-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      serviceAccountName: ns-label-exporter
      containers:
        - name: exporter
          image: python:3.12-slim
          command:
            - python3
            - /app/exporter.py
          volumeMounts:
            - name: script
              mountPath: /app
          ports:
            - containerPort: 8080
      volumes:
        - name: script
          configMap:
            name: ns-label-exporter-script
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ns-label-exporter-script
  namespace: monitoring
data:
  exporter.py: |
    from http.server import HTTPServer, BaseHTTPRequestHandler
    from kubernetes import client, config
    import time

    config.load_incluster_config()
    v1 = client.CoreV1Api()

    REQUIRED_LABELS = ["environment", "team"]

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path != "/metrics":
                self.send_response(404)
                self.end_headers()
                return
            namespaces = v1.list_namespace()
            lines = []
            for ns in namespaces.items:
                name = ns.metadata.name
                labels = ns.metadata.labels or {}
                for label in REQUIRED_LABELS:
                    has_label = 1 if label in labels else 0
                    lines.append(
                        f'namespace_has_required_label{{namespace="{name}",label="{label}"}} {has_label}'
                    )
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write("\n".join(lines).encode())

    HTTPServer(("", 8080), Handler).serve_forever()
```

## Setting Up Prometheus Alerts

Create alerting rules that fire when namespaces are missing required labels:

```yaml
# ns-label-alerts.yaml
# Alerts when namespaces lack labels required by Calico policies
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: namespace-label-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: namespace.labels
      rules:
        - alert: NamespaceMissingRequiredLabel
          expr: |
            namespace_has_required_label{namespace!~"kube-.*|default|calico-.*"} == 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Namespace {{ $labels.namespace }} missing label {{ $labels.label }}"
            description: "The namespace {{ $labels.namespace }} does not have the required label '{{ $labels.label }}', which may cause Calico policy selector mismatches."
```

Apply the resources:

```bash
# Apply the exporter and alerting rules
kubectl apply -f namespace-label-exporter.yaml
kubectl apply -f ns-label-alerts.yaml

# Verify the exporter is running and producing metrics
kubectl port-forward -n monitoring deploy/ns-label-exporter 8080:8080 &
curl -s http://localhost:8080/metrics
```

## Monitoring Calico Felix Policy Counters

Felix exposes metrics about policy rule evaluations. Use these to detect anomalies:

```bash
# Check available Felix metrics
kubectl exec -n calico-system $(kubectl get pod -n calico-system \
  -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') \
  -- wget -qO- http://localhost:9091/metrics | grep "felix_policy"
```

```yaml
# felix-policy-alerts.yaml
# Alert when traffic is not matching any policy (potential selector issue)
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: felix-policy-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: felix.policy
      rules:
        - alert: HighUnmatchedTrafficRate
          expr: |
            rate(felix_denied_packets_total[5m]) > 100
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High rate of denied packets detected"
            description: "Node {{ $labels.instance }} is seeing {{ $value }} denied packets/sec, which may indicate a namespace selector mismatch."
```

## Building a Namespace Label Dashboard

Create a Grafana dashboard to visualize namespace label compliance:

```bash
# PromQL queries for Grafana panels

# Panel 1: Count of namespaces missing each required label
# Type: Bar Gauge
count(namespace_has_required_label == 0) by (label)

# Panel 2: List of non-compliant namespaces
# Type: Table
namespace_has_required_label{namespace!~"kube-.*|default|calico-.*"} == 0

# Panel 3: Felix denied packets rate by node
# Type: Time Series
rate(felix_denied_packets_total[5m])
```

## Verification

Confirm the monitoring pipeline is operational:

```bash
# Check that the namespace exporter is producing metrics
kubectl port-forward -n monitoring deploy/ns-label-exporter 8080:8080 &
curl -s http://localhost:8080/metrics | head -20

# Verify Prometheus is scraping the exporter
curl -s http://localhost:9090/api/v1/targets \
  | python3 -c "
import sys, json
for t in json.load(sys.stdin)['data']['activeTargets']:
    if 'ns-label' in t.get('labels',{}).get('pod',''):
        print(f'Target: {t["labels"]["pod"]} Health: {t["health"]}')
"

# Create a test namespace without labels to trigger alert
kubectl create namespace monitor-test-unlabeled
# Wait 10 minutes and check Prometheus for firing alert
# Then clean up
kubectl delete namespace monitor-test-unlabeled
```

## Troubleshooting

- **Exporter pod fails to start**: Ensure the ServiceAccount has RBAC permissions to list namespaces. Create a ClusterRole with `get`, `list` on namespaces and bind it to the ServiceAccount.
- **Prometheus not scraping exporter**: Check that the `prometheus.io/scrape` annotation is present and that Prometheus is configured to honor pod annotations for service discovery.
- **False alerts on system namespaces**: Adjust the `namespace!~` regex in the alert expression to exclude additional system namespaces specific to your cluster.
- **Felix metrics not available**: Ensure the Felix Prometheus metrics endpoint is enabled by checking the `felixConfiguration` resource for `prometheusMetricsEnabled: true`.

## Conclusion

Monitoring for namespace selector problems requires exposing namespace label state as metrics, alerting when namespaces lack required labels, and tracking Felix policy evaluation metrics for anomalies. This combination of label compliance monitoring and traffic-based detection ensures that unlabeled namespaces are caught before they create security gaps in your Calico network policies.
