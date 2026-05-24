# Validation Summary: How to Create GCP Network Endpoint Groups with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Google provider (~> 5.0)
- Google Cloud Platform (GCP)
- GCP Network Endpoint Groups (NEGs) — zonal, serverless, internet, hybrid
- Cloud Run
- Cloud Functions
- GCP Global HTTPS Load Balancer (backend service, URL map, target HTTPS proxy, forwarding rule, managed SSL certificate)
- GCP Health Checks
- GCP VPC networking (network and subnetwork)

## Sources Consulted
- Terraform Google provider documentation for `google_compute_network_endpoint_group`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network_endpoint_group
- Terraform Google provider documentation for `google_compute_network_endpoint`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network_endpoint
- Terraform Google provider documentation for `google_compute_region_network_endpoint_group`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_network_endpoint_group
- Terraform Google provider documentation for `google_compute_global_network_endpoint_group`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_network_endpoint_group
- Terraform Google provider documentation for `google_compute_global_network_endpoint`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_network_endpoint
- Terraform Google provider documentation for `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Terraform Google provider documentation for `google_cloud_run_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service
- Terraform Google provider documentation for `google_compute_health_check`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_health_check
- GCP documentation on Network Endpoint Groups overview: https://cloud.google.com/load-balancing/docs/negs
- GCP documentation on Serverless NEGs: https://cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- GCP documentation on Internet NEGs: https://cloud.google.com/load-balancing/docs/negs/internet-neg-concepts

## Issues Found
No technical issues found. All Terraform resource names, argument names (`network_endpoint_type`, `default_port`, `cloud_run.service`, `cloud_function.function`, `url_mask`, `fqdn`, `port`, `balancing_mode`, `max_rate_per_endpoint`, `health_checks`, etc.), valid enum values (`GCE_VM_IP_PORT`, `SERVERLESS`, `INTERNET_FQDN_PORT`, `RATE`), and nested block structures match the current Google provider schema. The NEG type categorization (zonal, serverless, internet, hybrid) accurately reflects GCP's documented offerings.

## Review Notes
- The post uses `google_cloud_run_service` (Cloud Run v1 API resource). This still works, but the Google provider now also offers `google_cloud_run_v2_service`, which is the recommended resource for new deployments. Either is valid; the post's v1 usage is not incorrect.
- The provider pin `~> 5.0` is reasonable; the Google provider 5.x line is widely deployed. Newer 6.x releases are also available but the post's code does not rely on any 6.x-only features.
- The Cloud Run URL mask example uses just `<service>` as the mask. This is syntactically valid; in production, the mask typically encodes additional path/host structure (e.g., `<service>.example.com/<service>/*`), but the simplified form is fine for illustrating the attribute.
- For the internet NEG, both `default_port = 443` on the group and per-endpoint `port = 443` are set — the per-endpoint value would take precedence, but this is harmless duplication, not an error.
