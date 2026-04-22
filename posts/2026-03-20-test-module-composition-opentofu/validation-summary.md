# Validation Summary: How to Test Module Composition in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu native testing (`tofu test`)
- HCL
- AWS provider mock resources
- Infrastructure as Code module composition

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu output values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu operators documentation: https://opentofu.org/docs/language/expressions/operators/
- AWS provider `aws_vpc` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc.html.markdown
- AWS provider `aws_subnet` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown

## Issues Found
- The `mock_resource` defaults for `aws_vpc` included `cidr_block`, and the defaults for `aws_subnet` included `vpc_id`. OpenTofu mock defaults are for computed attributes; provider configuration values cannot be changed through mock defaults. I removed those non-computed arguments and kept the computed `id` defaults.
- The `database_layer` and `compute_layer` runs were described as layer-specific tests, but they did not override the module under test. I added `module` blocks for `./modules/rds` and `./modules/ec2`, matching OpenTofu's documented `run.module` behavior.
- The compute assertion used `output.instance_ids != []`. OpenTofu equality operators require exactly matching types, and empty collection comparisons can produce surprising results. I changed this to `length(output.instance_ids) > 0`.
- The configuration propagation test set `environment` but not the root module's `vpc_cidr` input shown earlier in the post. I added `vpc_cidr = "10.0.0.0/16"` so the example supplies the required root-module input.

## Review Notes
The examples rely on the child modules exporting outputs such as `vpc_id`, `private_subnet_ids`, `public_subnet_ids`, `db_endpoint`, `instance_ids`, and `tags`, which is valid OpenTofu syntax when those outputs are declared. The local `tofu` binary is not installed in this environment, so validation was performed against official documentation rather than by executing `tofu test`.
