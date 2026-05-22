# Validation Summary: How to Use CDKTF with GCP Provider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform Google provider
- TypeScript
- Google Cloud CLI
- Google Compute Engine
- Google VPC, Cloud Router, Cloud NAT, and firewall rules
- Google Kubernetes Engine (GKE)
- Cloud SQL for PostgreSQL
- Cloud Storage
- Google Cloud IAM and Application Default Credentials

## Sources Consulted
- HashiCorp CDKTF providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- HashiCorp CDKTF application tutorial: https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-applications
- CDKTF Google provider package metadata and generated TypeScript declarations: https://www.npmjs.com/package/@cdktf/provider-google
- Google Cloud SDK Application Default Credentials documentation: https://cloud.google.com/sdk/gcloud/reference/auth/application-default
- Terraform Registry, `google_compute_router_nat`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat
- Terraform Registry, `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry, `google_container_node_pool`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Terraform Registry, `google_sql_database_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Google Cloud SQL private IP documentation: https://docs.cloud.google.com/sql/docs/postgres/configure-private-ip
- Google VPC private services access documentation: https://cloud.google.com/vpc/docs/configure-private-services-access
- Terraform Registry, `google_compute_global_address`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_address
- Terraform Registry, `google_service_networking_connection`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_networking_connection
- Terraform Registry, `google_storage_bucket`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

## Issues Found
- The GKE network policy example configured `networkPolicy` but did not enable the network policy addon. Added `addonsConfig.networkPolicyConfig.disabled: false`, which Terraform requires for GKE network policy to take effect.
- The GKE cluster snippet had a misleading comment saying it enabled Binary Authorization, but the code only configured `releaseChannel`. Updated the comment to describe the release channel accurately.
- The Cloud SQL private IP example set `ipv4Enabled: false` and `privateNetwork` but did not create Private Service Access prerequisites. Added `ComputeGlobalAddress` and `ServiceNetworkingConnection`, changed `privateNetwork` to `network.selfLink`, and added `dependsOn` so the Cloud SQL instance waits for the service networking connection.

## Review Notes
- The service account key workflow is technically valid, but for future updates Google Cloud generally recommends keyless approaches such as Workload Identity Federation or service account impersonation where possible.
- The examples use the current published CDKTF Google provider package, whose generated TypeScript declarations are based on the HashiCorp Google provider schema bundled with that package.
