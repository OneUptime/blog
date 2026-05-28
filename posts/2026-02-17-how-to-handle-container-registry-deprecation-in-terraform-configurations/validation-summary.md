# Validation Summary: How to Handle Container Registry Deprecation in Terraform Configurations

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Container Registry
- Google Artifact Registry
- Terraform Google provider
- Google Kubernetes Engine
- Cloud Build
- Cloud Run
- Google Cloud CLI

## Sources Consulted
- Google Cloud Artifact Registry documentation: Transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Artifact Registry documentation: Manual migration to gcr.io repositories / upgrade redirection: https://docs.cloud.google.com/artifact-registry/docs/transition/manual-gcr-repositories
- Google Cloud Artifact Registry documentation: Repository and image names: https://docs.cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud Artifact Registry documentation: Access control with IAM, including GKE access scopes: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Terraform Google provider documentation: google_artifact_registry_repository: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- Terraform Google provider documentation: google_artifact_registry_vpcsc_config: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_vpcsc_config
- Terraform Google provider documentation: google_cloud_run_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service
- Terraform Google provider release notes v6.28.0: https://github.com/hashicorp/terraform-provider-google/releases/tag/v6.28.0

## Issues Found
- The post said GCR had no dedicated Terraform resource while also listing `google_container_registry`. Updated the explanation to clarify that `google_container_registry` exists but only ensures the backing Cloud Storage bucket exists.
- The description referred to a future deprecation deadline. Updated it to reflect that Container Registry shutdown for writes took effect on March 18, 2025.
- The Artifact Registry repository example described `docker_config.immutable_tags = false` as enabling vulnerability scanning. Updated the comment to describe Docker tag mutability instead.
- The GKE example said Workload Identity is required for Artifact Registry authentication. Updated the comment because GKE image pulls are controlled by node service account permissions and access scopes; Workload Identity is optional for workload API access.
- The Terraform state section said `terraform apply` would apply only the new Artifact Registry resources. Updated the wording because the command applies the current configuration plan, not only selected resources.
- The gcr.io redirection section used `google_artifact_registry_vpcsc_config`, which manages Artifact Registry VPC Service Controls behavior and does not enable gcr.io upgrade redirection. Replaced it with the documented `gcloud artifacts settings enable-upgrade-redirection` commands.
- The migration order described gcr.io redirection as a general safety net. Updated it to clarify that redirection applies when using Artifact Registry `gcr.io` repositories, not the `pkg.dev` repository path used in the main examples.

## Review Notes
The Cloud Run example still uses the first-generation `google_cloud_run_service` resource. The Terraform provider recommends `google_cloud_run_v2_service` for broader Cloud Run feature support, but `google_cloud_run_service` remains documented and valid, so no correction was required.
