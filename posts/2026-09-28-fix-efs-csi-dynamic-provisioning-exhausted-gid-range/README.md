# How to Fix EFS CSI Dynamic Provisioning When the StorageClass Exhausts Its GID Range

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, EKS, Kubernetes, CSI Driver

Description: Diagnose EFS CSI free-GID allocation failures and move new claims to a reviewed identity range without changing existing volume ownership.

A PVC can remain Pending even though the EFS file system is healthy and reachable. When controller logs report that no free GID can be found, provisioning has failed before the application tries to mount anything. The problem is the POSIX identity pool used to create new EFS access points.

Restarting the node plugin or raising the PVC's storage request will not create more identities. Inspect the StorageClass and the access points already consuming its range, then choose a new provisioning configuration.

## Confirm that allocation is the failing stage

Start with the claim's events and controller logs:

```bash
kubectl describe pvc documents -n tenant-blue
kubectl get storageclass efs-apps -o yaml
kubectl logs -n kube-system deployment/efs-csi-controller \
  -c efs-plugin --since=30m
```

The workload may also show scheduling events, but look for the provisioning error that precedes them. A free-GID allocation error differs from an AWS access-point quota error, an IAM denial, and an NFS mount timeout. Each has a different corrective action.

In released EFS CSI v3.5.0, the allocator reads POSIX GIDs from the file system's access points and chooses an unused value in the requested interval. Its failure message directs the operator toward a new StorageClass and filesystem. The implementation also caps an excessively large interval relative to its access-point limit. [Released GID allocator](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/gid_allocator.go).

This matters when several classes or clusters use the same EFS file system: the identity inventory is larger than one namespace's PVC list.

## Count the actual occupants

Get the configured range and list access-point ownership:

```bash
aws efs describe-access-points \
  --file-system-id fs-0123456789abcdef0 \
  --query 'AccessPoints[].{Id:AccessPointId,Gid:PosixUser.Gid,Path:RootDirectory.Path,State:LifeCycleState}' \
  --output json
```

For an illustrative range of `50000` through `50099`, there are only 100 candidate numbers. One hundred distinct occupied values exhaust it even if EFS has ample storage capacity. Compare the returned GIDs against both boundaries; a large total access-point count by itself does not prove this particular range is full.

Inspect the live driver image too:

```bash
kubectl get deployment efs-csi-controller -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="efs-plugin")].image}{"\n"}'
```

Check behavior against that release, especially for large inventories and pagination. Do not assume the newest repository documentation describes an older managed add-on.

## Choose a clean provisioning pool

For new volumes, create a new StorageClass with a reviewed unused range. The example below keeps the existing filesystem but assigns a separate pool; use a new file system instead if access-point capacity or tenant ownership makes sharing unsuitable.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-apps-v2
provisioner: efs.csi.aws.com
reclaimPolicy: Retain
volumeBindingMode: Immediate
mountOptions:
  - tls
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef0
  basePath: /apps-v2
  directoryPerms: "700"
  gidRangeStart: "80000"
  gidRangeEnd: "84999"
  ensureUniqueDirectory: "true"
  reuseAccessPoint: "false"
```

Supply both range parameters. Ensure these identities fit your organization's identity plan and do not overlap a separately managed allocation pool. A larger range does not increase the AWS service's access-point quota. [CSI provisioning parameter requirements](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/parameters.md).

Do not replace the range with one fixed `uid` and `gid` merely to suppress the error. That changes the isolation design by giving multiple access points the same identity. It can be valid for an intentional shared application identity, but it is a separate design decision.

## Move new claims without disturbing bound volumes

Update the workload's desired configuration so future claims name `efs-apps-v2`. Existing bound PVs keep their existing access points and identities; they do not need a data migration just because future allocations use another class.

For a Pending claim, first establish whether it is truly unbound and whether an access point was partially created. StorageClass changes are not a general in-place migration mechanism for existing PVCs. Prefer creating a new claim with the new class and updating the unstarted workload to reference it. Delete the old claim only after checking its PV association and intended retention behavior. [Kubernetes PV and PVC lifecycle](https://kubernetes.io/docs/concepts/storage/persistent-volumes/).

Retained or orphaned access points may explain the exhausted pool. Reconcile each against PVs, other clusters, backup procedures, and owners before deleting it. The absence of a PVC in the current namespace is insufficient evidence that an access point is unused.

## Verify provisioning and the application identity

Create one canary claim using the new class. Require it to become Bound, inspect its PV's `volumeHandle`, and describe the corresponding access point. Its UID/GID should match the new allocation policy and its root should be unique.

Mount the claim in a test pod and write a small file. Inspect its numeric owner and mode through an administrative view. Then watch controller events as normal provisioning resumes. Track remaining identity capacity alongside access-point count so the next failure is detected before tenant claims begin accumulating in Pending.
