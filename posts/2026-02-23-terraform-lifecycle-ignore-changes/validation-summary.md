# Validation Summary: How to Use Lifecycle Rules with ignore_changes in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform lifecycle meta-arguments
- Terraform `ignore_changes`
- Terraform `replace_triggered_by`
- Terraform CLI forced replacement
- AWS Terraform provider resources: `aws_autoscaling_group`, `aws_ecs_service`, `aws_instance`
- Kubernetes Terraform provider `kubernetes_deployment`
- AzureRM Terraform provider `azurerm_resource_group`

## Sources Consulted
- HashiCorp Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform `taint` command reference: https://developer.hashicorp.com/terraform/cli/commands/taint
- HashiCorp Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Help Center on remote object changes and `ignore_changes`: https://support.hashicorp.com/hc/en-us/articles/4405950960147-New-Feature-Objects-have-changed-outside-of-Terraform
- Terraform AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Kubernetes provider `kubernetes_deployment` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform Kubernetes provider versioned resources guide: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/guides/versioned-resources
- Terraform AzureRM provider `azurerm_resource_group` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group

## Issues Found
- The AMI example said an external image pipeline could update the AMI on an existing `aws_instance`. EC2 instances are launched from an AMI, and changing the Terraform `ami` argument normally implies replacement rather than an in-place external AMI update. Updated the wording to describe the valid Terraform case where an AMI data source changes over time and `ignore_changes = [ami]` prevents replacement after creation.
- The `ignore_changes = all` section recommended tainting a resource. The `terraform taint` command is deprecated for Terraform v0.15.2 and later. Updated the text to recommend `terraform apply -replace=...`.
- The plan-output section said Terraform would not show diffs for ignored attributes and that users would "never know" about drift from plan output. HashiCorp documents that `ignore_changes` ignores configuration-versus-state differences for planned updates, but remote object changes may still be reported during refresh in some cases. Updated the wording to say Terraform will not propose update actions for ignored attributes and that a normal plan should not be relied on to enforce them.
- The `replace_triggered_by` section said `ignore_changes` takes precedence in a broad way. HashiCorp documents that `replace_triggered_by` responds to planned changes in referenced managed resources or attributes. Updated the wording to clarify that an ignored attribute difference with no planned update will not by itself trigger replacement.

## Review Notes
The Kubernetes provider now offers version-suffixed resources such as `kubernetes_deployment_v1`, but the unsuffixed `kubernetes_deployment` resource remains documented in the latest provider documentation. The ECS example's `task_definition` ignore pattern is common for CI/CD-managed task revisions, but teams should use it deliberately because it means Terraform will not roll the service back to the configured task definition after creation.
