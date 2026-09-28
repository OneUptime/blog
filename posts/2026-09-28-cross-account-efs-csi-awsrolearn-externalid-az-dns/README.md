# How to Configure Cross-Account EFS CSI Provisioning with `awsRoleArn`, `externalId`, and AZ-Resilient DNS Resolution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, EKS, Kubernetes, CSI Driver, Networking

Description: Configure cross-account EFS CSI provisioning and distinguish controller role assumption from node IAM mounts and Availability Zone DNS selection.

Cross-account EFS has two authorization paths. The CSI controller assumes a role to create and discover storage resources, while the node plugin mounts the resulting access point. Fixing the controller's `AssumeRole` permission does not automatically authorize the node's NFS connection.

This example uses an EKS cluster in account A, EFS in account B, and released EFS CSI driver v3.5.0. Both VPCs need private routing, and nodes must reach account B's mount targets on TCP 2049. Provision mount targets in the physical Availability Zones used by the nodes.

## Separate the two IAM identities

In account B, create a role the controller identity in account A can assume. Use the controller's specific role as the trusted principal and include an external ID condition when that is part of your trust design:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::111122223333:role/EfsCsiController"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {"sts:ExternalId": "cluster-blue-storage"}
    }
  }]
}
```

The controller role in A also needs `sts:AssumeRole` permission for this B role. The B role needs the EFS describe operations plus access-point creation, tagging, and deletion permissions for dynamic provisioning. Preserve the driver's required tag conditions when scoping those permissions; a describe-only role can discover a target but cannot provision an access point.

Separately, authorize the CSI node identity for the required EFS client operations and allow that principal in account B's file-system policy. The example enables `iam` mounting, so the node's actual credential source matters. [Cross-account setup](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/examples/kubernetes/efs/cross_account_mount/README.md).

An external ID is a role-assumption condition, not a substitute for a restricted principal or a secret application credential. Keep the trust policy and provisioner value identical. [IAM external ID guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html).

## Supply the controller's provisioner secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: efs-account-b
  namespace: kube-system
type: Opaque
stringData:
  awsRoleArn: arn:aws:iam::444455556666:role/EfsProvisionFromAccountA
  externalId: cluster-blue-storage
  crossaccount: "true"
```

The driver reads these exact key names. `awsRoleArn` controls its EFS API role assumption; `externalId` is passed to STS; `crossaccount` selects node-side DNS resolution. [Released role configuration code](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/cloud/cloud.go).

Restrict who can edit this secret and the StorageClass referencing it. It influences a privileged infrastructure controller.

## Configure DNS for physical AZ identity

The `crossaccount` helper option matches Availability Zone IDs such as `use1-az1`, because account-specific names such as `us-east-1a` can refer to different physical zones. For each relevant AZ, configure the documented private DNS name to resolve to that AZ's mount target:

```text
use1-az1.fs-0123456789abcdef0.efs.us-east-1.amazonaws.com
```

The EFS utilities instructions describe creating a Route 53 hosted zone for this name and an apex A record for the mount-target IP. Ensure that the private zone is associated with, or otherwise resolvable from, the client VPC. Test resolution from the CSI node environment in every client AZ. [EFS utilities cross-account prerequisites](https://raw.githubusercontent.com/aws/efs-utils/master/README.md).

Peering alone does not create these records. A working record in one AZ also does not establish the mapping for the others.

## Create the DNS-based StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-account-b
provisioner: efs.csi.aws.com
reclaimPolicy: Retain
volumeBindingMode: Immediate
mountOptions:
  - tls
  - iam
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef0
  directoryPerms: "700"
  basePath: /cluster-blue
  csi.storage.k8s.io/provisioner-secret-name: efs-account-b
  csi.storage.k8s.io/provisioner-secret-namespace: kube-system
```

For this mode, leave the StorageClass `az` parameter unset. Do not put `crossaccount` into `mountOptions`; the released driver routes that setting through the secret for dynamic volumes.

Version matters: v3.1.0 introduced default per-node AZ target selection when neither DNS mode nor a pinned `az` is set. Older releases could bake a single selected target into the PV. The default mapping is discovered during provisioning and, in v3.5.0, matches account-specific AZ names rather than AZ IDs, so it does not guarantee the same physical AZ across accounts. DNS mode resolves by AZ ID at mount time. [Default mapping implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/controller.go). Inspect existing PV attributes after an upgrade rather than assuming they were rewritten. [Version history](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/CHANGELOG-3.x.md).

## Verify provisioning, mounts, and recovery separately

Create a canary PVC and inspect its PV:

```bash
kubectl describe pvc cross-account-canary
kubectl get pv CANARY_PV_NAME -o yaml
kubectl logs -n kube-system deployment/efs-csi-controller \
  -c efs-plugin --since=10m
```

Require a Bound claim, the intended file-system/access-point handle, and `crossaccount: "true"` in the provisioned volume attributes. Then run a write/read canary on nodes in each intended AZ. A Pending claim points toward the controller path; a Bound claim with a mount failure points toward node credentials, policy, DNS, or network reachability.

Test rescheduling to a healthy AZ. DNS-based selection helps new mounts use that node's target; it does not move an existing NFS session out of a failed AZ. Application replicas and scheduling must supply the recovery mechanism.

If directory deletion is enabled on the controller, review that third mount path too. The controller needs network and client authorization to mount EFS during cleanup, beyond its access-point API permissions.
