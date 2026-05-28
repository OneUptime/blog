# Validation Summary: How to Configure Named IP Lists in Cloud Armor for Dynamic IP Allowlisting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Armor
- Cloud Armor named IP address lists
- Google Threat Intelligence feeds
- Google Cloud CLI
- Cloud Logging
- Bash, curl, jq

## Sources Consulted
- Google Cloud Armor: Apply Google Threat Intelligence and use named IP address lists: https://docs.cloud.google.com/armor/docs/threat-intelligence
- Google Cloud Armor custom rules language reference: https://cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor request logging: https://cloud.google.com/armor/docs/request-logging
- gcloud compute security-policies list-preconfigured-expression-sets: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/list-preconfigured-expression-sets
- gcloud compute security-policies rules create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- gcloud compute security-policies rules update: https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/update
- gcloud compute security-policies create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- gcloud compute backend-services update: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update

## Issues Found
- Cloud Armor named IP address lists are deprecated. Added this caveat and noted Google's recommendation to use Google Threat Intelligence feeds where appropriate.
- The post overstated provider coverage. Corrected the supported named IP list providers to Cloudflare, Fastly, and Imperva.
- The command `gcloud compute security-policies describe-named-ip-lists` is not a documented gcloud command. Replaced it with documented provider-published IP range URLs and the documented `list-preconfigured-expression-sets --filter="id:sourceiplist"` command.
- Official named IP address list examples use `gcloud beta compute security-policies rules create`. Updated named-list rule examples accordingly.
- The bot example used a nonexistent `sourceiplist-google` named IP list. Replaced it with the documented `evaluateThreatIntelligence('iplist-search-engines-crawlers')` feed and added `has(request.headers['user-agent'])` checks before reading the header.
- The logging example referenced `jsonPayload.remoteIp`, but load balancer request IPs are exposed through `httpRequest.remoteIp`. Updated the output format.
- The explanation about spoofing a Cloudflare IP was misleading for HTTP traffic. Reworded it to describe verification of traffic that comes from an allowed provider range.
- The limitations section incorrectly suggested availability varied by region. Updated it to reflect deprecation, Cloud Armor Enterprise requirements, documented exceptions, and supported provider-list limits.
- The custom update script produced a trailing comma with `tr '\n' ','`. Replaced it with `paste -sd, -` to generate a cleaner comma-separated list.

## Review Notes
The post is technically relevant and remains useful for existing Cloud Armor Enterprise configurations that still use named IP address lists. For new implementations, a future rewrite should consider centering the guide on Google Threat Intelligence feeds because named IP address lists are deprecated.
