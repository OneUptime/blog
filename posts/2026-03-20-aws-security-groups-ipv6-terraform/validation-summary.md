# Validation Summary: How to Configure AWS Security Groups for IPv6 with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS EC2 security groups
- Amazon VPC IPv6 networking
- Terraform
- Terraform AWS provider
- AWS CLI

## Sources Consulted
- Terraform Registry: `aws_security_group` resource docs - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform Registry: `aws_security_group_rule` resource docs - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS VPC User Guide: Security group rules - https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS EC2 User Guide: Security group rules for different use cases - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html
- AWS VPC User Guide: Add IPv6 support for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- AWS VPC User Guide: Path MTU Discovery and network ACLs - https://docs.aws.amazon.com/vpc/latest/userguide/path_mtu_discovery.html
- AWS CLI Command Reference: `describe-security-groups` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html

## Issues Found
- The original post mixed inline `ingress` and `egress` blocks in `aws_security_group` with standalone `aws_security_group_rule` resources. I changed Step 1 to define the security group without inline rules and moved the HTTP, HTTPS, and egress examples to standalone rule resources, because the Terraform AWS provider warns that mixing those patterns causes rule conflicts and overwritten settings.
- The SSH example used `2001:db8:management::/48`, which is not a valid IPv6 CIDR. I replaced it with the valid documentation prefix `2001:db8:1234::/48`.
- The reusable-rule example showed a bare `ingress {}` block, which is not valid top-level Terraform syntax. I replaced it with a complete `aws_security_group_rule` example so the snippet is directly usable.
- The verification command depended on `terraform output -raw web_sg_id`, but the post did not define that output. I added the `output "web_sg_id"` block and updated the query to inspect both ingress and egress IPv6 ranges.
- The ICMPv6 section overstated that ICMPv6 must always be allowed and tied the rule to Neighbor Discovery. I corrected the explanation to match AWS documentation more closely by focusing on `ping6` and Path MTU Discovery while keeping the explicit ICMPv6 rule example.

## Review Notes
- The corrected examples are technically valid, but the current Terraform AWS provider documentation prefers `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new code. The post now uses `aws_security_group_rule` consistently, which avoids the original conflict and remains valid.
- Security group rules alone do not make an EC2 workload reachable over IPv6. In practice, dual-stack connectivity also depends on VPC and subnet IPv6 CIDRs, route table entries such as `::/0`, and assigning IPv6 addresses to instances.
