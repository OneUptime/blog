# How to Set Up CSI-Addons Controller for Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Controller, Kubernetes

Description: Learn how to deploy and configure the CSI-Addons controller in a Rook cluster to enable extended storage operations like reclaim space and volume replication.

---

## What Is CSI-Addons

CSI-Addons is a Kubernetes project that extends the standard CSI specification with additional operations that are not part of the core CSI API. For Rook, the CSI-Addons controller enables:

- **ReclaimSpace** - Reclaims unused space in RBD volumes by running `fstrim` or `sparsify` operations
- **VolumeReplication** - Manages RBD mirroring for disaster recovery
- **NetworkFence** - Fences a node from Ceph storage during failure scenarios

These operations are expressed as Kubernetes custom resources (`ReclaimSpaceJob`, `VolumeReplication`, `NetworkFence`).

## Prerequisites

CSI-Addons requires the CSI-Addons sidecar to be running in the Rook CSI provisioner pods. This is enabled via Helm:

```yaml
csi:
  csiAddons:
    enabled: true
    repository: quay.io/csiaddons/k8s-sidecar
    tag: v0.14.0
```

Apply via Helm upgrade:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f values.yaml
```

## Deploying the CSI-Addons Controller

The CSI-Addons controller is a separate component deployed alongside Rook. Install it using the official manifests:

```bash
kubectl apply -f https://raw.githubusercontent.com/csi-addons/kubernetes-csi-addons/main/deploy/controller/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/csi-addons/kubernetes-csi-addons/main/deploy/controller/rbac.yaml
kubectl apply -f https://raw.githubusercontent.com/csi-addons/kubernetes-csi-addons/main/deploy/controller/setup-controller.yaml
```

Or enable it directly in the Rook Helm chart values:

```yaml
csi:
  csiAddons:
    enabled: true
```

## Verifying the CSI-Addons Controller

Check the controller deployment is running:

```bash
kubectl -n csi-addons-system get pods
```

Expected:

```text
NAME                                        READY   STATUS
csi-addons-controller-manager-xxx          2/2     Running
```

Verify the CRDs are installed:

```bash
kubectl get crd | grep -E "csiaddons|replication"
```

Expected CRDs:

```text
networkfences.csiaddons.openshift.io
reclaimspacecronjobs.csiaddons.openshift.io
reclaimspacejobs.csiaddons.openshift.io
volumereplicationclasses.replication.storage.openshift.io
volumereplications.replication.storage.openshift.io
```

## Confirming CSI-Addons Sidecar in Provisioner

Verify the sidecar is present in the RBD provisioner:

```bash
kubectl -n rook-ceph describe deployment csi-rbdplugin-provisioner \
  | grep csi-addons
```

The sidecar container listens on a Unix socket that the controller uses to call extended operations on volumes.

## Creating a Test ReclaimSpaceJob

Once the controller is running, test it by creating a `ReclaimSpaceJob`:

```yaml
apiVersion: csiaddons.openshift.io/v1alpha1
kind: ReclaimSpaceJob
metadata:
  name: test-reclaim
  namespace: my-app
spec:
  target:
    persistentVolumeClaim: my-rbd-pvc
```

Check the job status:

```bash
kubectl get reclaimspacejob test-reclaim -n my-app
```

## Summary

The CSI-Addons controller extends Rook CSI with storage lifecycle operations beyond basic provisioning and deletion. Enable the CSI-Addons sidecar via Helm values, deploy the CSI-Addons controller via its manifests, and verify CRD installation. Once deployed, `ReclaimSpaceJob`, `VolumeReplication`, and `NetworkFence` resources become available to manage advanced storage operations on Rook-provisioned volumes.
