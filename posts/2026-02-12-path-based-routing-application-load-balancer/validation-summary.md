# Validation Summary: How to Use Path-Based Routing with Application Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Application Load Balancer
- Elastic Load Balancing v2 listener rules
- AWS CLI
- EC2 target registration
- Terraform AWS provider
- HTTPS listeners and SSL policies

## Sources Consulted
- AWS Elastic Load Balancing: Listener rules for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-rules.html
- AWS CLI Command Reference: elbv2 create-rule: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-rule.html
- AWS CLI Command Reference: elbv2 create-target-group: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI Command Reference: elbv2 create-listener: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS CLI Command Reference: elbv2 register-targets: https://docs.aws.amazon.com/cli/latest/reference/elbv2/register-targets.html
- AWS EC2 documentation examples for current instance ID shape: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/retrieve-iid.html
- HashiCorp Terraform AWS Provider: aws_lb_listener_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- HashiCorp Terraform AWS Provider: aws_lb_target_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group

## Issues Found
- The `register-targets` examples used invalid placeholder instance IDs such as `i-api1`, `i-web1`, and `i-admin1`. Replaced them with valid EC2 instance ID-shaped placeholders because `register-targets` expects real target identifiers, and AWS examples use `i-` IDs with hexadecimal suffixes.
- The post created a static assets target group and listener rule, but the registration section did not register any static asset server targets. Added a static target registration command so the example is internally complete.
- The Terraform section described a complete setup but omitted the static target group and static listener rule used earlier in the article. Added the corresponding `aws_lb_target_group.static` and `aws_lb_listener_rule.static` resources using the documented Terraform AWS provider syntax.

## Review Notes
The listener rule priority explanation, path-pattern wildcard behavior, default rule behavior, single-target and weighted forward actions, fixed-response action, HTTP header condition, health check interval values, and referenced host-based routing link were verified as technically correct. The Terraform example is still illustrative and assumes surrounding variables, security group resources, certificate resources, and target attachments are defined elsewhere.
