# Validation Summary: How to Use the startswith and endswith Functions in OpenTofu - Functions

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu string functions: `startswith`, `endswith`, `substr`, `regex`, `can`
- OpenTofu variable validation and `for` expressions
- AWS Route 53 via the AWS provider
- AWS Load Balancer listener configuration

## Sources Consulted
- OpenTofu `startswith` function: https://opentofu.org/docs/language/functions/startswith/
- OpenTofu `endswith` function: https://opentofu.org/docs/language/functions/endswith/
- OpenTofu `substr` function: https://opentofu.org/docs/language/functions/substr/
- OpenTofu `regex` function: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `can` function: https://opentofu.org/docs/language/functions/can/
- OpenTofu input variable validation and condition expressions: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `for` expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu data sources: https://opentofu.org/docs/language/data-sources/
- AWS Route 53 `CreateHostedZone` API reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_CreateHostedZone.html
- AWS provider `aws_route53_zone` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/route53_zone.html.markdown
- AWS provider `aws_route53_zone` data source implementation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/route53/zone_data_source.go
- AWS provider `aws_lb_listener` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_listener.html.markdown

## Issues Found
- The Route 53 section said DNS zone names should end with a dot and that the trailing dot is required by Route 53. AWS Route 53 documentation says the trailing dot is optional and that Route 53 treats the dotted and non-dotted forms as identical for hosted zone names. The current AWS provider data source also normalizes hosted zone names when matching. Updated the wording to say DNS zone names are often represented as fully qualified names with a trailing dot, and changed the code comment to describe this as normalizing to the fully qualified form rather than a Route 53 requirement.

## Review Notes
- The `startswith` and `endswith` syntax, examples, boolean behavior, and case-sensitive exact matching behavior are consistent with the official OpenTofu function documentation.
- The `for` expression filters, variable validation blocks, `substr` comparison, and `can(regex(...))` examples are consistent with OpenTofu documentation.
- The AWS listener example is intentionally partial because it uses `# ...`; a complete `aws_lb_listener` resource still needs required provider arguments such as `load_balancer_arn` and `default_action`, and HTTPS listeners require a certificate.
- Local CLI validation was not run because neither `tofu` nor `terraform` is installed in the environment.
