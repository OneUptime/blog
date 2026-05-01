# Validation Summary: How to Enforce Tagging Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- AWS Organizations Tag Policies
- Open Policy Agent (OPA) / Rego
- Conftest
- AWS CLI
- AWS Resource Explorer

## Sources Consulted
- OpenTofu input variable validation docs: https://opentofu.org/docs/language/values/variables/
- OpenTofu `show` command and JSON plan output docs: https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- HashiCorp tutorial for AWS provider `default_tags`: https://developer.hashicorp.com/terraform/tutorials/aws/aws-default-tags
- AWS provider tag policy compliance guide: https://registry.terraform.io/providers/-/aws/6.39.0/docs/guides/tag-policy-compliance
- AWS Organizations tag policy syntax and examples: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_example-tag-policies.html
- AWS Organizations required tag key enforcement with IaC: https://docs.aws.amazon.com/organizations/latest/userguide/enforce-required-tag-keys-iac.html
- AWS CLI `resourcegroupstaggingapi get-resources` reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/resourcegroupstaggingapi/get-resources.html
- AWS Resource Explorer search query examples: https://docs.aws.amazon.com/resource-explorer/latest/userguide/using-search-query-examples.html
- AWS CLI `resource-explorer-2 search` reference: https://docs.aws.amazon.com/cli/latest/reference/resource-explorer-2/search.html
- Conftest documentation: https://www.conftest.dev/
- OPA Terraform plan and Rego syntax docs: https://www.openpolicyagent.org/docs/terraform and https://www.openpolicyagent.org/docs/v0-upgrade

## Issues Found
- The `default_tags` section said tags are applied to all resources automatically. I corrected this to reflect the documented exception for resources such as `aws_autoscaling_group`, and I added the missing `aws_region` variable used by the snippet.
- The OPA example used older Rego rule syntax and checked `change.after.tags`, which would miss provider-level default tags. I updated it to current `deny contains msg if` syntax and switched the check to `change.after.tags_all` so provider defaults are accounted for in plan evaluation.
- The policy-check command sequence was incomplete because it referenced a saved plan file without showing how it was created. I added `tofu plan -out=tfplan.binary` before `tofu show -json`.
- The AWS Organizations example used `enforced_for`, which standardizes and enforces allowed tagging operations but does not model required tag keys for IaC the way the post described. I replaced it with `report_required_tag_for` and updated the prose to note the AWS provider `tag_policy_compliance` requirement.
- The remediation script used `aws resourcegroupstaggingapi get-resources` in a way that cannot find truly untagged resources, because that API does not return untagged resources. I replaced it with an AWS Resource Explorer query that matches the documented pattern for finding resources missing a specific tag.
- The conclusion overstated the guarantees provided by the individual layers. I tightened the language so it matches the documented behavior of provider defaults, OPA checks, and AWS tag policy enforcement.

## Review Notes
- Required tag key enforcement through the AWS provider is version-sensitive. The AWS Organizations documentation currently points to AWS provider `6.22.0+` for this feature.
- AWS Resource Explorer tag-based searches depend on a view that includes tag data. The command syntax in the post is correct, but that prerequisite is worth keeping in mind for future revisions.
