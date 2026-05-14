# Validation Summary: How to Configure OCIRepository with AWS ECR in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- OCIRepository
- AWS Elastic Container Registry (ECR)
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- AWS CLI
- eksctl
- Kubernetes CronJob, Secret, ServiceAccount, Role, and RoleBinding
- kubectl

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux AWS integration documentation: https://v2-6.docs.fluxcd.io/flux/integrations/aws/
- Flux `push artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux v2.6 release notes for OCIRepository v1: https://fluxcd.io/blog/2025/05/flux-v2.6.0/
- Amazon ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI Docker image documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-docker.html
- eksctl IRSA documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The prerequisites said Flux CD v0.35 or later, but the examples use `apiVersion: source.toolkit.fluxcd.io/v1` for `OCIRepository`. Flux v2.6 introduced the OCIRepository v1 API, so the prerequisite was updated to Flux CD v2.6 or later.
- The `eksctl create iamserviceaccount` comment told readers to replace `OIDC_ID` and `REGION`, but those placeholders were not used in the command. The comment was corrected to mention only `ACCOUNT_ID` and `my-cluster`.
- The static credential refresh CronJob referenced a `ServiceAccount` that was never created, lacked RBAC permissions to update the Docker registry Secret, and used an AWS CLI image while running `kubectl`. The example now creates the ServiceAccount, Role, and RoleBinding; uses the official AWS CLI image to fetch the ECR token; and uses a kubectl image to update the Kubernetes Secret.
- The static credential refresh path did not show how the CronJob receives AWS credentials. The setup now creates an `ecr-token-refresh-aws` Secret with the AWS environment variables used by the AWS CLI container.
- The `flux push artifact --revision` example used `main/<sha>`, but Flux documents the revision format as `<branch|tag>@sha1:<commit-sha>`. The command now uses `$(git branch --show-current)@sha1:$(git rev-parse HEAD)`.

## Review Notes
The IRSA-based `provider: aws` approach is technically correct for EKS and remains the preferred method. The static token-refresh approach is workable but less secure and more operationally fragile than IRSA, EKS Pod Identity, or another workload identity mechanism.
