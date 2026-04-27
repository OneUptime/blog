# Validation Summary: How to Configure OWASP Core Rule Set in WAF with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS WAFv2 (`aws_wafv2_web_acl`)
- AWS Managed Rules (Common Rule Set, SQLi Rule Set, Linux Rule Set)
- Azure Web Application Firewall (`azurerm_web_application_firewall_policy`)
- OWASP Core Rule Set 3.2 (Azure managed rule set)
- GCP Cloud Armor (`google_compute_security_policy`)
- GCP pre-configured WAF rules (`evaluatePreconfiguredWaf`, CRS v3.3 stable)

## Sources Consulted
- AWS WAFv2 Terraform provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS Managed Rules reference: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html
- AzureRM provider docs for WAF policy: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/web_application_firewall_policy
- Azure WAF managed rule sets / CRS versions: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/application-gateway-crs-rulegroups-rules
- OWASP CRS rule reference for rule ID 942450 (REQUEST-942-APPLICATION-ATTACK-SQLI)
- GCP Cloud Armor pre-configured WAF rules: https://cloud.google.com/armor/docs/waf-rules
- GCP `evaluatePreconfiguredWaf` CEL syntax / sensitivity: https://cloud.google.com/armor/docs/rule-tuning
- Terraform `google_compute_security_policy` provider docs

## Issues Found
- **GCP default rule priority typed as a string**: The default allow rule used `priority = "2147483647"` (quoted string) while every other rule in the same resource used unquoted integers. The Terraform schema for `priority` on `google_compute_security_policy.rule` is `TypeInt`. While HCL string-to-number coercion typically makes this work, it is inconsistent and not idiomatic. **Fix**: changed to `priority = 2147483647` (unquoted integer) to match the surrounding rules.

## Review Notes
- AWS does not publish a managed rule group literally named "OWASP CRS"; the AWS Managed Rules Common Rule Set is AWS's OWASP-aligned baseline. The post's framing ("OWASP CRS via AWS Managed Rules Common Rule Set") is the standard simplification used in industry guidance and is acceptable.
- `rule_action_override` is correctly used in place of the deprecated `excluded_rule` block (deprecation occurred in aws provider v4.x).
- Azure OWASP CRS 3.2 is supported, but newer versions (e.g., CRS 3.2 → DRS 2.x for Azure Front Door) exist; the post is explicit about targeting 3.2 so this is fine. No deprecation as of validation date.
- Azure rule ID 942450 ("SQL Hex Encoding Identified") is a well-known false-positive source on session cookies — it is a sensible example for `rule_group_override`.
- GCP preconfigured WAF expression names `*-v33-stable` correspond to ModSecurity CRS 3.3 derivatives and are current.
- Sensitivity range for `evaluatePreconfiguredWaf` is 0–4; the post uses sensitivity 1 (high-confidence, fewer false positives), which is a reasonable starting value.
