# How to Customize Prometheus Rules for Rook-Ceph with Kustomize

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Kustomize, Kubernetes

Description: Use Kustomize patches to customize Rook-Ceph Prometheus alerting rules - adjust thresholds, add custom rules, and disable unwanted alerts.

---

## Overview

Rook ships default Prometheus alerting rules that suit most deployments, but production environments often require tuned thresholds, additional labels, or custom alerting rules. Kustomize patches allow you to modify the upstream `PrometheusRule` objects without forking the Rook manifests.

## Base Kustomize Setup

Create a directory structure for your customizations:

```bash
mkdir -p rook-monitoring/base rook-monitoring/overlays/production
```

In `rook-monitoring/base/kustomization.yaml`, reference the upstream Rook alerts:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/prometheus-ceph-v14.yaml
```

## Patch Alert Thresholds

Create a strategic merge patch to adjust the `CephPoolNearFull` threshold from 70% to 80%:

```yaml
# rook-monitoring/overlays/production/patch-pool-threshold.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: prometheus-ceph-rules
  namespace: rook-ceph
spec:
  groups:
  - name: pool-usage
    rules:
    - alert: CephPoolNearFull
      expr: |
        ceph_pool_percent_used > 80
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Ceph pool is near capacity (>80%)"
```

## Add a Custom Alerting Rule

Add a custom rule for high write latency as a separate PrometheusRule resource:

```yaml
# rook-monitoring/overlays/production/custom-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rook-ceph-custom-rules
  namespace: rook-ceph
  labels:
    role: alert-rules
spec:
  groups:
  - name: custom-ceph-rules
    rules:
    - alert: CephHighWriteLatency
      expr: |
        ceph_osd_apply_latency_ms > 200
      for: 2m
      labels:
        severity: warning
        team: storage
      annotations:
        summary: "OSD {{ $labels.ceph_daemon }} write latency above 200ms"
        description: "OSD apply latency is {{ $value }}ms, threshold is 200ms"
```

## Production Overlay kustomization.yaml

```yaml
# rook-monitoring/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
- custom-rules.yaml
patches:
- path: patch-pool-threshold.yaml
  target:
    kind: PrometheusRule
    name: prometheus-ceph-rules
commonLabels:
  environment: production
```

## Apply with Kustomize

Preview the changes:

```bash
kubectl kustomize rook-monitoring/overlays/production
```

Apply to the cluster:

```bash
kubectl apply -k rook-monitoring/overlays/production
```

## Disable Specific Alert Rules

To disable a rule (such as a noisy alert), patch it with a `null` expression or set `for` to a very long duration:

```yaml
# Disable CephMgrIsAbsent in dev environments
spec:
  groups:
  - name: ceph.mgr
    rules:
    - alert: CephMgrIsAbsent
      expr: "absent(ceph_mgr_status) and 0 == 1"
      for: 999h
```

## Summary

Kustomize patches provide a GitOps-friendly way to customize Rook-Ceph Prometheus rules without modifying upstream files. Strategic merge patches adjust existing thresholds while additional PrometheusRule resources extend the ruleset with site-specific alerts. This approach keeps customizations version-controlled and easy to review across environment overlays.
