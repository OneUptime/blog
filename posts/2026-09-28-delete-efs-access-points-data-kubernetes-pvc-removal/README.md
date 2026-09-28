# How to Delete EFS Access Points and Their Data When Kubernetes PVCs Are Removed

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Kubernetes, CSI Driver, Storage

Description: Understand EFS PVC reclamation and configure verified directory cleanup when access-point data should be deleted with the volume.

Deleting a Kubernetes PVC, deleting its EFS access point, and deleting the files behind that access point are three different operations. With the EFS CSI driver's default behavior, reclaiming a dynamically provisioned volume removes the access point but leaves its root directory and contents on EFS.

That distinction is useful for recovery, but it can also leave an ever-growing collection of abandoned directories. Decide the retention policy explicitly before enabling automatic data removal. The examples here target released driver v3.5.0 and its Helm chart 4.5.0.

## Understand what triggers reclamation

Inspect the bound PV before deleting a claim:

```bash
kubectl get pvc documents -n tenant-blue \
  -o jsonpath='{.spec.volumeName}{"\n"}'
kubectl get pv pvc-example -o yaml
```

For a dynamically provisioned EFS volume, note the reclaim policy and access point in `spec.csi.volumeHandle`. A `Retain` PV leaves cleanup to the administrator after the claim is released. A `Delete` PV asks the CSI provisioner to reclaim the volume. An in-use PVC can remain protected until its consuming pod is gone. [Kubernetes reclamation and protection](https://kubernetes.io/docs/concepts/storage/persistent-volumes/).

Setting `reclaimPolicy: Delete` on a StorageClass affects newly provisioned volumes. Inspect each existing PV's actual policy instead of assuming a class edit changed it retroactively.

## Decide whether the directory is exclusively owned

Before enabling cleanup, establish a one-to-one ownership relationship between the reclaimable volume and its directory. Two access points can expose the same path, and a separate client can mount the filesystem root. Either can keep using data that the controller is about to remove.

Do not enable automatic root-directory cleanup for intentionally shared directories or access-point reuse without a separate ownership design. EFS access-point deletion by itself does not delete the directory; the CSI cleanup option adds that destructive step. [CSI deletion behavior](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/parameters.md).

Keep production backups and a tested restoration procedure appropriate to the dataset. A `Delete` policy is a lifecycle decision, not a backup strategy.

## Enable directory cleanup on the controller

For a Helm-managed installation, merge this into the existing values:

```yaml
controller:
  deleteAccessPointRootDir: true
```

The corresponding controller argument is:

```text
--delete-access-point-root-dir=true
```

This is a controller-wide behavior setting, not a per-PVC switch. Review every EFS volume the controller can reclaim before rolling it out. Use separate operational boundaries if some applications require retention and others require immediate directory removal.

Check the rendered chart before upgrading:

```bash
helm template aws-efs-csi-driver \
  aws-efs-csi-driver/aws-efs-csi-driver \
  --version 4.5.0 \
  --namespace kube-system \
  -f reviewed-values.yaml > rendered-efs-driver.yaml
```

Verify the controller's argument and security context. The released chart documents that disabling privileged mode prevents root-directory deletion from working. For an EKS-managed add-on, use its supported configuration mechanism and schema instead of applying a Helm upgrade over the managed resources. [Released chart settings](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/values.yaml).

## Give the cleanup process its own access path

The controller must reach a mount target over TCP 2049, resolve or select the target, and mount the filesystem with the required permissions. Node pods successfully mounting application volumes does not prove the controller can do so.

In v3.5.0, the deletion path mounts the filesystem root using `tls` and `iam`, removes the access point's directory, unmounts, and then deletes the access point. Thus the controller's IAM principal needs effective `ClientMount`, `ClientWrite`, and `ClientRootAccess` permissions for the cleanup mount, as well as management permissions for the access point. Client permissions can be granted through an identity policy or a filesystem policy; they do not have to be allowed in both, and an applicable explicit deny still blocks access. A policy that allows only access-point-scoped mounts can block this root mount. [Released DeleteVolume implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/controller.go).

Grant cleanup access narrowly to the controller identity. Do not relax application directory permissions to compensate for a controller IAM or network error.

## Prove the full lifecycle with a disposable claim

Use a dedicated canary StorageClass with `Delete`, a unique directory, and no access-point reuse. Create a claim, mount it, and write a recognizable marker. Record its PV, access-point ID, and root path before removing the pod and claim.

```bash
kubectl delete pod cleanup-canary -n storage-test
kubectl delete pvc cleanup-canary -n storage-test
kubectl logs -n kube-system deployment/efs-csi-controller \
  -c efs-plugin --all-pods=true --since=10m
```

Success requires more than the PVC disappearing: confirm the PV is reclaimed, the access point no longer exists, and the recorded directory is absent when viewed from an authorized administrative mount. Also verify an unrelated neighboring directory remains intact.

If cleanup stalls, inspect controller logs and events before removing finalizers. A stuck PV may be preserving evidence of a failed mount or deletion. Removing its finalizer can abandon the very data you intended to clean up.

## Control deletion bursts

Directory traversal and removal can be expensive for large trees. The driver's FAQ recommends increasing controller resources for highly concurrent deletions or reducing external-provisioner worker concurrency. Test with realistic file counts and track deletion duration as well as errors. [Controller resource guidance](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/faq.md).

For retained historical directories, use a separately reviewed administrative cleanup process. Enabling the flag does not retroactively discover and delete every directory whose access point disappeared months ago.
