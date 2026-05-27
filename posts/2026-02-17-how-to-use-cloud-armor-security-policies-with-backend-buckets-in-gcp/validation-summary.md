# Validation Summary: How to Use Cloud Armor Security Policies with Backend Buckets in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Armor
- Cloud Armor edge security policies
- Google Cloud backend buckets
- Cloud Storage
- Cloud CDN
- External Application Load Balancers
- Google Cloud CLI
- Cloud Logging logs-based metrics

## Sources Consulted
- Google Cloud Armor: Configure security policies - https://docs.cloud.google.com/armor/docs/configure-security-policies
- Google Cloud Armor: Security policy overview - https://docs.cloud.google.com/armor/docs/security-policy-overview
- Google Cloud Armor: Custom rules language reference - https://docs.cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor: Request logging - https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud Armor: Rate limiting overview - https://docs.cloud.google.com/armor/docs/rate-limiting-overview
- Google Cloud Armor: Preconfigured WAF rules overview - https://docs.cloud.google.com/armor/docs/waf-rules
- Google Cloud Load Balancing: Set up a classic Application Load Balancer with Cloud Storage buckets - https://docs.cloud.google.com/load-balancing/docs/https/ext-load-balancer-backend-buckets
- Google Cloud Load Balancing: Global external Application Load Balancer logging and monitoring - https://docs.cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- Google Cloud SDK: gcloud compute security-policies create - https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud SDK: gcloud compute security-policies rules create - https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud SDK: gcloud compute backend-buckets create - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/create
- Google Cloud SDK: gcloud compute backend-buckets update - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/update
- Google Cloud SDK: gcloud logging metrics create - https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create

## Issues Found
- The geographic restriction example said "US and EU only" while the rule also allowed `GB`, which is a valid ISO 3166-1 alpha-2 region code but not an EU member country. Changed the comment and description to say "the US, Germany, France, and the UK" / "selected countries."
- The log table format referenced `jsonPayload.remoteIp` and `jsonPayload.requestUrl`. External Application Load Balancer request logs expose these common HTTP request fields under `httpRequest.remoteIp` and `httpRequest.requestUrl`. Updated the command accordingly.

## Review Notes
- The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
- Google Cloud's Cloud Armor attach-policy documentation currently has an apparent command typo in the backend bucket section, showing `backend-services update` after saying to use `backend-buckets`. The Google Cloud SDK backend bucket reference confirms `gcloud compute backend-buckets update --edge-security-policy` is the correct command used in the post.
- The post's limitation notes are consistent with official documentation: backend buckets can only use edge security policies, edge policies support a narrower request attribute set, and preconfigured WAF rules are documented for backend services behind load balancers.
