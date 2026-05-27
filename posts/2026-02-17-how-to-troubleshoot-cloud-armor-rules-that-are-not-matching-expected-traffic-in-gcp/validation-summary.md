# Validation Summary: How to Troubleshoot Cloud Armor Rules That Are Not Matching Expected Traffic

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Armor
- Google Cloud Load Balancing
- Google Cloud CLI
- Cloud Logging
- Cloud Armor custom rules language / CEL
- RE2 regular expressions

## Sources Consulted
- Google Cloud Armor request logging documentation: https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud Armor custom rules language reference: https://docs.cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor security policy overview: https://docs.cloud.google.com/armor/docs/security-policy-overview
- Google Cloud Armor verbose logging documentation: https://docs.cloud.google.com/armor/docs/verbose-logging
- Google Cloud SDK reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud SDK reference for `gcloud compute security-policies rules`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules
- Google Cloud SDK reference for `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK reference for `gcloud logging read`: https://cloud.google.com/sdk/gcloud/reference/logging/read

## Issues Found
- The post used `gcloud compute security-policies rules list`, but the current GA `gcloud compute security-policies rules` command group does not include a `list` command. Changed the example to use `gcloud compute security-policies describe` with `--flatten="rules[]"` and a table projection.
- The post stated that Cloud Armor logs every request evaluation. Google documents that Cloud Armor request logs are part of Cloud Load Balancing logs, logging is disabled by default for new backend services, and logs are subject to the load balancer sampling rate. Updated the text to include those caveats.
- The post listed `matchedFieldType` and `matchedFieldValue` as general Cloud Armor enforcement log fields. These fields are part of verbose logging and are populated for preconfigured WAF rule matches, not custom rules. Replaced the general field list with standard enforcement fields and added the verbose logging caveat.
- The missing-header CEL explanation said the expression fails silently. Google documents that missing map keys return an error and recommends checking key availability with `has()`. Updated the wording while keeping the original troubleshooting point.
- The CDN/X-Forwarded-For example matched the raw header with a regex. Google documents `origin.user_ip` with `--user-ip-request-headers` for trusted upstream client IP extraction. Updated the command sequence to configure `x-forwarded-for` as the user IP header and match with `inIpRange(origin.user_ip, ...)`.
- The geographic logging example used `jsonPayload.enforcedSecurityPolicy.matchedFieldValue`, which is not a general region-code log field. Updated it to use `jsonPayload.securityPolicyRequestData.remoteIpInfo.region_code`.

## Review Notes
The post is technically relevant and useful after the corrections. The examples assume a global backend service; regional backend services would require `--region` instead of `--global` where applicable.
