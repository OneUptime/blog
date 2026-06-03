# Validation Summary: Using Terraform Workspaces to Manage Multiple Kubernetes Environments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI workspaces
- Terraform S3 backend
- AWS EKS
- Terraform AWS provider
- Terraform Helm provider
- Terraform Kubernetes provider
- GitLab CI/CD

## Sources Consulted
- Terraform CLI workspace documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform `workspace select` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform lifecycle precondition documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp guidance for selecting workspaces in automation: https://support.hashicorp.com/hc/en-us/articles/360043550953-Selecting-a-workspace-when-running-Terraform-in-automation
- AWS EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Terraform AWS provider `aws_eks_cluster` and `aws_eks_node_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform Helm provider release notes and examples: https://github.com/hashicorp/terraform-provider-helm/releases and https://github.com/hashicorp/terraform-provider-helm
- Terraform Kubernetes provider release notes and resource documentation: https://github.com/hashicorp/terraform-provider-kubernetes/releases and https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy_v1
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. DynamoDB-based S3 backend locking is deprecated in current Terraform documentation, so it was replaced with `use_lockfile = true`.
- The EKS cluster example pinned Kubernetes `1.29`, which is no longer listed as available in current Amazon EKS standard or extended support. It was updated to `1.35`, which is currently in EKS standard support.
- The Helm provider examples used legacy `set` blocks. Helm provider v3 changed `set` to a list of nested objects, so the example was updated to `set = [...]`, and the numeric replica count was converted with `tostring()`.
- The Kubernetes provider examples used deprecated unversioned resources `kubernetes_resource_quota` and `kubernetes_network_policy`. They were updated to `kubernetes_resource_quota_v1` and `kubernetes_network_policy_v1`.
- The GitLab CI example used Terraform 1.7 and selected workspaces only after `terraform init`. It was updated to Terraform 1.15, `terraform init -input=false`, and per-job `TF_WORKSPACE` variables so initialization can run non-interactively with the intended workspace.
- The safety guard used `null_resource` with a `local-exec` provisioner. It was replaced with built-in `terraform_data` plus a lifecycle `precondition`, which is the current Terraform-native way to fail early without requiring the null provider.

## Review Notes
The post is technically relevant and remains a valid tutorial after the corrections. The examples are still illustrative and omit full provider authentication, IAM role definitions, and variable declarations, which is acceptable for the scope but would need to be supplied in a complete runnable module.
