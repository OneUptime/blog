# How to Configure OMAP Generator in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, CSI, RBD

Description: Configure the OMAP generator in the Rook-Ceph Helm chart to manage RBD volume journaling metadata required for CSI operations.

---

## Overview

The OMAP (Object Map) generator is a component in the Rook-Ceph CSI stack that generates the OMAP mapping between PV names and RBD images. This mapping helps CSI identify RBD images for CSI operations. The OMAP generator is specifically needed when using the RBD mirroring feature, where these mappings must be maintained on secondary clusters.

## What the OMAP Generator Does

When you create an RBD PVC, the CSI driver stores metadata about the volume in a RADOS object using the OMAP data structure. This metadata associates the Kubernetes PV name with the underlying Ceph RBD image. Without correct OMAP entries, the CSI driver cannot locate volumes.

The OMAP generator sidecar runs inside the provisioner pod and handles these mappings automatically.

## Helm Configuration

Enable the OMAP generator through the operator chart values:

```yaml
csi:
  enableOMAPGenerator: true
```

The OMAP generator is disabled by default. Enable it when using the RBD mirroring feature, as mirrored images on secondary clusters need their OMAP entries maintained.

## Provisioner Sidecar Configuration

The OMAP generator runs as a sidecar container in the CSI RBD provisioner pod. Configure its resources:

```yaml
csi:
  enableOMAPGenerator: true
  csiRBDProvisionerResource: |
    - name: csi-omap-generator
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
          cpu: 100m
```

## Applying and Verifying

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set csi.enableOMAPGenerator=true
```

Check the provisioner pod for the `csi-omap-generator` container:

```bash
kubectl get pod -n rook-ceph -l app=csi-rbdplugin-provisioner \
  -o jsonpath='{.items[0].spec.containers[*].name}'
```

View OMAP generator logs:

```bash
kubectl logs -n rook-ceph \
  -l app=csi-rbdplugin-provisioner \
  -c csi-omap-generator
```

## Troubleshooting OMAP Issues

If PVCs are stuck in `Pending` with OMAP-related errors, check provisioner logs:

```bash
kubectl logs -n rook-ceph \
  -l app=csi-rbdplugin-provisioner \
  -c csi-rbdplugin | grep -i omap
```

To manually inspect OMAP entries for a pool:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  bash -c "rados -p ceph-blockpool listomapkeys csi.volumes.default"
```

## When to Enable the OMAP Generator

Enable the OMAP generator when:
- Using RBD mirroring to replicate images across Ceph clusters
- Running a disaster recovery setup where secondary clusters need PV-to-RBD mappings

For deployments not using RBD mirroring, the OMAP generator can remain disabled (the default).

## Summary

The OMAP generator in Rook-Ceph maintains the mapping between PV names and RBD images. Enable it via `csi.enableOMAPGenerator: true` in the operator Helm chart when using RBD mirroring, where secondary clusters need these mappings to identify mirrored images for CSI operations.
