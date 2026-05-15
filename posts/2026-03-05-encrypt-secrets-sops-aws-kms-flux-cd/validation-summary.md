# Validation Summary: How to Encrypt Secrets with SOPS and AWS KMS for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization and kustomize-controller SOPS decryption
- SOPS
- AWS KMS
- AWS IAM and IRSA
- Amazon EKS / eksctl
- Kubernetes Secrets
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux AWS integrations documentation: https://fluxcd.io/flux/integrations/aws/
- SOPS official documentation: https://github.com/getsops/sops
- AWS CLI `kms create-key` command reference: https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- AWS / eksctl IAM service account documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html

## Issues Found
- The `.sops.yaml` example used `path_regex: .*\.enc\.yaml$` while the simplified command was `sops --encrypt secret.yaml > secret.enc.yaml`. SOPS creation rules match the filename known to SOPS during encryption, which in this command is `secret.yaml`, not the redirected output filename. Changed the rule to `path_regex: .*\.yaml$` so the documented command can select the AWS KMS creation rule.

## Review Notes
- The Flux `Kustomization` `decryption.provider: sops` and optional `decryption.secretRef.name` fields are current and correct.
- Flux documentation confirms that AWS KMS with controller-level EKS OIDC/IRSA authentication does not require a SOPS credentials `secretRef`; when using IAM user access keys, the Kubernetes Secret key must be `sops.aws-kms`, which the post uses.
- AWS KMS `create-key` options `--key-usage ENCRYPT_DECRYPT` and `--key-spec SYMMETRIC_DEFAULT` are valid, although both are the defaults for a symmetric encryption KMS key.
- The IAM decrypt policy uses the minimum permissions Flux documents for AWS KMS decryption: `kms:Decrypt` and `kms:DescribeKey`.
