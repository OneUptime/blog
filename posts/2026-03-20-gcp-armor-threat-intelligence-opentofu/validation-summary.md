# Validation Summary: How to Configure GCP Armor Threat Intelligence with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Armor
- Google Threat Intelligence
- OpenTofu / Terraform HCL
- Google Cloud Load Balancing backend services
- Cloud Armor preconfigured WAF rules

## Sources Consulted
- Google Cloud Armor Threat Intelligence: https://cloud.google.com/armor/docs/threat-intelligence
- Google Cloud Armor rules language reference: https://cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor preconfigured WAF rules overview: https://cloud.google.com/armor/docs/waf-rules
- Set up preconfigured WAF rules: https://cloud.google.com/armor/docs/configure-waf
- Google Cloud Armor overview: https://cloud.google.com/armor/docs/cloud-armor-overview
- Google Cloud Armor release notes: https://cloud.google.com/armor/docs/release-notes
- Terraform Registry `google_compute_security_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy
- Terraform Registry `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The overview used stale Cloud Armor tier terminology and implied Threat Intelligence blocks traffic automatically without policy rules. I updated it to the current Cloud Armor Enterprise naming and clarified that policy rules allow or block traffic on supported external Application Load Balancers.
- In Step 1, the first rule was labeled as blocking Tor exit nodes even though it used the `iplist-known-malicious-ips` feed. I corrected the rule comment and description to match the actual feed.
- In Step 1, the anonymous proxy rule description claimed to block VPNs even though it used `iplist-anon-proxies`. I corrected the wording to match the documented feed behavior.
- In Step 2, the post used `evaluatePreconfiguredExpr('sqli-stable')` and `evaluatePreconfiguredExpr('xss-stable')`. The official rules language reference marks `evaluatePreconfiguredExpr()` as deprecated, so I replaced those examples with current `evaluatePreconfiguredWaf()` expressions using the current CRS 4.22 stable rule names.
- In Step 2, the section claimed to add WAF rules alongside Threat Intelligence, but the shown `combined_policy` resource only included one threat-intelligence rule and would not match the surrounding explanation or summary. I updated the combined policy to include the Tor, anonymous proxy, and known-malicious-IP threat feeds it describes.
- In Step 3, the backend service example omitted `port_name` and used `id` references where provider examples commonly use `self_link`. I added `port_name = "http"` and switched the health check and security policy references to `self_link` for a more accurate provider example.

## Review Notes
- Threat Intelligence in Cloud Armor requires a Cloud Armor Enterprise subscription.
- The backend service snippet assumes the referenced instance group exposes a named port that matches `port_name = "http"`.
- Google still documents legacy WAF rule names and `evaluatePreconfiguredExpr()`, but the current guidance recommends `evaluatePreconfiguredWaf()`.
