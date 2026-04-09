# How to Set Up Non-Default Namespace for Rook CSI Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Namespace, Kubernetes

Description: Learn how to configure Rook CSI drivers to run in a namespace other than rook-ceph for multi-team or compliance-driven Kubernetes deployments.

---

## Why Change the CSI Driver Namespace

By default, all Rook CSI components - the provisioner deployments, node plugins, and associated secrets - are deployed in the `rook-ceph` namespace alongside the Ceph cluster. Some organizations have policies requiring CSI infrastructure to run in a separate namespace from storage backends, or need to isolate CSI components for RBAC or audit purposes. Rook supports deploying CSI drivers to a separate namespace via Helm values or operator configuration.

## Setting the CSI Namespace via Helm

When installing Rook with Helm, set the CSI plugin namespace during the operator installation:

```bash
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set csi.pluginNamespace=rook-ceph-csi \
  --set csi.provisionerNamespace=rook-ceph-csi
```

Or in a `values.yaml`:

```yaml
csi:
  pluginNamespace: rook-ceph-csi
  provisionerNamespace: rook-ceph-csi
  enableRbdDriver: true
  enableCephfsDriver: true
  nfs:
    enabled: true
```

Apply the values:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f values.yaml
```

## What Gets Deployed in the CSI Namespace

After setting the namespace, verify CSI components are in the correct location:

```bash
kubectl get pods -n rook-ceph-csi
```

Expected output:

```text
NAME                                      READY   STATUS
csi-rbdplugin-5fxkt                       3/3     Running
csi-rbdplugin-provisioner-xxx             5/5     Running
csi-cephfsplugin-7j2lg                    3/3     Running
csi-cephfsplugin-provisioner-xxx          5/5     Running
```

## Updating StorageClass to Reference New Namespace

When CSI runs in a non-default namespace, update the secret references in your `StorageClass` objects:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph-csi
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph-csi
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph-csi
```

The secret names stay the same, but the namespace now points to `rook-ceph-csi`.

## RBAC Requirements

Ensure the Rook operator has permission to create resources in the CSI namespace. Review the ClusterRoleBinding for the Rook operator service account:

```bash
kubectl get clusterrolebinding | grep rook
kubectl get rolebinding -n rook-ceph-csi | grep rook
```

If bindings are missing, the operator will fail to deploy CSI daemonsets in the new namespace.

## Summary

Moving Rook CSI drivers to a non-default namespace requires setting `csi.pluginNamespace` and `csi.provisionerNamespace` via Helm values. After changing the namespace, update all `StorageClass` secret namespace references to point at the new namespace and verify RBAC bindings allow the Rook operator to manage resources there. This separation is useful for compliance requirements that mandate isolation between storage infrastructure and CSI plugin components.
