# Validation Summary: How to Create GCP Cloud Composer Environments with Terraform

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- Google Cloud Platform (GCP)
- GCP Cloud Composer 2 (managed Apache Airflow)
- Apache Airflow 2.x
- Google Kubernetes Engine (GKE) Autopilot
- GCP Cloud Storage (DAG bucket)
- GCP Secret Manager (Airflow secrets backend)
- GCP Cloud KMS (CMEK)
- GCP IAM (service accounts, roles)
- hashicorp/google Terraform provider

## Sources Consulted
- Terraform Registry / provider source: `google_composer_environment` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/composer_environment (cross-checked against the provider markdown in hashicorp/terraform-provider-google on GitHub)
- Terraform Registry: `google_service_account` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account
- Terraform Registry: `google_project_iam_member` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- Terraform Registry: `google_storage_bucket_object` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_object
- Terraform Registry: `google_project_service` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service
- GCP Cloud Composer versioning overview — https://cloud.google.com/composer/docs/concepts/versioning/composer-versions
- GCP Cloud Composer "Configure Secret Manager" docs — https://cloud.google.com/composer/docs/secret-manager
- GCP Cloud Composer "Blocked Airflow configurations" docs — https://cloud.google.com/composer/docs/composer-2/airflow-configurations
- GCP Cloud Composer environment scaling / workloads — https://cloud.google.com/composer/docs/composer-2/scale-environments

## Issues Found
One technical error was found and fixed:

- **DAG upload bucket extraction was invalid.** In the "Managing DAG Deployment" section, the `google_storage_bucket_object.sample_dag` resource set `bucket = replace(google_composer_environment.basic.config[0].dag_gcs_prefix, "gs://", "")`. The `dag_gcs_prefix` attribute is in the form `gs://<bucket-name>/dags`, so after the `replace` the value is `<bucket-name>/dags` — which is not a valid bucket name and would cause the apply to fail. Fixed by wrapping with `split("/", ...)[0]` to extract only the first path segment (the bucket name), and added a short inline comment explaining why.

All other code, resource arguments, enum values, and explanations match the official provider/cloud documentation:

- `google_project_service` for `composer.googleapis.com` and `container.googleapis.com` with `disable_on_destroy = false` — correct.
- Service account + IAM bindings (`roles/composer.worker`, `roles/storage.objectViewer`, `roles/bigquery.dataEditor`, `roles/secretmanager.secretAccessor`) — valid role names and standard pattern.
- `software_config` with `image_version`, `airflow_config_overrides` (using the `<section>-<key>` convention), `pypi_packages`, and `env_variables` — all correct.
- `workloads_config` sub-blocks `scheduler { cpu, memory_gb, storage_gb, count }`, `web_server { cpu, memory_gb, storage_gb }`, `worker { cpu, memory_gb, storage_gb, min_count, max_count }` — all match the provider schema.
- `private_environment_config` fields `enable_private_endpoint`, `cloud_sql_ipv4_cidr_block`, `master_ipv4_cidr_block`, `cloud_composer_network_ipv4_cidr_block` — all valid Composer 2 attributes. CIDR sizes (`/28` for master, `/24` for the others) satisfy documented minimums.
- `node_config` with `service_account`, `network`, `subnetwork`, and `ip_allocation_policy { cluster_secondary_range_name, services_secondary_range_name }` — correct.
- `encryption_config { kms_key_name }` for CMEK — correct.
- `environment_size = "ENVIRONMENT_SIZE_SMALL"` / `"ENVIRONMENT_SIZE_MEDIUM"` — valid enum values.
- `resilience_mode = "HIGH_RESILIENCE"` — valid Composer 2 value (the other being `STANDARD_RESILIENCE`).
- Outputs `config[0].dag_gcs_prefix`, `config[0].airflow_uri`, `config[0].gke_cluster` — all real attributes exposed by the resource.
- Airflow Secret Manager backend override (`secrets-backend` / `secrets-backend_kwargs`) — the `secrets` section is not on Composer's blocked list, and this is the documented way to enable the Secret Manager backend.
- Claim that "Composer 2 uses GKE Autopilot under the hood" — confirmed by GCP versioning docs (Composer 2 = GKE Autopilot VPC-native; Composer 3 abstracts the cluster).

## Review Notes
- The post pins `image_version = "composer-2.9.7-airflow-2.9.3"`. The `composer-2.9.7-airflow-*` family is a real Gen 2 release line, and a `2.9.3` Airflow build pairing is plausible, but readers should run `gcloud composer environments list-image-versions` to confirm an exact build is still available in their region before applying. Composer image versions are deprecated and removed over time.
- `pypi_packages` constraints like `"apache-airflow-providers-google" = ">=10.0.0"` can conflict with the version preinstalled in the Composer image; Composer will reject incompatible upgrades. Readers should consult the image's preinstalled package list before pinning floors.
- The `triggerer { cpu, memory_gb, count }` sub-block under `workloads_config` is also supported (for deferrable operators) but is not shown in the post — this is an acceptable omission, not an error.
- `prevent_destroy = true` only stops `terraform destroy`/replace operations triggered by Terraform; it does not stop manual deletions via the console or `gcloud`. The post's phrasing ("prevent accidental destruction") is accurate but readers should not treat it as a full safeguard.
- The `node_config.network`/`subnetwork` and `ip_allocation_policy.*_secondary_range_name` values are sourced from `var.*` placeholders — the post correctly assumes the caller provides a VPC with pre-allocated secondary ranges for pods and services, which matches Composer 2 / GKE Autopilot requirements.
