# How to Configure Rook-Ceph Drift Detection in ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ArgoCD, Drift Detection, GitOps, Kubernetes

Description: Learn how to configure ArgoCD drift detection for Rook-Ceph resources - covering ignore differences for operator-managed fields, self-healing configuration, and drift alerting.

---

## What Is Configuration Drift

Configuration drift occurs when the live state of a Kubernetes resource diverges from the desired state in Git. For Rook-Ceph, this is common because:
- The Rook operator modifies CephCluster status fields
- Ceph autoscaler adjusts PG counts automatically
- Admin may apply emergency changes via kubectl

## Step 1: Configure Ignore Differences for Operator-Managed Fields

Without ignore rules, ArgoCD constantly shows Rook resources as out-of-sync:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: rook-ceph
spec:
  ignoreDifferences:
  - group: ceph.rook.io
    kind: CephCluster
    jsonPointers:
    - /status
    - /metadata/finalizers
  - group: ceph.rook.io
    kind: CephBlockPool
    jsonPointers:
    - /status
  - group: storage.k8s.io
    kind: StorageClass
    jsonPointers:
    - /metadata/annotations/storageclass.kubernetes.io~1is-default-class
  - group: apps
    kind: Deployment
    namespace: rook-ceph
    jsonPointers:
    - /spec/template/spec/containers/0/resources
```

## Step 2: Enable Self-Healing

Self-healing automatically reverts unauthorized changes:

```yaml
spec:
  syncPolicy:
    automated:
      selfHeal: true
      prune: false  # never delete resources automatically
    syncOptions:
    - RespectIgnoreDifferences=true
```

## Step 3: Set Up Drift Alerts

Create a PrometheusRule that alerts when ArgoCD detects drift:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-drift-alerts
  namespace: monitoring
spec:
  groups:
  - name: argocd-rook
    rules:
    - alert: RookCephConfigDrift
      expr: |
        argocd_app_info{name="rook-ceph", sync_status!="Synced"} == 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Rook-Ceph configuration drift detected"
        description: "ArgoCD shows rook-ceph is out of sync for >10m"
```

## Step 4: Review Drift Before Auto-Healing

For critical changes, disable auto-sync and review first:

```bash
# Check what drifted
argocd app diff rook-ceph --hard-refresh

# Example output shows operator changed a resource setting
# Review if the change was intentional before syncing back

# If intentional - update Git to match
# If unauthorized - trigger sync to revert
argocd app sync rook-ceph
```

## Step 5: Audit Log Integration

Enable JSON-formatted logging on the ArgoCD server to make audit events easier to parse:

```yaml
# argocd-cmd-params-cm ConfigMap
data:
  server.log.format: json
  server.log.level: info
```

View sync events:

```bash
kubectl -n argocd get events \
  --field-selector involvedObject.name=rook-ceph \
  --sort-by='.lastTimestamp'
```

## Summary

Effective drift detection for Rook-Ceph in ArgoCD requires ignoring operator-managed fields to reduce noise, enabling self-healing for unauthorized changes, and setting up alerts for prolonged out-of-sync states. The goal is distinguishing intentional operator behavior from actual configuration drift that needs remediation.
