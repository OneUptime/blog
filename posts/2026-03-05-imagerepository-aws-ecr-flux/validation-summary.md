# Validation Summary: How to Configure ImageRepository for AWS ECR in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD image-reflector-controller
- Flux ImageRepository API
- AWS Elastic Container Registry
- Amazon EKS IAM Roles for Service Accounts
- eksctl
- AWS CLI
- Kubernetes Secrets, RBAC, and CronJobs

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux AWS integration documentation: https://v2-6.docs.fluxcd.io/flux/integrations/aws/
- Amazon ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon EKS OIDC provider documentation: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- eksctl IAM service accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Alpine Linux aws-cli package for v3.22: https://pkgs.alpinelinux.org/package/v3.22/community/x86_64/aws-cli
- Alpine Linux kubectl package for v3.22: https://pkgs.alpinelinux.org/package/v3.22/community/x86_64/kubectl

## Issues Found
- The CronJob example used `amazon/aws-cli:latest` but then called `kubectl`; the AWS CLI image does not provide Kubernetes tooling. Updated the example to use `alpine:3.22` and install both `aws-cli` and `kubectl` with `apk`.
- The CronJob referenced `serviceAccountName: ecr-token-refresh` without defining the ServiceAccount or granting permissions to create/update the `ecr-credentials` Secret. Added the required ServiceAccount, Role, and RoleBinding.
- The refresh workflow deleted and recreated the Secret, which can create a short window where the Secret does not exist. Updated the command to render the docker-registry Secret with `--dry-run=client -o yaml` and apply it.
- The static-token automation section did not state that the CronJob itself needs AWS credentials to call `aws ecr get-login-password`. Added a sentence describing acceptable credential sources.

## Review Notes
The main Flux examples use the current `image.toolkit.fluxcd.io/v1` ImageRepository API and valid `provider: aws` and `secretRef` fields. AWS documents ECR authorization tokens as valid for 12 hours, and Flux documents the `aws` provider as supporting ECR authentication through EKS worker node IAM roles or IRSA. The IAM policy shown is broader than the minimum needed for tag scanning but aligns with ECR read-only access patterns; the AWS-managed `AmazonEC2ContainerRegistryReadOnly` policy is also documented by Flux as the recommended single-tenant option.
