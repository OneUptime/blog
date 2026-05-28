# Validation Summary: How to Fix SSL Certificate Provisioning Stuck in Pending

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Run
- Cloud Run domain mappings
- Google-managed SSL certificates
- Cloud DNS
- DNS A, AAAA, CNAME, and CAA records
- Google Cloud CLI
- Cloudflare CDN/proxy behavior
- Global external Application Load Balancer

## Sources Consulted
- Google Cloud Run custom domain mapping documentation: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Google Cloud SDK reference for `gcloud beta run domain-mappings describe`: https://cloud.google.com/sdk/gcloud/reference/beta/run/domain-mappings/describe
- Google Cloud SDK reference for `gcloud beta run domain-mappings create`: https://cloud.google.com/sdk/gcloud/reference/beta/run/domain-mappings/create
- Google Cloud SDK reference for `gcloud beta run domain-mappings delete`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/run/domain-mappings/delete
- Google Cloud SDK reference for `gcloud domains`: https://docs.cloud.google.com/sdk/gcloud/reference/domains
- Google Cloud SDK reference for `gcloud dns record-sets create`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Google Cloud Load Balancing Google-managed SSL certificate documentation: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud Load Balancing SSL certificate overview: https://docs.cloud.google.com/load-balancing/docs/ssl-certificates
- Google Trust Services site: https://pki.goog/
- Let's Encrypt CAA documentation: https://letsencrypt.org/docs/caa/

## Issues Found
- The post used `gcloud run domain-mappings` for fully managed Cloud Run. Current Google Cloud documentation uses `gcloud beta run domain-mappings` for Cloud Run domain mappings, while the unqualified SDK reference still describes Cloud Run for Anthos. Updated the describe, delete, and create commands to use `gcloud beta run domain-mappings`.
- The post stated Cloud Run automatically provisions certificates using "Let's Encrypt (or Google Trust Services)." Google Cloud Run documentation describes this as a Google-managed certificate, without promising a specific CA. Updated the explanation to say Google automatically provisions and renews a Google-managed SSL certificate.
- The CAA section said users need to allow both `letsencrypt.org` and `pki.goog`. Official sources identify `pki.goog` with Google Trust Services and `letsencrypt.org` with Let's Encrypt, but Cloud Run documentation does not state that both are always required. Updated the wording to allow Google Trust Services and include Let's Encrypt when the existing setup or status output indicates it.
- The Cloudflare section focused only on the orange-cloud proxy. Google Cloud Run documentation specifically warns that third-party CDN providers can intercept validation requests and gives Cloudflare's "Always use HTTPS" setting as an example. Updated the fix to include both DNS-only mode and disabling "Always use HTTPS" during certificate provisioning.
- The load balancer section called the global HTTP(S) load balancer an alternative. Current Cloud Run documentation recommends the global external Application Load Balancer approach for production custom domains and notes Cloud Run domain mappings are Preview with limited availability. Updated the wording to reflect that recommendation.

## Review Notes
Cloud Run domain mappings are currently documented as Preview, limited availability, and not recommended for production services. The post remains useful as a troubleshooting guide for existing Cloud Run domain mappings, but a future revision could more prominently mention the Preview status and regional limitations.
