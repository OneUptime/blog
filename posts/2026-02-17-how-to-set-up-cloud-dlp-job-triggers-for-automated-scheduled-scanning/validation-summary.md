# Validation Summary: How to Set Up Cloud DLP Job Triggers for Automated Scheduled Scanning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP
- Cloud DLP Python client library
- BigQuery inspection jobs
- Cloud Storage inspection jobs
- Pub/Sub notifications
- Cloud Security Command Center summaries
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Sensitive Data Protection job trigger guide: https://cloud.google.com/sensitive-data-protection/docs/creating-job-triggers
- Google Cloud Sensitive Data Protection job trigger concepts: https://cloud.google.com/sensitive-data-protection/docs/concepts-job-triggers
- Cloud DLP JobTrigger REST reference: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/projects.jobTriggers
- Cloud DLP InspectJobConfig REST reference: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/InspectJobConfig
- Cloud DLP Action REST reference: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/Action
- Cloud DLP FileType REST reference: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/FileType
- Supported file types and scanning modes: https://cloud.google.com/sensitive-data-protection/docs/supported-file-types
- Google Cloud CLI alpha DLP job trigger reference: https://cloud.google.com/sdk/gcloud/reference/alpha/dlp/job-triggers
- Terraform Google provider `google_data_loss_prevention_job_trigger` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_loss_prevention_job_trigger

## Issues Found
- The post described Pub/Sub as receiving DLP findings. Cloud DLP's Pub/Sub action publishes a job-completion notification containing the DLP job name, not detailed findings. Updated the explanation, code comment, topic name, and production tip to describe Pub/Sub notifications accurately.
- The Cloud Storage example used `file_types: ["TEXT_FILE", "CSV", "JSON"]`, but `JSON` is not a valid `FileType` enum. Updated it to `["TEXT_FILE", "CSV"]`; `TEXT_FILE` covers JSON and JSONL extensions, while `CSV` enables CSV handling.
- The Cloud Storage example built a URL as `gs://bucket/prefix`, which can target a single object named `prefix` instead of files under that prefix. Updated the snippet to construct `gs://bucket/prefix/*` or `gs://bucket/*`.
- The gcloud examples used `gcloud dlp job-triggers` and an `update --status` command. Current official gcloud documentation exposes these commands under `gcloud alpha dlp job-triggers` and does not document a job-trigger `update` command. Updated list, describe, and delete commands to use `gcloud alpha`, and replaced pause/resume commands with a note to use the API or client libraries.
- The production tips implied BigQuery identifying fields or timestamp columns focus scans on new rows. Identifying fields only help map findings back to source rows. Updated the tip to describe `timespan_config` for incremental Cloud Storage and BigQuery scans and identifying fields for row mapping.
- The Security Command Center action was described as sending findings. Updated the comment and wording to clarify that it publishes a findings summary.

## Review Notes
Cloud DLP is now part of Sensitive Data Protection, but the Cloud Data Loss Prevention API and `google.cloud.dlp_v2` client names remain current. The Python snippets were checked for syntax, but live API execution was not run because it requires a configured Google Cloud project, enabled API, IAM permissions, datasets, buckets, Pub/Sub topic, and billing.
