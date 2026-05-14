# Validation Summary: How to Configure Flux CD with Amazon ECR for Image Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Amazon ECR
- Amazon EKS
- IRSA
- Kubernetes RBAC, ServiceAccounts, CronJobs, and Secrets
- AWS IAM and AWS CLI
- GitOps image update automation

## Sources Consulted
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux v2.0 credential sync guide for ECR token refresh pattern: https://v2-0.docs.fluxcd.io/flux/guides/cron-job-image-auth/
- AWS ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS managed policy reference for AmazonEC2ContainerRegistryReadOnly: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEC2ContainerRegistryReadOnly.html
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html

## Issues Found
- The GitHub bootstrap command enabled the image automation controllers but did not configure Git write access. Added `--read-write-key`, matching Flux's image update guide for SSH deploy-key based GitHub bootstrap.
- The service account patch annotated `image-automation-controller` with an undefined AWS IAM role for "Git write access." That is misleading for the GitHub-based example, where Git write access comes from the GitRepository credentials/deploy key, not IRSA. Removed that patch and kept the IRSA annotation scoped to `image-reflector-controller` for ECR access.
- The ImagePolicy verification command read `.status.latestImage`, which is deprecated in current Flux APIs. Updated the JSONPath to use `.status.latestRef.image` and `.status.latestRef.tag`.
- The ECR token refresh CronJob example was incomplete for static registry-secret authentication: it did not show `provider: generic` with `secretRef`, omitted RBAC for updating the Secret, and used an image that does not provide `kubectl` for the Secret update. Added the `ImageRepository` static-secret example and expanded the CronJob manifest with ServiceAccount, Role, RoleBinding, token handoff, and a Flux CLI container for `kubectl`.

## Review Notes
- The main IRSA-based `provider: aws` flow is technically current and preferred for EKS when the image-reflector-controller service account is bound to an ECR read role.
- The custom IAM policy is broadly consistent with ECR read-only access. AWS also provides the managed `AmazonEC2ContainerRegistryReadOnly` policy, which Flux documentation explicitly notes can be attached for IRSA-based ECR access.
- The fallback CronJob pattern is based on an archived Flux v2.0 guide; for new EKS setups, the post correctly positions IRSA as the simpler approach.
