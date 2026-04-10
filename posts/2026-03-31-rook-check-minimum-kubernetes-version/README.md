# How to Check Minimum Kubernetes Version for Rook Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Kubernetes, Upgrade, Compatibility, Version

Description: Learn how to verify your Kubernetes version meets Rook's minimum requirements before upgrading to avoid compatibility failures and unsupported configurations.

---

Each Rook release requires a minimum Kubernetes version. Attempting to install or upgrade Rook on an unsupported Kubernetes version can result in CRD schema validation failures, missing API support, or operator crashes. Checking compatibility before upgrading prevents these avoidable failures.

## Finding the Minimum Kubernetes Version Requirement

Rook documents its Kubernetes version requirements in two places:

1. The official documentation: `https://rook.io/docs/rook/latest/Getting-Started/Prerequisites/prerequisites/`
2. The GitHub release notes for each version

Typical requirements by Rook version:

```text
Rook v1.13.x: Kubernetes >= 1.25
Rook v1.14.x: Kubernetes >= 1.26
Rook v1.15.x: Kubernetes >= 1.27
```

Always check the exact requirement for your target Rook version - do not rely on this table as it may be outdated.

## Checking Current Kubernetes Version

```bash
kubectl version
```

```text
Client Version: v1.28.4
Kustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3
Server Version: v1.27.8
```

Note: The `--short` flag was deprecated in kubectl v1.28 and removed in v1.29. Running `kubectl version` without flags now produces the short format by default in modern kubectl versions.

Or for more detail:

```bash
kubectl version -o json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('Server:', d['serverVersion']['gitVersion'])
print('Client:', d['clientVersion']['gitVersion'])
"
```

For managed Kubernetes clusters, also check the provider's console for the exact version.

## Checking All Node Versions

In heterogeneous clusters, different nodes may run different kubelet versions:

```bash
kubectl get nodes -o custom-columns='NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion'
```

```text
NAME     VERSION
node-1   v1.27.8
node-2   v1.27.8
node-3   v1.27.6
```

Note: Kubernetes supports a small version skew between control plane and node kubelet versions. The minimum version check applies to all nodes that will run Rook components.

## Checking Kubernetes API Availability

Rook uses specific Kubernetes APIs. Verify the required APIs are available:

```bash
# Check for required API groups
kubectl api-versions | grep -E "storage.k8s.io|snapshot.storage.k8s.io|batch"
```

```text
batch/v1
snapshot.storage.k8s.io/v1
storage.k8s.io/v1
```

For CSI snapshot support (required for Rook volume snapshots), verify:

```bash
kubectl get crd volumesnapshotclasses.snapshot.storage.k8s.io 2>/dev/null && \
  echo "VolumeSnapshot CRDs present" || \
  echo "VolumeSnapshot CRDs MISSING"
```

## Checking Feature Gates

Rook uses several Kubernetes feature gates that should be enabled. Verify they are not explicitly disabled on your cluster:

```bash
# Check kube-apiserver feature gates (method varies by installation)
# For kubeadm clusters:
kubectl -n kube-system get configmap kubeadm-config -o yaml | grep featureGates

# For managed clusters, check provider documentation
```

Key feature gates for Rook:
- `CSIMigration` (enabled by default in Kubernetes 1.21+)
- `VolumeSnapshotDataSource` (GA in Kubernetes 1.20+)

## Automating the Version Check

Create a script to validate all version requirements before upgrading:

```bash
#!/bin/bash

TARGET_ROOK_VERSION="${1:-v1.15.0}"
MINIMUM_K8S_VERSION="1.27"  # Update based on target Rook version

echo "=== Rook ${TARGET_ROOK_VERSION} Pre-Upgrade Version Check ==="
echo ""

# Get server version
K8S_VERSION=$(kubectl version -o json | python3 -c "
import json, sys
d = json.load(sys.stdin)
v = d['serverVersion']
print(f\"{v['major']}.{v['minor'].rstrip('+')}\")")

echo "Kubernetes server version: ${K8S_VERSION}"

# Compare versions
if python3 -c "
import sys
current = tuple(int(x) for x in '${K8S_VERSION}'.split('.'))
minimum = tuple(int(x) for x in '${MINIMUM_K8S_VERSION}'.split('.'))
sys.exit(0 if current >= minimum else 1)
"; then
  echo "Version check PASSED: ${K8S_VERSION} >= ${MINIMUM_K8S_VERSION}"
else
  echo "Version check FAILED: ${K8S_VERSION} < ${MINIMUM_K8S_VERSION}"
  echo "Please upgrade Kubernetes before upgrading Rook."
  exit 1
fi

echo ""
echo "=== Node Version Check ==="
kubectl get nodes -o custom-columns='NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion'
```

## What to Do If Kubernetes Version is Too Old

If your Kubernetes version does not meet Rook's minimum requirement:

1. Upgrade Kubernetes first before upgrading Rook
2. For managed clusters (EKS, GKE, AKS), use the cloud provider's upgrade process
3. For self-managed clusters (kubeadm), follow the Kubernetes upgrade documentation
4. After Kubernetes upgrade, verify Rook is still functioning correctly before proceeding with the Rook upgrade

```bash
# After Kubernetes upgrade, check Rook health
kubectl -n rook-ceph get pods
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Summary

Before upgrading Rook, always check that your Kubernetes server version meets the minimum requirement for the target Rook release. Use `kubectl version` to get the current version, check all node kubelet versions with `kubectl get nodes`, and verify required API groups are present. If the Kubernetes version is too old, upgrade Kubernetes first and verify Rook is healthy before proceeding with the Rook upgrade.
