# Validation Summary: How to Set Up an External HTTP Load Balancer with Managed SSL Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud Load Balancing / classic external Application Load Balancer
- Google-managed SSL certificates
- Google Cloud CLI (`gcloud`)
- DNS A and AAAA records
- HTTP to HTTPS redirects

## Sources Consulted
- Google Cloud: Set up a classic Application Load Balancer with a managed instance group backend: https://docs.cloud.google.com/load-balancing/docs/https/ext-https-lb-simple
- Google Cloud: Use Google-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud: Troubleshoot SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting
- Google Cloud: Set up an HTTP-to-HTTPS redirect for a classic Application Load Balancer: https://cloud.google.com/load-balancing/docs/https/setting-up-http-https-redirect
- Google Cloud: Cloud Load Balancing pricing: https://cloud.google.com/load-balancing/pricing
- Google Cloud SDK reference: `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK reference: `gcloud compute target-https-proxies create`: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- Google Cloud SDK reference: `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create

## Issues Found
- The prerequisites did not mention that instance group backends need a named port matching the backend service `--port-name=http`. Added the named port requirement.
- DNS propagation was described as taking up to 48 hours. Google Cloud documentation states propagation can take up to 72 hours, so the timing was corrected.
- The backend service and forwarding rule commands relied on implicit load balancing scheme defaults. Added `--load-balancing-scheme=EXTERNAL` to match the classic external Application Load Balancer command path documented by Google.
- The certificate validation explanation incorrectly described Google-managed certificate validation as an HTTP-01 challenge. Replaced it with Google Cloud's documented A/AAAA record and forwarding rule visibility requirement.
- The HTTP-to-HTTPS redirect URL map import omitted `--global`. Added it to match the documented global URL map import command.
- The certificate status check only returned `managed.status`, but the post discussed `FAILED_NOT_VISIBLE`, which is a domain status. Updated the command to return both `managed.status` and `managed.domainStatus`, and revised the explanation accordingly.
- The troubleshooting note only mentioned A records. Added the AAAA record caveat for IPv6 configurations, matching Google Cloud's certificate visibility requirements.

## Review Notes
The commands align with the classic external Application Load Balancer flow. For new deployments, Google Cloud also documents the global external Application Load Balancer path using `EXTERNAL_MANAGED`, but changing the tutorial to that mode would be a larger rewrite than needed for validation.
