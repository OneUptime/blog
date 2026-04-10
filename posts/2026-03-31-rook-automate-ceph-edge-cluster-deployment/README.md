# How to Automate Ceph Edge Cluster Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Automation, Edge Computing, GitOps

Description: Learn how to automate repeatable Ceph edge cluster deployments using GitOps tools like Flux or ArgoCD combined with Rook operator templates.

---

Deploying Ceph to dozens of edge locations manually is error-prone and time-consuming. Automating deployments with GitOps ensures consistency, auditability, and the ability to bring new edge sites online with minimal manual intervention.

## GitOps Architecture for Edge Ceph

```text
Git Repository
  |-- base/           (common Rook operator + RBAC)
  |-- edge-profile/   (edge-specific CephCluster template)
  |-- sites/
      |-- edge-1/     (site-specific overrides)
      |-- edge-2/
      |-- edge-N/
```

## Base Rook Operator Manifest

```yaml
# base/operator.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rook-ceph
---
# (Rook operator deployment from official Helm chart or manifests)
```

## Edge CephCluster Template with Kustomize

```yaml
# edge-profile/ceph-cluster.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 1
    allowMultiplePerNode: true
  mgr:
    count: 1
  dashboard:
    enabled: false
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
    - name: sdb
  resources:
    osd:
      limits:
        memory: "1Gi"
      requests:
        memory: "512Mi"
```

## Site-Specific Kustomize Override

```yaml
# sites/edge-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../edge-profile

patches:
- target:
    kind: CephCluster
    name: rook-ceph
  patch: |
    - op: replace
      path: /spec/storage/devices/0/name
      value: nvme0n1
    - op: replace
      path: /spec/mon/count
      value: 3
```

## Flux CD Configuration

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: edge-1-ceph
  namespace: flux-system
spec:
  interval: 10m
  path: ./sites/edge-1
  prune: true
  sourceRef:
    kind: GitRepository
    name: edge-clusters
  healthChecks:
  - apiVersion: ceph.rook.io/v1
    kind: CephCluster
    name: rook-ceph
    namespace: rook-ceph
```

## Bootstrap Script for New Sites

```bash
#!/bin/bash
SITE_NAME=$1
DISK=$2

# Create site directory
mkdir -p sites/$SITE_NAME

cat > sites/$SITE_NAME/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../edge-profile
patches:
- target:
    kind: CephCluster
    name: rook-ceph
  patch: |
    - op: replace
      path: /spec/storage/devices/0/name
      value: $DISK
EOF

git add sites/$SITE_NAME/
git commit -m "Add edge site $SITE_NAME"
git push
echo "Site $SITE_NAME will be deployed by Flux"
```

## Verifying Deployment Status

```bash
flux get kustomizations | grep edge
kubectl -n rook-ceph get cephcluster
```

## Summary

Automating Ceph edge cluster deployment with GitOps tools like Flux combines Kustomize base templates with site-specific patches to create repeatable, auditable deployments. A bootstrap script generates new site configurations from templates, and Flux handles the actual reconciliation. This approach scales to hundreds of edge locations without manual cluster-by-cluster configuration.
