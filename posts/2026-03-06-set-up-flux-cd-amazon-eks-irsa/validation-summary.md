# Validation Summary: How to Set Up Flux CD on Amazon EKS with IRSA

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- AWS IAM
- AWS CLI
- eksctl
- Kubernetes
- Amazon ECR
- Amazon S3
- AWS KMS
- SOPS

## Sources Consulted
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux GitHub bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux AWS CodeCommit bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/aws-codecommit/
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS service account role association documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- eksctl IAM service accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html

## Issues Found
- The prerequisites said EKS version 1.24+, but current Flux documentation lists supported Kubernetes versions by Flux release and no longer documents 1.24 as a supported baseline. Changed the prerequisite to require a Kubernetes version supported by the Flux release being installed.
- The prerequisites required an OIDC provider even though the next step creates one. Clarified that the user needs either an associated OIDC provider or permission to associate one.
- The post described CodeCommit access through IRSA, but current Flux GitRepository provider documentation does not list AWS/CodeCommit IAM as a supported provider. Replaced the CodeCommit policy with an S3 read-only policy, which is a supported Flux AWS integration through Bucket sources.
- The custom ECR policy omitted several read-only ECR actions listed in Flux's AWS integration guidance. Expanded the action list to match the documented ECR read-only access pattern more closely.
- The eksctl example used `--role-name` and `--attach-policy-arn` after the tutorial had already created the IAM role. Changed it to `--attach-role-arn` so eksctl annotates the service account with the existing role.
- The GitHub bootstrap command used `--owner=my-org` together with `--personal`. Current Flux CLI docs define `--personal` for GitHub user accounts, while organization owners should omit it. Removed `--personal` from the organization example.
- The Flux kustomization patch annotated `helm-controller` with a role that was never created and is not needed for the ECR source examples. Removed the undefined helm-controller patch.
- The verification commands tried to execute `env` and `aws` inside the source-controller pod. Flux controller images should not be assumed to include AWS CLI or shell utilities. Replaced this with Kubernetes pod spec inspection for injected AWS environment variables and Flux reconciliation commands for the OCI source.

## Review Notes
The KMS example uses an identity policy for a specific key ARN, which can work when the KMS key policy allows the IAM role to use identity-based permissions. For stricter production setups, Flux's AWS integration guide recommends granting access in the KMS key policy itself.
