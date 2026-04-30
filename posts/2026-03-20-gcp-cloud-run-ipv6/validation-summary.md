# Validation Summary: How to Configure Cloud Run with Dual-Stack IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Load Balancing
- Serverless Network Endpoint Groups (NEGs)
- Direct VPC egress
- IPv6 and dual-stack VPC subnets
- `gcloud` CLI
- Terraform with the Google provider

## Sources Consulted
- Cloud Run dual-stack networking: https://cloud.google.com/run/docs/configuring/vpc-dual-stack-subnet
- Cloud Run Direct VPC egress: https://cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Cloud Run VPC connectors: https://cloud.google.com/run/docs/configuring/vpc-connectors
- Global external Application Load Balancer with Cloud Run: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- IPv6 for Application Load Balancers: https://cloud.google.com/load-balancing/docs/ipv6
- `gcloud compute backend-services create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- `gcloud compute forwarding-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- `gcloud run services update` reference: https://cloud.google.com/sdk/gcloud/reference/run/services/update
- Terraform `google_compute_global_forwarding_rule`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule
- Terraform `google_compute_region_network_endpoint_group`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_network_endpoint_group
- Terraform `google_compute_managed_ssl_certificate`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate
- Terraform `google_compute_ssl_certificate`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_ssl_certificate

## Issues Found
- The post referred to a generic "Global HTTP(S) Load Balancer" and mixed classic load balancer defaults with global external Application Load Balancer settings. I updated the wording and the CLI/Terraform examples to use `EXTERNAL_MANAGED`, which matches the current Google Cloud documentation for new global external Application Load Balancer deployments with Cloud Run serverless NEGs.
- The CLI backend service example used `--protocol=HTTPS`, which did not match the current serverless NEG guidance for Cloud Run. I replaced that with the current external-managed backend service configuration used for this load balancer flow.
- The Terraform example was incomplete because it referenced `google_compute_target_https_proxy.cloud_run` without defining that resource, and it did not provide an SSL certificate input for the HTTPS proxy. I added the missing target HTTPS proxy and an `ssl_certificate_id` variable so the example is syntactically complete and usable.
- The Terraform backend service used `protocol = "HTTPS"` and omitted the external-managed load balancing scheme. I corrected it to `protocol = "HTTP"` and `load_balancing_scheme = "EXTERNAL_MANAGED"` to align with current Google Cloud examples for serverless NEG backends.
- The outbound IPv6 section incorrectly showed Serverless VPC Access connectors as an IPv6-capable option. Google Cloud documents that connectors do not support IPv6 traffic, so I removed that example and kept Direct VPC egress on a dual-stack subnet as the valid approach.
- The conclusion implied dual-stack behavior without mentioning the IPv4 frontend requirement for dual-stack DNS. I added a note that production dual-stack DNS also needs an IPv4 frontend and matching `A` record.

## Review Notes
- The post is technically correct after the fixes above.
- The Terraform example now assumes you already have an SSL certificate resource and will pass its ID through `ssl_certificate_id`.
- If the Direct VPC egress subnet uses external IPv6, the Cloud Run service agent needs `roles/compute.publicIpAdmin`, which is now called out in the post.
