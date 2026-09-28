# Validation Summary: Debug EKS EFS CSI Exit Status 32: Node Plugin, Watchdog, and efs-utils

## Status

validated

## Post Type

Technical troubleshooting guide with Kubernetes and AWS CLI commands.

## Technologies Covered

- Amazon EKS on EC2 and AWS Fargate
- Amazon EFS, mount targets, and access points
- AWS EFS CSI driver, node DaemonSet, and controller provisioning
- Kubernetes pods, PersistentVolumes, PersistentVolumeClaims, and kubectl
- Linux NFS mounts, `efs-utils`, and mount watchdog supervision
- AWS IAM, filesystem policies, VPC networking, DNS, and security groups
- EKS managed add-ons and Helm installations

## Sources Consulted

- [Amazon EKS: EFS storage considerations and installation](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html) — Fargate static provisioning, managed mounts, and avoiding overlapping driver installations.
- [EFS CSI driver overview](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/README.md) — provisioning, volume handles, bundled helpers, and worker-node installation guidance.
- [EFS CSI driver parameters](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/parameters.md) — mount options, node identity for IAM authentication, and mount resource pressure.
- [EFS CSI node DaemonSet manifest](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/deploy/kubernetes/base/node-daemonset.yaml) — container names, host networking, and node deployment structure.
- [Upstream watchdog incident #637](https://github.com/kubernetes-sigs/aws-efs-csi-driver/issues/637) and [the original reporter’s resolution](https://github.com/kubernetes-sigs/aws-efs-csi-driver/issues/637#issuecomment-1059715668) — failed mount output and mount-target security-group correction. Comments were retrieved through the GitHub API because the rendered issue page omitted them.
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) — provisioning, claim binding, CSI volumes, and mount options.
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — container selection, relative time filtering, and previous-container logs.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — resource queries and output formats.
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/) — namespaced pod inspection.
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/) — array wildcard and field-selection syntax.
- [AWS CLI: eks describe-addon](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon.html) — command syntax and required arguments.
- [Amazon EFS: Troubleshooting mount issues](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html) — DNS, timeout, helper, and access-denied failures.
- [Amazon EFS: Mounting with a DNS name](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html) — mount-target DNS and Availability Zone requirements.
- [Amazon EFS: VPC security groups](https://docs.aws.amazon.com/efs/latest/ug/network-access.html) — node outbound and mount-target inbound TCP 2049 connectivity.
- [Amazon EFS: IAM access control](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html) — client identity and filesystem-policy evaluation.
- [Amazon EFS: Access-point root directories](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html) — root-directory creation and permission requirements.
- [Linux mount(8) manual](https://man7.org/linux/man-pages/man8/mount.8.html) — exit status 32 denotes mount failure.

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- All three Bash command blocks were checked for shell syntax. The documented `kubectl` resource queries, namespace flag, `-o wide`, `-c efs-plugin`, `--since=30m`, and `--previous` usage are valid. The DaemonSet JSONPath correctly selects all container images. The AWS command supplies both required `describe-addon` arguments.
- Example names such as `reports`, `worker-0`, `production`, and `efs-csi-node-EXAMPLE` require the reader’s actual resources and configured cluster/AWS access. The abbreviated inline `kubectl logs ... --previous` is contextual shorthand for the preceding full command.
- The distinction between a provisioning failure and a node mount failure is appropriate. A bound claim or successfully created access point does not establish NFS connectivity.
- The watchdog incident supports the post’s limited claim: the warning can accompany a separate network failure. It does not establish that every watchdog warning has the same cause.
- The network and identity advice is consistent with the node plugin’s mounting context. Application-pod DNS tests and application service-account credentials do not establish the node plugin’s connectivity or effective mount identity.
- The PV fields discussed correspond to `spec.csi.volumeHandle`, `spec.csi.volumeAttributes`, and `spec.mountOptions`. The common access-point handle remains appropriate; the post correctly defers to the installed release for exact formatting.
- No deprecated command flags or explicitly outdated version claims were found. Upstream `master` documentation can contain changes beyond an installed release, so the post’s release-compatibility caveat remains relevant.
- Technical reference links resolve to the intended documentation or upstream incident. Review was based on documentation, upstream manifests, and shell syntax checks; no live EKS cluster, EFS mount, IAM authorization, or fleet rollout was exercised.
