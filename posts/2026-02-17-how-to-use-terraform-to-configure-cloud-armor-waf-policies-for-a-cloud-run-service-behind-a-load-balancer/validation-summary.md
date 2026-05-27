# Validation Summary: How to Use Terraform to Configure Cloud Armor WAF Policies for a Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Google Cloud Armor
- Google Cloud Load Balancing
- Serverless Network Endpoint Groups
- Terraform Google provider
- Google Cloud CLI
- Cloud Logging

## Sources Consulted
- Google Cloud Armor preconfigured WAF rules overview: https://docs.cloud.google.com/armor/docs/waf-rules
- Google Cloud Armor custom rules language reference: https://cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor rate limiting configuration: https://cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud Armor request logging: https://cloud.google.com/armor/docs/request-logging
- Google Cloud Armor Adaptive Protection overview: https://docs.cloud.google.com/armor/docs/adaptive-protection-overview
- Google Cloud Armor Adaptive Protection auto-deploy: https://docs.cloud.google.com/armor/docs/adaptive-protection-auto-deploy
- Cloud Run ingress restriction documentation: https://cloud.google.com/run/docs/securing/ingress
- Cloud Load Balancing serverless NEG overview: https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- Cloud Load Balancing with Cloud Run and Cloud Armor: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-https-serverless
- Terraform Google provider `google_compute_security_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy
- Terraform Google provider `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Terraform Google provider `google_compute_region_network_endpoint_group`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_network_endpoint_group
- Cloud Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language

## Issues Found
- The Cloud Armor WAF examples used `evaluatePreconfiguredExpr()`, which current Google Cloud Armor documentation marks as deprecated. I changed those examples to `evaluatePreconfiguredWaf()` for the SQLi, XSS, LFI, RFI, RCE, scanner detection, and preview-mode snippets.
- The Adaptive Protection snippet had a comment implying `rule_visibility` enables auto-deployment. Current documentation requires `evaluateAdaptiveProtectionAutoDeploy()` placeholder rules and auto-deploy configuration for automatic deployment, while `rule_visibility` controls rule transparency. I updated the comment to describe `STANDARD` visibility accurately.
- The Cloud Logging example compared string fields without quotes. I updated the filter to quote `http_load_balancer` and the interpolated policy name, matching the Cloud Logging query language examples.

## Review Notes
The Terraform structure and Google Cloud architecture are technically valid for a Cloud Run service behind an external Application Load Balancer with a serverless NEG and backend security policy. Adaptive Protection auto-deploy is not fully configured in the post; the snippet only enables Layer 7 DDoS defense, which is accurate after the comment correction.
