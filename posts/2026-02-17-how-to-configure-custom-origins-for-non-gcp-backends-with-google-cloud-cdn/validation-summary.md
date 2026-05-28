# Validation Summary: How to Configure Custom Origins for Non-GCP Backends with Google Cloud CDN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud CDN
- Google Cloud external Application Load Balancer
- Internet network endpoint groups (Internet NEGs)
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- HTTPS and Host header configuration
- CORS response headers

## Sources Consulted
- Google Cloud CDN: Set up an external backend with an internet NEG: https://docs.cloud.google.com/cdn/docs/set-up-external-backend-internet-neg
- Google Cloud CDN: External backends specified by using internet NEGs: https://docs.cloud.google.com/cdn/docs/external-backends-internet-neg-overview
- Google Cloud Load Balancing: Internet network endpoint groups overview: https://docs.cloud.google.com/load-balancing/docs/negs/internet-neg-concepts
- Google Cloud SDK: `gcloud compute network-endpoint-groups create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/create
- Google Cloud SDK: `gcloud compute network-endpoint-groups update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/update
- Google Cloud SDK: `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud Load Balancing: Create custom headers in backend services: https://docs.cloud.google.com/load-balancing/docs/https/custom-headers
- Google Cloud SDK: `gcloud compute ssl-certificates create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create
- Terraform Google provider: `google_compute_global_network_endpoint`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_network_endpoint
- Terraform Google provider: `google_compute_global_network_endpoint_group`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_network_endpoint_group
- Terraform Google provider: `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The post claimed and demonstrated backend service health checks for a global Internet NEG. Google Cloud documents that backend services with global Internet NEGs cannot reference health checks. I replaced the health-check step with the required Google Cloud egress IP allowlist lookup and removed the Terraform health check resource.
- The IP endpoint `gcloud` example used `ipAddress=...` inside `--add-endpoint`. The current `gcloud compute network-endpoint-groups update` syntax uses `ip=...` for `internet-ip-port` endpoints. I corrected the command.
- The custom request and response header examples used plural flags (`--custom-request-headers`, `--custom-response-headers`). Current `gcloud` syntax uses repeatable singular flags (`--custom-request-header`, `--custom-response-header`). I corrected the commands.
- The post said Cloud CDN uses the FQDN from the Internet NEG as the default Host header. Google Cloud documents that, without a user-defined request header, the backend service preserves the Host header from the client request to the load balancer. I corrected the explanation.
- The Terraform `google_compute_global_network_endpoint` example passed the NEG `id` where the provider examples use the NEG `name`. I changed it to use `.name`.

## Review Notes
The guide is technically valid after the corrections. For future expansion, it could mention that global Internet NEGs support only one endpoint per NEG and one Internet NEG per backend service, while regional Internet NEGs have different health-check and routing behavior.
