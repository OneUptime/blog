# Validation Summary: How to Configure Automated Response to Cloud Armor Threat Intelligence Signals

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Armor
- Google Threat Intelligence for Cloud Armor
- Cloud Armor Adaptive Protection
- Google Cloud CLI (`gcloud`)
- Cloud Logging log sinks
- Pub/Sub
- Cloud Functions for Python
- Google Cloud Compute Python client library
- Cloud Monitoring alerting policies
- Slack incoming webhooks

## Sources Consulted
- Google Cloud Armor: Apply Google Threat Intelligence: https://docs.cloud.google.com/armor/docs/threat-intelligence
- Google Cloud Armor: Configure security policies: https://docs.cloud.google.com/armor/docs/configure-security-policies
- Google Cloud Armor: Configure rate limiting: https://docs.cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud Armor: Use request logging: https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud Armor: Automatically deploy Adaptive Protection suggested rules: https://docs.cloud.google.com/armor/docs/adaptive-protection-auto-deploy
- Google Cloud SDK: `gcloud compute security-policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud SDK: `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud SDK: `gcloud compute security-policies update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/update
- Google Cloud SDK: `gcloud compute security-policies add-layer7-ddos-defense-threshold-config`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/add-layer7-ddos-defense-threshold-config
- Google Cloud SDK: `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Compute Python client: `SecurityPoliciesClient`: https://docs.cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.security_policies.SecurityPoliciesClient
- Google Cloud Compute Python client: `PatchRuleSecurityPolicyRequest`: https://docs.cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.types.PatchRuleSecurityPolicyRequest

## Issues Found
- The base security policy section said the policy was attached to a backend service, but the commands only created and updated the policy. Added the `gcloud compute backend-services update ... --security-policy` command required to attach the policy.
- The `rate-based-ban` Cloud Armor examples omitted required rate limiting behavior flags. Added `--conform-action=allow`, `--exceed-action=deny-429`, and `--enforce-on-key=IP` to the rate-based ban examples.
- The Cloud Function attempted to read `jsonPayload.enforcedSecurityPolicy.matchedField`, which is not a Cloud Armor request log field. Updated the sample to read the source IP from `httpRequest.remoteIp` and derive policy/rule information from `jsonPayload.enforcedSecurityPolicy`.
- The Cloud Function declared a five-minute time window but only used a simple process-wide integer counter. Updated the sample to use timestamp deques and prune counts outside `TIME_WINDOW_SECONDS`.
- The Cloud Function updated Cloud Armor rules by patching the whole security policy resource. The Compute API documentation says policy patching cannot update rules and that per-rule methods should be used. Updated the sample to use `get_rule`, `patch_rule`, and `add_rule`.
- The Cloud Function hard-coded `/32` for all IP addresses, which would fail for IPv6 sources. Updated it to use Python's `ipaddress.ip_network(..., strict=False)`.
- The Adaptive Protection automatic deployment example used an unsupported `--layer7-ddos-defense-threshold-configs` JSON flag on `security-policies update`. Replaced it with the documented `evaluateAdaptiveProtectionAutoDeploy()` placeholder rule and `gcloud beta compute security-policies update --layer7-ddos-defense-auto-deploy-*` flags.
- The Cloud Monitoring command used non-existent `--condition-threshold-value` and `--condition-threshold-duration` flags. Replaced them with the documented `--if` and `--duration` flags.
- The preview log query referenced `jsonPayload.previewSecurityPolicy.matchedFieldValue`, which is not documented in Cloud Armor request logs. Replaced it with `jsonPayload.previewSecurityPolicy.outcome="DENY"`.

## Review Notes
Google Threat Intelligence for Cloud Armor requires a Cloud Armor Enterprise subscription. The post is now technically accurate for the documented commands and APIs, but production implementations should still account for Cloud Armor rule expression size and rule quotas when automatically appending many IP addresses.
