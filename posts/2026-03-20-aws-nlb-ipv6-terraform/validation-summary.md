# Validation Summary: How to Configure AWS NLB with IPv6 Using Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Network Load Balancer (NLB)
- Amazon VPC
- IPv6 networking on AWS
- Terraform
- DNS verification with `dig`
- HTTPS verification with `curl`

## Sources Consulted
- AWS Elastic Load Balancing: Network Load Balancers — https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html
- AWS Elastic Load Balancing: Update the IP address types for your Network Load Balancer — https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-ip-address-type.html
- AWS Elastic Load Balancing: Target groups for your Network Load Balancers — https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS Elastic Load Balancing: Edit target group attributes for your Network Load Balancer — https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS Elastic Load Balancing: Register targets for your Network Load Balancer — https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-register-targets.html
- AWS Elastic Load Balancing: Health checks for Network Load Balancer target groups — https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- Amazon VPC: Enable internet access for a VPC using an internet gateway — https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC: Add IPv6 support for your VPC — https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- Terraform AWS Provider: `aws_lb` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS Provider: `aws_lb_target_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS Provider: `aws_lb_target_group_attachment` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment
- Terraform Language: `cidrsubnet` — https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- curl manual page — https://curl.se/docs/manpage.html

## Issues Found
- The "public subnet" example was incomplete. It created IPv6-enabled subnets but did not create an internet gateway, IPv4 and IPv6 default routes, or route-table associations. I added those resources because AWS requires internet-routable public subnets, and dualstack NLB subnets must route IPv6 traffic.
- The post referenced `data.aws_availability_zones.available` without defining the data source. I added the missing `aws_availability_zones` data block so the Terraform example is self-consistent.
- The NLB security-group explanation was outdated. I changed it to reflect current AWS behavior: security groups are optional for NLBs, rather than unsupported.
- The target group section implied that `ip` targets were specifically required for client IP preservation. I corrected this by explicitly marking the example as an IPv4 target group and clarifying that IPv6 backend targets require an IPv6 target group and IPv6 target registration.
- The target registration comment implied the shown `private_ip` attribute could also register IPv6 targets. I corrected the comment because the snippet as written registers only private IPv4 addresses.
- The verification step labeled an HTTPS `curl` request as a generic TCP connectivity test. I changed the wording so it accurately describes an HTTPS end-to-end test over IPv6.
- The IPv6 client IP preservation section overstated the behavior. I rewrote it to match AWS documentation: preservation depends on target type, protocol, and whether traffic stays within the same IP family; IPv6-to-IPv4 and IPv4-to-IPv6 flows show the NLB node IP at the target.
- The closing sentence implied Elastic IP assignment and full client IP preservation were unconditional. I corrected it to say Elastic IP assignment is optional and client IP preservation depends on the target group configuration.

## Review Notes
- This example now clearly documents a dualstack NLB with IPv4 backend targets. That is valid: IPv6 clients can still reach the service through the dualstack NLB even when the target group remains IPv4.
- If the post is later expanded to demonstrate backend IPv6 targets, the target group should use `ip_address_type = "ipv6"` and the attachments must register IPv6 addresses, not `private_ip`.
