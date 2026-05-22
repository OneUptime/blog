# Validation Summary: How to Use the sum Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform built-in functions
- HCL
- AWS CloudWatch metric alarms

## Sources Consulted
- Terraform official documentation: sum function - https://developer.hashicorp.com/terraform/language/functions/sum
- Terraform official documentation: function calls and argument expansion - https://developer.hashicorp.com/terraform/language/expressions/function-calls
- Terraform official documentation: pow function - https://developer.hashicorp.com/terraform/language/functions/pow
- Terraform official documentation: values function - https://developer.hashicorp.com/terraform/language/functions/values
- Terraform official documentation: format function - https://developer.hashicorp.com/terraform/language/functions/format
- Terraform official documentation: for expressions - https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform AWS Provider documentation: aws_cloudwatch_metric_alarm - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The post stated that `sum` takes only a list of numbers. Terraform documents that `sum` accepts a list or set of numbers, so the wording and syntax placeholder were updated.
- The post stated that `sum([])` returns `0`. Terraform's official documentation says `sum` fails when given an empty list or set, so both examples and the explanatory note were corrected.
- The average guidance did not mention the non-empty collection requirement. It now says to use `sum(list) / length(list)` for a non-empty list.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were reviewed against official Terraform and provider documentation rather than local console execution.
