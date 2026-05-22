# Validation Summary: How to Use Dynamic Blocks with Nested Objects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL expressions and type constraints
- Terraform dynamic blocks
- Terraform AWS provider resources
- Amazon EC2, EBS, Elastic Load Balancing, CloudWatch, RDS, and VPC routing

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform flatten function documentation: https://developer.hashicorp.com/terraform/language/functions/flatten
- Terraform try function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- AWS provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS provider `aws_route` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- AWS provider `aws_volume_attachment` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/volume_attachment
- Amazon EC2 device naming documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/device_naming.html

## Issues Found
- The CloudWatch alarm example was introduced as a dynamic block example, but it only used plain list and map arguments. It was changed to use a repeated `metric_query` nested block with `dynamic "metric_query"`, matching Terraform's dynamic block semantics and the AWS provider schema.
- The optional-fields section said to handle nulls inside the dynamic block, but the RDS example uses resource arguments rather than a dynamic block. The wording now says to handle nulls in the resource arguments.
- The EBS volume attachment example used a `mount` field as `aws_volume_attachment.device_name`. The AWS provider requires an EC2 device name such as `/dev/sdh`, so the field was renamed to `device_name` throughout that example.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were reviewed manually against the current Terraform language documentation and the AWS provider resource schemas.
