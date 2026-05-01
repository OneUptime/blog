# Validation Summary: How to Set Up ECS with Application Load Balancer Using OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Application Load Balancer (ALB / ELBv2)
- Amazon ECS
- Amazon Cognito
- AWS VPC security groups
- AWS Certificate Manager (ACM)
- AWS CLI

## Sources Consulted
- OpenTofu CLI `init`: https://opentofu.org/docs/cli/init/
- OpenTofu CLI `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform Registry `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform Registry `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Amazon ECS developer guide, "Use an Application Load Balancer for Amazon ECS": https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html
- Elastic Load Balancing, "Action types for listener rules": https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html
- Elastic Load Balancing, "Authenticate users using an Application Load Balancer": https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html
- Elastic Load Balancing, "Security groups for your Application Load Balancer": https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-update-security-groups.html
- Elastic Load Balancing, "Target groups for your Application Load Balancers": https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- Amazon ECS developer guide, "Optimize load balancer connection draining parameters for Amazon ECS": https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-connection-draining.html
- Elastic Load Balancing, "Security policies for your Application Load Balancer": https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS CLI `describe-load-balancers`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-load-balancers.html

## Issues Found
- The `/admin/*` listener rule only defined an `authenticate-cognito` action and never routed traffic to a target group. I added a `forward` action to `var.admin_target_group_arn` because ALB rules must end with a routing action such as `forward`, `redirect`, or `fixed-response`.
- The `target_type = "ip"` comment was too narrow. I updated it to say this is required for ECS services using `awsvpc` network mode, which is the actual AWS requirement and not just a Fargate-only rule.
- The conclusion described `deregistration_delay` as something that should be lower than a connection timeout and implied the health check should avoid database connectivity. I corrected this to match AWS behavior: deregistration delay should cover in-flight request duration, and the health endpoint should reflect whether the task is ready to serve traffic.

## Review Notes
- The security group example is valid because the ALB forwards traffic and health checks on port `8080`; if you use a different application or health check port, the outbound rule must be updated to match.
- The ACM certificate used by the HTTPS listener must exist in the same AWS Region as the Application Load Balancer.
