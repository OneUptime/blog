# Validation Summary: How to Build AWS EKS Add-ons Management

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Amazon EKS
- EKS managed add-ons
- eksctl
- AWS CLI
- Kubernetes
- CoreDNS
- kube-proxy
- Amazon VPC CNI
- Amazon EBS CSI driver
- IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- AWS CLI `create-addon` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-addon.html
- AWS CLI `update-addon` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-addon.html
- AWS CLI `describe-addon-versions` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html
- eksctl add-ons documentation: https://docs.aws.amazon.com/eks/latest/eksctl/addons.html
- eksctl installation documentation: https://docs.aws.amazon.com/eks/latest/eksctl/installation.html
- Current eksctl CLI help for `create addon`, `update addon`, `get addon`, and `delete addon`
- Amazon EKS kube-proxy documentation: https://docs.aws.amazon.com/eks/latest/userguide/managing-kube-proxy.html
- Amazon EKS IPVS best practices: https://docs.aws.amazon.com/eks/latest/best-practices/ipvs.html
- Amazon EKS CoreDNS documentation: https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html
- Amazon EKS VPC CNI IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/cni-iam-role.html
- Amazon EKS VPC CNI add-on creation documentation: https://docs.aws.amazon.com/eks/latest/userguide/vpc-add-on-create.html
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- IAM `PassRole` documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html

## Issues Found
- The eksctl installation command used the old `weaveworks/eksctl` release URL and hard-coded `amd64` inline. Updated it to the current official `eksctl-io/eksctl` release URL with the platform variable pattern from the eksctl installation docs.
- The IAM permissions example omitted permissions needed by the shown workflows, including describing cluster/update/configuration information and passing service account roles to EKS. Added the missing EKS actions and `iam:PassRole`, and clarified that `eksctl create iamserviceaccount` needs additional IAM and CloudFormation permissions.
- The eksctl `--force` example was described as overwriting custom config. Current eksctl help says `--force` force-migrates an existing self-managed add-on to an EKS managed add-on, so the comment was corrected.
- The VPC CNI IRSA command could fail when the `aws-node` service account already exists and did not set an explicit role name. Added `--role-name AmazonEKSVPCCNIRole` and `--override-existing-serviceaccounts`, matching the Amazon EKS VPC CNI IRSA guidance.
- The EBS CSI IRSA command created/annotated a service account directly and used the older `AmazonEBSCSIDriverPolicy`. For the EKS add-on workflow, AWS documents creating a role only because the add-on creates and uses `ebs-csi-controller-sa`; updated the command to use `--role-only`, an explicit role name, and `AmazonEBSCSIDriverPolicyV2`.
- The CI/CD script selected `addons[0].addonVersions[0]` as "latest", which is not a reliable or documented way to choose the version to deploy. Changed the script to select the default compatible version from `compatibilities[].defaultVersion` and updated the wording accordingly.

## Review Notes
- Several pinned example versions target Kubernetes 1.29 and are no longer the latest EKS add-on versions as of this review date. They remain syntactically valid examples, but readers should run `describe-addon-versions` for their own cluster version before using them.
- AWS now recommends EKS Pod Identity for add-on IAM permissions where supported, while IRSA remains supported. The post's IRSA examples are still valid.
