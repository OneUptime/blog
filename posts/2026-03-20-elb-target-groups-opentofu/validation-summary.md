# Validation Summary: How to Configure ELB Target Groups with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Elastic Load Balancing v2 (ALB, NLB, target groups)
- AWS Lambda
- AWS CLI
- HashiCorp AWS provider / OpenTofu AWS resource syntax

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/init/
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/plan/
- AWS ELBv2 CreateTargetGroup API: https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_CreateTargetGroup.html
- AWS Application Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Application Load Balancer health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS Application Load Balancer Lambda targets: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html
- AWS Application Load Balancer target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS Network Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS Network Load Balancer health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS CLI `describe-target-health`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-target-health.html
- AWS CLI `describe-target-group-attributes`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-target-group-attributes.html
- HashiCorp AWS provider `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- HashiCorp AWS provider `aws_lb_target_group_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment
- HashiCorp AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Amazon ECS load balancer target type guidance for `awsvpc` / Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/nlb-resources-for-blue-green.html
- Amazon EKS load balancing target-type guidance: https://docs.aws.amazon.com/eks/latest/best-practices/load-balancing.html

## Issues Found
- The description and prerequisite list referenced Gateway Load Balancers even though the post did not include a GWLB configuration example. I narrowed those references so the metadata matches the actual content.
- The prerequisites listed only EC2 and ELB permissions, but the Lambda example also requires Lambda permissions. I updated the prerequisite text so it matches the resources the post provisions.
- The introduction implied that all target groups support the same target types and that all target groups expose a configurable load-balancing algorithm. I clarified that supported target types depend on load balancer type and that the routing algorithm setting applies to ALB target groups.
- Step 3 was labeled as a TCP health-check example, but the HCL configures an HTTPS health check on a TLS target group. I updated the heading to match the code.
- The Lambda target group comment incorrectly implied that health checks are implicitly based on Lambda execution success. I corrected it to reflect that Lambda target-group health checks are disabled by default unless explicitly enabled.
- The conclusion said `target_type = "ip"` should be used for ECS and EKS workloads in general and claimed that `least_outstanding_requests` outperforms round-robin. I narrowed the `ip` guidance to Fargate/direct-IP workloads and rewrote the algorithm note to match AWS’ documented behavior without making an unsupported performance claim.

## Review Notes
- The post is technically correct after the fixes above.
- It still does not include a GWLB example. That is fine after the metadata changes, but a future revision could cover GWLB-specific attributes such as `target_failover`.
