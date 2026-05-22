# Validation Summary: How to Use Dynamic Blocks for Repeating Nested Blocks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform dynamic blocks
- HCL type constraints, optional attributes, for expressions, and conditional expressions
- AWS provider resources: `aws_security_group`, `aws_lb`, `aws_lb_listener`, `aws_ecs_task_definition`, and `aws_wafv2_web_acl`
- AWS Elastic Load Balancing, ECS task definitions, and AWS WAFv2

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_lb` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider `aws_lb_listener` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_wafv2_web_acl` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Amazon ECS task definition parameters documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS WAF Web ACL CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-webacl.html

## Issues Found
- The ECS task definition example used `container_definitions = jsonencode([])`. The AWS provider requires `container_definitions` to be a valid ECS container definitions document, so I replaced the empty list with a minimal container definition that mounts the generated volumes.
- The security group examples used inline `ingress` blocks without mentioning that the AWS provider currently recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for production rule management. I added a short caveat while keeping the inline blocks as the dynamic-block teaching example.
- The WAF example used inline `rule` blocks without mentioning the AWS provider's documented limitations for inline WAF rules. I added a short caveat recommending consideration of `aws_wafv2_web_acl_rule` for production rule management.

## Review Notes
Terraform CLI was not installed in the review environment, so I verified syntax and provider schemas against official Terraform language documentation and the AWS provider documentation rather than running `terraform validate`. The remaining snippets are illustrative and still assume surrounding resources such as VPCs, subnets, target groups, ACM certificates, S3 log buckets, and WAF IP sets exist.
