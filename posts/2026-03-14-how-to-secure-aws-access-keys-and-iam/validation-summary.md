# Validation Summary: Securing AWS Access Keys and IAM Roles in Cilium

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- AWS IAM
- IAM Roles for Service Accounts (IRSA)
- AWS EC2 ENI IPAM
- AWS CloudTrail
- kubectl
- eksctl
- AWS CLI

## Sources Consulted
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium operator documentation: https://docs.cilium.io/en/stable/internals/cilium_operator/
- Amazon EKS identity and access management best practices: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- eksctl IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS CloudTrail lookup-events documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-cli.html
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart

## Issues Found
- The post assigned the IRSA role to the `cilium` service account and restarted the `cilium` DaemonSet. Cilium's AWS ENI allocation is performed by the Cilium operator, so the role should be scoped to the `cilium-operator` service account and the `cilium-operator` Deployment should be restarted.
- The IRSA trust policy omitted the `aud` condition. Added `oidc.eks.us-east-1.amazonaws.com/id/ABCDEF:aud = sts.amazonaws.com`, matching EKS best practice for scoped IRSA trust policies.
- The sample IAM policy omitted Cilium ENI permissions documented as required or conditionally required for common defaults, including `DescribeRouteTables`, `ModifyNetworkInterfaceAttribute`, `CreateTags`, and `DescribeTags`. Added these actions to the least-privilege example.
- The migration commands attached `CiliumMinimalPolicy` without creating it. Added an `aws iam create-policy` step and clarified that the JSON policy should be saved as `cilium-eni-policy.json`.
- The CloudTrail example filtered on `Username=cilium-eni-role`, which is not a reliable way to find IRSA role assumption activity. Changed the lookup to `EventName=AssumeRoleWithWebIdentity`.
- The verification command assumed the Cilium pod had the AWS CLI installed. Replaced it with a disposable `amazon/aws-cli:2` pod using the `cilium-operator` service account.

## Review Notes
- The old static credential secret name `aws-creds` is deployment-specific; users should confirm the actual secret name in their cluster before deleting it.
- `DescribeInstances` is only required by Cilium when `--instance-tags-filter` is used, and `UnassignPrivateIpAddresses` is needed when release-excess-IP behavior is enabled. Keeping them in the example is reasonable for the post's practical least-privilege baseline, but very strict deployments can remove unused conditional permissions.
