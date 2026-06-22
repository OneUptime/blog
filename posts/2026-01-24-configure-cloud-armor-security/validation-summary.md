# Validation Summary: How to Configure Cloud Armor Security

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Google Cloud Armor
- Google Cloud Load Balancing
- Google Cloud CLI (`gcloud`)
- Cloud Armor custom rules language / CEL
- Cloud Armor preconfigured WAF rules
- Cloud Armor rate limiting
- Cloud Logging and Cloud Monitoring
- Terraform Google provider
- BigQuery SQL for exported logs

## Sources Consulted
- Google Cloud Armor: Create and manage security policies: https://docs.cloud.google.com/armor/docs/configure-security-policies
- Google Cloud Armor: Custom rules language reference: https://docs.cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor: Preconfigured WAF rules overview: https://docs.cloud.google.com/armor/docs/waf-rules
- Google Cloud Armor: Tune preconfigured WAF rules: https://docs.cloud.google.com/armor/docs/rule-tuning
- Google Cloud Armor: Configure rate limiting: https://docs.cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud Armor: Per-request logging: https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud Armor: Verbose logging: https://docs.cloud.google.com/armor/docs/verbose-logging
- Google Cloud Armor: Monitor security policies: https://docs.cloud.google.com/armor/docs/monitoring
- Google Cloud Armor overview: https://docs.cloud.google.com/armor/docs/cloud-armor-overview
- Cloud Monitoring alert policies with gcloud: https://docs.cloud.google.com/monitoring/alerts/policies-in-api
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Google provider `google_compute_security_policy` resource source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_security_policy.html.markdown

## Issues Found
- Replaced deprecated `evaluatePreconfiguredExpr()` examples with current `evaluatePreconfiguredWaf()` syntax, because Google Cloud Armor documentation marks `evaluatePreconfiguredExpr()` as deprecated.
- Updated WAF rule examples from CRS 3.3 names to CRS 4.22 rule names, matching the current Cloud Armor preconfigured WAF rule reference.
- Corrected the WAF tuning example to use the current map argument with `sensitivity` and `opt_out_rule_ids`, and updated the signature IDs to CRS 4.22 IDs.
- Anchored the country allowlist regex so it matches exact two-letter region codes instead of any substring match.
- Added safe `has()` checks for optional request headers before evaluating header values in custom CEL expressions.
- Changed the query-parameter-count example to a long-query-string example using `size(request.query)`, because `request.query` is a string attribute, not a map with `.size()`.
- Replaced Terraform WAF expressions with `evaluatePreconfiguredWaf()` and added `type = "CLOUD_ARMOR"` for the backend security policy.
- Changed Terraform rule priorities from quoted strings to numeric values.
- Updated the Adaptive Protection note from the former Managed Protection Plus naming to Cloud Armor Enterprise.
- Replaced the invalid `gcloud monitoring alert-policies create` example with the documented `gcloud monitoring policies create --policy-from-file` command form.

## Review Notes
Local `gcloud` and `terraform` binaries were not installed in the review environment, so CLI behavior was checked against official Google Cloud and HashiCorp documentation rather than local command execution.
