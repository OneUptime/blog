# Validation Summary: How to Configure AWS Security Groups for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS security groups
- Amazon VPC IPv6 and dual-stack networking
- AWS CLI
- Terraform AWS provider
- IPv6 CIDR notation and ICMPv6

## Sources Consulted
- AWS CLI `authorize-security-group-ingress` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon VPC security group rules: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- Amazon EC2 security group rules for different use cases: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html
- Amazon EC2 `IpPermission` API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_IpPermission.html
- AWS CLI filtering guide for `--query` and JMESPath: https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html
- Amazon EC2 `DescribeSecurityGroups` API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeSecurityGroups.html
- Terraform Registry: `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- RFC 4291: IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849: IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The Terraform example used `2001:db8:admin::/48`, which is not a valid IPv6 CIDR because IPv6 hextets must be hexadecimal. It was corrected to `2001:db8:1234::/48`, which stays within the RFC 3849 documentation prefix.
- The Terraform ICMPv6 comment and description said the rule was needed for NDP and `ping6`. AWS documentation explicitly documents the inbound ICMPv6 rule for `ping6`, but not as a security-group requirement for NDP, so the wording was narrowed to `ping6` testing.
- The AWS CLI `describe-security-groups --query` example filtered on `Ipv6Ranges!=null`. `DescribeSecurityGroups` responses include empty `ipv6Ranges` arrays for rules without IPv6 ranges, so that filter can return non-IPv6 rules. It was corrected to `length(Ipv6Ranges) > \`0\``.

## Review Notes
- No other technical issues were found in the AWS CLI commands or the Terraform schema shown in the post.
- The Terraform AWS provider currently recommends the standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as best practice, but the inline `ingress` and `egress` blocks used in the post remain valid.
- AWS documentation shows that security groups created in IPv6-enabled VPCs start with allow-all outbound rules including IPv6. The explicit IPv6 egress example in the post is still valid for security groups where that rule is absent, but it can be redundant on newly created groups.
