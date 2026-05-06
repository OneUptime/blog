# Validation Summary: How to Configure GCP External HTTP(S) Load Balancer for IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Cloud Load Balancing / global external Application Load Balancer
- Compute Engine managed instance groups
- Google Cloud CLI (`gcloud`)
- Google-managed SSL certificates
- Cloud CDN

## Sources Consulted
- Global external Application Load Balancer with VM instance group backends — https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- HTTP-to-HTTPS redirect for global external Application Load Balancers — https://cloud.google.com/load-balancing/docs/https/setting-up-global-http-https-redirect
- External Application Load Balancer overview — https://cloud.google.com/load-balancing/docs/https
- Use Google-managed SSL certificates — https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- `gcloud compute instance-templates create` reference — https://cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- `gcloud compute health-checks create http` reference — https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- `gcloud compute backend-services create` reference — https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- `gcloud compute backend-services add-backend` reference — https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- `gcloud compute url-maps create` reference — https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/create
- `gcloud compute url-maps validate` reference — https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/validate
- `gcloud compute url-maps import` reference — https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/import
- `gcloud compute target-http-proxies create` reference — https://cloud.google.com/sdk/gcloud/reference/compute/target-http-proxies/create
- `gcloud compute target-https-proxies create` reference — https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- `gcloud compute forwarding-rules create` reference — https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- `gcloud compute addresses create` reference — https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create

## Issues Found

1. **The original commands mixed load balancer generations.** The backend service and forwarding rules were created without `--load-balancing-scheme=EXTERNAL_MANAGED`, which would not match the current global external Application Load Balancer configuration described by the rest of the post. Updated the backend service and both forwarding rules to use `EXTERNAL_MANAGED`, and made the global IPv4/Premium-tier frontend settings explicit.

2. **The HTTP frontend did not actually redirect to HTTPS.** Pointing an HTTP proxy at the same URL map as the HTTPS proxy serves plain HTTP; it does not create a redirect. Replaced that section with a redirect-only URL map, added validation/import commands, and pointed the HTTP proxy at the redirect URL map instead.

3. **The redirect URL map validation needed an explicit load-balancing scheme.** A redirect-only URL map does not reference a backend, so `gcloud compute url-maps validate` defaults to `EXTERNAL` unless `--load-balancing-scheme=EXTERNAL_MANAGED` is supplied. Added that flag so the example validates against the intended load balancer type.

4. **The firewall and network example was inconsistent with the VM template.** The instance template did not specify `prod-vpc`, but the firewall rule targeted `prod-vpc`, so the example resources could end up in different networks. Introduced a `NETWORK` variable, used it in the instance template and firewall rule, and defaulted it to `default` for a self-consistent example.

5. **The firewall rule exposed the wrong backend ports.** The backend service uses HTTP on the named port `http:80`, so allowing `tcp:443` on the VM backends was inaccurate. Restricted the rule to `tcp:80` and clarified that the same source ranges cover both GFE proxy traffic and health checks for instance-group backends.

6. **The health check duration flags were not in the documented format.** Updated `--check-interval` and `--timeout` to `10s` and `5s` to match the current CLI reference format.

7. **The certificate renewal note was too absolute.** The original conclusion implied that DNS resolution alone guarantees managed certificate renewal. Updated the wording to reflect that DNS must continue pointing at the load balancer and certificate validation must keep succeeding.

## Review Notes
- The post title uses the older "External HTTP(S) Load Balancer" naming. Current Google Cloud documentation generally refers to this `EXTERNAL_MANAGED` configuration as a global external Application Load Balancer.
- The example now uses `NETWORK="default"` for consistency. Readers using a custom VPC must change that variable to their own network and, if needed, specify an appropriate subnet.
- The post is intentionally IPv4-focused. Google documents additional IPv6 source ranges for dual-stack backends, but those are out of scope for this article.
