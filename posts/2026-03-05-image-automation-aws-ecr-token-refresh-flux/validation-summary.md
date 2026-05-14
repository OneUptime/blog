# Validation Summary: How to Configure Image Automation with AWS ECR Token Refresh in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD image-reflector-controller and image-automation-controller
- Flux ImageRepository and ImagePolicy resources
- Kubernetes CronJob, ServiceAccount, Role, RoleBinding, and Secret resources
- kubectl and flux CLI commands
- AWS Elastic Container Registry (ECR)
- AWS IAM and IAM Roles for Service Accounts (IRSA)
- eksctl

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux CLI documentation for image repositories: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Amazon ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI ECR get-authorization-token command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-authorization-token.html
- Amazon EKS eksctl IRSA documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Amazon EKS kubectl setup documentation: https://docs.aws.amazon.com/eks/latest/userguide/install-kubectl.html
- Kubernetes kubectl command reference for docker-registry and generic secrets: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The CronJob used `amazon/aws-cli:2.15.0` but the script also called `kubectl`. That container provides `aws` but not `kubectl`, so the job would fail when creating or applying the secret. Changed the example to use an image that includes both `aws` and `kubectl`.
- The IRSA instructions omitted the required EKS IAM OIDC provider association step for clusters where it has not already been enabled. Added the `eksctl utils associate-iam-oidc-provider` command before creating the IAM service account.
- The IRSA section only restarted the controller after creating the service account association. Because Flux manages the controller service account from Git, the annotation should be persisted in the Flux bootstrap repository. Added the Kustomize patch for the `image-reflector-controller` ServiceAccount and then kept the rollout restart.
- The Flux ServiceAccount annotation example used a concrete role ARN, but the `eksctl create iamserviceaccount` command did not specify a deterministic role name. Added `--role-name flux-ecr-readonly` so the command and annotation example are consistent.

## Review Notes
- The ECR token expiration claim is correct: ECR authorization tokens are valid for 12 hours.
- The Flux `provider: aws` usage is correct for ECR authentication through EKS worker node IAM roles or IRSA.
- The `ImageRepository`, `ImagePolicy`, Kubernetes CronJob, RBAC, and secret examples use current API versions and valid field names.
- For production hardening, the CronJob image should be pinned by digest or replaced with an internally maintained image containing the required CLI tools.
