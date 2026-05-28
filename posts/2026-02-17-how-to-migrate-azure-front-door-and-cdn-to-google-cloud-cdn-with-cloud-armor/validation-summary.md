# Validation Summary: How to Migrate Azure Front Door and CDN to Google Cloud CDN with Cloud Armor

## Status
validated

## Post Type
Migration guide / technical tutorial

## Technologies Covered
- Google Cloud CDN
- Google Cloud Armor
- Google Cloud external HTTP(S) Load Balancing / external Application Load Balancer
- Google Cloud CLI (`gcloud`)
- Cloud DNS
- Azure Front Door
- Azure CDN
- Azure Web Application Firewall

## Sources Consulted
- Google Cloud CDN caching overview: https://cloud.google.com/cdn/docs/caching
- Google Cloud CDN cache modes: https://cloud.google.com/cdn/docs/using-cache-modes
- Google Cloud CDN TTL overrides: https://cloud.google.com/cdn/docs/using-ttl-overrides
- Google Cloud CDN dynamic compression: https://cloud.google.com/cdn/docs/dynamic-compression
- Google Cloud CDN logging: https://cloud.google.com/cdn/docs/logging
- Google Cloud Armor preconfigured WAF rules: https://cloud.google.com/armor/docs/configure-waf
- Google Cloud Armor rules language reference: https://cloud.google.com/armor/docs/rules-language-reference
- `gcloud compute backend-services create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- `gcloud compute backend-services update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- `gcloud compute backend-services add-backend` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- `gcloud compute health-checks create http` reference: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- `gcloud compute security-policies rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- `gcloud compute url-maps add-path-matcher` reference: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/add-path-matcher
- `gcloud dns record-sets update` reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/update

## Issues Found
- The backend setup text said the shown commands covered an instance group or Cloud Run service. The commands only configure an instance group backend, while Cloud Run requires a serverless NEG flow, so the wording was narrowed to instance groups.
- The `USE_ORIGIN_HEADERS` cache-mode example included `--default-ttl`, `--max-ttl`, and `--client-ttl`. Google documentation states default TTL cannot be set with `USE_ORIGIN_HEADERS`, and TTL overrides apply to other cache modes, so those flags were removed from that example.
- The Cloud Armor WAF examples used `evaluatePreconfiguredExpr()`, which Google documents as deprecated. They were updated to `evaluatePreconfiguredWaf()` with the same `sqli-v33-stable` and `xss-v33-stable` rule sets.
- The compression note said Cloud CDN does not compress on the fly at the edge. Cloud CDN now supports dynamic compression with `--compression-mode=AUTOMATIC`, so the note was corrected.
- The logging example referenced `jsonPayload.cacheHit`, but Cloud CDN cache hit status is exposed as `httpRequest.cacheHit`. The command and surrounding text were corrected.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command validation was performed against official Google Cloud CLI reference documentation rather than local `--help` output.
