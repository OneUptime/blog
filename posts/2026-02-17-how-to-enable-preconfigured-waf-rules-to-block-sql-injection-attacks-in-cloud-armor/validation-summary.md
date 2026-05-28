# Validation Summary: How to Enable Preconfigured WAF Rules to Block SQL Injection Attacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Armor
- Cloud Armor preconfigured WAF rules
- OWASP ModSecurity Core Rule Set
- Google Cloud CLI
- Cloud Logging
- BigQuery log sinks
- Terraform Google provider

## Sources Consulted
- Google Cloud Armor preconfigured WAF rules overview: https://docs.cloud.google.com/armor/docs/waf-rules
- Set up Cloud Armor preconfigured WAF rules: https://docs.cloud.google.com/armor/docs/configure-waf
- Tune Cloud Armor preconfigured WAF rules: https://docs.cloud.google.com/armor/docs/rule-tuning
- Cloud Armor request logging: https://docs.cloud.google.com/armor/docs/request-logging
- Configure Cloud Armor security policies: https://docs.cloud.google.com/armor/docs/configure-security-policies
- gcloud compute security-policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- gcloud compute security-policies rules create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- gcloud compute security-policies rules update reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/update
- Terraform google_compute_security_policy resource reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy

## Issues Found
- The post used the legacy `evaluatePreconfiguredExpr()` expression throughout the gcloud and Terraform examples. Updated the examples to use the current documented `evaluatePreconfiguredWaf()` expression.
- The sensitivity level 1 example incorrectly passed a list of CRS rule IDs as the second argument. Updated it to `evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': 1})`, which is the documented way to configure sensitivity.
- The tuning example described the second argument as a list of excluded rule IDs. Updated it to use `opt_out_rule_ids` with `sensitivity: 4`, matching the documented Cloud Armor WAF tuning syntax.
- The SQL injection rule set table implied that stable versus canary directly determined false-positive risk. Updated the wording to clarify that false-positive risk depends on configured sensitivity.

## Review Notes
The Cloud Armor logging filters and log field names match the documented `previewSecurityPolicy`, `enforcedSecurityPolicy`, and `preconfiguredExprIds` fields. Cloud Armor documentation also notes that request logging must be enabled on the protected backend service and is subject to load balancer log sampling; the post's monitoring examples assume logs are already available.
