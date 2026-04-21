# Validation Summary: How to Create Network ACLs for IPv4 Using Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS VPC Network ACLs
- IPv4 subnet traffic filtering

## Sources Consulted
- Terraform AWS Provider documentation for `aws_network_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- Terraform AWS Provider documentation for `aws_network_acl_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl_rule
- AWS VPC User Guide, Network ACL basics: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS VPC User Guide, Network ACL rules: https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html
- AWS VPC User Guide, Custom network ACLs and ephemeral ports: https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS VPC User Guide, Create a network ACL: https://docs.aws.amazon.com/vpc/latest/userguide/create-network-acl.html
- AWS VPC User Guide, Compare security groups and network ACLs: https://docs.aws.amazon.com/vpc/latest/userguide/infrastructure-security.html#VPC_Security_Comparison

## Issues Found
- The post mixed inline `aws_network_acl` rules with a standalone `aws_network_acl_rule` for the same ACL. The Terraform AWS Provider documentation states that these rule management styles must not be used together because they conflict and overwrite rules. I changed the block-specific-IP example to an inline `ingress` rule that can be added inside the existing `aws_network_acl.public` resource.
- The conclusion said to always allow ephemeral ports on inbound rules. AWS documentation explains that response traffic must be allowed in the direction it enters or leaves the subnet; inbound ephemeral rules are needed when instances initiate outbound requests, while public-facing services also need outbound response rules unless outbound traffic is already allowed. I updated the wording to say to allow the appropriate ephemeral range in the response direction.
- The conclusion implied that explicit denies should specifically use rule numbers 10-90. AWS requires only that lower-numbered rules are evaluated first, and recommends leaving gaps between numbers. I clarified this as an example convention when broad allows start at 100.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The HCL was reviewed against the current HashiCorp AWS Provider resource documentation. The explicit deny-all rules at rule number 200 are valid but redundant because custom network ACLs already include non-removable `*` deny rules for unmatched traffic.
