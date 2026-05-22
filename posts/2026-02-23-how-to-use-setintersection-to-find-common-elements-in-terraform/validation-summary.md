# Validation Summary: How to Use setintersection to Find Common Elements in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform collection functions
- HCL
- AWS provider data sources
- AWS CloudWatch metric alarms

## Sources Consulted
- Terraform `setintersection` function reference: https://docs.hashicorp.com/terraform/language/functions/setintersection
- Terraform function call and argument expansion documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls
- Terraform `substr` function reference: https://developer.hashicorp.com/terraform/language/functions/substr
- Terraform `length` function reference: https://developer.hashicorp.com/terraform/language/functions/length
- Terraform `setsubtract` function reference: https://developer.hashicorp.com/terraform/language/functions/setsubtract
- Terraform `setunion` function reference: https://developer.hashicorp.com/terraform/language/functions/setunion
- AWS provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- AWS provider source documentation for `aws_availability_zones`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/availability_zones.html.markdown
- cty standard library `SetIntersectionFunc` implementation reference used by Terraform: https://pkg.go.dev/github.com/zclconf/go-cty/cty/function/stdlib

## Issues Found
- The introductory description said `setintersection` takes "two or more" sets, while the post later showed a single-set example. Terraform's underlying cty implementation defines one required set plus variadic additional sets, so the description was corrected to "one or more" sets.
- The availability zone suffix example used `replace(az, data.aws_availability_zones.region_a.names[0], "")`, which only removes the first full AZ name and would leave other AZ names unchanged. Replaced it with `substr(az, length(data.aws_availability_zones.<name>.id), -1)` so each suffix is extracted after the region prefix, and added `common_az_suffixes = setintersection(...)` so the example actually computes the common suffixes.
- The `aws_availability_zones` data source can include Local Zones by default when they are enabled in a region. Added an `opt-in-status = opt-in-not-required` filter in the AZ example so the suffix extraction applies to standard Availability Zones.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official Terraform documentation, AWS provider documentation, and the cty function implementation rather than by running `terraform console`.
