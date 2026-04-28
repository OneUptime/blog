# Validation Summary: How to Handle Import ID Formats for Different Resource Types in OpenTofu (2)

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI, `import` blocks)
- Terraform AWS provider (hashicorp/aws)
- Terraform Google provider (hashicorp/google)
- Terraform AzureRM provider (hashicorp/azurerm)
- AWS CLI, gcloud CLI, Azure CLI

## Sources Consulted
- AWS provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_iam_role_policy` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- AWS provider `aws_s3_bucket_acl` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_acl
- AWS provider `aws_ecs_service` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS provider `aws_lb_listener_rule` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- Google provider `google_storage_bucket` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Google provider `google_compute_instance` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Google provider `google_sql_database_instance` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance_v2
- AzureRM provider `azurerm_resource_group` and `azurerm_storage_account` docs (registry.terraform.io)
- OpenTofu import / generate-config docs: https://opentofu.org/docs/language/import/generating-configuration/
- OpenTofu plan command: https://opentofu.org/docs/cli/commands/plan/

## Issues Found
1. **Invalid AWS resource name `aws_ec2_instance`** — The AWS provider has no such resource; the correct name for EC2 instances is `aws_instance`. Fixed `tofu import aws_ec2_instance.web "i-0abc123456def"` → `tofu import aws_instance.web "i-0abc123456def"`.
2. **Wrong separator for `aws_iam_role_policy` import ID** — The official import format uses a colon (`role_name:policy_name`), not a slash. Updated the AWS section to move `aws_iam_role_policy` under "Composite with colon" and changed the example ID from `RoleName/PolicyName` to `RoleName:PolicyName`. Also updated the "Validating Before Import" example and its error message text from `MyRole/MyPolicy` to `MyRole:MyPolicy`.
3. **Mislabeled subgroupings in the AWS examples block** — The original "Composite with slash" group included a comma-separated example (`aws_s3_bucket_acl`) and the "Composite with colon" group contained a slash-separated example (`aws_ecs_service`). Reorganized into accurate subgroups: slash (`aws_ecs_service`), colon (`aws_iam_role_policy`), comma (`aws_s3_bucket_acl`), full ARN (`aws_alb_listener_rule`).
4. **"Common Import ID Patterns" table** — `aws_iam_role_policy` was listed under `parent/child` but actually uses `parent:child`. Split into two table rows: `parent/child` for `aws_ecs_service` and a new `parent:child` row for `aws_iam_role_policy`.

## Review Notes
- `google_sql_database_instance` accepts both `{{project}}/{{name}}` (used in the post) and the longer canonical `projects/{{project}}/instances/{{name}}` form; the example in the post is valid.
- `google_storage_bucket` accepts both `{{project_id}}/{{bucket}}` and `{{bucket}}` — the post's example is valid.
- `aws_alb_listener_rule` is an alias for `aws_lb_listener_rule`; both work and import using the rule ARN.
- `tofu plan -generate-config-out` is supported in OpenTofu (mirrors the Terraform behavior); the target file must not already exist.
- The import ID error message shown ("Cannot import non-existent remote object…") matches the actual OpenTofu/Terraform output style for invalid import IDs.
