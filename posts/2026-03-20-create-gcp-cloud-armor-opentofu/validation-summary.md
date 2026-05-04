# Validation Summary: How to Create GCP Cloud Armor Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Google Cloud Provider (`hashicorp/google` ~> 5.0)
- GCP Cloud Armor security policies (`google_compute_security_policy`)
- GCP Cloud Load Balancing backend services (`google_compute_backend_service`)
- Cloud Armor pre-configured WAF rules (ModSecurity CRS v3.3)
- Cloud Armor Adaptive Protection (Layer 7 DDoS defense)
- CEL match expressions (`request.path`, `inIpRange`, `evaluatePreconfiguredWaf`)
- Rate limiting / throttle actions

## Sources Consulted
- [google_compute_security_policy — Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy)
- [Cloud Armor security policy overview](https://docs.cloud.google.com/armor/docs/security-policy-overview)
- [Cloud Armor rate limiting overview](https://docs.cloud.google.com/armor/docs/rate-limiting-overview)
- [Configure Cloud Armor rate limiting](https://docs.cloud.google.com/armor/docs/configure-rate-limiting)
- [Cloud Armor preconfigured WAF rules overview](https://docs.cloud.google.com/armor/docs/waf-rules)
- [Cloud Armor Adaptive Protection overview](https://docs.cloud.google.com/armor/docs/adaptive-protection-overview)
- [Configure advanced network DDoS protection](https://docs.cloud.google.com/armor/docs/advanced-network-ddos)

## Issues Found

1. **Misleading feature name in WAF policy comment.** The example labelled the `adaptive_protection_config` / `layer_7_ddos_defense_config` block as "Cloud Armor Advanced Network DDoS Protection". That is a different product — Advanced Network DDoS Protection targets Layer 3/4 attacks on external network load balancers and is configured separately (not via `adaptive_protection_config`). The block in the example actually enables **Adaptive Protection (Layer 7 DDoS defense)**. Updated the comment to reflect the correct feature name.

2. **Throttle rule placed before WAF rules — WAF rules would never run.** In the WAF policy example, the throttle rule had `priority = 100` and a match of `src_ip_ranges = ["*"]` (matches every request). Per Cloud Armor's evaluation model, the lowest-numbered priority that matches is applied and evaluation stops. That means the SQLi rule at priority 1000 and the XSS rule at priority 1001 would never have been evaluated. Moved the throttle rule to `priority = 2000` so it runs after the WAF rules but before the default allow, which is the standard Cloud Armor pattern, and updated the comment to make the ordering rationale explicit.

## Review Notes
- The `evaluatePreconfiguredWaf('sqli-v33-stable')` and `evaluatePreconfiguredWaf('xss-v33-stable')` rule set names are still current. For production use, GCP recommends combining these with a sensitivity parameter (e.g. `evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': 1})`) to reduce false positives — out of scope for an introductory post but worth mentioning in a follow-up.
- `rule_visibility = "STANDARD"` inside `layer_7_ddos_defense_config` is correct, though there is a known provider quirk (hashicorp/terraform-provider-google#17966) where importing existing policies can produce no-op plan churn around this field.
- `enforce_on_key = "IP"` is valid; other valid keys include `ALL`, `XFF_IP`, `HTTP_HEADER`, `HTTP_COOKIE`, `HTTP_PATH`, `SNI`, `REGION_CODE`, and `TLS_JA3_FINGERPRINT`. When using `HTTP_HEADER` or `HTTP_COOKIE` an additional `enforce_on_key_name` must be set.
- The `security_policy = google_compute_security_policy.waf_policy.self_link` reference on `google_compute_backend_service` is correct; `.id` would also work.
- The "higher priority = evaluated first" comment on the priority-100 deny rule is a bit ambiguous (in Cloud Armor, *lower* priority numbers are evaluated first, i.e. have higher logical precedence). The numeric ordering in the example is correct, so this was not changed, but a future revision could rephrase it as "lower number = higher precedence = evaluated first" to remove ambiguity.
