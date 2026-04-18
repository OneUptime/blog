# Validation Summary: How to Troubleshoot Kubernetes Provider Connection Issues in OpenTofu

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- OpenTofu (Terraform-compatible)
- Kubernetes provider (HashiCorp/OpenTofu registry)
- Amazon EKS (Elastic Kubernetes Service)
- AWS CLI (`aws eks`, `aws sts`)
- kubectl
- HCL (HashiCorp Configuration Language)
- IAM role authentication (aws-auth ConfigMap)

## Sources Consulted
- OpenTofu Kubernetes provider docs: https://search.opentofu.org/provider/hashicorp/kubernetes/latest
- Terraform Kubernetes provider (upstream): https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- AWS CLI reference for `aws eks get-token`: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- AWS CLI reference for `aws eks update-kubeconfig`: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Amazon EKS IAM authenticator / aws-auth ConfigMap documentation: https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
- Kubernetes client-go exec credential plugin (`client.authentication.k8s.io/v1beta1`): https://kubernetes.io/docs/reference/access-authn-authz/authentication/#client-go-credential-plugins
- `kubernetes_config_map_v1_data` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map_v1_data
- OpenTofu debug/logging (`TF_LOG`): https://opentofu.org/docs/internals/debugging/

## Issues Found
- In the "aws-auth ConfigMap Access Denied" section, the comment above `aws eks describe-cluster --query 'cluster.roleArn'` said "Check who created the cluster (has implicit admin)". This was technically incorrect: `cluster.roleArn` returns the cluster's service role (the IAM role EKS uses to call other AWS services), not the IAM identity that created the cluster (which would need to be looked up via CloudTrail). I replaced the comment so it accurately describes what the command returns, and added `aws sts get-caller-identity` as the actually useful check for confirming the current AWS identity matches the creator or is listed in aws-auth.

## Review Notes
- The `client.authentication.k8s.io/v1beta1` exec API version is still supported but `client.authentication.k8s.io/v1` (GA since Kubernetes 1.26) is preferred for new configurations. Since v1beta1 remains broadly compatible and works with `aws eks get-token`, no change was required.
- EKS `aws eks get-token` tokens have an effective lifetime of ~14-15 minutes; the post's "15 minutes" statement is acceptable.
- The `kubernetes_config_map_v1_data` resource with `force = true` is appropriate for managing the aws-auth ConfigMap which is auto-created by EKS on node group creation.
- Granting `system:masters` to a CI role works but should be minimized to least-privilege groups where possible; this is a style/security note, not a technical error.
- For new EKS clusters, AWS now recommends EKS access entries (access management API) over the aws-auth ConfigMap. The ConfigMap approach shown is still valid and supported but will eventually be superseded.
