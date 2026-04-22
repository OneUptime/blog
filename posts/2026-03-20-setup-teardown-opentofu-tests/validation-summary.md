# Validation Summary: How to Use Setup and Teardown in OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu test framework
- OpenTofu HCL test files (`*.tftest.hcl`)
- OpenTofu CLI (`tofu test`, `tofu init`)
- OpenTofu mock providers
- AWS provider resources and data sources
- AWS CLI Resource Groups Tagging API
- GitHub Actions YAML

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu input variable documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu `formatdate` function documentation: https://opentofu.org/docs/language/functions/formatdate/
- OpenTofu `timestamp` function documentation: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu test cleanup implementation: https://github.com/opentofu/opentofu/blob/main/internal/command/test.go
- OpenTofu test output implementation: https://github.com/opentofu/opentofu/blob/main/internal/command/views/test.go
- AWS CLI `resourcegroupstaggingapi get-resources` documentation: https://docs.aws.amazon.com/cli/latest/reference/resourcegroupstaggingapi/get-resources.html
- HashiCorp AWS provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones

## Issues Found
- The lifecycle illustration was fenced as `hcl` even though it was prose, not HCL. Changed the fence to `text`.
- The setup module referenced `var.vpc_cidr`, `var.suffix`, and `data.aws_availability_zones.available` without declaring the variables or data source. Added the missing variable declarations and the `aws_availability_zones` data source.
- The cleanup example searched for a `TestRun` tag that the setup resources did not create. Added `TestRun` tags to the VPC, subnets, and security group.
- The teardown-failure description and example implied a generic warning/output shape. Updated it to reflect OpenTofu's behavior of reporting cleanup errors and writing `errored_test.tfstate` when managed resource instances remain in state.
- The "Conditional Setup Based on Environment" section did not actually include conditional test behavior. Renamed it to a real-AWS setup example and added a provider block using `var.region`, which OpenTofu test provider blocks support.
- The CI example used `tofu test tests/integration.tftest.hcl`, but `tofu test` uses `-filter` for selecting a test file. Updated the example to run `tofu init` and `tofu test -filter=tests/integration.tftest.hcl`.
- The AWS cleanup example used a non-existent generic `aws resource-cleanup` command. Replaced it with a valid `aws resourcegroupstaggingapi get-resources` command and noted that deletion must use service-specific AWS CLI commands.

## Review Notes
Local `tofu` and `aws` binaries were not installed in the review environment, so CLI behavior was verified against official documentation and OpenTofu source code rather than by executing the commands locally.
