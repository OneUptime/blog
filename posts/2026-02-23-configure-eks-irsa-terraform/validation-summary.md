# Validation Summary: How to Configure EKS IRSA (IAM Roles for Service Accounts) in Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- AWS IAM and STS
- OpenID Connect (OIDC)
- Terraform
- HashiCorp AWS, Kubernetes, and TLS providers
- Kubernetes service accounts and deployments
- AWS Load Balancer Controller
- IAM Access Analyzer

## Sources Consulted
- Amazon EKS User Guide: IAM roles for service accounts - https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS User Guide: Configure Pods to use a Kubernetes service account - https://docs.aws.amazon.com/eks/latest/userguide/pod-configuration.html
- Amazon EKS Best Practices Guide: Identity and Access Management - https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- Amazon EKS User Guide: Amazon EKS add-ons - https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
- Amazon EKS User Guide: AWS add-ons - https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html
- Amazon EKS User Guide: Install AWS Load Balancer Controller with manifests - https://docs.aws.amazon.com/eks/latest/userguide/lbc-manifest.html
- Terraform Registry: aws_iam_openid_connect_provider - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Terraform Registry: tls_certificate data source - https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate
- Terraform Registry: kubernetes_service_account - https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_account
- AWS IAM User Guide: IAM Access Analyzer findings - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-findings.html

## Issues Found
- The Terraform setup used the `tls_certificate` data source but did not declare the HashiCorp TLS provider in `required_providers`. Added the `hashicorp/tls` provider with a current `~> 4.0` constraint.
- The reusable module examples create Kubernetes service accounts in `orders` and `notifications` namespaces, but the module does not create those namespaces. Added a note that the namespaces must already exist before creating the service accounts.
- The AWS Load Balancer Controller IAM policy URL pointed at the repository `main` branch. Updated it to the versioned URL currently shown in AWS documentation so the example is reproducible.

## Review Notes
The core IRSA flow, OIDC trust policy conditions, `eks.amazonaws.com/role-arn` service account annotation, webhook-injected environment variables, and troubleshooting commands matched the referenced AWS and Terraform documentation. EKS Pod Identity is now also available and is documented by AWS as an alternative, but the post is explicitly about IRSA and the IRSA content remains technically valid.
