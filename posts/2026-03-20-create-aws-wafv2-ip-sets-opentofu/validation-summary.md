# Validation Summary: How to Create AWS WAFv2 IP Sets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS WAFv2 (`aws_wafv2_ip_set`, `aws_wafv2_web_acl`)
- AWS Terraform Provider (`hashicorp/aws`)
- Infrastructure as Code

## Sources Consulted
- AWS Terraform Provider — `aws_wafv2_ip_set` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_ip_set (and the underlying source markdown at https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/wafv2_ip_set.html.markdown)
- AWS Terraform Provider — `aws_wafv2_web_acl` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl (and the underlying source markdown at https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/wafv2_web_acl.html.markdown)
- RFC 5737 (IPv4 documentation address blocks: TEST-NET-2 198.51.100.0/24, TEST-NET-3 203.0.113.0/24)
- RFC 3849 (IPv6 documentation prefix: 2001:db8::/32)

## Issues Found
No technical issues found.

The verified items include:
- `aws_wafv2_ip_set` arguments: `name`, `description`, `scope` (`REGIONAL` valid), `ip_address_version` (`IPV4` and `IPV6` valid), `addresses` (CIDR notation list), and `tags` are all correctly used.
- `aws_wafv2_web_acl` structure with required `name`, `scope`, `default_action`, and `visibility_config`, plus correctly nested `rule` blocks containing `name`, `priority`, `action`, `statement`, and `visibility_config`.
- `ip_set_reference_statement` correctly references the IP set ARN via `arn`.
- `byte_match_statement` correctly nests `field_to_match` (with `uri_path {}`), `positional_constraint`, `search_string`, and `text_transformation` (with `priority` and `type`).
- `and_statement` correctly contains multiple `statement` children.
- `not_statement` correctly wraps a single `statement` child.
- Example IP ranges (`203.0.113.0/24`, `198.51.100.10/32`, `198.51.100.11/32`, `2001:db8::/32`) are valid documentation/reserved ranges per RFC 5737 and RFC 3849.

## Review Notes
- The post sets `priority = 5` for the `BlockKnownBadIPs` rule while other rules use 1 and 2. Priorities only need to be unique and ordered; this is valid, though using 3 would be more conventional. Not an error.
- The Web ACL example does not include the `provider` configuration or `aws_wafv2_web_acl_association` block, which would be needed for real-world deployment. This is a common scope decision for focused tutorials and not a technical inaccuracy.
- The `aws_wafv2_ip_set` resource's `addresses` attribute supports an empty list, so the `var.blocked_ip_ranges` example is valid even when the list is empty.
- For potential future enhancements, the post could mention that WAFv2 IP sets have a default limit of 10,000 IP addresses/CIDRs per set (a soft AWS service quota), and that updating an IP set's `addresses` list does not force replacement.
