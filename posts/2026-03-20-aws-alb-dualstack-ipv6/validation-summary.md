# Validation Summary: How to Configure AWS ALB Dualstack IP Address Type for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Application Load Balancer (ALB)
- AWS VPC IPv6 networking
- AWS CLI (`elbv2`)
- Terraform AWS Provider
- DNS verification with `dig` and `curl`

## Sources Consulted
- AWS Elastic Load Balancing: Update the IP address types for your Application Load Balancer
  https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-ip-address-type.html
- AWS Elastic Load Balancing: Application Load Balancers
  https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- AWS Elastic Load Balancing: How Elastic Load Balancing works
  https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
- AWS Elastic Load Balancing: Target groups for your Application Load Balancers
  https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS CLI Command Reference: `set-ip-address-type`
  https://docs.aws.amazon.com/cli/latest/reference/elbv2/set-ip-address-type.html
- Terraform AWS Provider docs: `aws_lb`
  https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS Provider source docs: `aws_lb`
  https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- Terraform AWS Provider docs: `aws_lb_target_group`
  https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS Provider source docs: `aws_lb_target_group`
  https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group.html.markdown

## Issues Found
- The AWS console instructions were outdated. The post said to edit the ALB under `Attributes`, but the current AWS flow is on the `Network mapping` tab under `Edit IP address type`. I updated the steps to match current AWS documentation.
- The prerequisites and final explanation understated AWS dualstack requirements. AWS also requires IPv6 routing on the ALB subnets and IPv6 allowances in security groups and network ACLs. I corrected the prerequisites and the closing paragraph.
- The Terraform example enabled IPv6 on the VPC and subnets but omitted the internet gateway routing needed for an internet-facing dualstack ALB to actually receive IPv6 traffic. I added an internet gateway, a public route table, and subnet associations with both `0.0.0.0/0` and `::/0` routes.
- The verification section implicitly assumed a configured listener and healthy targets. I added a short qualifier so the `curl` checks are technically accurate in context.
- The note about IPv6 targets in IP target groups was incomplete. In Terraform, `ip_address_type = "ipv6"` must be set on `aws_lb_target_group` when using IPv6 IP targets, and AWS requires that target group to be used with a dualstack load balancer. I updated the note accordingly.

## Review Notes
- The AWS CLI and Terraform binaries were not installed in the workspace, so command and schema validation was done against current official documentation rather than local `--help` output.
- The post remains intentionally scoped to dualstack IP configuration and does not attempt to be a full end-to-end ALB deployment guide with listeners, certificates, and target registration.
