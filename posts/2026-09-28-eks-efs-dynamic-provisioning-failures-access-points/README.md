# Diagnose EKS EFS Provisioning: StorageClasses, Access Points, and POSIX IDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, EKS, Kubernetes

Description: Follow an EFS PVC from StorageClass selection through controller IAM, access-point creation, POSIX identity assignment, and node mounting.

EFS dynamic provisioning creates access points inside an existing filesystem. It does not create a new EFS filesystem for each PVC, and a requested capacity such as `1Gi` does not establish a per-claim EFS storage quota. Those distinctions help explain why a PVC can remain `Pending` even when the filesystem has abundant storage. [EFS CSI provisioning model](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/README.md)

This workflow assumes an EKS cluster using EC2 worker nodes and a supported EFS CSI driver. EKS does not support EFS dynamic provisioning for Fargate nodes; use the documented static approach for that environment. [EKS storage support](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html)

## Start with the claim's events

```bash
kubectl -n reports describe pvc report-data
kubectl -n reports get pvc report-data -o yaml
kubectl get storageclass efs-apps -o yaml
```

Record `storageClassName`, access modes, requested capacity, and the event reporting the provisioning failure. If `storageClassName` was omitted, confirm whether the cluster selected a default class. An explicit `storageClassName: ""` disables default-class selection and dynamic provisioning. A typo or a different provisioner can send the request somewhere entirely unrelated to EFS.

For a deliberately simple diagnostic class:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-apps
provisioner: efs.csi.aws.com
reclaimPolicy: Retain
volumeBindingMode: Immediate
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef0
  directoryPerms: "750"
  gidRangeStart: "50000"
  gidRangeEnd: "50999"
  basePath: "/kubernetes"
```

Create a new class for a controlled test rather than editing the semantics of existing claims. `Retain` deliberately leaves storage recovery and cleanup to an operator during the investigation; choose a production reclaim policy according to your data lifecycle.

## Inspect the controller operation

```bash
kubectl -n kube-system logs deployment/efs-csi-controller \
  -c efs-plugin --since=30m
kubectl -n kube-system logs deployment/efs-csi-controller \
  -c csi-provisioner --since=30m
```

The provisioner sidecar handles Kubernetes requests; the plugin performs EFS operations. Correlate the claim's UID and event time with both. For replicated controllers, inspect the active leader's pod when the deployment shortcut does not show the relevant request.

Classify the failure before changing anything:

| Evidence | Likely investigation |
| --- | --- |
| No matching StorageClass or provisioner | Kubernetes object selection |
| Credential or STS error | Controller identity, trust, and credential delivery |
| `AccessDenied` on EFS API | Controller IAM permissions and tag conditions |
| Filesystem not found | Region, account, and filesystem ID |
| No available GID | Configured allocation range and existing access points |
| EFS quota or throttling error | Actual service response, quotas, and request volume |

The controller needs management-plane permissions such as creating and describing access points. Those differ from the NFS client permissions used when a node mounts the resulting volume. Verify the role associated with the controller service account through EKS Pod Identity or IRSA, using the installation mechanism you selected. [EFS CSI IAM setup](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html)

## Compare the created access point with the class

```bash
aws efs describe-access-points \
  --file-system-id fs-0123456789abcdef0 \
  --query 'AccessPoints[].{Id:AccessPointId,State:LifeCycleState,User:PosixUser,Root:RootDirectory,Tags:Tags}'
```

For the matching access point, compare the root path, creation mode, and assigned numeric identity with the intended class. The dynamic provisioner configures the access-point identity, and EFS enforces it on file operations through that access point. Changing a pod's `runAsUser` therefore does not override the UID/GID enforced by EFS. [Dynamic provisioning parameters](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/parameters.md)

If using a custom GID range, specify both endpoints and size it for the expected allocation count. Do not delete live access points to free IDs without mapping them back to bound PVs and workloads. If you choose explicit UID/GID values, understand that sharing identities can weaken isolation between application directories.

Existing directories preserve their existing mode and owner. `directoryPerms` is a creation setting, so repeated provisioning against a reused path does not guarantee repaired permissions. [EFS root-directory creation semantics](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)

## Follow the transition to node mounting

Once the PVC is `Bound`, inspect the resulting PV and start a small pod using it. A subsequent `FailedMount` is a new stage: investigate the node plugin, target DNS, network access, and file-system policy. Repeatedly recreating the PVC after provisioning succeeds can create unnecessary access points and obscure this distinction.

Complete the test by creating a unique file, reading it from a second authorized pod, and checking its numeric ownership. Confirm the result matches the intended access-point identity. Record the installed driver version and consult that release's parameter documentation; the upstream `master` branch can document features absent from the version installed in your cluster.
