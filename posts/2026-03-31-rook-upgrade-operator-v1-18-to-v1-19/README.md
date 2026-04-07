# How to Upgrade the Rook Operator from v1.18 to v1.19

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Upgrade, Operator

Description: Step-by-step guide to upgrading the Rook-Ceph operator from v1.18 to v1.19 using Helm or manifests with minimal downtime.

---

## Before You Begin

Review the [Rook v1.19 release notes](https://github.com/rook/rook/releases) for any breaking changes. Key checks before upgrading:

- Confirm the current cluster is healthy: `ceph status` should show `HEALTH_OK`.
- Ensure you are running Rook v1.18 (not an older version; always upgrade one minor version at a time).
- Kubernetes cluster must meet the minimum version requirement for Rook v1.19.

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph status
kubectl -n rook-ceph get deployments rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Option 1: Upgrade via Helm

If Rook was installed with Helm, update the chart and upgrade:

```bash
helm repo update

helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --version 1.19.0
```

Check that the operator pod is replaced:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-operator
```

## Option 2: Upgrade via Manifests

Download the v1.19 manifests from the Rook repository:

```bash
curl -O https://raw.githubusercontent.com/rook/rook/v1.19.0/deploy/examples/crds.yaml
curl -O https://raw.githubusercontent.com/rook/rook/v1.19.0/deploy/examples/common.yaml
curl -O https://raw.githubusercontent.com/rook/rook/v1.19.0/deploy/examples/operator.yaml
```

Apply the CRD updates first:

```bash
kubectl apply -f crds.yaml
```

Apply common resources (RBAC, service accounts):

```bash
kubectl apply -f common.yaml
```

Update the operator deployment:

```bash
kubectl apply -f operator.yaml
```

Watch the operator restart:

```bash
kubectl -n rook-ceph rollout status deployment/rook-ceph-operator
```

## Verifying the Operator Upgrade

Confirm the operator image version:

```bash
kubectl -n rook-ceph get deployment rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Expected output should contain `v1.19.0`.

## Upgrading the Ceph Cluster After the Operator

The operator upgrade alone does not change the running Ceph version. After the operator is running on v1.19, you can trigger a Ceph version upgrade by patching the `CephCluster` image:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type merge \
  -p '{"spec":{"cephVersion":{"image":"quay.io/ceph/ceph:v19.2.0"}}}'
```

Monitor the rolling upgrade of OSDs, monitors, and managers:

```bash
kubectl -n rook-ceph get pods -w
```

## Monitoring During Upgrade

Watch the cluster health throughout the process:

```bash
watch kubectl -n rook-ceph exec <toolbox-pod> -- ceph status
```

It is normal for health to temporarily show `HEALTH_WARN` during an OSD rolling restart. Wait for it to return to `HEALTH_OK` before proceeding.

## Rollback Considerations

If you need to roll back the operator, re-apply the v1.18 manifests. The operator manages the cluster but does not change on-disk Ceph data structures, so a rollback is generally safe as long as the Ceph version itself was not upgraded.

## Summary

Upgrading Rook from v1.18 to v1.19 follows a clear sequence: verify cluster health, apply updated CRDs and RBAC, then update the operator deployment. The Ceph daemons continue running during the operator upgrade. After confirming the new operator is healthy, optionally update the Ceph version by patching the `CephCluster` spec.
