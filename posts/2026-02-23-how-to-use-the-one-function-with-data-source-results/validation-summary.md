# Validation Summary: How to Use the one Function with Data Source Results

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform CLI
- Terraform collection functions
- Terraform AWS Provider data sources and resources

## Sources Consulted
- Terraform `one` function documentation: https://developer.hashicorp.com/terraform/language/functions/one
- Terraform `element` function documentation: https://developer.hashicorp.com/terraform/language/functions/element
- Terraform `terraform console` command documentation: https://developer.hashicorp.com/terraform/cli/commands/console
- Terraform AWS Provider `aws_vpcs` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpcs and https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/vpcs.html.markdown
- Terraform AWS Provider `aws_ami_ids` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami_ids and https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami_ids.html.markdown
- Terraform AWS Provider `aws_security_groups` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_groups and https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/security_groups.html.markdown
- Terraform AWS Provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip and https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eip.html.markdown

## Issues Found
- The post described `one` as accepting only lists and sets. Updated it to list, set, or tuple, matching the Terraform documentation.
- The basic signature used `one(list)`, which was narrower than the supported input types. Updated it to `one(collection)`.
- The `aws_vpc` example was introduced as an old list-indexing approach, but the code uses a single-result data source and does not index a list. Reworded that section to explain that some data sources return a single result directly, while others return lists.
- The post said Terraform would flag both zero and multiple VPC matches through the `one` pattern. Updated the wording because `one([])` returns `null`; only two or more elements cause `one` to error. The text now explains that zero matches should be handled explicitly or rejected by a required downstream argument.
- The summary said `one` enforces a single result. Updated it to say `one` enforces zero or one result, which is the precise Terraform behavior.

## Review Notes
The Terraform CLI was not installed in the local environment, so console examples could not be executed locally. They were checked against the official Terraform documentation instead. The related OneUptime links resolved to matching blog pages.
