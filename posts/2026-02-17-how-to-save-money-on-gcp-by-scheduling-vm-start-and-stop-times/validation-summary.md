# Validation Summary: How to Save Money on GCP by Scheduling VM Start and Stop Times

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Compute Engine VM instances
- Compute Engine instance schedules and resource policies
- Google Cloud CLI
- Cloud Scheduler
- Cloud Functions / Cloud Run functions
- Python
- Terraform Google provider
- Cloud Monitoring

## Sources Consulted
- Google Cloud documentation: Scheduling a VM instance to start and stop - https://cloud.google.com/compute/docs/instances/schedule-instance-start-stop
- Google Cloud SDK reference: `gcloud compute resource-policies create instance-schedule` - https://cloud.google.com/sdk/gcloud/reference/compute/resource-policies/create/instance-schedule
- Google Cloud SDK reference: `gcloud scheduler jobs create http` - https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Google Cloud SDK reference: `gcloud functions deploy` - https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Compute Engine REST API reference: `instances.list` filtering - https://cloud.google.com/compute/docs/reference/rest/v1/instances/list
- Cloud Run functions documentation: Specify dependencies in Python - https://cloud.google.com/functions/docs/writing/specifying-dependencies-python
- Terraform Registry: `google_compute_resource_policy` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_resource_policy
- Terraform Registry: `google_compute_instance` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Registry: `google_compute_resource_policy_attachment` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_resource_policy_attachment

## Issues Found
- The Python Cloud Function example imported `googleapiclient.discovery` but did not show a `requirements.txt`. Added a minimal `requirements.txt` snippet with `google-api-python-client` and `functions-framework`, matching Google Cloud's Python dependency guidance.
- The Compute Engine API filter strings used a less precise combined expression. Updated them to parenthesized AIP-160-style filters, which are documented for `instances.list`.
- The monitoring `gcloud compute instances list` filters were updated to the same documented parenthesized filter style.
- The Terraform example attached the resource policy using `.id`; the Google provider documents `resource_policies` as a list of self links. Updated the snippet to use `google_compute_resource_policy.dev_hours.self_link`.
- The holiday-awareness Python snippet used `datetime.date.today()` without importing `datetime`. Added the missing import.
- The buffer-time best practice mentioned boot and app startup time but omitted the documented instance schedule delay. Updated it to note that instance schedules can take up to 15 minutes to begin an operation.

## Review Notes
The post is technically relevant and the main approach is current. Instance schedules have additional operational limitations not fully covered in the post, including same-region attachment, one schedule per VM, no scheduled stops for instances with Local SSD disks, and no capacity guarantees for scheduled starts. These are not blockers for the tutorial examples but are worth mentioning in a future expansion.
