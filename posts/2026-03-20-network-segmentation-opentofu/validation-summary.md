# Validation Summary: How to Configure Network Segmentation with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS VPC
- AWS Subnets (public, private, database)
- AWS Security Groups
- AWS Network ACLs (NACLs)
- terraform-aws-modules/vpc/aws (v5.x)

## Sources Consulted
- AWS VPC CIDR block sizing limits: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- terraform-aws-modules/vpc/aws module: https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest
- Terraform AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_network_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- AWS Network ACL rules documentation (rule numbers 1-32766): https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- HCL `dynamic` blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks

## Issues Found
- **Invalid VPC CIDR block** (Step 1): The original code used `cidr = "10.0.0.0/8"` for the VPC. AWS rejects this — VPC IPv4 CIDR blocks must be between /16 (largest, 65,536 IPs) and /28 (smallest, 16 IPs). Changed to `10.0.0.0/16`, which still comfortably contains all the subnet CIDRs declared in `locals.zones` (10.0.1.0/24, 10.0.11.0/24, 10.0.21.0/24, 10.0.100.0/28, etc.).

## Review Notes
- The inline `ingress` / `egress` blocks on `aws_security_group` are still supported in current AWS provider versions, though HashiCorp now recommends the standalone `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` resources for new code. The post's approach remains valid.
- The `management` zone CIDR (`10.0.100.0/28`) is defined in `locals` but never wired into the VPC module's subnet arguments (only `public`, `application`, and `database` are). This is a minor scope gap rather than a technical error — the post does not claim management subnets are provisioned by the module.
- The public-zone security group declares no `egress` block. With the AWS Terraform provider, omitting `egress` blocks results in a security group with no egress rules (not the AWS-console default of allow-all). Readers may want to add an explicit egress block in production.
- NACL rule number `32766` is the maximum user-definable rule number; AWS reserves the implicit `*` deny entry above it. This is correct.
- The `dynamic "ingress"` block uses `index(tolist(toset(...)), ingress.value)` to derive `rule_no`. Functionally correct (sets in HCL are ordered deterministically) but more elaborate than necessary; a future cleanup could use `count.index` over the original list.
- Module version pin `~> 5.0` for terraform-aws-modules/vpc/aws is current and appropriate.
