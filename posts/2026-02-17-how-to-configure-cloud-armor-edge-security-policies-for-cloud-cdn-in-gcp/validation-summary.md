# Validation Summary: How to Configure Cloud Armor Edge Security Policies for Cloud CDN in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Google Cloud Armor
- Cloud Armor edge security policies
- Cloud CDN
- Cloud Load Balancing backend services and backend buckets
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring

## Sources Consulted
- Google Cloud Armor security policy overview: https://docs.cloud.google.com/armor/docs/security-policy-overview
- Configure Cloud Armor security policies: https://docs.cloud.google.com/armor/docs/configure-security-policies
- Cloud Armor custom rules language reference: https://docs.cloud.google.com/armor/docs/rules-language-reference
- Cloud Armor request logging: https://docs.cloud.google.com/armor/docs/request-logging
- Cloud Armor monitoring: https://docs.cloud.google.com/armor/docs/monitoring
- Google Cloud Monitoring metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- gcloud compute security-policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- gcloud compute security-policies rules create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- gcloud compute backend-services update reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- gcloud compute backend-buckets update reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/update
- gcloud alpha monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create

## Issues Found
- The post stated that rate limiting is not available for edge security policies. Current Cloud Armor documentation lists throttle and rate-based-ban actions for global edge security policies, so the text and feature table were updated to show rate limiting as supported.
- The Cloud Monitoring alert command used unsupported flags (`--condition-threshold-value` and `--condition-threshold-duration`) and a non-existent load-balancing edge security metric. It was updated to use the documented `--if` and `--duration` flags with the Cloud Armor metric `networksecurity.googleapis.com/https/request_count` filtered by `metric.labels.blocked="true"` on `network_security_policy`.

## Review Notes
The core Cloud CDN and Cloud Armor explanation is accurate: edge security policies are enforced before Cloud CDN cache lookup, backend policies apply only to cache misses that reach the backend service, and only edge security policies can be attached to backend buckets. The CLI examples for creating policies, adding rules, and attaching policies to backend services and backend buckets match current Google Cloud CLI documentation.
