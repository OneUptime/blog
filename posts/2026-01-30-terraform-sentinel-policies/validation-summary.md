# Validation Summary: How to Create Terraform Sentinel Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Sentinel (policy-as-code language)
- Terraform / Terraform Cloud (HCP Terraform)
- Sentinel imports: `tfplan/v2`, `tfconfig/v2`, `tfstate/v2`, `tfrun`, `decimal`, `strings`
- Sentinel CLI (`sentinel test`, `sentinel apply`, `sentinel fmt`)
- Terraform Cloud Policy Sets API
- `hashicorp/tfe` Terraform provider (`tfe_policy_set`, `tfe_policy_set_parameter`)
- AWS resources used as examples (`aws_instance`, `aws_security_group`, `aws_ebs_volume`, `aws_db_instance`, etc.)

## Sources Consulted
- HashiCorp Sentinel language reference: https://developer.hashicorp.com/sentinel/docs/language
- Sentinel keywords / reserved identifiers: https://developer.hashicorp.com/sentinel/docs/language/lexical-elements
- Sentinel rules documentation: https://developer.hashicorp.com/sentinel/docs/language/rules
- Sentinel `for` loop / quantifier syntax: https://developer.hashicorp.com/sentinel/docs/language/loops
- `tfplan/v2` import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- `tfconfig/v2` import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfconfig-v2
- `tfstate/v2` import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfstate-v2
- `tfrun` import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfrun
- Sentinel `decimal` standard import: https://developer.hashicorp.com/sentinel/docs/imports/decimal
- Sentinel CLI documentation and installation: https://developer.hashicorp.com/sentinel/install
- Sentinel testing framework: https://developer.hashicorp.com/sentinel/docs/commands/test
- Terraform Cloud Policy Sets API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/policy-sets
- `tfe_policy_set` provider docs: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/policy_set

## Issues Found

1. **Operator precedence bug in `get_ec2_instances`** (`restrict-ami.sentinel`).
   The original expression chained `and`/`or` without parentheses:
   ```
   rc.type is "aws_instance" and
   rc.mode is "managed" and
   rc.change.actions contains "create" or
   rc.change.actions contains "update"
   ```
   In Sentinel, `and` binds tighter than `or`, so this parses as
   `(... contains "create") or (rc.change.actions contains "update")`, which matches *any* resource type on update. Wrapped the create/update clause in parentheses so the filter correctly limits to managed `aws_instance` resources being created or updated.

2. **`rule` used as a `for` loop variable in `check_ingress_rules`** (`network-security.sentinel`).
   `rule` is a reserved keyword in Sentinel (used for declaring rules) and cannot be bound as an identifier. Renamed the loop variable from `rule` to `ing` and updated the three downstream references (`rule.cidr_blocks`, `rule.from_port`, `rule.to_port`).

3. **Statements inside rule bodies — Sentinel rule bodies must be a single boolean expression.** Three places had assignments / `if` / `for` directly inside a `rule { ... }` block:
   - `cost_within_limit` in `cost-control.sentinel`: collapsed the body to a single chained expression using `decimal.new(...)...`.
   - `main` in `module-versions.sentinel`: extracted the assignment + `if`/`for` logic into a helper function `report_module_violations()` and reduced the rule body to `report_module_violations()`.
   - `no_mass_deletions` in `workspace-rules.sentinel`: extracted the body into `check_mass_deletions()` (which uses proper `return` statements for the `if`/`else` branches) and reduced the rule body to `check_mass_deletions()`.

4. **Incorrect `decimal` import method name** (`cost-control.sentinel`).
   The post called `delta.less_than_or_equals(max)`. The Sentinel `decimal` standard import method is `less_than_or_equal` (singular). Updated to use the correct method name.

5. **Non-existent `brew install sentinel` formula.**
   There is no `sentinel` formula in homebrew-core and no official HashiCorp tap formula for it. The Sentinel CLI is distributed as a direct binary download from https://developer.hashicorp.com/sentinel/install. Replaced the misleading `brew install sentinel` instruction with a pointer to the official download page.

## Review Notes

- The post correctly describes the three enforcement levels (`advisory`, `soft-mandatory`, `hard-mandatory`) and how overrides work.
- `tfplan/v2`, `tfconfig/v2`, `tfstate/v2`, and `tfrun` field names used in the examples (`resource_changes`, `output_changes`, `module_calls`, `cost_estimation.{prior,proposed,delta}_monthly_cost`, `workspace.name`, `workspace.auto_apply`, `organization.name`, etc.) match the current HCP Terraform import reference.
- The "Restrict Regions" pattern is acknowledged as simplified in its own comment; `rc.change.after.region` will almost always be `null` for AWS resources because region is set on the provider, not the resource. The author flagged this with `# In practice, you might pass region differently`, so it was left in place as illustrative.
- The `actions is not ["delete"]` idiom is correct Sentinel for "exclude pure-delete changes," but it does *not* exclude replace operations like `["delete", "create"]`. That is intentional in most tagging policies (you do want to validate the replacement resource), so no change was made.
- The `hashicorp/tfe` provider version constraint `~> 0.50` is reasonable but will likely drift; readers should pin the latest release available at use time.
- No explicit Sentinel CLI version is given for the install instructions, which is intentional — pointing readers at the install page avoids version drift in the post.
