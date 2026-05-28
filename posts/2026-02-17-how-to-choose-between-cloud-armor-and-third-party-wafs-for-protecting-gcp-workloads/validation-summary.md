# Validation Summary: How to Choose Between Cloud Armor and Third-Party WAFs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Armor
- Google Cloud Application Load Balancing
- Cloud CDN
- GKE Ingress
- Google Cloud CLI
- OWASP ModSecurity Core Rule Set
- reCAPTCHA bot management
- Third-party WAFs including Cloudflare, AWS WAF, Imperva, Akamai, and F5

## Sources Consulted
- Google Cloud Armor preconfigured WAF rules overview: https://docs.cloud.google.com/armor/docs/waf-rules
- Set up preconfigured WAF rules: https://docs.cloud.google.com/armor/docs/configure-waf
- Cloud Armor rules language reference: https://docs.cloud.google.com/armor/docs/rules-language-reference
- Configure Cloud Armor security policies: https://docs.cloud.google.com/armor/docs/configure-security-policies
- Configure Cloud Armor rate limiting: https://cloud.google.com/armor/docs/configure-rate-limiting
- Cloud Armor Adaptive Protection overview: https://docs.cloud.google.com/armor/docs/adaptive-protection-overview
- Automatically deploy Adaptive Protection suggested rules: https://docs.cloud.google.com/armor/docs/adaptive-protection-auto-deploy
- Cloud Armor bot management overview: https://docs.cloud.google.com/armor/docs/bot-management
- Apply Google Threat Intelligence named IP address lists: https://cloud.google.com/armor/docs/threat-intelligence
- Google Cloud Armor pricing: https://cloud.google.com/armor/pricing

## Issues Found
- The WAF rule examples used the deprecated `evaluatePreconfiguredExpr()` operator. Updated both SQL injection and XSS examples to use the current `evaluatePreconfiguredWaf()` operator.
- The named IP address list capability was described as a way to block traffic from specific geographies. Updated it to describe named IP lists as provider IP range lists, because geo matching is handled separately through attributes such as `origin.region_code`.
- The pricing section described Cloud Armor Standard as free and used the older Managed Protection Plus product name. Updated the wording to reflect current Cloud Armor Standard request/policy/rule charges and Cloud Armor Enterprise pay-as-you-go or annual subscription pricing.

## Review Notes
The rate limiting example, geo-blocking expression, backend service policy attachment command, WAF rule names, Adaptive Protection description, and bot management references are consistent with current Google Cloud documentation. The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud documentation rather than local `--help` output.
