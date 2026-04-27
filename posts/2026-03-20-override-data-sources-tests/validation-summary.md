# Validation Summary: How to Override Data Sources in OpenTofu Tests - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (testing framework — `.tftest.hcl` files)
- HCL (HashiCorp Configuration Language)
- AWS provider data sources (`aws_ami`, `aws_vpc`, `aws_subnet`, `aws_caller_identity`, `aws_region`, `aws_availability_zones`)
- OpenTofu test directives: `override_data`, `mock_provider`, `mock_resource`

## Sources Consulted
- [OpenTofu test command documentation](https://opentofu.org/docs/cli/commands/test/) — verified `override_data`, `override_resource`, `override_module`, `mock_provider`, `mock_resource`, `mock_data`, and `defaults` semantics.
- [hashicorp/aws provider — aws_availability_zones data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones) — verified exported attributes (`names`, `zone_ids`, `group_names`).
- [terraform-provider-aws GitHub source for availability_zones docs](https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/availability_zones.html.markdown) — cross-reference for attribute naming.

## Issues Found
1. **Wrong AWS data source for `subnet_id`** — The original config used `data "aws_vpc" "selected"` and assigned `subnet_id = data.aws_vpc.selected.id` on `aws_instance`. A VPC ID is not a valid subnet ID; an EC2 instance must be launched in a subnet. Changed the data source to `data "aws_subnet" "selected"` and updated the resource attribute reference and the two corresponding `override_data` targets/values (e.g., `vpc-mock12345` → `subnet-mock12345`, cidr `10.0.0.0/16` → `10.0.1.0/24` to reflect subnet-sized CIDR).
2. **Incorrect attribute name on `aws_availability_zones`** — The override used `ids = [...]`, but this data source exports `zone_ids` (along with `names` and `group_names`); there is no `ids` attribute. Changed `ids` to `zone_ids` in the override values.

## Review Notes
- The `override_data` and `mock_provider` syntax (target/values, `mock_resource "<type>" { defaults = {...} }`) matches the OpenTofu documentation.
- The `expect_failures` reference in Best Practices is a real OpenTofu test attribute; while it's primarily used for variable validation / output / check-block failures rather than arbitrary "bad data," the suggestion to combine it with overrides is reasonable.
- The example in "Overriding Data Sources with Complex Results" references `aws_vpc.main` without showing its definition — this is a self-contained snippet illustrating the override block, so it's acceptable but could include the resource for full clarity in a future revision.
- All HCL syntax (block labels, attribute formatting, list/map literals) is syntactically valid.
