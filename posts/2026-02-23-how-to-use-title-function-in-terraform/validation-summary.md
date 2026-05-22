# Validation Summary: How to Use the title Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- AWS provider resources for EC2, CloudWatch dashboards, and SNS topics

## Sources Consulted
- HashiCorp Terraform `title` function documentation: https://developer.hashicorp.com/terraform/language/functions/title
- HashiCorp Terraform `lower` function documentation: https://developer.hashicorp.com/terraform/language/functions/lower
- HashiCorp Terraform `upper` function documentation: https://developer.hashicorp.com/terraform/language/functions/upper
- HashiCorp Terraform `jsonencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- HashiCorp Terraform `replace` function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- Terraform AWS provider `aws_cloudwatch_dashboard` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- Terraform AWS provider `aws_sns_topic` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- Amazon CloudWatch dashboard body structure documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html

## Issues Found
- The post said Terraform's `title` function lowercases non-initial letters in each word. HashiCorp's documentation says it capitalizes the first letter of each word and does not change any other letters. Updated the description, introduction, and "What Does title Do?" section.
- The basic examples for `title("MY TERRAFORM PROJECT")` and `title("hELLO wORLD")` expected lowercased non-initial letters. Updated the expected outputs to `"MY TERRAFORM PROJECT"` and `"HELLO WORLD"`.
- The `title` vs `lower` vs `upper` comparison showed `title("hello WORLD")` returning `"Hello World"`. Updated it to `"Hello WORLD"`.
- The post described words as separated by spaces or other non-letter characters. Updated the wording to align with Terraform's documented Unicode letter and case behavior while preserving the hyphen example.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were verified against official HashiCorp documentation rather than `terraform console`. The AWS examples are illustrative snippets and use current Terraform AWS provider resource names and arguments.
