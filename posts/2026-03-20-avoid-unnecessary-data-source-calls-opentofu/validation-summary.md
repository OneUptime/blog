# Validation Summary: How to Avoid Unnecessary Data Source Calls in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu data sources
- HCL
- AWS provider for Terraform/OpenTofu
- AWS EC2 and VPC data sources/resources

## Sources Consulted
- OpenTofu data sources documentation: https://opentofu.org/docs/language/data-sources/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- AWS provider `aws_ami` data source docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown
- AWS provider `aws_region` data source docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/region.html.markdown
- AWS provider `aws_caller_identity` data source docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/caller_identity.html.markdown
- AWS provider `aws_subnets` data source docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/subnets.html.markdown
- AWS provider `aws_vpc` data source docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/vpc.html.markdown
- AWS provider `aws_subnet` resource docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown
- AWS provider `aws_launch_template` resource docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown

## Issues Found
- The introduction said data sources read during planning without qualification. I changed this to "usually during planning" because OpenTofu can defer some data source reads until apply.
- Several HCL comparison snippets reused the same resource names in a single code block, which makes the examples invalid as written. I renamed the example resources/data blocks so each snippet is valid HCL.
- The self-referencing subnet example omitted `cidr_block`, which is needed for a normal `aws_subnet` example. I added `cidr_block` to both subnet resources.
- The region/account example used `data.aws_region.current.name`, which does not match the current provider documentation. I changed it to `data.aws_region.current.region`.
- The region/account section implied that locals themselves avoid duplicate provider calls. I revised the wording so the optimization is correctly described as reading once in the root module and passing values to child modules.
- The pinned AMI example used a hard-coded region-specific AMI ID as a default. I removed the default so the example does not imply one fixed AMI ID is generally valid across regions.
- The `-refresh=false` section presented the flag as a simple speed optimization without the documented risk. I updated it to note that OpenTofu warns this can produce an incomplete or incorrect plan when external changes exist.

## Review Notes
- `tofu show -json` has an additional caveat in the official docs: saved plan files must be created without `-refresh=false` to be shown as JSON.
- The `tofu` binary was not installed in the local workspace, so CLI validation was done against the official OpenTofu documentation rather than local `--help` output.
