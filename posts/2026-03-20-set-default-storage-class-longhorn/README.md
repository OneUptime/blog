# How to Set Default Storage Class to Longhorn

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, StorageClass, Configuration

Description: Learn how to configure Longhorn as the default Kubernetes storage class so that PVCs without an explicit storageClassName automatically use Longhorn.

## Introduction

In Kubernetes, a default StorageClass is used to automatically provision PersistentVolumes for PersistentVolumeClaims that do not specify a `storageClassName`. Setting Longhorn as the default storage class means that applications deployed without explicit storage configuration will automatically use Longhorn-backed volumes. This guide explains how to set Longhorn as the default and handle scenarios where another default already exists.

## Understanding the Default Storage Class

When a PVC is created without a `storageClassName`, Kubernetes uses the storage class annotated with:

```text
storageclass.kubernetes.io/is-default-class: "true"
```

Only one StorageClass should have this annotation set to `"true"`. If multiple classes have this annotation, Kubernetes will use the most recently created default StorageClass for PVCs that do not specify a class.

## Check Your Current Default Storage Class

```bash
# List all storage classes and their default status

kubectl get storageclass

# Look for "(default)" in the output, e.g.:
# NAME                 PROVISIONER             RECLAIMPOLICY   VOLUMEBINDINGMODE
# local-path (default) rancher.io/local-path   Delete          WaitForFirstConsumer
# longhorn             driver.longhorn.io       Delete          Immediate
```

## Remove the Existing Default Storage Class

If another storage class is already set as the default, mark it as non-default first:

```bash
# Mark the existing default class as non-default
# Replace "local-path" with your current default class name
kubectl patch storageclass local-path \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "false"}}}'
```

Common default storage class names to check:
- `local-path` (Rancher k3s clusters)
- `standard` (GKE, minikube)
- `gp2` or `gp3` (EKS)
- `default` (various providers)

## Set Longhorn as the Default Storage Class

```bash
# Annotate the Longhorn storage class as the default
kubectl patch storageclass longhorn \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
```

## Verify the Change

```bash
# Confirm Longhorn is now the default
kubectl get storageclass

# Expected output:
# NAME               PROVISIONER            RECLAIMPOLICY   VOLUMEBINDINGMODE
# longhorn (default) driver.longhorn.io     Delete          Immediate
```

## Alternative: Set Default During Longhorn Installation

### Using Helm

When installing with Helm, set the default class in your values file:

```yaml
# longhorn-values.yaml
persistence:
  # Set Longhorn as the default storage class during installation
  defaultClass: true
  defaultClassReplicaCount: 3
  reclaimPolicy: Delete
```

```bash
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --values longhorn-values.yaml
```

### Using the Longhorn Settings

The Longhorn UI setting **Default Longhorn Static StorageClass Name** does not mark the Kubernetes `longhorn` StorageClass as the default for dynamically provisioned PVCs. It only sets the `storageClassName` used when Longhorn creates PV/PVC objects for an existing Longhorn volume. To make Longhorn the Kubernetes default StorageClass, use the Kubernetes annotation method above or set `persistence.defaultClass` during Helm installation.

## Creating a PVC Without a StorageClass

Once Longhorn is the default, PVCs that omit `storageClassName` will use Longhorn automatically:

```yaml
# pvc-no-class.yaml - PVC that will use the default (Longhorn) storage class
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-volume
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  # No storageClassName specified - will use the default (Longhorn)
```

```bash
kubectl apply -f pvc-no-class.yaml

# Verify the PVC was provisioned by Longhorn
kubectl get pvc app-volume -o yaml | grep storageClassName
```

## Preventing Longhorn from Being the Default for Specific Namespaces

In some scenarios, you may want certain namespaces to use a different storage class. You can specify the storage class explicitly in those namespaces:

```yaml
# Explicitly use a different storage class in a specific PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: fast-volume
spec:
  accessModes:
    - ReadWriteOnce
  # Explicitly override the default for this PVC
  storageClassName: local-path
  resources:
    requests:
      storage: 5Gi
```

## Reverting: Remove Longhorn as Default

If you need to remove Longhorn as the default storage class:

```bash
# Mark Longhorn as non-default
kubectl patch storageclass longhorn \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "false"}}}'

# Set a different class as default
kubectl patch storageclass <other-class-name> \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
```

## Conclusion

Setting Longhorn as the default storage class streamlines volume provisioning for applications that do not explicitly specify a storage class. This is especially useful in development and testing environments where developers should not need to know the details of storage provisioning. In production environments, consider whether it is more appropriate to require explicit storage class specification to ensure workloads get the correct storage characteristics.
