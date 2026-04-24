# Validation Summary: How to Query Existing Infrastructure with Data Sources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for Terraform/OpenTofu
- Amazon VPC
- Amazon EC2
- Elastic Load Balancing
- Amazon ECS
- AWS Systems Manager Parameter Store
- Amazon Route 53

## Sources Consulted
- OpenTofu data sources documentation: https://opentofu.org/docs/language/data-sources/
- OpenTofu `terraform_remote_state` documentation: https://opentofu.org/docs/v1.9/language/state/remote-state-data/
- AWS provider `aws_vpc` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/vpc.html.markdown
- AWS provider `aws_ami` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/ami.html.markdown
- AWS provider `aws_subnets` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/subnets.html.markdown
- AWS provider `aws_ssm_parameter` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/ssm_parameter.html.markdown
- AWS provider `aws_route53_zone` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/route53_zone.html.markdown
- AWS provider `aws_route53_record` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/route53_record.html.markdown
- AWS provider `aws_lb` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb.html.markdown
- AWS provider `aws_ecs_task_definition` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_task_definition.html.markdown
- Amazon ECS task definition parameters documentation: https://docs.aws.amazon.com/AmazonECS/latest/userguide/task_definition_parameters.html
- Application Load Balancer creation documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-application-load-balancer.html

## Issues Found
- The sentence introducing `filter` blocks was too broad. Not every AWS data source supports `filter` blocks, so it was changed to say that many AWS data sources do.
- The `aws_ecs_task_definition` example omitted the required container `image` field inside `container_definitions`. An `image` value was added so the example matches ECS task definition requirements.
- The Route 53 example referenced `aws_instance.api.public_ip`, but no `aws_instance.api` resource was declared in the post. The record target was replaced with a valid literal IP value so the snippet is self-contained and syntactically correct.

## Review Notes
- `terraform_remote_state` is used correctly in the post, but OpenTofu documents that it only exposes root module outputs and that consumers still need access to the full state snapshot.
- `aws_ssm_parameter` is used correctly here, but the provider documentation notes that SecureString values can still end up in raw state data.
- Local runtime validation with `tofu validate` was not possible in this workspace because the `tofu` CLI is not installed, so verification was documentation-based.
