# Validation Summary: How to Build Terraform Moved Blocks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.1+) moved blocks
- HCL configuration language
- Terraform CLI (`terraform plan`, `terraform apply`, `terraform state list`, `terraform force-unlock`, `terraform version`)
- AWS provider resources (`aws_instance`, `aws_s3_bucket`, `aws_security_group`, `aws_subnet`, `aws_vpc`, `aws_db_instance`, `aws_rds_cluster`, `aws_iam_role`, `aws_lambda_function`, `aws_autoscaling_group`)
- Terraform meta-arguments (`count`, `for_each`)
- Terraform functions (`cidrsubnet`)
- Mermaid diagrams (illustrative)

## Sources Consulted
- HashiCorp Terraform docs — Refactoring with moved blocks: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform docs — `moved` block reference: https://developer.hashicorp.com/terraform/language/moved
- Terraform AWS Provider — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider — `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform CLI reference (`state list`, `force-unlock`, `plan -out`, `apply <plan>`): https://developer.hashicorp.com/terraform/cli/commands
- Terraform functions — `cidrsubnet`: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform 1.1 release notes (introduction of `moved` blocks): https://github.com/hashicorp/terraform/blob/v1.1/CHANGELOG.md

## Issues Found
- **Invalid resource type `aws_rds_instance`** — The post used `aws_rds_instance` in two code snippets (the "Splitting a Monolith" example and the "Document the Refactor" example). The AWS provider has no such resource. For standard RDS DB instances the correct resource is `aws_db_instance`; for Aurora clusters it is `aws_rds_cluster` (used correctly elsewhere in the post). I replaced both occurrences of `aws_rds_instance` with `aws_db_instance` so the examples reference a real resource type.

## Review Notes
- The Terraform 1.1+ version requirement is accurate. Moved blocks were introduced in Terraform 1.1 (December 2021).
- The Mermaid subgraph titles use multi-word labels without bracket syntax (e.g., `subgraph Before Moved Blocks`). Older Mermaid versions are stricter and prefer `subgraph id [Title]`, but the syntax shown is broadly accepted in current Mermaid renderers.
- The sample "Moved object still exists" error message text is illustrative; the exact wording printed by Terraform varies slightly by version (recent versions print "Resource declared for moved object still exists in configuration"). The example conveys the right meaning, so I left it unchanged.
- The chained `moved` block example is correct: Terraform follows transitive `moved` chains in a single plan/apply.
- The `module.web_server.aws_instance.this` style address for resources inside a child module is the correct format for `moved` block `to`/`from` values.
- `cidrsubnet(var.vpc_cidr, 8, each.value)` correctly uses the integer map value as `netnum`.
- `aws_iam_role.LambdaExecutionRole` (PascalCase) is syntactically valid Terraform — labels are case-sensitive identifiers.
- The package upgrade hints (`brew upgrade terraform`, `sudo apt-get install terraform`) require the user to have HashiCorp's tap/repo configured, which is the standard install path; this is a fair simplification.
