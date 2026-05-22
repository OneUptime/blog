# Validation Summary: How to Use Locals for Computed Values in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform local values
- Terraform HCL expressions and functions
- Terraform AWS provider data sources and resources
- AWS networking, tagging, Lambda, and ECS examples

## Sources Consulted
- Terraform local values documentation: https://developer.hashicorp.com/terraform/language/values/locals
- Terraform references to named values documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform slice function documentation: https://developer.hashicorp.com/terraform/language/functions/slice
- Terraform cidrsubnet function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform substr and length function documentation: https://developer.hashicorp.com/terraform/language/functions/substr and https://developer.hashicorp.com/terraform/language/functions/length
- Terraform console command documentation: https://developer.hashicorp.com/terraform/cli/commands/console
- Terraform timestamp function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform AWS provider aws_region data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region
- Terraform AWS provider aws_subnets data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform AWS provider aws_availability_zones data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- Terraform AWS provider aws_lambda_function resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda CreateFunction API documentation: https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html

## Issues Found
- Added the missing `aws_caller_identity` data source declaration to the first example so the `data.aws_caller_identity.current.account_id` reference is defined in that snippet.
- Updated `data.aws_region.current.name` references to `data.aws_region.current.id`, matching the current AWS provider documentation for the region data source.
- Changed the availability zone slice expression to use `min(3, length(...))` because Terraform's `slice` function errors when the end index is outside the list bounds.
- Reworded the subnet explanation to avoid implying that `count`-based subnet resources automatically adapt to AZ additions or removals without planning changes to managed resources.
- Replaced the suggestion of timestamp-based tags with workspace-based tags because Terraform's `timestamp()` function changes every run and is not recommended directly in resource attributes.
- Corrected the result comments for `for` expressions over a map. Terraform orders map keys lexically when producing a list, so the example results are `api`, `grpc`, then `web`.
- Added the missing `aws_region` data source declaration to the multiple-sources example before referencing it in locals.

## Review Notes
Terraform was not installed in the review environment, so snippets were reviewed statically against official documentation instead of running `terraform validate`. Several examples are still illustrative fragments and assume surrounding variables, providers, and resources exist.
