# Validation Summary: How to Configure Cloud Armor Header-Based Rules to Block Suspicious User-Agents

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Armor
- Google Cloud CLI
- Cloud Armor custom rules language / CEL expressions
- HTTP User-Agent and request headers
- Cloud Logging
- Cloud Armor rate limiting

## Sources Consulted
- Google Cloud Armor custom rules language reference: https://docs.cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor security policy configuration guide: https://docs.cloud.google.com/armor/docs/configure-security-policies
- Google Cloud SDK reference for `gcloud compute security-policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud SDK reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud SDK reference for `gcloud compute security-policies rules update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/update
- Google Cloud Armor rate limiting configuration guide: https://docs.cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud Armor request logging guide: https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud Armor Threat Intelligence and named IP address lists documentation: https://cloud.google.com/armor/docs/threat-intelligence
- RFC 9110 HTTP Semantics, User-Agent header field: https://www.rfc-editor.org/rfc/rfc9110

## Issues Found
- Removed unnecessary escaped forward slashes from User-Agent regex examples. Cloud Armor uses RE2 patterns through CEL `matches()`, and forward slashes are not regex delimiters in these string patterns, so `curl/`, `java/`, and `Chrome/` are clearer and avoid relying on nonessential slash escapes.
- Changed "Legitimate browsers always send a User-Agent header" to "typically send" and changed "almost always automated" to "often automated." RFC 9110 says a user agent SHOULD send the header unless configured not to, which is not an absolute requirement.
- Replaced the recommendation to verify crawler User-Agents with named IP lists. Cloud Armor named IP address lists are deprecated and provider-maintained lists are not a general crawler verification mechanism; published crawler IP ranges or maintained address groups are more accurate guidance.
- Changed the Cloud Logging filter from `jsonPayload.enforcedSecurityPolicy.configuredAction="DENY"` to `jsonPayload.enforcedSecurityPolicy.outcome="DENY"`. Google Cloud Armor's logging guide recommends filtering denied requests by outcome or status details, and this better matches the stated goal of viewing blocked requests.
- Added `--enforce-on-key=IP` to the throttle example. Cloud Armor's rate limiting examples specify the rate limiting key explicitly, and using IP matches the post's description of per-client throttling.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command validation was performed against the current official Google Cloud SDK command references and Cloud Armor documentation. The post does not show attaching the security policy to a backend service; that is outside the scope of the rule-focused tutorial but would be needed for a complete deployment.
