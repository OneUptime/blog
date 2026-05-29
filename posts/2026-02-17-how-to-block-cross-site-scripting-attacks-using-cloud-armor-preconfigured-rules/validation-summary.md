# Validation Summary: How to Block Cross-Site Scripting Attacks Using Cloud Armor Preconfigured Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Armor
- Cloud Armor preconfigured WAF rules
- OWASP Core Rule Set
- Google Cloud CLI
- Cloud Logging
- Cross-site scripting protection

## Sources Consulted
- Google Cloud Armor: Set up preconfigured WAF rules: https://docs.cloud.google.com/armor/docs/configure-waf
- Google Cloud Armor: Preconfigured WAF rules overview: https://docs.cloud.google.com/armor/docs/waf-rules
- Google Cloud Armor: Tune preconfigured WAF rules: https://docs.cloud.google.com/armor/docs/rule-tuning
- Google Cloud Armor: Custom rules language reference: https://docs.cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor: Request logging: https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud CLI reference: gcloud compute security-policies create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud CLI reference: gcloud compute security-policies rules create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud CLI reference: gcloud compute security-policies rules update: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/update

## Issues Found
- The post used deprecated `evaluatePreconfiguredExpr()` examples. Updated all WAF expressions to the current `evaluatePreconfiguredWaf()` syntax.
- The post used CRS 3.3 rule set names and signature IDs. Updated examples to current CRS 4.22 stable rule sets, including `xss-v422-stable`, `sqli-v422-stable`, `lfi-v422-stable`, `rfi-v422-stable`, `rce-v422-stable`, and matching `owasp-crs-v042200-*` signature IDs.
- The preview-mode flow first created an enforcing rule and then attempted to create another rule with the same priority in preview mode. Reordered the flow so the rule is created in preview mode first, then enforced with `rules update --no-preview`.
- The sensitivity-level example used exclusion-list behavior to approximate level 1 and created another rule at priority `1000`. Replaced it with `evaluatePreconfiguredWaf('xss-v422-stable', {'sensitivity': 1})` and `rules update`.
- The false-positive exclusion example used legacy list syntax. Replaced it with `opt_out_rule_ids` in the WAF options map.
- The logging examples only checked enforced-policy matches and used CRS 3.3 IDs. Updated monitoring to include both enforced and preview policy fields where relevant and changed XSS signature matching to the CRS 4.22 ID prefix.
- The post implied DOM-based XSS detection generally. Narrowed that claim to client-side template injection patterns when the payload is present in request data, because Cloud Armor evaluates HTTP request data and cannot detect browser-only DOM vulnerabilities that are not present in the request.
- The post said the rules were tuned for low false positives and maintained by Google's security team. Adjusted the wording to match official documentation more closely: the rules are preconfigured WAF rule sets that can be tuned and are provided by Google.

## Review Notes
The local environment did not have `gcloud` installed, so CLI syntax was verified against official Google Cloud CLI reference documentation rather than local `--help` output.
