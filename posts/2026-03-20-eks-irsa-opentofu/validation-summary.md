# Validation Summary: How to Set Up EKS IRSA (IAM Roles for Service Accounts) with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- OpenID Connect (OIDC)
- Kubernetes
- Amazon S3

## Sources Consulted
- Amazon EKS User Guide: IAM roles for service accounts — https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS User Guide: Assign IAM roles to Kubernetes service accounts — https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS Best Practices Guide: Identity and Access Management — https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- AWS IAM User Guide: Create an OpenID Connect (OIDC) identity provider in IAM — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS IAM User Guide: Obtain the thumbprint for an OpenID Connect identity provider — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS provider docs: `aws_eks_cluster` data source — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster.html
- Kubernetes provider docs: `kubernetes_job_v1` resource — https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/job_v1
- Kubernetes documentation: Jobs — https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes documentation: Run a Stateless Application Using a Deployment — https://kubernetes.io/docs/tasks/run-application/run-stateless-application-deployment/
- OpenTofu CLI docs — https://opentofu.org/docs/cli/commands/
- OpenTofu `init` command docs — https://opentofu.org/docs/v1.11/cli/commands/init/

## Issues Found
- The Step 1 snippets referenced `aws_eks_cluster.main` without defining it, which did not match the post's prerequisite of using an existing EKS cluster. I changed the example to use `data "aws_eks_cluster" "main"` so the OIDC issuer lookup works against an existing cluster.
- The Step 4 example used a `kubernetes_deployment` to run `aws s3 ls`. That command is a run-to-completion task, so a Deployment would keep restarting completed containers instead of behaving like a one-off validation workload. I replaced it with `kubernetes_job_v1`, added `restart_policy = "Never"`, and made the `aws` command explicit.
- The introduction and conclusion overstated IRSA's isolation guarantees. AWS documents that pods may still reach node-role credentials if IMDS access is not restricted, and that containers are not a hard security boundary. I updated the wording to reflect that caveat.

## Review Notes
- IRSA remains a valid and supported approach for EKS workloads. AWS also now offers EKS Pod Identity as an alternative for some use cases, but that does not make the post outdated.
- The examples assume the AWS and Kubernetes providers, along with variables such as `cluster_name`, `namespace`, and `data_bucket`, are defined elsewhere in the OpenTofu configuration.
