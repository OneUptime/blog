# Validation Summary: How to Set Up EKS Secrets Encryption with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Amazon EKS
- AWS KMS
- AWS CLI
- Kubernetes Secrets
- kubectl

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Amazon EKS user guide, default envelope encryption: https://docs.aws.amazon.com/eks/latest/userguide/envelope-encryption.html
- Amazon EKS user guide, encrypt Kubernetes secrets with KMS on existing clusters: https://docs.aws.amazon.com/eks/latest/userguide/enable-kms.html
- Amazon EKS user guide, cluster IAM role: https://docs.aws.amazon.com/eks/latest/userguide/cluster-iam-role.html
- AWS CLI `associate-encryption-config` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/associate-encryption-config.html
- Terraform AWS provider `aws_eks_cluster` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown
- Terraform AWS provider `aws_eks_cluster` implementation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/eks/cluster.go
- Terraform AWS provider `aws_kms_key` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_key.html.markdown

## Issues Found
- The introduction implied that EKS Secrets are simply unencrypted by default. I corrected this to distinguish Kubernetes Secret base64 encoding from EKS behavior, and added the current EKS 1.28+ caveat that default envelope encryption already exists for all Kubernetes API data with an AWS owned key.
- The prerequisites were incomplete for the commands shown later in the post. I added `aws` CLI and `kubectl`, and clarified the KMS permissions required when using a scoped-down key policy.
- The KMS key example used a custom key policy that referenced an undeclared `aws_caller_identity` data source and granted the wrong permissions to the cluster role for this use case. I removed the custom policy and relied on the default KMS key policy, which is the safer accurate baseline for the example.
- Step 3 incorrectly said encryption could not be enabled later through the `aws_eks_cluster` resource. I corrected this to match the current AWS provider behavior, which calls `AssociateEncryptionConfig` when `encryption_config` is added to an existing cluster resource.
- Step 3 omitted the required re-encryption step for existing Secrets after enabling encryption on an existing cluster. I added the `kubectl annotate` command documented by Amazon EKS.
- Step 4 claimed `kubectl describe secret` would verify at-rest encryption and “show kms provider in etcd,” which is not how verification works. I replaced that with a read check through the Kubernetes API and kept `aws eks describe-cluster --query 'cluster.encryptionConfig'` as the real configuration check.
- The conclusion overstated KMS usage by saying each Secret creation or retrieval generates KMS API calls. I corrected this to a more accurate statement about monitoring CloudTrail and KMS usage without claiming per-request KMS calls.

## Review Notes
- For EKS clusters running Kubernetes 1.28 or later, the post is best understood as configuring a customer managed KMS key rather than turning on encryption from scratch, because default envelope encryption is already enabled by Amazon EKS.
- The AWS provider still models the user-managed configuration with `encryption_config { resources = ["secrets"] }`, even though modern EKS default envelope encryption now applies to all Kubernetes API data.
