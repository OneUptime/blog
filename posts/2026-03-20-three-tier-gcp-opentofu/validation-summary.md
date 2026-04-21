# Validation Summary: How to Build a Three-Tier Web Application Architecture with OpenTofu on GCP

## Status
validated

## Post Type
Tutorial / infrastructure-as-code guide

## Technologies Covered
- Google Cloud VPC
- Private Service Access and Service Networking
- Cloud Run
- Serverless VPC Access
- Cloud Load Balancing
- Serverless network endpoint groups
- Cloud Armor
- Cloud SQL for PostgreSQL
- Secret Manager
- OpenTofu/Terraform HCL with the Google provider

## Sources Consulted
- Google Cloud: Cloud Run ingress settings: https://cloud.google.com/run/docs/securing/ingress
- Google Cloud: Cloud Run public unauthenticated access: https://cloud.google.com/run/docs/authenticating/public
- Google Cloud: Cloud Run VPC access connector Terraform sample: https://cloud.google.com/run/docs/samples/cloudrun-vpc-access-connector-parent-tag
- Google Cloud: Cloud Run Secret Manager configuration: https://cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud: Artifact Registry transition from Container Registry: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud: Artifact Registry Docker image naming: https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- Google Cloud: Cloud SQL for PostgreSQL private services access: https://cloud.google.com/sql/docs/postgres/configure-private-services-access
- Google Cloud: Cloud SQL for PostgreSQL private IP: https://cloud.google.com/sql/docs/postgres/configure-private-ip
- Google Cloud: Cloud SQL for PostgreSQL machine series: https://cloud.google.com/sql/docs/postgres/machine-series-overview
- Google Cloud: Cloud SQL for PostgreSQL backup retention Terraform sample: https://cloud.google.com/sql/docs/postgres/samples/cloud-sql-postgres-instance-backup-retention
- Google Cloud: Cloud SQL for PostgreSQL high availability: https://cloud.google.com/sql/docs/postgres/high-availability
- Google Cloud: Cloud SQL for PostgreSQL availability: https://cloud.google.com/sql/docs/postgres/availability
- Google Cloud: Serverless NEG concepts: https://cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- Google Cloud: Global external Application Load Balancer with Cloud Run: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud Armor: integrating with Cloud Run and serverless NEGs: https://cloud.google.com/armor/docs/integrating-cloud-armor
- Terraform Registry: google_cloud_run_v2_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Terraform Registry: google_sql_database_instance: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Registry: google_compute_backend_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Terraform Registry: google_compute_region_network_endpoint_group: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_network_endpoint_group

## Issues Found
- The Cloud Run image used a `gcr.io` Container Registry path. Container Registry is deprecated and Artifact Registry is the recommended/current service for container images, so the image was changed to the Artifact Registry URL format: `us-central1-docker.pkg.dev/${var.project_id}/app/app:latest`.
- The Cloud Run service was intended to sit behind a load balancer and Cloud Armor, but the snippet did not restrict direct internet ingress to the `run.app` endpoint or configure public invocation for load-balancer traffic. Added `ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"` and `invoker_iam_disabled = true` so internet traffic is expected to flow through the external Application Load Balancer while the service can receive unauthenticated web requests.
- The Cloud SQL PostgreSQL tier used `db-n1-standard-4`, which is not the current machine type format shown for Cloud SQL for PostgreSQL Enterprise dedicated-core instances. Updated it to the equivalent custom machine type `db-custom-4-15360`.

## Review Notes
- The snippets still assume surrounding resources that are not shown, including provider configuration, API enablement, the Artifact Registry repository, Secret Manager resources, service account IAM grants, load balancer URL map/proxy/certificate/IP resources, and the Cloud Armor policy. The reviewed resource schemas and claims are now correct, but a future version would be stronger with a complete runnable module.
- Serverless VPC Access connectors remain supported for Cloud Run private egress, but Google Cloud now recommends Direct VPC egress when it is available for the workload.
- Local OpenTofu/Terraform validation was not run because neither `tofu` nor `terraform` is installed in this workspace.
