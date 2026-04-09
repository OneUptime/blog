# How to Set Up Prometheus Alerts for Rook-Ceph with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Alert, Kubernetes

Description: Deploy and configure Prometheus alerting rules for Rook-Ceph using the Helm chart to monitor cluster health and trigger notifications.

---

## Overview

Rook ships a comprehensive set of Prometheus alerting rules for Ceph cluster health, OSD failures, pool capacity, and more. When using the Helm-based kube-prometheus-stack or the Rook Helm chart, these rules can be deployed with minimal configuration.

## Option 1 - Enable Alerts via Rook Helm Chart

If you installed Rook using Helm, alerts can be enabled in the `values.yaml`:

```yaml
monitoring:
  enabled: true
  createPrometheusRules: true
  prometheusRule:
    labels:
      release: kube-prometheus-stack
    annotations: {}
```

Upgrade the release:

```bash
helm upgrade rook-ceph-cluster rook-release/rook-ceph-cluster \
  --namespace rook-ceph \
  --set monitoring.enabled=true \
  --set monitoring.createPrometheusRules=true
```

Verify PrometheusRule objects were created:

```bash
kubectl get prometheusrule -n rook-ceph
```

## Option 2 - Deploy Alerts from Rook GitHub

Rook publishes alerting rules in its repository. Apply them directly:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/localrules.yaml -n rook-ceph
```

## Option 3 - kube-prometheus-stack Integration

If using the kube-prometheus-stack Helm chart, ensure its Prometheus instance selects `rook-ceph` namespace rules:

```yaml
# kube-prometheus-stack values.yaml
prometheus:
  prometheusSpec:
    ruleNamespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: rook-ceph
    ruleSelector:
      matchLabels:
        release: kube-prometheus-stack
```

Label the `rook-ceph` namespace for selection:

```bash
kubectl label namespace rook-ceph kubernetes.io/metadata.name=rook-ceph
```

## Key Alert Rules Included

The default Rook alerting rules cover:

```text
- CephHealthError          - Cluster is in HEALTH_ERR state
- CephOSDDown              - One or more OSDs are down
- CephOSDNearFull          - OSD capacity above 85%
- CephOSDFull              - OSD capacity above 95%
- CephMonDown              - Monitor quorum at risk
- CephPGUnavailableBlockingIO - Placement groups unavailable, blocking I/O
- CephPoolNearFull         - Pool capacity above 85%
- CephMgrPrometheusModuleInactive - Prometheus manager module inactive
```

## Test an Alert Rule

Verify a specific rule evaluates correctly:

```bash
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &
curl -s 'http://localhost:9090/api/v1/query?query=ALERTS{alertname="CephHealthError"}' | jq .
```

## View Firing Alerts

```bash
curl -s 'http://localhost:9090/api/v1/alerts' | \
  jq '.data.alerts[] | select(.labels.alertname | test("Ceph"))'
```

## Summary

Setting up Prometheus alerts for Rook-Ceph with Helm is a one-step operation via the `monitoring.createPrometheusRules=true` Helm value. The resulting PrometheusRule objects provide out-of-the-box coverage for critical Ceph cluster conditions, enabling your alerting pipeline to notify on-call teams before storage issues impact workloads.
