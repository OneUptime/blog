# Validation Summary: Securing AWS Secrets in Cilium Network Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium AWS ENI IPAM
- Kubernetes and RBAC
- Amazon EKS IRSA
- AWS IAM policies
- Helm
- kubectl
- eksctl

## Sources Consulted
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Helm chart templates and values for v1.19.3: https://helm.cilium.io/cilium-1.19.3.tgz
- Amazon EKS eksctl IRSA documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Amazon EKS service account role documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- AWS EC2 IAM actions, resources, and condition keys: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS CLI iam create-policy documentation: https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy.html
- Kubernetes kubectl create secret generic documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Helm upgrade documentation: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The post said Cilium generally needs AWS credentials in ENI IPAM mode. Updated this to specify that the Cilium operator is the component that needs AWS credentials for ENI allocation.
- The IRSA example created and annotated the `cilium` service account with a generic `serviceAccount` Helm value. Updated it to target the `cilium-operator` service account and use Cilium's `eni.iamRole` Helm value, which annotates the operator service account when ENI mode is enabled.
- The IAM policy omitted documented Cilium ENI permissions including `DescribeRouteTables`, `CreateTags`, `DescribeTags`, and `DescribeInstanceTypes`. Added the missing actions and removed an overly broad VPC condition example that could incorrectly deny required EC2 calls.
- The static credential example used `aws-creds`, but the Cilium Helm chart reads the `cilium-aws` secret for `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_DEFAULT_REGION` when `eni.iamRole` is not set. Updated the secret name and keys.
- The RBAC example created only a Role, so it did not grant access to any subject. Added a RoleBinding for the `cilium-operator` service account.
- The IRSA verification command tried to run `aws sts get-caller-identity` inside the Cilium pod, which is not reliable because Cilium images do not provide the AWS CLI. Replaced it with service account annotation verification and a temporary `amazon/aws-cli:2` pod using the same service account.
- The credential log check targeted Cilium agent pods. Updated it to check the Cilium operator deployment, where ENI AWS credential errors surface.

## Review Notes
The IAM policy remains action-scoped with `Resource: "*"`, which matches the practical shape of many EC2 ENI permissions. Future hardening can add subnet, security group, tag, and VPC conditions only for actions where AWS documents those condition keys as supported.
