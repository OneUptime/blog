# Validation Summary: How to Use Security Group Referencing for Layered Security

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS EC2 security groups
- Amazon VPC
- AWS Transit Gateway
- VPC peering and shared VPC security group references
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- AWS VPC User Guide: Security group rules - https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS EC2 User Guide: Change security groups and configure security group rules - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/changing-security-group.html
- AWS CLI Command Reference: authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS VPC User Guide: Amazon VPC quotas - https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS Transit Gateway documentation: VPC attachments security group referencing - https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS Networking Blog: Introducing security group referencing for AWS Transit Gateway - https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-security-group-referencing-for-aws-transit-gateway/
- Terraform Registry: aws_security_group resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- OneUptime linked posts, verified with HTTP 200 responses:
  - https://oneuptime.com/blog/post/2026-02-12-security-group-rules-common-architectures/view
  - https://oneuptime.com/blog/post/2026-02-12-network-acls-subnet-level-security/view

## Issues Found
- The post implied CIDR rules are always brittle in auto-scaling environments. This is only true when using individual or changing instance IPs; broader subnet CIDRs may not require per-instance updates. Updated the wording to refer to instance-specific CIDR rules.
- The post said security group references allow "any instance" in the referenced group. AWS evaluates network interfaces associated with security groups, so the wording was tightened to "network interface."
- The layered architecture section said traffic must flow through every layer in order, but the example allows the API tier to reach both cache and database directly. Updated the explanation to say traffic follows the explicitly allowed relationships.
- The cross-account section overstated Transit Gateway support. AWS supports inbound security group references across VPCs attached to the same Transit Gateway in the same Region when security group referencing is enabled, with limitations. Updated the wording to include shared VPC, peering, and Transit Gateway caveats.
- The common mistake about "always" using security group references in the same VPC omitted AWS's documented middlebox limitation. Updated the guidance to exclude traffic routed through middlebox appliances.
- The outbound rules note did not mention that Transit Gateway security group referencing is inbound-only. Added a caveat that outbound security group references work in the same VPC or over VPC peering, but not over Transit Gateway.
- The wrap-up overgeneralized cross-account support and CIDR replacement. Updated it to refer to supported cross-account scenarios and instance-specific CIDR-based rules.

## Review Notes
The AWS CLI examples use current `authorize-security-group-ingress` options. The Terraform inline `ingress` example is valid, though current Terraform AWS provider documentation recommends separate rule resources for more complex production management.
