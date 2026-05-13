# Validation Summary: How to Configure Flux with IRSA for KMS SOPS Decryption on EKS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux kustomize-controller
- Kubernetes Kustomization resources
- SOPS
- AWS KMS
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- AWS CLI
- kubectl

## Sources Consulted
- Flux AWS integrations documentation: https://fluxcd.io/flux/integrations/aws/
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Amazon EKS IRSA service account role documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- SOPS official documentation: https://getsops.io/docs/
- AWS CLI `kms create-key` documentation: https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- AWS CLI `kms create-alias` documentation: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/kms/create-alias.html
- AWS CLI `iam create-policy` documentation: https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy.html
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The SOPS encryption command encrypted `secret.yaml` before moving it under `secrets/production/`, but the `.sops.yaml` `path_regex` only matches files under `secrets/`. Changed the workflow to create the target directory, move the file first, and run `sops --encrypt --in-place` on `secrets/production/database-credentials.yaml`.
- Flux documents that when a controller service account annotation is added after bootstrap, the controller pod must be restarted for the projected web identity environment to take effect. Added `kubectl rollout restart deployment/kustomize-controller -n flux-system`.
- The troubleshooting command attempted to run `aws sts get-caller-identity` inside the kustomize-controller container, which should not be assumed to contain the AWS CLI. Replaced it with a temporary AWS CLI pod that uses the `kustomize-controller` service account via a supported `kubectl run --overrides` pod spec.

## Review Notes
The remaining Flux, SOPS, EKS IRSA, IAM trust policy, KMS policy, and AWS CLI examples are consistent with the consulted official documentation. The guide uses controller-level Flux AWS authentication; object-level secret-less authentication is also available in Flux with `.spec.decryption.serviceAccountName`, but that is not required for the approach shown here.
