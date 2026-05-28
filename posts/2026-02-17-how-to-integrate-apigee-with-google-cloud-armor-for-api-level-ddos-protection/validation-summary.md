# Validation Summary: How to Integrate Apigee with Google Cloud Armor for API-Level DDoS Protection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Apigee X
- Google Cloud Armor
- Google Cloud external Application Load Balancer
- Private Service Connect and managed instance group northbound routing for Apigee
- Google Cloud CLI
- Apigee SpikeArrest policy
- Cloud Logging and Cloud Monitoring

## Sources Consulted
- Google Cloud Apigee networking options: https://docs.cloud.google.com/apigee/docs/api-platform/get-started/networking-options
- Google Cloud Apigee northbound networking with Private Service Connect: https://docs.cloud.google.com/apigee/docs/api-platform/system-administration/northbound-networking-psc
- Google Cloud Armor rate limiting configuration: https://cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud Armor Adaptive Protection overview: https://docs.cloud.google.com/armor/docs/adaptive-protection-overview
- Google Cloud Armor Adaptive Protection auto-deploy documentation: https://docs.cloud.google.com/armor/docs/adaptive-protection-auto-deploy
- Google Cloud Armor preconfigured WAF rules documentation: https://docs.cloud.google.com/armor/docs/configure-waf
- Google Cloud Armor request logging documentation: https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud external Application Load Balancer logging and monitoring: https://cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- Google Cloud SDK reference for `gcloud compute security-policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud SDK reference for `gcloud compute security-policies update`: https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/update
- Google Cloud SDK reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud SDK reference for `gcloud compute backend-services update`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK reference for `gcloud alpha monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Apigee SpikeArrest policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/spike-arrest-policy

## Issues Found
- The post said Apigee X already uses a managed instance group behind a load balancer and that Google creates the runtime load balancer. Current Apigee documentation describes user-managed northbound routing through an external Application Load Balancer, commonly using PSC NEGs, with the MIG approach as an older pattern. Updated the architecture and Step 1 wording to cover PSC and MIG backends accurately.
- The Cloud Armor security policy commands did not explicitly create a global `CLOUD_ARMOR` backend policy. Added `--type=CLOUD_ARMOR` and `--global` where relevant, and added `--global` to backend service and security policy rule commands for the global external Application Load Balancer path described in the post.
- The Adaptive Protection explanation said it automatically suggests or applies rules just by enabling the feature. Updated it to state that Adaptive Protection suggests mitigation rules, and auto-deployment requires an `evaluateAdaptiveProtectionAutoDeploy()` placeholder rule.
- The WAF examples used `evaluatePreconfiguredExpr(...)`. Current Cloud Armor documentation uses `evaluatePreconfiguredWaf(...)` with a sensitivity configuration for the preconfigured WAF rule sets. Updated the SQL injection and XSS examples.
- The SpikeArrest example included `<MessageWeight ref="spike_weight"/>` without defining the referenced flow variable, and described smoothing while also setting `<UseEffectiveCount>true</UseEffectiveCount>`, which uses the distributed sliding-window algorithm rather than smoothing. Removed the undefined `MessageWeight` line and corrected the surrounding wording.
- The Cloud Monitoring alert command used unsupported flags `--condition-threshold-value` and `--condition-threshold-duration`. Updated the command to use the documented `--if='> 1000'` and `--duration=300s` flags.
- The monitoring text claimed the sample alert specifically detects Cloud Armor blocks, but the metric filter matches all load balancer 4xx responses. Adjusted the wording to say it detects a surge of 4xx responses, such as Cloud Armor blocks.
- The post stated Adaptive Protection takes about a week before models can effectively detect anomalies. Current documentation says up to one hour may be needed to generate rules, with effectiveness improving as more baseline traffic is observed. Updated that caveat.

## Review Notes
The guide now matches the current Google Cloud documentation for Apigee northbound routing, Cloud Armor policy attachment, rate limiting, preconfigured WAF rules, Adaptive Protection behavior, request logging, and the referenced gcloud command syntax. The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK references rather than local `--help` output.
