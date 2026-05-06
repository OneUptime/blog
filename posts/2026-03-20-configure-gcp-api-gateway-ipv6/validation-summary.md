# Validation Summary: How to Configure GCP API Gateway with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud API Gateway
- Google Cloud Load Balancing
- Serverless Network Endpoint Groups (NEGs)
- IPv6 networking
- `gcloud` CLI
- Terraform
- `curl`
- DNS

## Sources Consulted
- Google Cloud API Gateway load balancing guide: https://cloud.google.com/api-gateway/docs/gateway-load-balancing
- Google Cloud tutorial for API Gateway with serverless NEGs: https://cloud.google.com/api-gateway/docs/gateway-serverless-neg
- Google Cloud Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/application-load-balancer
- Google Cloud IPv6 load balancing guide: https://cloud.google.com/load-balancing/docs/ipv6
- `gcloud api-gateway api-configs create` reference: https://cloud.google.com/sdk/gcloud/reference/api-gateway/api-configs/create
- `gcloud api-gateway gateways create` reference: https://cloud.google.com/sdk/gcloud/reference/api-gateway/gateways/create
- `gcloud beta compute network-endpoint-groups create` reference: https://cloud.google.com/sdk/gcloud/reference/beta/compute/network-endpoint-groups/create
- `gcloud compute backend-services create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- `gcloud compute forwarding-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Terraform `google_compute_global_address` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_address
- Terraform `google_compute_global_forwarding_rule` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The serverless NEG example used the wrong command shape for API Gateway. I changed it to `gcloud beta compute network-endpoint-groups create`, removed unrelated empty Cloud Run/Cloud Functions/App Engine flags, and corrected `--serverless-deployment-platform` to `apigateway.googleapis.com`, which is the documented value for API Gateway.
- The NEG section claimed it targeted the API Gateway FQDN, but the documented `--serverless-deployment-resource` value for API Gateway is the gateway ID. I removed the unused hostname lookup and corrected the description.
- The load balancer commands explicitly set `--load-balancing-scheme=EXTERNAL`, which creates a classic Application Load Balancer. Because the post describes a global external Application Load Balancer path, I changed the backend service and forwarding rule examples to `EXTERNAL_MANAGED`.
- The Terraform forwarding rule snippet omitted `load_balancing_scheme`, so it would default to `EXTERNAL`. I added `load_balancing_scheme = "EXTERNAL_MANAGED"` and switched `ip_address` to the reserved address resource ID for a cleaner and documented reference.
- The IPv6 verification example used `curl` against the raw IPv6 literal with only an HTTP `Host` header. That does not preserve the TLS SNI hostname. I replaced it with `curl --resolve ... https://api.example.com/` so the hostname is preserved for certificate validation and routing while still connecting to the IPv6 address.
- The introduction did not mention that API Gateway integration through serverless NEGs is currently a Preview feature. I added that caveat because Google documents the feature as Preview as of April 16, 2026.

## Review Notes
- Google documents API Gateway load balancing through serverless NEGs as a Preview feature as of April 16, 2026.
- Google also notes that API Gateway does not support ingress controls to disable the service-generated gateway URL, so the load balancer does not become the only possible entry point to the gateway.
