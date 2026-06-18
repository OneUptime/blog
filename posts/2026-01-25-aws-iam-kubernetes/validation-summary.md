# Validation Summary: How to Configure AWS IAM for Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS IAM
- Amazon EKS
- Kubernetes service accounts and projected tokens
- IAM Roles for Service Accounts (IRSA)
- EKS Pod Identity
- AWS STS
- AWS CLI
- eksctl
- Terraform AWS provider
- CloudTrail and CloudWatch
- Python boto3

## Sources Consulted
- Amazon EKS: IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS: Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS: Configure Pods to use a Kubernetes service account: https://docs.aws.amazon.com/eks/latest/userguide/pod-configuration.html
- Amazon EKS: Configure the AWS STS endpoint for a service account: https://docs.aws.amazon.com/eks/latest/userguide/configure-sts-endpoint.html
- Amazon EKS: EKS Pod Identities: https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
- Amazon EKS: Set up the EKS Pod Identity Agent: https://docs.aws.amazon.com/eks/latest/userguide/pod-id-agent-setup.html
- AWS CLI: create-pod-identity-association: https://docs.aws.amazon.com/cli/latest/reference/eks/create-pod-identity-association.html
- AWS CLI: create-addon: https://docs.aws.amazon.com/cli/latest/reference/eks/create-addon.html
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS IAM: Logging IAM and AWS STS API calls with CloudTrail: https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html
- Amazon CloudWatch usage metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Usage-Metrics.html
- Terraform AWS provider: aws_iam_openid_connect_provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Terraform AWS provider: aws_eks_pod_identity_association: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_pod_identity_association
- Terraform AWS provider: aws_cloudwatch_log_metric_filter: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Kubernetes projected volumes: https://kubernetes.io/docs/concepts/storage/projected-volumes/

## Issues Found
- The examples used EKS Kubernetes version 1.28 and the prerequisites said EKS v1.21+. Those versions are not appropriate as current examples in 2026 because EKS versions have a fixed standard and extended support lifecycle. Updated the prerequisite to require a supported EKS cluster version and changed example cluster versions to 1.34.
- The Terraform IAM role example referenced `data.aws_caller_identity.current.account_id` without declaring the data source. Added `data "aws_caller_identity" "current" {}`.
- The S3 IAM policy combined bucket-level `s3:ListBucket` and object-level S3 actions in one statement across both bucket and object ARNs. Split the policy into separate bucket and object statements so each action has the correct resource type.
- The EKS Pod Identity CLI example created the association before installing the agent and associated a role with an IRSA trust policy. Reordered the commands, removed the stale hard-coded add-on version pin, and changed the role ARN to the Pod Identity role.
- The Terraform EKS Pod Identity association referenced the IRSA role instead of the role trusted by `pods.eks.amazonaws.com`. Updated the association to use `aws_iam_role.pod_identity_role.arn`.
- The secure deployment example disabled `automountServiceAccountToken` and then manually mounted a token at the IRSA webhook path without setting the required IRSA environment variables. Removed the manual token override so the EKS webhook can inject the expected token mount and environment variables for annotated service accounts.
- The CloudWatch alarm used a non-existent `AWS/STS` `CallCount` metric with an `ErrorCode` dimension for STS access-denied failures. Replaced it with a CloudWatch Logs metric filter over CloudTrail events and an alarm on the custom metric.

## Review Notes
The IRSA architecture, service account annotation, STS regional endpoint annotation, trust policy condition keys, `eksctl create iamserviceaccount` flow, AWS CLI verification commands, cross-account role chaining pattern, and boto3 `assume_role` usage are technically sound. The Terraform snippets remain illustrative and still assume surrounding resources such as cluster IAM roles, VPC subnet variables, CloudTrail bucket policy, and CloudTrail logging role are defined elsewhere.
