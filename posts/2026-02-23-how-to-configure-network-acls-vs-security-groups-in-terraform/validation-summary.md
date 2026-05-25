# Validation Summary: How to Configure Network ACLs vs Security Groups in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS VPC
- AWS Security Groups
- AWS Network ACLs
- TCP ephemeral ports

## Sources Consulted
- AWS VPC User Guide: Infrastructure security and comparison of security groups and network ACLs - https://docs.aws.amazon.com/vpc/latest/userguide/infrastructure-security.html
- AWS VPC User Guide: Security group rules - https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS VPC User Guide: Custom network ACLs and ephemeral ports - https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- Terraform Registry: aws_security_group resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform Registry: aws_network_acl resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- Terraform Registry: aws_network_acl_rule resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl_rule

## Issues Found
- The database security group example showed an outbound TCP/5432 rule to the application security group and described it as "Response to app tier." This was misleading because security groups are stateful: response traffic for an allowed inbound database connection is automatically allowed regardless of outbound rules. I changed the example to use `egress = []` with a comment explaining that no outbound rules are needed for database responses.

## Review Notes
- The NACL examples correctly account for stateless filtering by allowing both request traffic and return traffic on ephemeral ports. The 1024-65535 range is broad but valid for public-facing resources and AWS services such as Elastic Load Balancing, NAT Gateway, and Lambda.
- The Terraform examples use inline `ingress` and `egress` blocks on `aws_security_group`, which remain valid for the provider version shown in the post. Current Terraform AWS Provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for newer production code, and warns not to mix inline and standalone rule management for the same security group.
