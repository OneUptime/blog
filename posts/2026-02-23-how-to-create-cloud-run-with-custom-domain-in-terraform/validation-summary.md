# Validation Summary: How to Create Cloud Run with Custom Domain in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Google Cloud Provider for Terraform
- Google Cloud Run
- Cloud Run domain mappings
- Google Cloud Load Balancing
- Serverless Network Endpoint Groups
- Cloud DNS
- Artifact Registry
- Secret Manager
- Cloud IAM

## Sources Consulted
- Google Cloud Run documentation: Mapping custom domains - https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Google Cloud Load Balancing documentation: Set up a global external Application Load Balancer with Cloud Run, App Engine, or Cloud Run functions - https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud Run documentation: Deploying container images to Cloud Run - https://docs.cloud.google.com/run/docs/deploying
- Google Cloud Run documentation: Allowing public unauthenticated access - https://docs.cloud.google.com/run/docs/authenticating/public
- Google Artifact Registry documentation: Transition from Container Registry - https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Terraform Google provider documentation: google_cloud_run_v2_service - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Terraform Google provider documentation: google_cloud_run_domain_mapping - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_domain_mapping
- Terraform Google provider documentation: google_compute_region_network_endpoint_group - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_network_endpoint_group
- Terraform Google provider documentation: google_compute_backend_service - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The post described Cloud Run domain mapping as production-ready and suitable for most use cases. Current Google Cloud documentation marks Cloud Run domain mappings as preview, limited availability, region-limited, and not recommended for production services. Updated the introduction, domain mapping section, load balancer section, and conclusion to present the global external Application Load Balancer as the production recommendation.
- The post used Container Registry (`gcr.io`) and enabled `containerregistry.googleapis.com`. Container Registry is shut down for writes as of March 18, 2025, and Artifact Registry is the recommended container registry. Updated the API and image URL format to use Artifact Registry.
- The Cloud Run service snippet referenced a Secret Manager secret that was not defined and did not ensure the secret version or IAM access existed before service creation. Added the Secret Manager API, example secret resources, secret accessor IAM binding, and explicit dependencies.
- The DNS snippet used the service domain as the managed zone DNS name, which is incorrect when mapping a subdomain. Added a separate `dns_zone_name` variable for the Cloud DNS managed zone.
- The DNS snippet created a CNAME record for every domain while also creating A and AAAA records for apex domains. Apex domains cannot use CNAME records with other records at the same name, so the CNAME record is now created only for non-apex domains.
- The post referenced `var.is_apex_domain` without declaring it. Added the variable declaration.
- The load balancer snippet omitted the Compute Engine API and did not identify the backend and forwarding rules as `EXTERNAL_MANAGED` for the global external Application Load Balancer flow. Added the Compute API resource and `load_balancing_scheme = "EXTERNAL_MANAGED"` where appropriate.
- The introductory billing statement said you only pay during request processing. That depends on CPU allocation and scaling settings, especially with minimum instances. Updated the wording.

## Review Notes
Terraform CLI is not installed in the workspace, so I could not run `terraform validate`. The Terraform examples were reviewed manually against the current Google Cloud and HashiCorp provider documentation. The public access snippet that grants `roles/run.invoker` to `allUsers` remains technically valid, although current Cloud Run documentation recommends disabling the Invoker IAM check for public services in many cases.
