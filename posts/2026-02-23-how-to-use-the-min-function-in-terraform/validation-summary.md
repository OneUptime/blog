# Validation Summary: How to Use the min Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform numeric functions
- AWS Auto Scaling
- Amazon EBS gp3 volumes
- AWS Elastic Load Balancing target groups
- AWS Application Auto Scaling for ECS

## Sources Consulted
- HashiCorp Terraform `min` function documentation: https://developer.hashicorp.com/terraform/language/functions/min
- HashiCorp Terraform function calls and expanding function arguments documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls#expanding-function-arguments
- HashiCorp Terraform `ceil` function documentation: https://developer.hashicorp.com/terraform/language/functions/ceil
- HashiCorp AWS provider `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- AWS Amazon EBS General Purpose SSD volume documentation: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- HashiCorp AWS provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- HashiCorp AWS provider `aws_appautoscaling_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy

## Issues Found
- The console example described `...` as the splat operator. Terraform documents this syntax as function argument expansion, while splat expressions use different syntax such as `[*]`. Updated the comment to "Using function argument expansion with a list."
- The gp3 quota example used an outdated `16000` IOPS maximum. AWS currently documents gp3 volumes as supporting up to 80,000 IOPS, with the maximum available at 160 GiB or larger at 500 IOPS per GiB. Updated the comment and `max_iops_by_type` value to `80000`.

## Review Notes
Terraform is not installed in this workspace, so examples were reviewed against official Terraform and provider documentation rather than executed locally in `terraform console`. The examples that expand computed collections with `...` assume the collections are non-empty; empty collections would cause `min` to fail because it requires at least one numeric argument.
