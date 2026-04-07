# How to Version Control Rook-Ceph Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GitOps, Version Control, Configuration Management, Kubernetes

Description: Learn how to structure and version control Rook-Ceph configuration in Git, covering repository layout, CRD versioning, change tracking, and config drift prevention.

---

## Why Version Control Rook Configuration

Version controlling Rook-Ceph configuration enables:
- Audit trail of every configuration change
- Rollback to known-good configurations
- Review and approval workflow for storage changes
- Multi-environment promotion with confidence

## Repository Layout

A well-structured Rook configuration repository:

```text
rook-ceph-config/
  README.md
  CHANGELOG.md
  base/
    namespace.yaml
    crds.yaml
    common.yaml
    operator.yaml
    cluster.yaml
    storageclass.yaml
    rbac.yaml
  pools/
    replicated-pool.yaml
    erasure-coded-pool.yaml
  filesystem/
    cephfs.yaml
    mds-storageclass.yaml
  object/
    object-store.yaml
    rgw-storageclass.yaml
  monitoring/
    prometheus-rules.yaml
    grafana-dashboards/
      ceph-cluster.json
```

## Tagging Configuration Versions

Use Git tags aligned with the exact Rook and Ceph versions you deploy:

```bash
git tag -a rook-v1.14.0-ceph-v18.2.4-20240724 -m "Rook 1.14.0 with Ceph 18.2.4-20240724 - production"
git push origin rook-v1.14.0-ceph-v18.2.4-20240724
```

Track the intended versions in Git alongside the manifests:

```yaml
# In cluster.yaml, track the intended Ceph image; track the Rook operator image in operator.yaml
# Ceph: v18.2.4-20240724 | Rook operator: v1.14.0 | Updated: 2026-03-31
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.4-20240724
```

## Capturing Live Configuration for Audit

If you have the `kubectl neat` plugin installed, export the live configuration to Git periodically:

```bash
#!/bin/bash
# Export key Rook resources to files for version control
kubectl -n rook-ceph get cephcluster rook-ceph -o yaml \
  | kubectl neat > base/cluster-live.yaml

kubectl -n rook-ceph get cephblockpool -o yaml \
  | kubectl neat > pools/pools-live.yaml

git add -A
git commit -m "chore: export live Rook config snapshot $(date +%Y-%m-%d)"
```

## Branch Strategy for Changes

Use feature branches for any configuration change:

```bash
# Create a branch for the change
git checkout -b feat/add-ssd-pool

# Make changes to the pool configuration
# ...edit pools/ssd-pool.yaml...

git add pools/ssd-pool.yaml
git commit -m "feat: add SSD-backed pool for high-performance workloads"
git push origin feat/add-ssd-pool

# Open a PR - requires approval before merging
```

## Preventing Configuration Drift

Use ArgoCD self-heal to reconcile drift in managed resources:

```yaml
spec:
  syncPolicy:
    automated:
      selfHeal: true
      prune: false
```

Set up a weekly diff check:

```bash
argocd app diff rook-ceph --hard-refresh
# Any differences indicate configuration drift
```

## Summary

Version controlling Rook-Ceph configuration requires a structured repository layout, Git tagging aligned with the exact Rook and Ceph versions you deploy, and a branch-and-review workflow for changes. Combined with ArgoCD self-healing and regular diff checks, this helps keep managed resources aligned with the intended configuration stored in Git.
