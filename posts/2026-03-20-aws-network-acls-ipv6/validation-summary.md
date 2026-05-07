# Validation Summary: How to Configure AWS Network ACLs for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS VPC network ACLs
- IPv6 and dual-stack VPC networking
- AWS CLI
- Terraform `hashicorp/aws` provider

## Sources Consulted
- Amazon VPC User Guide: Control subnet traffic with network access control lists - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- Amazon VPC User Guide: Custom network ACLs for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- Amazon VPC User Guide: Default network ACL for a VPC - https://docs.aws.amazon.com/vpc/latest/userguide/default-network-acl.html
- Amazon VPC User Guide: Path MTU Discovery and network ACLs - https://docs.aws.amazon.com/vpc/latest/userguide/path_mtu_discovery.html
- AWS CLI Command Reference: `create-network-acl-entry` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-acl-entry.html
- AWS CLI Command Reference: `describe-network-acls` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-acls.html
- Terraform Registry: `aws_network_acl` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861

## Issues Found
- The introduction said the default NACL must be updated to allow IPv6 traffic. This was corrected because AWS adds the default IPv6 allow rules only when the VPC has an associated IPv6 CIDR block, and AWS does not add those rules if the corresponding default NACL direction has already been modified.
- The Terraform ICMPv6 example claimed to allow NDP and PMTUD but only set `protocol = "58"` with `from_port = 0` and `to_port = 0`. It was corrected to explicitly allow all ICMPv6 types and codes with `icmp_type = -1` and `icmp_code = -1`, and the comment was updated to match the rule's actual behavior.
- The default NACL inspection command used the wrong field name in the AWS CLI query (`CidrIpv6`). It was corrected to `Ipv6CidrBlock`, and the query now also shows rule direction and IPv4 CIDRs to match the real `describe-network-acls` output structure.
- The default-rule comments listed the IPv6 deny rule as `32767`. This was corrected to `32768`, which is how AWS exposes the default IPv6 deny entry in `describe-network-acls`.
- The conclusion overstated IPv6 rule parity by saying all IPv4 rules must have corresponding IPv6 versions. It was corrected to the accurate rule: any traffic policy you want applied to IPv6 must have its own IPv6 NACL entry.

## Review Notes
- The post uses `1024-65535` for ephemeral ports. AWS documents that the required ephemeral range depends on the initiating client or service, but `1024-65535` is a valid broad range when you need to cover multiple client types.
- The CLI example includes both a narrow outbound ephemeral rule and a broader allow-all outbound IPv6 rule. That combination is valid, but the broader rule makes the narrow egress response rule unnecessary once both are present, so the broader rule was clarified as optional.
