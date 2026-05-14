# Validation Summary: How to Configure Flux CD with AWS KMS for SOPS Encryption

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD kustomize-controller
- SOPS
- AWS KMS
- AWS IAM
- Amazon EKS IRSA
- Kubernetes Secrets and Kustomization resources
- kubectl and AWS CLI

## Sources Consulted
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- SOPS official README and configuration documentation: https://github.com/getsops/sops
- SOPS latest release page: https://github.com/getsops/sops/releases/latest
- AWS CLI KMS create-key documentation: https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- Amazon EKS IRSA service account role documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The IAM policy setup comment said the policy allowed encrypt and decrypt operations, but the policy intentionally grants only `kms:Decrypt` and `kms:DescribeKey` for the Flux controller. Updated the comment to match the actual least-privilege policy.
- The EKS `describe-cluster` command omitted `--region us-east-1` even though the OIDC provider ARN and KMS examples use `us-east-1`. Added the region flag so the OIDC issuer lookup is consistent.
- The SOPS Linux installation example used `v3.9.4`, which is no longer the latest stable release. Updated the download command and example SOPS metadata to `v3.12.2`.
- The troubleshooting command tried to run `aws kms describe-key` inside the `kustomize-controller` deployment, but the controller image should not be assumed to include the AWS CLI. Replaced it with a temporary AWS CLI pod using the `kustomize-controller` service account.

## Review Notes
The Flux `decryption.provider: sops` example, the `encrypted_regex: ^(data|stringData)$` SOPS rule, the IRSA trust policy shape, and the AWS KMS symmetric key commands were consistent with official documentation. Future improvements could mention creating the EKS OIDC provider if the cluster does not already have one and could add checksum verification for the downloaded SOPS binary.
