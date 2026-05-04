# Validation Summary: How to Configure Network ACLs for IPv4 in AWS VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC Network ACLs (NACLs)
- AWS Security Groups (referenced for comparison)
- OpenTofu / Terraform (HCL)
- AWS Terraform Provider resources: `aws_network_acl`, `aws_network_acl_rule`, `aws_network_acl_association`
- IPv4 / CIDR notation

## Sources Consulted
- AWS VPC User Guide — Control subnet traffic with network access control lists: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS Terraform Provider docs — `aws_network_acl_rule`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/network_acl_rule.html.markdown
- AWS Terraform Provider docs — `aws_network_acl_association`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/network_acl_association.html.markdown

## Issues Found
No technical issues found.

Verified:
- NACLs are stateless and evaluated in ascending rule-number order — matches AWS docs.
- Custom NACL rule numbers must be in range 1–32766 (32767 is reserved for the implicit `*` deny). The post uses 32766 for the explicit deny-all, which is the correct maximum custom rule number.
- All HCL arguments used (`network_acl_id`, `rule_number`, `egress`, `protocol`, `rule_action`, `cidr_block`, `from_port`, `to_port`, `vpc_id`, `tags`, `subnet_id`) are valid for the AWS Terraform provider.
- `protocol = "-1"` (all protocols) correctly omits `from_port`/`to_port` in the deny-all and outbound-all rules.
- Ephemeral port range 1024–65535 is the AWS-recommended range for inbound NACL response traffic.
- Custom NACLs deny all traffic by default — comparison table is accurate.
- `aws_network_acl_association` is a valid alternative to inline `subnet_ids` on `aws_network_acl`.

## Review Notes
- The explicit deny rule at 32766 is redundant given the implicit `*` deny rule that AWS automatically applies as the last rule, but including it explicitly is a defensible practice for clarity and is not technically incorrect.
- When using separate `aws_network_acl_rule` resources (as the post does), authors should avoid also defining inline `ingress`/`egress` blocks on `aws_network_acl` to prevent rule conflicts. The post correctly uses only the standalone rule resources.
- Note that the AWS Terraform provider recommends managing rules either entirely via inline blocks or entirely via `aws_network_acl_rule` resources, but not both — this caveat could be useful to mention in a future revision but is not a technical error.
- The ephemeral port range 1024–65535 is correct as a broad/safe range, though the actual range needed depends on the OS of the client initiating the connection (e.g., Linux 32768–60999, modern Windows 49152–65535). The post's broader range covers all common cases.
