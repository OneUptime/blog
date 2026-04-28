# Validation Summary: How to Manage Network ACLs with OpenTofu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTofu (compatible with Terraform AWS provider syntax)
- HashiCorp AWS provider (resources: `aws_network_acl`, `aws_network_acl_rule`)
- AWS VPC Network ACLs (NACLs)
- AWS Security Groups (referenced for comparison)
- HCL (HashiCorp Configuration Language) — including dynamic blocks and splat expressions

## Sources Consulted
- HashiCorp AWS provider docs — `aws_network_acl` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- HashiCorp AWS provider docs — `aws_network_acl_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl_rule
- AWS VPC User Guide — Network ACLs documentation (rule numbering 1–32766, statelessness, ephemeral port recommendations)

## Issues Found
No technical issues found.

All resource attribute names were verified correct:
- `aws_network_acl` accepts `vpc_id`, `subnet_ids`, `tags`, plus inline `ingress`/`egress` blocks.
- The inline block keys (`rule_no`, `action`) correctly differ from the standalone `aws_network_acl_rule` resource keys (`rule_number`, `rule_action`) — the dynamic block example uses the correct inline-block names.
- Protocol `"-1"` with `from_port = 0` and `to_port = 0` is the documented correct usage for "all protocols" in inline blocks.
- The ephemeral port range (1024–65535) matches AWS's documented recommendation for return-traffic rules.
- NACLs are correctly described as stateless and subnet-level; comparison table with Security Groups is accurate.
- Rule numbering practice (increments of 10/100, range up to 32766 with 32767 reserved for the implicit deny) is correct.

## Review Notes
- The `deny_all_in` rule at rule_number 32766 is technically redundant since AWS automatically appends an implicit deny-all rule at 32767, but it is not incorrect and can serve as documentation/explicit intent.
- For the standalone `aws_network_acl_rule` resource, `from_port`/`to_port` are technically ignored when protocol is `"-1"`, but supplying `0`/`0` (as the post does) is harmless and is what the inline block form actually requires.
- Worth noting for readers (not strictly an error): inline `ingress`/`egress` blocks within `aws_network_acl` and the standalone `aws_network_acl_rule` resource cannot be mixed on the same NACL — doing so causes rule overwrites. The post correctly uses each pattern on separate NACLs (`public`/`private` use the standalone resource; `app` uses the inline dynamic block), so no conflict exists in the examples.
- The tip "Keep the default VPC NACL permissive" is the AWS default behavior; some security-conscious teams instead lock it down — this is a stylistic recommendation rather than a technical error.
