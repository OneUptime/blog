# Validation Summary: How to Set Up EKS Pod Identity for Fine-Grained AWS IAM Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- EKS Pod Identity
- AWS IAM
- AWS CLI
- Kubernetes service accounts and pods
- Terraform AWS provider
- Python boto3
- Amazon S3, DynamoDB, SQS, Secrets Manager, CloudWatch, and CloudTrail

## Sources Consulted
- Amazon EKS User Guide: Learn how EKS Pod Identity grants pods access to AWS services - https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
- Amazon EKS User Guide: Set up the Amazon EKS Pod Identity Agent - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-agent-setup.html
- Amazon EKS User Guide: Create IAM role with trust policy required by EKS Pod Identity - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-role.html
- Amazon EKS User Guide: Use pod identity with the AWS SDK - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-minimum-sdk.html
- Amazon EKS API Reference: AssumeRoleForPodIdentity - https://docs.aws.amazon.com/eks/latest/APIReference/API_auth_AssumeRoleForPodIdentity.html
- AWS CLI Command Reference: create-pod-identity-association - https://docs.aws.amazon.com/cli/latest/reference/eks/create-pod-identity-association.html
- AWS CLI Command Reference: EKS wait addon-active - https://docs.aws.amazon.com/cli/latest/reference/eks/wait/index.html
- AWS SDKs and Tools Reference Guide: Container credential provider - https://docs.aws.amazon.com/sdkref/latest/guide/feature-container-credentials.html
- Kubernetes kubectl reference: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Amazon EKS User Guide: Monitor cluster data with Amazon CloudWatch - https://docs.aws.amazon.com/eks/latest/userguide/cloudwatch.html
- Terraform AWS provider documentation: aws_eks_pod_identity_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_pod_identity_association

## Issues Found
1. **Outdated cluster prerequisite wording.** The post said Pod Identity requires EKS 1.24+. Current AWS documentation describes support in terms of EKS Kubernetes and platform versions, with Kubernetes 1.28 requiring platform version `eks.4` or later and later listed behavior depending on the support table. Updated the command to check both Kubernetes and platform versions instead of stating a fixed 1.24+ requirement.
2. **Missing node-role prerequisite.** The agent requires node-role permission for `eks-auth:AssumeRoleForPodIdentity`, commonly supplied by `AmazonEKSWorkerNodePolicy`. Added a prerequisite check for the managed node role policy.
3. **S3 SDK example did not match the least-privilege policy.** The Terraform policy grants `s3:ListBucket` and `s3:GetObject` for `my-bucket`, but the Python example called `list_buckets()`, which requires account-level `s3:ListAllMyBuckets`. Changed the example to call `list_objects_v2(Bucket='my-bucket')`.
4. **`kubectl run --serviceaccount` is not present in the current generated kubectl reference.** Replaced it with an `--overrides` example that sets `spec.serviceAccountName`.
5. **Debug curl omitted the required authorization token.** Directly curling `$AWS_CONTAINER_CREDENTIALS_FULL_URI` can fail because EKS sets `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` for the container credential provider. Updated the curl example to send the token file value as the `Authorization` header.
6. **CloudTrail lookup used the less-specific event name.** Pod Identity agent credential retrieval uses the EKS Auth `AssumeRoleForPodIdentity` action. Updated the CloudTrail lookup example to search for that event.
7. **CloudWatch alarm used a non-documented built-in metric.** AWS EKS CloudWatch vended metrics documentation does not list an `AWS/EKS` metric named `PodIdentityErrors`. Changed the text and Terraform snippet to describe a custom metric published from agent logs or observability tooling under `Custom/EKS`.

## Review Notes
The hardcoded add-on version `v1.0.0-eksbuild.1` is still shown in AWS setup documentation as an example, but production IaC should usually select a compatible add-on version from `describe-addon-versions` or a Terraform add-on-version data source.
