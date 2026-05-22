# Validation Summary: How to Set Up Terraform Documentation Standards

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- AWS Terraform Provider
- Amazon ECS
- Amazon EBS
- GitHub Actions
- terraform-docs
- Markdown

## Sources Consulted
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform configuration syntax and comments: https://docs.hashicorp.com/terraform/language/syntax/configuration
- Terraform resource dependency behavior: https://developer.hashicorp.com/terraform/language/block/resource
- AWS CLI ECS update-service reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS ECS UpdateService API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_UpdateService.html
- AWS EBS General Purpose SSD volumes: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- Terraform AWS Provider ECS service documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS Provider security group rule guidance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- terraform-docs GitHub Action documentation: https://terraform-docs.io/how-to/github-action/
- terraform-docs GitHub Action repository documentation: https://github.com/terraform-docs/gh-actions
- GitHub Actions workflow syntax: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- Referenced OneUptime article: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-knowledge-sharing-in-teams/view

## Issues Found
- The security group rule example used `aws_security_group_rule`. The AWS provider documentation now recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for current VPC security group rule management, so the example was updated to use `aws_vpc_security_group_ingress_rule` with `ip_protocol` and `cidr_ipv4`.
- The ECS workaround comment incorrectly said ECS services do not detect task definition updates automatically and tied removal to AWS provider `>= 5.35`. AWS ECS starts a deployment when the task definition is updated; `force_new_deployment` is for redeploying without service definition changes, such as reusing a mutable image tag. The comment was corrected to reflect that behavior.
- The nested Markdown README example used plain triple backticks for an outer `markdown` block and incorrectly closed inner HCL examples with ```bash. The outer fence was changed to four backticks and the inner examples now close with plain triple backticks.
- The terraform-docs GitHub Action example used an older action version and did not check out the pull request head ref before using `git-push`. It was updated to `terraform-docs/gh-actions@v1.4.1`, added the checkout `ref`, quoted `git-push`, and configured recursive generation for modules under `modules`.

## Review Notes
Some Terraform snippets remain illustrative rather than complete standalone configurations because they reference surrounding resources or module variables not shown in the article. The syntax and referenced arguments are valid for the documented purpose.
