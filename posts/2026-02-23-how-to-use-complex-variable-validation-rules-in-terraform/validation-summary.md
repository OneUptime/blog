# Validation Summary: How to Use Complex Variable Validation Rules in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform input variable validation
- AWS ECS Fargate task CPU and memory values
- Amazon EBS volume settings
- Amazon CloudWatch Logs retention settings

## Sources Consulted
- Terraform: Validate your configuration: https://developer.hashicorp.com/terraform/language/validate
- Terraform: Type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform: `alltrue` function: https://developer.hashicorp.com/terraform/language/functions/alltrue
- Terraform: `try` function: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform: `toset` function: https://developer.hashicorp.com/terraform/language/functions/toset
- Terraform: `cidrhost` function: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Amazon ECS: Fargate task CPU and memory combinations: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
- Amazon EBS volume types: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- Amazon CloudWatch Logs `PutRetentionPolicy`: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutRetentionPolicy.html

## Issues Found
- The CIDR section claimed to validate non-overlapping CIDR blocks, but the Terraform snippet did not perform an overlap check and ignored each subnet CIDR in the first validation expression. I changed the section to validate CIDR format and private VPC address space, and updated the expression to validate both `vpc_cidr` and every subnet CIDR with `cidrhost`.
- The storage object comment listed only `gp3`, `io1`, and `io2`, while the validation also allowed `gp2`. I updated the comment to include `gp2`.
- The Fargate CPU validation omitted current valid task CPU values `8192` and `16384`. I added them to the allowed CPU list and error message.
- The Fargate memory validation used broad numeric ranges for several CPU values, which allowed invalid values such as non-GB increments. I changed those checks to exact lists or modulo checks that match AWS's documented Fargate memory increments.
- The CloudWatch Logs retention validation omitted currently supported retention values `1096`, `2192`, `2557`, `2922`, and `3288`. I added those values to the allowed list.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform validate` against extracted examples. The examples were reviewed manually against the official Terraform language documentation and AWS service documentation.
