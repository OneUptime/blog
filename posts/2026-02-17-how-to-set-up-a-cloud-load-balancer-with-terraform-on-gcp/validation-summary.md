# Validation Summary: How to Set Up a Cloud Load Balancer with Terraform on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud external Application Load Balancer
- Terraform Google provider
- Compute Engine instance groups
- Cloud Run serverless NEGs
- Google-managed SSL certificates
- Cloud CDN
- Cloud Armor
- Cloud DNS

## Sources Consulted
- Google Cloud Load Balancing: External Application Load Balancer overview: https://docs.cloud.google.com/load-balancing/docs/https
- Google Cloud Load Balancing: Serverless NEG backend setup: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-https-serverless
- Google Cloud Load Balancing: Google-managed SSL certificates: https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Terraform Google provider: google_compute_backend_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Terraform Google provider source docs: google_compute_backend_service: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_backend_service.html.markdown
- Terraform Google provider source docs: google_compute_global_forwarding_rule: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_global_forwarding_rule.html.markdown
- Terraform Google provider source docs: google_compute_region_network_endpoint_group: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_region_network_endpoint_group.html.markdown
- Terraform Google provider source docs: google_compute_managed_ssl_certificate: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_managed_ssl_certificate.html.markdown
- Terraform Google provider source docs: google_compute_health_check: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_health_check.html.markdown
- Terraform Google provider source docs: google_compute_url_map: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_url_map.html.markdown
- Terraform Google provider source docs: google_compute_backend_bucket: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_backend_bucket.html.markdown
- Terraform Google provider source docs: google_compute_security_policy: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_security_policy.html.markdown
- Terraform Google provider source docs: google_dns_record_set: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/dns_record_set.html.markdown

## Issues Found
- The introduction said a single HTTPS load balancer requires health checks. Google Cloud documents that serverless NEG backends do not support or require health checks, while VM and zonal NEG backends do. Updated the wording to distinguish those backend types.
- The introduction said the guide covered custom headers, but the post does not include custom request or response header configuration. Updated the wording to say the guide covers CDN and security policies.
- The VM instance group backend example omitted the required firewall rule allowing Google Front Ends and health check probes to reach backend VMs. Added a minimal Terraform firewall example for source ranges `35.191.0.0/16` and `130.211.0.0/22` on the backend port.

## Review Notes
- The examples are composable snippets and still assume supporting resources such as `google_compute_instance.web_1`, `google_compute_instance.web_2`, `google_compute_backend_service.api`, `google_storage_bucket.static_assets`, `google_dns_managed_zone.main`, and `google_compute_network.main` exist elsewhere.
- Compute Engine Google-managed SSL certificates are valid for global external Application Load Balancers and classic Application Load Balancers. Certificate Manager is the recommended alternative for several newer or regional certificate scenarios.
