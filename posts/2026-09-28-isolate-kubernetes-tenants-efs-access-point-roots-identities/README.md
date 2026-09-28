# Isolate Kubernetes Tenants with EFS Access Point Roots and POSIX Identities

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, EKS, Kubernetes, Security

Description: Separate Kubernetes tenants with EFS access-point directories and identities, then close the RBAC, IAM, and pod-security paths that can bypass them.

Separate EFS access points can give Kubernetes tenants different filesystem roots and server-enforced POSIX identities. This is useful for sharing storage infrastructure, but a namespace alone does not enforce that boundary. The platform must control who can create volumes, select storage classes, run privileged pods, and mount the file system outside the approved access points.

This example assumes platform-managed EFS CSI installation on Linux worker nodes, an existing reachable EFS file system, and tenants that cannot administer the cluster or its nodes. For hostile workloads requiring stronger isolation, evaluate separate clusters or file systems. AWS describes tenant isolation as a combination of controls rather than a single namespace setting. [EKS tenant isolation guidance](https://docs.aws.amazon.com/eks/latest/best-practices/tenant-isolation.html).

## Give each tenant a root and an identity

An access point can replace the client's UID/GID with a configured identity and expose a subdirectory as the mount root. The directory still needs permissions that allow the enforced identity to traverse and write it. Creating an access point does not fix permissions on a root directory that already exists. [Access-point root directories](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html).

For dynamic provisioning, create a platform-owned StorageClass for tenant blue:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-tenant-blue
provisioner: efs.csi.aws.com
reclaimPolicy: Retain
volumeBindingMode: Immediate
mountOptions:
  - tls
  - iam
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef0
  basePath: /tenants/blue
  subPathPattern: /${.PVC.namespace}/${.PVC.name}
  ensureUniqueDirectory: "true"
  reuseAccessPoint: "false"
  uid: "21000"
  gid: "21000"
  directoryPerms: "700"
```

This assigns one identity to blue's volumes while retaining a distinct directory per claim. Create a corresponding green StorageClass with `/tenants/green` and UID/GID `22000`. Keep path components short enough for EFS access-point path limits; the unique suffix adds to the resulting path length.

The example targets released driver v3.5.0. Its dynamic provisioning applies identity enforcement, and its controller constructs the access-point path from the StorageClass. [Released controller implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/controller.go).

Keep `reuseAccessPoint` disabled across tenants. In this release, reuse keys off the PVC name without including its namespace, so matching names can resolve to shared storage. A tenant-specific directory pattern does not make unrestricted reuse safe. [Released provisioning parameters](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/parameters.md).

## Bind a namespaced claim

After creating the namespace, blue can request its approved class:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: documents
  namespace: tenant-blue
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-tenant-blue
  resources:
    requests:
      storage: 1Gi
```

The storage request is required Kubernetes metadata; it is not an EFS directory quota. Capacity management and cost attribution therefore need separate controls. An access point also does not reserve a share of EFS throughput, so tenants can still compete for the shared file system's performance.

## Close the bypass paths

Do not give tenants permission to create or edit PVs, StorageClasses, CSI provisioner secrets, or platform service accounts. Restrict ordinary claims to the tenant's approved StorageClass using an admission policy. Kubernetes RBAC permission to create PVCs alone does not constrain the `storageClassName` field.

Enforce pod security that blocks host mounts, privileged containers, and node-level access. Otherwise a workload may escape the access-point route and use node privileges to reach broader storage. Review inline volume choices and service-account permissions as part of the same admission boundary.

The `iam` mount option uses the CSI node pod's IAM identity. It does not automatically turn each application's service account into a distinct EFS mount principal. If several tenants share that node identity, design file-system policies and cluster controls around that fact. [CSI mount authentication](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/parameters.md).

Use the file-system policy to require TLS and restrict client access to approved access points and principals. Verify that no other allow grants those principals an unrestricted root mount. Where per-tenant IAM enforcement is required, introduce genuinely separate client identities and scheduling boundaries rather than assuming a namespace supplies them. [EFS access-point IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/access-points-iam-policy.html).

## Test isolation as well as access

Inspect the actual provisioned access points:

```bash
aws efs describe-access-points \
  --file-system-id fs-0123456789abcdef0 \
  --query 'AccessPoints[].{Id:AccessPointId,Root:RootDirectory.Path,User:PosixUser}'
```

Create a marker through blue's mounted claim and verify that green cannot see it through green's mount. Check numeric ownership from an administrative filesystem mount. Test the negative controls too: blue must be unable to request green's class, create a PV referencing green's access point, or launch a privileged host-mounted pod.

Use `Retain` while establishing the policy so accidental PVC deletion does not remove the access point. Document an explicit retirement procedure for the PV, access point, and directory. Isolation remains reliable when creation, ordinary use, and cleanup all follow the same ownership boundary.
