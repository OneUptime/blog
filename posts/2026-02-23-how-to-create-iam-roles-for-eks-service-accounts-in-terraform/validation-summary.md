# Validation Summary: How to Create IAM Roles for EKS Service Accounts in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Amazon EKS (Elastic Kubernetes Service)
- AWS IAM (Roles, Policies, OIDC Identity Providers)
- IAM Roles for Service Accounts (IRSA)
- Kubernetes (Service Accounts)
- OpenID Connect (OIDC) / STS AssumeRoleWithWebIdentity
- Terraform AWS Provider (`hashicorp/aws`)
- Terraform Kubernetes Provider (`hashicorp/kubernetes`)
- Terraform TLS Provider (`hashicorp/tls`)
- AWS Load Balancer Controller
- ExternalDNS

## Sources Consulted
- AWS EKS Documentation — IAM Roles for Service Accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- AWS EKS Documentation — Configure a Kubernetes service account to assume an IAM role: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Terraform AWS Provider — `aws_iam_openid_connect_provider`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Terraform AWS Provider — `aws_iam_role`, `aws_iam_policy`, `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider — `data.aws_iam_policy_document`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform AWS Provider — `data.aws_eks_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster
- Terraform TLS Provider — `data.tls_certificate`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate
- Terraform Kubernetes Provider — `kubernetes_service_account`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_account
- AWS Load Balancer Controller IAM policy: https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/main/docs/install/iam_policy.json
- ExternalDNS AWS setup docs: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md
- amazon-eks-pod-identity-webhook (GitHub): https://github.com/aws/amazon-eks-pod-identity-webhook
- AWS IAM JSON policy elements — Condition operators: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html

## Issues Found
No technical issues found.

All code examples are syntactically valid HCL and use correct, current Terraform AWS / Kubernetes / TLS provider resource and argument names. The IRSA mechanism is described correctly:
- `Federated` principal with the OIDC provider ARN and `sts:AssumeRoleWithWebIdentity` action is the standard trust-policy pattern.
- The condition variable form `<oidc-issuer-without-https>:sub` with value `system:serviceaccount:<namespace>:<sa-name>` matches the OIDC token claim layout AWS STS validates.
- The `eks.amazonaws.com/role-arn` annotation on the service account is the correct mechanism for the Amazon EKS Pod Identity Webhook to inject `AWS_ROLE_ARN` / `AWS_WEB_IDENTITY_TOKEN_FILE` env vars and a projected token volume.
- The `aud` condition value of `sts.amazonaws.com` matches the token audience the webhook configures.
- The example policies for the AWS Load Balancer Controller and ExternalDNS reference the right service-account names (`kube-system:aws-load-balancer-controller`, `kube-system:external-dns`) and reasonable IAM actions.

## Review Notes
- **Step 1, point 5 — minor simplification.** The post says the pod identity webhook "injects AWS credentials." Strictly, the `amazon-eks-pod-identity-webhook` mutating webhook injects environment variables (`AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE`) and a projected service account token volume; the AWS SDK then exchanges that token for temporary credentials via `sts:AssumeRoleWithWebIdentity`. This is a common didactic simplification and the next bullet ("The pod can assume the IAM role…") clarifies the actual exchange, so it was left as-is.
- **Thumbprint relevance.** AWS no longer cryptographically validates the OIDC provider thumbprint for EKS clusters (since mid-2023), but `aws_iam_openid_connect_provider` still requires the `thumbprint_list` argument, so the `data.tls_certificate` approach shown remains the standard pattern and will keep working. Using `certificates[0].sha1_fingerprint` is the widely used form across community modules; readers using TLS provider 4.x should be aware that `certificates[length(...) - 1]` is sometimes preferred to deterministically grab the root CA, but either works in practice for EKS today.
- **"Allowing Multiple Service Accounts" section.** The example uses `StringLike` with explicit (non-wildcard) values. This is functionally equivalent to `StringEquals` against the same list and works correctly; the comment "Use StringLike with wildcards" hints at the operator's main use case rather than illustrating it. The example is valid as written.
- **Amazon EKS Pod Identity vs. IRSA.** Since November 2023, AWS also offers a newer "EKS Pod Identity" feature (separate Pod Identity Agent + `aws_eks_pod_identity_association` resource) as an alternative to IRSA. The post focuses exclusively on IRSA, which remains fully supported and is still appropriate for many workloads. A future revision could mention Pod Identity as an alternative for readers evaluating options, but this is an additive suggestion, not a correction.
- **`tls_certificate` requirement.** The `hashicorp/tls` provider must be declared in `required_providers` for `data "tls_certificate"` to resolve; the post implicitly assumes this. Readers writing a fresh module from scratch may need to add it.
