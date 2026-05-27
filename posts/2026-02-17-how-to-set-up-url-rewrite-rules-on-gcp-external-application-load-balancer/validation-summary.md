# Validation Summary: How to Set Up URL Rewrite Rules on GCP External Application Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud External Application Load Balancer
- Google Cloud URL maps
- URL rewrite rules
- `gcloud compute` CLI
- YAML URL map configuration

## Sources Consulted
- Google Cloud Compute Engine REST reference for URL maps: https://docs.cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud Load Balancing URL maps overview: https://docs.cloud.google.com/load-balancing/docs/url-map-concepts
- Google Cloud traffic management overview for Application Load Balancers: https://docs.cloud.google.com/load-balancing/docs/https/traffic-management
- Google Cloud URL rewrite setup guide: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-url-rewrite
- Google Cloud SDK reference for `gcloud compute url-maps import`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/import
- Google Cloud SDK reference for `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud setup guide for global external Application Load Balancers with VM instance group backends: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute

## Issues Found
- Backend service creation commands omitted `--load-balancing-scheme=EXTERNAL_MANAGED`. The `gcloud` default is `EXTERNAL`, which targets classic load balancers, so I added the explicit scheme for the external Application Load Balancer covered by the post.
- The canary example referenced `api-canary-backend` without creating it in the setup commands. I added a matching backend service creation command.
- URL map import examples used `--source=-` and did not specify `--global`. Official CLI docs state that omitting `--source` reads from standard input, and these examples use global backend service resources, so I changed the imports to `gcloud compute url-maps import app-url-map --global <<'EOF'`.
- The "Full Path Rewrite with Template" section described a template rewrite but used `fullPathMatch`, `prefixMatch`, and `pathPrefixRewrite`. I changed it to a path-template rewrite using `pathTemplateMatch` and `pathTemplateRewrite`.
- The host rewrite explanation implied that the backend receives a full rewritten HTTPS URL. I changed it to state that the backend receives the rewritten path and Host header.
- The common pattern about using host rewrites for client-region-based routing was inaccurate because host rewrite changes the Host header after route selection; it does not route by client region. I replaced it with an origin host normalization pattern.
- The combined-features section said "header-based routing" but the example used header actions and weighted backends. I corrected the wording.

## Review Notes
The workspace does not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK documentation rather than local `--help` output.
