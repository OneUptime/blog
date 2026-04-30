# Validation Summary: How to Create GCP Workflows with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud Workflows
- Google Cloud Scheduler
- Google Cloud IAM
- Google service accounts

## Sources Consulted
- Google Cloud Workflows: Grant a workflow permission to access Google Cloud resources — https://cloud.google.com/workflows/docs/authentication
- Google Cloud Workflows: Make authenticated requests from a workflow — https://cloud.google.com/workflows/docs/authenticate-from-workflow
- Google Cloud Workflows: Execute a workflow — https://cloud.google.com/workflows/docs/executing-workflow
- Google Cloud Workflows: Schedule a workflow using Cloud Scheduler — https://cloud.google.com/workflows/docs/schedule-workflow
- Google Cloud Scheduler: Use authentication with HTTP targets — https://cloud.google.com/scheduler/docs/http-target-auth
- Google Cloud Workflows Executions API reference — https://cloud.google.com/workflows/docs/reference/executions/rest/v1/projects.locations.workflows.executions/create
- Terraform Google provider docs for `google_workflows_workflow` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/workflows_workflow.html.markdown
- Terraform Google provider docs for `google_cloud_scheduler_job` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/cloud_scheduler_job.html.markdown
- OpenTofu CLI docs: `tofu plan` — https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: `tofu apply` — https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The IAM comment above `roles/workflows.invoker` was inaccurate. That role is for invoking workflow executions, not for calling generic HTTP endpoints. I corrected the comment to reflect its actual purpose when the same service account is reused by Cloud Scheduler.
- The workflow example used `auth.type: OIDC` with `api.example.com` placeholder URLs. Google documents OIDC for Cloud Run and Cloud Run functions, so I updated the example URLs to Cloud Run functions-style `cloudfunctions.net` endpoints to match the authentication method and the `roles/run.invoker` IAM binding.
- The Cloud Scheduler example posted a request body without a `Content-Type` header. Cloud Scheduler defaults request bodies to `application/octet-stream` when no content type is set, while the Workflows Executions API expects JSON. I added `Content-Type = "application/json"` to the `http_target` headers.

## Review Notes
- The post does not pin a specific Google provider version, so behavior depends on the version in use. The reviewed resource fields and syntax are valid against the current Google provider documentation as of 2026-04-30.
- The OpenTofu CLI was not installed in the local workspace, so command validation for `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` was done against the official OpenTofu documentation rather than local `--help` output.
- Reusing one service account for both the workflow runtime and the Cloud Scheduler caller is technically valid, but separate service accounts would be a tighter least-privilege design.
