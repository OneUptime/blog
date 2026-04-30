# Validation Summary: How to Deploy Cloud Run Services with OpenTofu on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Google Cloud Platform (GCP)
- Google Cloud Run
- Google Cloud IAM
- Google Cloud Service Usage API
- `gcloud` CLI
- HashiCorp Google provider

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- Google provider `google_cloud_run_v2_service` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/cloud_run_v2_service.html.markdown
- Google provider Cloud Run v2 IAM docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/cloud_run_v2_service_iam.html.markdown
- Google provider `google_project_service` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_project_service.html.markdown
- Google provider `google_service_account` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_service_account.html.markdown
- Cloud Run concurrency docs: https://cloud.google.com/run/docs/configuring/concurrency
- Cloud Run traffic migration docs: https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Cloud Run public access docs: https://cloud.google.com/run/docs/authenticating/public
- Cloud Run v2 REST reference for traffic targets: https://cloud.google.com/run/docs/reference/rest/v2/projects.locations.services
- `gcloud auth application-default login` reference: https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login

## Issues Found
- The original post did not deploy a Cloud Run service at all. It enabled unrelated APIs, created only a service account and a project-level Viewer binding, and never defined a Cloud Run resource. I replaced that with a `google_cloud_run_v2_service` example using the current Cloud Run v2 resource.
- The provider constraint was pinned to `~> 5.0`, which is outdated relative to the current provider line. I updated the example to `~> 7.0`.
- The API list was inaccurate for this tutorial. I replaced the Compute, GKE, Resource Manager, Logging, and Monitoring APIs with Cloud Run, Artifact Registry, and IAM, which match the revised deployment example.
- The post claimed to cover concurrency, traffic splitting, and IAM access, but the configuration did not include any of them. I added a validated `container_concurrency` variable, dynamic Cloud Run `traffic` blocks, and a `google_cloud_run_v2_service_iam_member` resource granting `roles/run.invoker`.
- The monitoring example was unrelated to the article scope and also referenced an undefined variable (`notification_channel_ids`). I replaced that section with Cloud Run invoker IAM configuration.
- The outputs were incomplete for a Cloud Run deployment. I added a `service_url` output using the Cloud Run service `uri`.
- The original deployment section had no concrete traffic-splitting example. I added a follow-up `tofu apply` example that uses an existing revision name, which is required for split traffic to a specific revision.
- The original post omitted a prerequisite for managing project services through `google_project_service`. I added the Service Usage API prerequisite.

## Review Notes
- Traffic splitting to a named revision only works after at least one Cloud Run revision already exists, so the example keeps the default at 100% to the latest revision for the initial deployment.
- The post now uses Cloud Run v2 resources and current field names such as `max_instance_request_concurrency`, `service_account`, `traffic.type`, and `uri`.
- Local `tofu` and `terraform` binaries were not available in this environment, so validation was performed against official documentation rather than by executing `tofu validate`.
