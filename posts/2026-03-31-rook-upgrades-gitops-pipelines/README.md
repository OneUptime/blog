# How to Handle Rook-Ceph Upgrades in GitOps Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Upgrade, GitOps, ArgoCD, Kubernetes

Description: Learn how to manage Rook-Ceph upgrades in GitOps pipelines using ArgoCD sync waves, pre-upgrade health gates, and staged rollout across environments.

---

## The Challenge of GitOps Upgrades

Rook upgrades require a specific order: CRDs first, then the operator, then the CephCluster image. GitOps tools apply all resources concurrently by default, which can break Rook upgrades.

## Step 1: Structure the Upgrade as Sync Waves

Use ArgoCD sync waves to enforce ordering:

```yaml
# crds.yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-10"

# operator.yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-5"

# cluster.yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"
```

## Step 2: Pre-Sync Health Gate

Add a pre-sync Job that verifies cluster health before the upgrade proceeds:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ceph-pre-upgrade-check
  namespace: rook-ceph
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      serviceAccountName: rook-ceph-operator
      containers:
      - name: health-check
        image: rook/ceph:v1.14.0
        command:
        - /bin/bash
        - -c
        - |
          STATUS=$(ceph status --format json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['health']['status'])")
          if [ "$STATUS" != "HEALTH_OK" ]; then
            echo "Cluster is not healthy: $STATUS"
            exit 1
          fi
          echo "Pre-upgrade health check passed: $STATUS"
      restartPolicy: Never
```

## Step 3: Version Bump Workflow

When upgrading, create a PR that changes only the version:

```bash
git checkout -b upgrade/rook-v1.14.0-ceph-v18.2.4

# Update operator image
sed -i 's/rook\/ceph:v1.13.0/rook\/ceph:v1.14.0/' base/operator.yaml

# Update Ceph version
sed -i 's/quay.io\/ceph\/ceph:v18.2.2/quay.io\/ceph\/ceph:v18.2.4/' base/cluster.yaml

git add base/operator.yaml base/cluster.yaml
git commit -m "upgrade: Rook v1.14.0, Ceph v18.2.4"
git push origin upgrade/rook-v1.14.0-ceph-v18.2.4
```

## Step 4: Staged Rollout Across Environments

Use separate ArgoCD Applications per environment with manual sync gates:

```yaml
# Staging syncs automatically
- cluster: staging
  syncPolicy:
    automated:
      prune: false
      selfHeal: true

# Production requires manual sync approval
- cluster: production
  syncPolicy: {}  # no automated sync
```

Promote to production only after staging succeeds:

```bash
# Check staging upgrade status
argocd app get rook-ceph-staging

# Manually sync production after verification
argocd app sync rook-ceph-production
```

## Step 5: Post-Sync Verification

Add a post-sync hook to verify the upgrade succeeded:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ceph-post-upgrade-verify
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
      - name: verify
        image: rook/ceph:v1.14.0
        command:
        - /bin/bash
        - -c
        - |
          ceph version
          ceph status
          ceph osd versions
```

## Summary

Rook-Ceph upgrades in GitOps pipelines require sync waves for ordering, pre-sync health gates to block upgrades on unhealthy clusters, and staged rollout across environments. Version bumps as dedicated PRs provide a clear audit trail and enable controlled promotion from staging to production.
