# Validation Summary: How to Set Up Geo-Based Access Restrictions in Google Cloud Armor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Armor
- Google Cloud CLI (`gcloud`)
- Cloud Armor custom rules language
- Cloud Load Balancing request logs
- Cloud Logging logs-based metrics
- Cloud Monitoring alerting policies
- Terraform Google provider

## Sources Consulted
- Google Cloud Armor: Configure security policies - https://docs.cloud.google.com/armor/docs/configure-security-policies
- Google Cloud Armor: Custom rules language reference - https://docs.cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor: Quotas and limits - https://docs.cloud.google.com/armor/quotas
- Google Cloud Armor: Use request logging - https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud SDK: `gcloud compute security-policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud SDK: `gcloud compute security-policies rules create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud SDK: `gcloud compute security-policies rules update` - https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/update
- Google Cloud SDK: `gcloud logging metrics create` - https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK: `gcloud monitoring policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Load Balancing: Global external Application Load Balancer logging and monitoring - https://cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- Cloud Load Balancing: Health checks overview - https://cloud.google.com/load-balancing/docs/health-check-concepts
- Terraform Registry: `google_compute_security_policy` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy

## Issues Found
- The post used CEL list membership expressions such as `origin.region_code in ['US', 'CA']`. Cloud Armor's documented custom rules language does not list list membership as a supported operation, and custom expressions are limited to five subexpressions per rule. Replaced those expressions with documented `==`, `!=`, `||`, and `&&` comparisons and split the EU allowlist example into multiple rules.
- The security policy creation example omitted `--type=CLOUD_ARMOR`. Added it to make the policy type explicit for a backend Cloud Armor policy.
- The redirect example used `--redirect-type=EXTERNAL_302`, but the current gcloud flag accepts `external-302`. Updated the value.
- The log query displayed `jsonPayload.remoteIpCountry`, which is not the documented Cloud Armor request-data field. Updated it to `jsonPayload.securityPolicyRequestData.remoteIpInfo.region_code`.
- The alerting example used the load balancer request count metric without a valid threshold condition and could not specifically count Cloud Armor-denied geo traffic. Replaced it with a logs-based metric for denied `geo-policy` requests and a Cloud Monitoring threshold policy over that metric.

## Review Notes
Cloud Armor request logs depend on load balancer logging being enabled and are subject to the load balancer log sampling rate. Path matching examples are valid, but Google recommends normalizing paths when URL encoding, case variation, or backslashes might affect matching.
