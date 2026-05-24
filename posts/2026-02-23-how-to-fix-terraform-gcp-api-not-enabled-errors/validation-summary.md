# Validation Summary: How to Fix Terraform GCP API Not Enabled Errors

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (HashiCorp Configuration Language / HCL)
- Google Cloud Platform (GCP)
- Terraform Google Cloud Provider (`hashicorp/google`)
- `google_project_service` resource
- `google_compute_instance` resource
- `google_compute_network` resource
- `google_project` resource
- gcloud CLI (Google Cloud SDK)
- GCP Service Usage API
- GCP IAM roles and permissions
- Bash scripting

## Sources Consulted
- Terraform Google Cloud Provider docs — `google_project_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service
- Terraform Google Cloud Provider docs — `google_compute_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Google Cloud Provider docs — `google_project`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project
- gcloud services CLI reference: https://cloud.google.com/sdk/gcloud/reference/services
- GCP Service Usage API documentation: https://cloud.google.com/service-usage/docs
- GCP IAM roles reference (Service Usage): https://cloud.google.com/iam/docs/understanding-roles#service-usage-roles
- Google Cloud API library (for verifying API service names like compute.googleapis.com, storage.googleapis.com, sqladmin.googleapis.com, container.googleapis.com, run.googleapis.com, cloudkms.googleapis.com, etc.)

## Issues Found
No technical issues found.

Verified specifics:
- `gcloud services enable` syntax with both single and multiple service arguments is correct.
- The `--project`, `--enabled`, `--available`, `--filter`, and `--format` flags on `gcloud services` are valid.
- `google_project_service` resource arguments (`project`, `service`, `disable_on_destroy`, `disable_dependent_services`) are correct, and the documented default value of `disable_on_destroy = true` is accurate.
- `google_compute_instance` fields (`name`, `machine_type`, `zone`, `boot_disk.initialize_params.image`, `network_interface.network`) are correct. The `e2-medium` machine type and `debian-cloud/debian-11` image family are valid.
- `google_compute_network` fields (`name`, `auto_create_subnetworks`, `project`) are correct.
- `google_project` fields (`name`, `project_id`, `org_id`, `billing_account`) are correct.
- All GCP service names referenced (compute.googleapis.com, storage.googleapis.com, container.googleapis.com, sqladmin.googleapis.com, iam.googleapis.com, cloudresourcemanager.googleapis.com, servicenetworking.googleapis.com, dns.googleapis.com, logging.googleapis.com, monitoring.googleapis.com, cloudfunctions.googleapis.com, run.googleapis.com, artifactregistry.googleapis.com, pubsub.googleapis.com, secretmanager.googleapis.com, cloudkms.googleapis.com, cloudbuild.googleapis.com, networkmanagement.googleapis.com, redis.googleapis.com, memcache.googleapis.com, file.googleapis.com) match official GCP API identifiers.
- IAM role names (`roles/owner`, `roles/editor`, `roles/serviceusage.serviceUsageAdmin`) and the `serviceusage.services.enable` permission are correct.
- `gcloud projects add-iam-policy-binding` syntax with `--member` and `--role` flags is correct.
- The bash array syntax `"${apis[@]}"` for expanding into separate gcloud arguments works as described.
- The Terraform resource-to-API mapping table accurately reflects which API each provider resource family depends on.

## Review Notes
- The post is up to date with the current Terraform Google Cloud Provider (5.x/6.x) and gcloud SDK at the time of review.
- `debian-11` images remain available on GCP but Debian 12 (`debian-cloud/debian-12`) is the current default for many examples; the existing choice is still valid and functional.
- The note that `depends_on` "handles the timing" is reasonable in practice: `google_project_service` performs a wait on the enablement operation, but propagation delays can still cause flaky applies for very fast follow-on resource creations. The post correctly mentions the propagation delay separately.
- `cloudresourcemanager.googleapis.com` being mapped to `google_project_iam_*` resources is a reasonable simplification — in some cases `iam.googleapis.com` is also required, but Resource Manager is the primary API gating project-level IAM bindings.
