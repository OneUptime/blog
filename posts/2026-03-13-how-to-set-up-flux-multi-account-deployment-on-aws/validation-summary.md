# Validation Summary: How to Set Up Flux Multi-Account Deployment on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Kustomize
- AWS EKS
- AWS IAM and IRSA
- Amazon ECR
- GitHub Actions

## Sources Consulted
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Amazon EKS eksctl IRSA documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Amazon EKS cross-account IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/cross-account-access.html
- Amazon ECR private repository policy documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html
- GitHub Actions runner images documentation: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md

## Issues Found
- The architecture overview said the AWS management account hosts the Git repository, but the tutorial uses GitHub bootstrap. Changed the wording so the management account owns shared AWS resources and CI/CD instead.
- The repository tree omitted the top-level `apps/dev`, `apps/staging`, and `apps/production` paths later referenced by Flux Kustomizations and the GitHub Actions workflow. Added those directories to the tree.
- The cross-account ECR setup used a management-account IAM role and a target-account `sts:AssumeRole` policy, but the Flux `OCIRepository` example did not configure role chaining. Replaced this with an ECR repository policy granting the target account IRSA roles access, plus a target-account IRSA role using `AmazonEC2ContainerRegistryReadOnly`.
- The IRSA setup did not include associating the cluster IAM OIDC provider. Added the `eksctl utils associate-iam-oidc-provider` command.
- The production Flux Kustomization set both `wait: true` and `healthChecks`; Flux ignores explicit `healthChecks` when `wait` is enabled. Removed `wait: true` from that production example.
- The ECR section described pulling images, but `OCIRepository` pulls OCI artifacts such as Helm charts for Flux source-controller. Updated the heading and explanation to avoid conflating Flux source artifact access with Kubernetes workload image pulls.
- The Flux notification example used `notification.toolkit.fluxcd.io/v1` for Provider and Alert, but current Provider and Alert APIs are `v1beta3`. Updated both manifests.
- The notification Alert used deprecated `.spec.summary`. Replaced it with `.spec.eventMetadata.summary`.
- The troubleshooting command tested an assume-role flow that was removed. Replaced it with an ECR repository policy verification command.

## Review Notes
The examples remain illustrative and use placeholder account IDs, repository names, and cluster names. The ECR access pattern shown is appropriate for Flux `OCIRepository` artifacts; workload image pulls from cross-account ECR would require permissions for the workload/node identity separately.
