# Validation Summary: How to Add Validation Rules to OpenTofu Variables

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu CLI (`tofu plan`)
- AWS naming examples for region codes and EC2 instance types
- CIDR notation

## Sources Consulted
- OpenTofu Input Variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `regex` function documentation: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `can` function documentation: https://opentofu.org/docs/language/functions/can/
- OpenTofu `cidrnetmask` function documentation: https://opentofu.org/docs/v1.8/language/functions/cidrnetmask/
- AWS Region codes reference: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-region-billing-codes.html
- Amazon EC2 instance type naming conventions: https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-type-names.html

## Issues Found
- The introduction and summary said validation runs at plan time. OpenTofu's custom conditions documentation says input variable validation runs as soon as the value can be evaluated, and may be deferred if a value is still unknown during planning. I updated both passages to use that more precise wording.
- The sample error output said the variable block was on line 1, but the snippet shown in the post places the `variable "environment"` block on line 3 because of the leading comment and blank line. I corrected the line number in the sample output.
- The `aws_region` regex only matched a narrow subset of AWS region codes and would reject valid forms such as multi-segment codes. I broadened the pattern and adjusted the wording to describe it as region code format validation rather than implying a stricter guarantee.
- The `vpc_cidr` example used `cidrnetmask()`, which OpenTofu documents as IPv4-only. The post described it as generic CIDR validation, so I clarified the comment and error message to say IPv4 CIDR block.
- The `instance_type` regex was narrower than AWS's documented naming conventions for EC2 instance types. I broadened the pattern so the "valid format" rule better matches actual instance type naming examples.
- The explanation of `can()` was slightly overstated. I reworded it to say the function returns `false` when evaluation produces an error, which better matches the official description.

## Review Notes
- The `tofu` CLI was not installed in this workspace, so command behavior was validated against official OpenTofu documentation rather than executed locally.
- The AWS-related validations in the post are still format checks, not existence checks against live AWS APIs. That is technically fine for a variable validation guide.
