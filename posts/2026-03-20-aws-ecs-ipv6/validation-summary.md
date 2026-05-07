# Validation Summary: How to Configure IPv6 for AWS ECS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon EC2 VPC networking
- IPv6 and dual-stack subnet configuration
- Application Load Balancer
- AWS CLI
- Terraform AWS Provider

## Sources Consulted
- Amazon ECS task networking options for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html
- Allocate a network interface for an Amazon ECS task: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking-awsvpc.html
- Amazon ECS task networking options for EC2: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking.html
- Access Amazon ECS features with account settings: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-account-settings.html
- Use an Application Load Balancer for Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html
- Update the IP address types for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-ip-address-type.html
- Modify the IP addressing attributes of your subnet: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-public-ip.html
- `run-task` AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/run-task.html
- `put-account-setting-default` AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/put-account-setting-default.html
- `create-cluster` AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-cluster.html
- Terraform AWS Provider `aws_ecs_service` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- Terraform AWS Provider `aws_ecs_task_definition` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_task_definition.html.markdown
- Terraform AWS Provider `aws_subnet` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown
- Terraform AWS Provider `aws_lb` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- Terraform AWS Provider `aws_lb_target_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group.html.markdown

## Issues Found
- The post omitted the ECS `dualStackIPv6` account-setting prerequisite for dual-stack task IPv6 assignment. I added the prerequisite and a CLI command to enable it because AWS documents it as required for `awsvpc` tasks to receive IPv6 addresses.
- The introduction and conclusion did not make the subnet IPv6 auto-assign requirement explicit. I corrected the wording to match the VPC and ECS documentation.
- The CLI task definition exposed container port `443` for a stock `nginx:latest` image, which does not listen on HTTPS by default. I removed that mapping so the example matches the container image’s default behavior.
- The Terraform example did not call out that `awsvpc` ECS services behind a load balancer must use a target group with `target_type = "ip"`, and that IPv6 clients require an ALB configured for `ip_address_type = "dualstack"`. I added those requirements as inline comments.
- The Terraform networking example did not mention that private dual-stack Fargate tasks still need IPv4 egress or equivalent VPC endpoints for launch-time dependencies such as ECR, Secrets Manager, and SSM. I added that clarification.
- The `describe-tasks` JMESPath query used to extract the ENI ID was brittle because it filtered nested attachment details incorrectly. I replaced it with a query that reliably selects the `ElasticNetworkInterface` attachment and then extracts `networkInterfaceId`.
- The conclusion said ALB-to-task forwarding depends on subnet configuration alone. I corrected it to reflect AWS documentation: forwarding to targets depends on the target group IP address type.

## Review Notes
- The post now accurately describes a dual-stack ECS setup. IPv6-only ECS deployments have additional constraints not covered by these examples, including IPv6-only subnet design, dualstack load balancer requirements, and some service limitations such as ECS Exec support.
