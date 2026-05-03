# Validation Summary: How to Set Up DDoS Protection with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Shield Advanced (`aws_shield_subscription`, `aws_shield_protection`, `aws_shield_protection_group`)
- AWS WAFv2 (`aws_wafv2_web_acl` with rate-based rules)
- Azure DDoS Protection Standard / Network Protection (`azurerm_network_ddos_protection_plan`, `azurerm_virtual_network`, `azurerm_monitor_metric_alert`)
- GCP Cloud Armor with Adaptive Protection (`google_compute_security_policy`)

## Sources Consulted
- [aws_shield_subscription | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_subscription)
- [aws_shield_protection_group | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_protection_group)
- [aws_wafv2_web_acl | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl)
- [azurerm_network_ddos_protection_plan | Terraform Registry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_ddos_protection_plan)
- [Azure DDoS Network Protection Terraform QuickStart | Microsoft Learn](https://learn.microsoft.com/en-us/azure/ddos-protection/manage-ddos-protection-terraform)
- [Monitor Azure DDoS Protection (IfUnderDDoSAttack metric) | Microsoft Learn](https://learn.microsoft.com/en-us/azure/ddos-protection/monitor-ddos-protection)
- [google_compute_security_policy | Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy)
- [Configure rate limiting | Google Cloud Armor docs](https://docs.cloud.google.com/armor/docs/configure-rate-limiting)

## Issues Found
- **GCP Cloud Armor rule action mismatch**: The Step 3 rule used `action = "throttle"` while also specifying `ban_threshold` and `ban_duration_sec`. According to the Cloud Armor docs, ban parameters are only valid when the action is `rate_based_ban`; using them with `throttle` is rejected. The intent of the rule (throttle first, then ban repeat offenders) — and the Summary's mention of ban thresholds — clearly require the `rate_based_ban` action. Changed `action = "throttle"` to `action = "rate_based_ban"`.

## Review Notes
- AWS Shield Advanced subscription costs $3,000/month with a 1-year commitment; readers should be warned, but the post's `auto_renew = "ENABLED"` is technically correct (default value, valid options ENABLED/DISABLED).
- The WAFv2 `rate_based_statement` `limit = 500` is valid (minimum 100), and the comment "Requests per 5 minutes per IP" matches the default fixed 5-minute evaluation window. Newer provider versions allow setting `evaluation_window_sec` for a configurable window, but the default is still 5 minutes, so the comment remains accurate.
- The `azurerm_virtual_network` `ddos_protection_plan` block uses `enable` (not `enabled`) in the current `azurerm` provider — this is correct in the post.
- Azure DDoS Protection Standard was renamed to "Azure DDoS Network Protection" in newer Microsoft documentation, but the Terraform resource name `azurerm_network_ddos_protection_plan` and the post's terminology are still widely used and accurate.
- The `aws_shield_protection_group` `resource_type = "APPLICATION_LOAD_BALANCER"` is valid (other valid values include CLOUDFRONT_DISTRIBUTION, ROUTE_53_HOSTED_ZONE, GLOBAL_ACCELERATOR, CLASSIC_LOAD_BALANCER, ELASTIC_IP_ADDRESS).
- The GCP `layer_7_ddos_defense_config` field uses `enable` (not `enabled`) and `rule_visibility = "STANDARD"` is a valid value (STANDARD or PREMIUM); both are correctly used in the post.
- The `interval_sec` values used in the GCP rule (60 and 300) are within the allowed set (10, 30, 60, 120, 180, 240, 300, 600, 900, 1200, 1800, 2700, 3600).
