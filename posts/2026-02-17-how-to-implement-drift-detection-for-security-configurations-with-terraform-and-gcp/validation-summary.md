# Validation Summary: How to Use Drift Detection for Security Configurations with Terraform and GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Terraform CLI and Terraform plan JSON
- Google Cloud Build
- Google Cloud Scheduler
- Google Pub/Sub
- Google Cloud client libraries for Python
- BigQuery SQL
- Google Cloud Terraform provider resources

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- Google Cloud Build substitutions documentation: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Cloud Build `projects.triggers.run` REST API: https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.triggers/run
- Google Cloud Build Python client reference: https://docs.cloud.google.com/python/docs/reference/cloudbuild/latest/google.cloud.devtools.cloudbuild_v1.services.cloud_build.CloudBuildClient
- Google Cloud Scheduler Terraform provider documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/cloud_scheduler_job.html.markdown
- Google Cloud Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Terraform provider IAM resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_project_iam.html.markdown
- Google Terraform provider Cloud SQL resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/sql_database_instance.html.markdown
- Google Terraform provider Cloud Storage bucket documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket.html.markdown
- Google Terraform provider Cloud Armor security policy documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_security_policy.html.markdown

## Issues Found
- The Cloud Build example used `PROJECT_ID` inside the Python script, but Cloud Build substitutions are not available as environment variables unless mapped. Added `options.automapSubstitutions: true`.
- The analyzer read `resource_changes` first. Terraform plan JSON has `resource_drift` specifically for changes detected by comparing refreshed remote objects to prior state, so the analyzer now uses `resource_drift` when present and falls back to `resource_changes`.
- The analyzer's nested attribute helper handled dictionaries only. Terraform plan JSON can represent nested blocks as lists, so the helper now traverses lists and can detect drift in nested blocks such as Cloud SQL `settings.ip_configuration`.
- The post mentioned IAM conditions and Cloud Armor policies, but the analyzer did not check IAM `condition` fields or `google_compute_security_policy`. Added those security-relevant attributes and resource type.
- Pub/Sub publishing is asynchronous in the Python client. The alert publisher now waits for each publish future to complete with `future.result(timeout=60)`.

## Review Notes
- The examples assume the referenced Cloud Build trigger, Pub/Sub topic, report bucket, Terraform backend bucket, and service account permissions already exist.
- The Cloud Scheduler URL shown is valid for global Cloud Build triggers. Regional triggers should use the regional Cloud Build trigger endpoint.
