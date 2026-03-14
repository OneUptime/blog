# Monitoring Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, Monitoring, Prometheus, Observability, CNI

Description: Set up Prometheus scraping, define critical alerting rules, and build a monitoring baseline for Calico Typha in a manifest-based deployment. Learn which metrics matter most for detecting scaling problems before they impact the cluster.

---

## Introduction

Typha exposes a rich set of Prometheus metrics covering connection counts, cache sizes, update fanout latency, and error rates. Without monitoring these metrics, you are flying blind — a Typha pod that silently falls behind syncing from the API server can cause Felix agents to enforce stale network policies for minutes before anyone notices.

This post covers enabling Typha metrics, configuring Prometheus to scrape them, defining alert rules for common failure modes, and establishing a baseline to detect performance regressions.

---

## Prerequisites

- Typha deployed with Prometheus metrics enabled (`TYPHA_PROMETHEUSMETRICSENABLED=true`)
- Prometheus Operator or standalone Prometheus running in your cluster
- `kubectl` and `calicoctl` access

---

## Step 1: Enable and Verify Typha Metrics

Confirm Typha is serving metrics on the configured port:

```bash
# Port-forward to Typha's metrics port
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl port-forward -n kube-system $TYPHA_POD 9093:9093 &

# Retrieve all Typha metrics
curl -s http://localhost:9093/metrics | grep "^typha_" | head -40
```

Key metric families to verify are present:

- `typha_connections_accepted_total` — cumulative connections ever accepted
- `typha_connections_active` — current connected Felix clients
- `typha_snapshots_generated_total` — how often Typha sends a full state snapshot
- `typha_updates_sent_total` — incremental updates dispatched to Felix clients

---

## Step 2: Create a Prometheus ServiceMonitor

If you are using the Prometheus Operator, create a `ServiceMonitor` to scrape Typha automatically:

```yaml
# typha-servicemonitor.yaml
# Prometheus ServiceMonitor for Typha metrics scraping
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-typha
  namespace: monitoring
  labels:
    # This label must match the Prometheus Operator's serviceMonitorSelector
    release: prometheus
spec:
  # Look for the Typha Service in kube-system
  namespaceSelector:
    matchNames:
      - kube-system
  selector:
    matchLabels:
      k8s-app: calico-typha
  endpoints:
    # Scrape the Prometheus metrics port every 30 seconds
    - port: typha-metrics
      interval: 30s
      path: /metrics
```

The Typha Service must expose the metrics port with a named port for the `ServiceMonitor` to work. Add the named port to the Service if it is missing:

```yaml
# typha-service-with-metrics.yaml
# Typha Service updated to expose both the Felix connection port and the metrics port
apiVersion: v1
kind: Service
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
spec:
  selector:
    k8s-app: calico-typha
  ports:
    # Felix connection port
    - name: calico-typha
      port: 5473
      protocol: TCP
      targetPort: calico-typha
    # Prometheus metrics port
    - name: typha-metrics
      port: 9093
      protocol: TCP
      targetPort: 9093
```

```bash
kubectl apply -f typha-service-with-metrics.yaml
kubectl apply -f typha-servicemonitor.yaml
```

---

## Step 3: Define Prometheus Alert Rules

Create alert rules that catch the most common Typha failure modes:

```yaml
# typha-alertrules.yaml
# PrometheusRule defining alerts for Typha health and scaling
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-typha-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
    - name: calico-typha
      rules:
        # Alert when fewer Typha pods are ready than expected
        - alert: TyphaPodCountLow
          expr: |
            count(up{job="calico-typha"} == 1) < 2
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Less than 2 Typha pods are healthy"
            description: "Only {{ $value }} Typha pod(s) are currently up. Felix agents may lose connectivity."

        # Alert when a single Typha pod has too many connected Felix clients
        # indicating connection imbalance (adjust threshold to replicas * expected_per_pod)
        - alert: TyphaCconnectionImbalance
          expr: |
            max(typha_connections_active) / avg(typha_connections_active) > 1.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Typha connection distribution is imbalanced"
            description: "The most-loaded Typha pod has 50% more connections than average. Consider rebalancing."

        # Alert when Typha stops sending updates to Felix clients
        - alert: TyphaSyncStalled
          expr: |
            rate(typha_updates_sent_total[5m]) == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Typha is not sending updates to Felix clients"
            description: "Typha on {{ $labels.instance }} has not sent updates in 5 minutes. Felix may be enforcing stale policies."

        # Alert when Typha is dropping clients due to slowness
        - alert: TyphaSendTimeout
          expr: |
            increase(typha_connections_dropped_total[5m]) > 0
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "Typha is dropping slow Felix clients"
            description: "{{ $value }} client(s) dropped in the last 5 minutes due to slow reads. Consider increasing TYPHA_CLIENTTIMEOUT."
```

```bash
kubectl apply -f typha-alertrules.yaml
```

---

## Step 4: Establish a Baseline with Key Metrics

Record these values immediately after a healthy deployment and use them as alert thresholds:

```bash
# Check current connection counts per Typha pod
kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | while read pod; do
  echo "=== $pod ==="
  kubectl exec -n kube-system $pod -- wget -qO- http://localhost:9093/metrics 2>/dev/null \
    | grep typha_connections_active
done
```

---

## Best Practices

- Scrape Typha metrics every 15–30 seconds; connection counts change rapidly during rolling restarts.
- Alert on `typha_connections_active` dropping to zero for any pod — it means Felix agents connected to that pod have lost their sync path.
- Create a dashboard panel showing `typha_connections_active` per pod instance to visualize balance at a glance.
- Include Typha metrics in the same dashboard as Felix `route_table_list_seconds` to correlate Typha sync delays with Felix programming latency.
- Export `typha_snapshots_generated_total` rate to detect unusually frequent full re-syncs, which can indicate API server connectivity problems.

---

## Conclusion

Monitoring Typha is straightforward once metrics are enabled and Prometheus is configured to scrape them. The most important signals are connection counts, update send rates, and pod availability. With the alert rules defined here, you will catch Typha problems before they cascade into Felix agents enforcing outdated network policies across the cluster.

---

*Send Typha alerts directly to your on-call team and correlate them with uptime data in [OneUptime](https://oneuptime.com).*
