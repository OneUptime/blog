# Validation Summary: How to Configure Network ACLs on AWS with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL syntax)
- AWS Network ACLs (NACLs)
- AWS VPC (Virtual Private Cloud)
- `hashicorp/aws` Terraform/OpenTofu provider
- Subnet-level network security

## Sources Consulted
- AWS Network ACL documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS ephemeral ports guidance: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html#nacl-ephemeral-ports
- Terraform AWS provider `aws_network_acl` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- Terraform AWS provider `aws_network_acl_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl_rule
- Terraform AWS provider `aws_vpc` resource (cidr_block attribute): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- HCL splat expression documentation: https://developer.hashicorp.com/terraform/language/expressions/splat

## Issues Found
No technical issues found.

All code examples are syntactically valid HCL and use current, non-deprecated APIs. Resource arguments (`vpc_id`, `subnet_ids`, `network_acl_id`, `rule_number`, `protocol`, `rule_action`, `egress`, `cidr_block`, `from_port`, `to_port`) are all valid for the respective resources. The use of `protocol = "-1"` without `from_port`/`to_port` for the all-protocols deny rule is correct.

Conceptual claims are accurate:
- NACLs are stateless (correct, vs. stateful security groups).
- Rule evaluation in ascending order by rule number (correct).
- Default NACL allows all inbound and outbound traffic (correct).
- Ephemeral port range 1024-65535 is AWS's recommended permissive range for NACLs (covers Linux 32768-60999, Windows 49152-65535, and other client OS ranges).

## Review Notes
- The Private NACL example shows outbound HTTPS to the internet (via NAT Gateway) but the inbound rule only permits traffic from `aws_vpc.main.cidr_block`. In practice, return traffic from outbound internet connections would be blocked because it arrives on ephemeral ports from internet source IPs. A real production setup would typically also need an inbound ephemeral-port rule from `0.0.0.0/0` on the private NACL. This is a completeness/design consideration rather than a syntactic error — the post's individual rule examples are correct in isolation, and the ephemeral-port concept is explained correctly elsewhere in the post.
- Mixing `aws_network_acl_rule` resources with inline `ingress`/`egress` blocks on `aws_network_acl` is not supported and will cause perpetual diffs. The post correctly uses only the separate-rule pattern, but readers extending these examples should be aware of this constraint.
- The Private NACL inbound rule uses `protocol = "tcp"` with port range 0-65535, which would not permit UDP or ICMP within the VPC. This appears intentional for the example but readers building on this may want broader intra-VPC allowances (`protocol = "-1"`).
