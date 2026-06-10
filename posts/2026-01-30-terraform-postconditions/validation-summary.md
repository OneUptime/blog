# Validation Summary: How to Create Terraform Postconditions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (custom conditions: `precondition`, `postcondition`)
- HCL `lifecycle` block syntax
- Terraform AWS provider (`aws_instance`, `aws_s3_bucket`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_versioning`, `aws_s3_bucket_public_access_block`, `aws_db_instance`, `aws_security_group`, `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_subnet`, `aws_autoscaling_group`, `aws_launch_template`, `aws_lb`)
- Terraform Kubernetes provider (`kubernetes_deployment`)
- Terraform built-in functions (`alltrue`, `can`, `jsondecode`, `lookup`, `cidrsubnet`, `length`)
- Terraform test framework (`.tftest.hcl`)
- Mermaid diagrams

## Sources Consulted
- Terraform Custom Conditions docs: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- Terraform `lifecycle` Meta-Argument docs: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform Outputs docs (output `precondition`): https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform Data Sources docs (lifecycle/precondition/postcondition): https://developer.hashicorp.com/terraform/language/data-sources
- Terraform `self` object reference (within `postcondition`): https://developer.hashicorp.com/terraform/language/expressions/custom-conditions#self-object
- Terraform Test framework docs (`.tftest.hcl`): https://developer.hashicorp.com/terraform/language/tests
- Terraform Functions reference (`alltrue`, `can`, `jsondecode`, `cidrsubnet`, `lookup`): https://developer.hashicorp.com/terraform/language/functions
- AWS Provider — `aws_instance` attributes (`instance_state`, `public_ip`, `private_ip`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS Provider — `aws_db_instance` attributes (`storage_encrypted`, `multi_az`, `deletion_protection`, `backup_retention_period`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS Provider — `aws_s3_bucket_server_side_encryption_configuration` `rule` / `apply_server_side_encryption_by_default` structure: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS Provider — `aws_s3_bucket_versioning` and `aws_s3_bucket_public_access_block`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Kubernetes Provider — `kubernetes_deployment` `spec[0].replicas`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment

## Issues Found
- **"Output Postconditions" section heading was technically incorrect.** Terraform `output` blocks support only `precondition`, not `postcondition`. The body text and code example already used `precondition` (correctly), but the heading contradicted this and could mislead readers. Changed the heading to "Output Preconditions" and added a one-sentence clarification noting outputs do not support `postcondition`.

## Review Notes
- All other code blocks check out against current Terraform docs and provider schemas:
  - `lifecycle { postcondition { condition = ... error_message = ... } }` syntax is correct for both managed resources and data sources (data source support added in Terraform 1.2).
  - The `self` object usage inside postconditions is correct.
  - Resource attribute references (`self.instance_state`, `self.public_ip`, `self.private_ip`, `self.storage_encrypted`, `self.multi_az`, `self.deletion_protection`, `self.backup_retention_period`, `self.versioning_configuration[0].status`, `self.spec[0].replicas`, etc.) match the schemas of their respective providers.
  - Functions used (`alltrue`, `can`, `jsondecode`, `cidrsubnet`, `lookup`, `length`) are valid built-in Terraform functions.
  - The `.tftest.hcl` example uses the current Terraform test framework syntax (`run` block, `command = plan`, `variables {}`, `assert {}`).
- Version-specific caveat (not changed): Custom conditions (`precondition`/`postcondition` in `lifecycle`) require Terraform >= 1.2; the Terraform test framework requires >= 1.6. The post does not state these minimum versions explicitly, which could be a future improvement but is not a correctness issue.
- Minor stylistic notes (left unchanged, not technical errors):
  - The AMI ID `ami-0c55b159cbfafe1f0` is an illustrative placeholder; it may not exist in any particular AWS region today, but the post does not claim otherwise.
  - The `aws:kms` postcondition example tautologically checks an algorithm that was set in the same resource — a realistic example would check a provider-side default, but this is presented as illustrative and is technically valid.
