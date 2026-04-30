# Validation Summary: How to Configure GCP External Load Balancer with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Load Balancing
- Global external Application Load Balancer
- IPv6
- Terraform
- gcloud CLI
- Cloud DNS
- Google-managed SSL certificates

## Sources Consulted
- Google Cloud: IPv6 for Application Load Balancers and proxy Network Load Balancers - https://cloud.google.com/load-balancing/docs/ipv6
- Google Cloud: Forwarding rules overview - https://cloud.google.com/load-balancing/docs/forwarding-rule-concepts
- Google Cloud: Set up a global external Application Load Balancer with VM instance group backends - https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- Google Cloud SDK reference: `gcloud compute forwarding-rules create` - https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud: Add, update, and delete records - https://cloud.google.com/dns/docs/records
- Google Cloud SDK reference: `gcloud dns record-sets create` - https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Terraform Registry: `google_compute_global_address` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_address
- Terraform Registry: `google_compute_global_forwarding_rule` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule
- Terraform Registry: `google_compute_managed_ssl_certificate` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate

## Issues Found
- The post described the modern global external Application Load Balancer, but the Terraform and `gcloud` forwarding rule examples omitted the `EXTERNAL_MANAGED` load balancing scheme. I added `load_balancing_scheme = "EXTERNAL_MANAGED"` to the backend service and forwarding rules, and added `--load-balancing-scheme=EXTERNAL_MANAGED` to the `gcloud compute forwarding-rules create` example so the configuration matches current Google Cloud guidance.
- The backend explanation implied a simple IPv6-to-IPv4 translation model. I corrected it to reflect the documented behavior: the load balancer terminates the IPv6 client connection and uses IPv4 to the backend by default, while IPv6 backend connections are possible only with dual-stack backends and an IP address selection policy.
- The verification section used `ping6`, which is not a reliable validation method for an HTTP(S) Application Load Balancer frontend, and included an application-specific `X-Debug-IP` example that would not generally verify anything. I replaced that with a DNS AAAA lookup and generic log or echo-endpoint guidance for validating `X-Forwarded-For`.

## Review Notes
- Global IPv6 forwarding rules use a `/64` IPv6 range. Google Cloud CLI commonly displays the range using the address whose lower 64 bits are zero; this is expected behavior.
- Dual-stack backend connectivity is not required for the frontend IPv6 setup shown here. If a future revision covers IPv6 connections from the load balancer to backends, it should also mention supported backend types and IP address selection policy requirements.
