# Validation Summary: How to Implement PCI DSS-Compliant Infrastructure with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL syntax)
- AWS Provider for Terraform
- Amazon VPC and Security Groups
- AWS KMS (Key Management Service)
- Amazon RDS (PostgreSQL)
- AWS WAFv2
- AWS CloudTrail
- Amazon S3 lifecycle policies
- PCI DSS v4.0 compliance framework
- Mermaid diagrams

## Sources Consulted
- PCI DSS v4.0 Standard - Requirements (https://www.pcisecuritystandards.org/)
- PCI DSS v4.0 Requirement 1 - Network Security Controls
- PCI DSS v4.0 Requirement 3 - Protect Stored Account Data
- PCI DSS v4.0 Requirement 10.5.1 - Audit Log Retention (12 months, 3 months online)
- PCI DSS v4.0 Requirements 11.3 (vulnerability scans) and 11.4 (penetration testing)
- Terraform AWS Provider docs - `aws_vpc` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc)
- Terraform AWS Provider docs - `aws_security_group`
- Terraform AWS Provider docs - `aws_kms_key`
- Terraform AWS Provider docs - `aws_db_instance` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)
- Terraform AWS Provider docs - `aws_wafv2_web_acl` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl)
- Terraform AWS Provider docs - `aws_cloudtrail` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail)
- Terraform AWS Provider docs - `aws_s3_bucket_lifecycle_configuration`
- AWS KMS Developer Guide - Key Deletion and Key Rotation
- AWS WAF Managed Rule Groups - `AWSManagedRulesCommonRuleSet`, `AWSManagedRulesSQLiRuleSet`

## Issues Found
No technical issues found.

All PCI DSS requirement numbers and wording match PCI DSS v4.0 (currently in effect). The HCL/OpenTofu syntax is valid against the AWS provider, and resource attributes/argument names (e.g., `enable_key_rotation`, `enable_log_file_validation`, `managed_rule_group_statement`, `override_action`) are correct. Numeric values (`deletion_window_in_days = 30`, `backup_retention_period = 35`) fall within their valid ranges. Audit log retention rules in the S3 lifecycle (transition to GLACIER at 90 days, expiration at 365 days) correctly implement the "12 months retention, 3 months immediately available" requirement from PCI DSS Req 10.5.1.

## Review Notes
- The CloudTrail `event_selector` block is still supported but newer code may prefer `advanced_event_selector` for finer-grained data event control. The current usage works correctly.
- The post intentionally omits referenced-but-not-defined resources (e.g., `aws_security_group.cde_app`, `aws_s3_bucket.cde_audit_logs`, `aws_db_parameter_group.ssl_required`, `aws_s3_bucket.chd_storage`) since the snippets are illustrative; readers building a real CDE will need to add those resources.
- The KMS `enable_key_rotation = true` enables AWS-managed automatic rotation (default 365 days). Newer AWS KMS supports a configurable `rotation_period_in_days` (90-2560) if a tighter cryptoperiod is desired.
- The `default_action { allow {} }` on the WAF allows traffic by default; the managed rule groups add deny-style protections. This is the standard pattern but operators should also consider rate-based rules and IP-block rules for payment endpoints.
