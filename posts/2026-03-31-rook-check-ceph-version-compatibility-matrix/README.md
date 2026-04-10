# How to Check Ceph Version Compatibility Matrix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compatibility, Version, Kubernetes

Description: Learn how to verify Ceph and Rook version compatibility with Kubernetes, CSI drivers, and client libraries before planning an upgrade.

---

## Overview

Running incompatible versions of Rook, Ceph, Kubernetes, and CSI drivers can cause silent failures or data access issues. The compatibility matrix defines which combinations are officially supported and tested.

## Official Compatibility Sources

The Rook documentation maintains the primary compatibility table. Key combinations:

| Rook Version | Ceph Version | Kubernetes Version |
|---|---|---|
| v1.16.x | Squid (19.x) | 1.26 - 1.32 |
| v1.15.x | Reef (18.x) | 1.25 - 1.31 |
| v1.14.x | Reef (18.x) | 1.24 - 1.30 |

Check the current Rook version:

```bash
kubectl -n rook-ceph get deployment rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Check the running Ceph version:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph version
```

Check Kubernetes version:

```bash
kubectl version
```

## CSI Driver Compatibility

Rook bundles specific versions of ceph-csi. Check the bundled version:

```bash
kubectl -n rook-ceph get deployment csi-rbdplugin-provisioner \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="csi-rbdplugin")].image}'
```

Verify ceph-csi is compatible with your kernel's RBD module:

```bash
# On a Kubernetes node
modinfo rbd | grep version
```

## Client Library Compatibility

Applications using `librados` or `librbd` must match the Ceph cluster's supported client versions. Ceph maintains backward compatibility for two major versions:

```bash
# Check librbd version from a client pod
kubectl exec -it my-app-pod -- python3 -c "import rados; print(rados.version())"
```

## Checking Feature Compatibility Flags

Ceph features are negotiated between clients and the cluster. Verify no incompatible features are required:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd dump | grep require_min_compat_client
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph features
```

If planning to upgrade, check if the target version supports your current client minimum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd dump | grep min_compat_client
```

## Automate Compatibility Checks

A shell script to validate key version constraints:

```bash
#!/bin/bash
ROOK_IMG=$(kubectl -n rook-ceph get deployment rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}')
CEPH_VER=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph version 2>/dev/null | awk '{print $3}')
K8S_VER=$(kubectl version 2>/dev/null | grep "Server Version" | awk '{print $3}')

echo "Rook: $ROOK_IMG"
echo "Ceph: $CEPH_VER"
echo "Kubernetes: $K8S_VER"
echo "Refer to: https://rook.io/docs/rook/latest/Getting-Started/quickstart/"
```

## Summary

Verifying the Ceph version compatibility matrix involves checking Rook, Ceph, Kubernetes, and CSI driver versions against the official support table. Use kubectl commands to inspect running images and ceph CLI to check feature flags. Staying within supported version combinations ensures you receive fixes and prevents subtle compatibility bugs.
