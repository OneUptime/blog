# Validation Summary: How to Use the lower Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform string functions (`lower`, `upper`, `title`, `trimspace`, `replace`)
- Terraform input variable validation
- Terraform `for` expressions and map lookups
- AWS S3 bucket naming
- AWS Route 53 records
- AWS provider resources (`aws_s3_bucket`, `aws_instance`, `aws_route53_record`, `aws_security_group`, `aws_lb`)
- DNS names

## Sources Consulted
- Terraform `lower` function documentation: https://developer.hashicorp.com/terraform/language/functions/lower
- Terraform built-in functions documentation: https://developer.hashicorp.com/terraform/language/functions
- Terraform `trimspace` function documentation: https://developer.hashicorp.com/terraform/language/functions/trimspace
- Terraform `replace` function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- Terraform `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- Terraform variable block documentation: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- AWS S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- Terraform AWS provider `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_lb` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb

## Issues Found
- The introduction said `lower` converts all Unicode letters to lowercase. Terraform documents this as converting all cased letters, using Unicode definitions of letters and case. Changed the wording to "all cased Unicode letters" for precision.
- The Unicode example used `BONJOUR`, which is ASCII and did not demonstrate Unicode behavior. Replaced it with Terraform's documented Greek-style example using `ΓΕΙΑ ΣΟΥ` -> `γεια σου`.
- The S3 section said `lower` ensures bucket name compliance regardless of input. AWS S3 bucket names have additional rules beyond lowercase characters, including length, allowed characters, start/end character rules, and reserved prefixes/suffixes. Changed the text to say `lower` helps meet the lowercase requirement and that the rest of the S3 rules should still be validated.
- The project name validation regex used `+` after the first character, which rejected one-character names even though the error message only required the name to start with a letter and contain valid characters. Changed it to `*` so a single lowercase letter is valid.

## Review Notes
- The Terraform CLI is not installed in this environment, so examples were checked against official documentation rather than executed with `terraform console` or `terraform validate`.
- The tag normalization `for` expressions are valid for unique normalized keys. If an input map contains keys that differ only by case, such as `Team` and `team`, Terraform will report duplicate object keys unless grouping mode is used.
