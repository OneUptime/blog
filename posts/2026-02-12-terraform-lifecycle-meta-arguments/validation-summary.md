# Validation Summary: How to Use Terraform Lifecycle Rules (create_before_destroy, prevent_destroy)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform lifecycle meta-arguments
- Terraform custom conditions
- AWS provider resources for Security Groups, ACM certificates, RDS, KMS, S3, ECS, Auto Scaling, Lambda, Cognito, and Application Auto Scaling
- Terraform `terraform_data` resource

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- Terraform custom conditions documentation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp null provider `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource.html
- AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_acm_certificate` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_kms_key` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- AWS provider `aws_cognito_user_pool` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Internal OneUptime links in the post were checked and returned HTTP 200.

## Issues Found
- The post said there are four lifecycle meta-arguments. Terraform's current lifecycle block includes additional rules such as `precondition`, `postcondition`, and `action_trigger`, so the wording was changed to say these are the four resource lifecycle rules used most often in the post.
- The `prevent_destroy` section said Terraform would block destruction if the resource is removed from configuration. Terraform only enforces `prevent_destroy` while the rule remains present in configuration, so the explanation was corrected.
- The `replace_triggered_by` ECS example described a service redeploy, but `replace_triggered_by` forces replacement. The example was changed to replace an `aws_appautoscaling_target` when an ECS service changes, and the ECS redeploy guidance was corrected to use `task_definition` updates or `force_new_deployment`.
- The `null_resource` example was updated to use the built-in `terraform_data` resource, which official docs recommend for Terraform 1.4 and later.
- The Lambda `ignore_changes` example included `last_modified`, a provider-computed attribute. It was removed because modern Terraform warns when `ignore_changes` includes attributes that are not user-configured.

## Review Notes
The remaining examples are illustrative snippets and omit required surrounding configuration such as providers, variables, IAM roles, VPC resources, and complete resource arguments. That is acceptable for the scope of the article.
