# Validation Summary: How to Configure IAP for Internal Application Load Balancers in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy
- Google Cloud internal Application Load Balancer
- Google Cloud VPC networking
- Google Cloud DNS
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud IAP: Enable IAP for Compute Engine: https://cloud.google.com/iap/docs/enabling-compute-howto
- Google Cloud IAP: Enable IAP using a Google-managed OAuth client: https://cloud.google.com/iap/docs/managed-oauth-client
- Google Cloud IAP: Migrate from the IAP OAuth Admin API: https://cloud.google.com/iap/docs/deprecations/migrate-oauth-client
- Google Cloud Load Balancing: Set up a regional internal Application Load Balancer with VM instance group backends: https://cloud.google.com/load-balancing/docs/l7-internal/setting-up-l7-internal
- Google Cloud Load Balancing: Internal Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/l7-internal
- Google Cloud VPC: Private Google Access: https://cloud.google.com/vpc/docs/private-google-access
- Google Cloud VPC: Configure Private Google Access: https://cloud.google.com/vpc/docs/configure-private-google-access
- Google Cloud SDK: gcloud iap web add-iam-policy-binding: https://cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Terraform Registry: google_compute_region_backend_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_backend_service
- Terraform Registry: google_iap_web_region_backend_service_iam: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iap_web_region_backend_service_iam

## Issues Found
- Private Google Access was listed as a prerequisite for the IAP browser authentication flow. Private Google Access applies to Google Cloud VM instances without external IP addresses reaching Google APIs and services; it does not provide browser access to Google Sign-In. I changed the prerequisite and Step 7 to require browser access to Google Sign-In, while keeping Private Google Access as an optional setting for internal-only backend VMs that need Google API access.
- The gcloud and Terraform examples used global health checks with a regional internal Application Load Balancer. Google Cloud's current regional internal Application Load Balancer examples use regional health checks, so I updated the commands and Terraform resource to use regional health checks consistently.
- The Terraform `iap` block omitted `enabled = true` and referenced `google_iap_client`, which is no longer a good default because the IAP OAuth Admin API is deprecated and Google-managed OAuth clients are the current path for new IAP resources. I changed the Terraform example to `iap { enabled = true }`, matching the gcloud example's Google-managed OAuth client behavior.
- The SSL certificate Terraform comment implied `google_compute_region_ssl_certificate` was for managed certificates. That resource represents a regional SSL certificate using supplied certificate material in the example, so I removed the inaccurate managed-certificate wording.

## Review Notes
The command examples for regional internal Application Load Balancer resources, regional backend service IAP enablement, and regional IAP IAM binding match the current Google Cloud documentation. The post intentionally uses placeholder project, subnet, instance group, certificate, and DNS values that readers must replace for their environment.
