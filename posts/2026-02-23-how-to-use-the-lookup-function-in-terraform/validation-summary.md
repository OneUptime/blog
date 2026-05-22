# Validation Summary: How to Use the lookup Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform Configuration Language (HCL)
- Terraform built-in functions
- AWS Terraform provider resources
- Amazon EC2, Amazon RDS, Amazon VPC, and Amazon CloudWatch examples

## Sources Consulted
- Terraform `lookup` function documentation: https://developer.hashicorp.com/terraform/language/functions/lookup
- Terraform functions tutorial using `lookup`: https://developer.hashicorp.com/terraform/tutorials/configuration-language/functions
- Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Amazon RDS DB instance class documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Types.html

## Issues Found
- The post described the third `lookup` argument as optional in recent Terraform versions. Official Terraform documentation says the default parameter is optional only for historical reasons and that omitting it has been deprecated since Terraform v0.7 because it is equivalent to native map index syntax. Updated the explanation and console comment to reflect the deprecation.
- The environment-based configuration example used EC2 instance type values such as `t3.micro` and `m5.large` for the `aws_db_instance.instance_class` argument. RDS DB instance classes use names such as `db.t3.micro` and `db.m5.large`. Added a separate `db_instance_classes` map and updated the RDS lookup to use it.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform validate` or `terraform console`. The examples were reviewed against the official Terraform language documentation, HashiCorp AWS provider documentation, and Amazon RDS documentation.
