# Validation Summary: How to Automate Toil Reduction with Cloud Workflows and Cloud Scheduler on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workflows
- Google Cloud Scheduler
- Google Cloud Monitoring
- Google Cloud IAM service accounts and roles
- Compute Engine persistent disks
- Slack incoming webhooks
- gcloud CLI
- YAML

## Sources Consulted
- Google Cloud Workflows syntax overview: https://docs.cloud.google.com/workflows/docs/reference/syntax
- Google Cloud Workflows iteration syntax: https://docs.cloud.google.com/workflows/docs/reference/syntax/iteration
- Google Cloud Workflows map syntax and key existence checks: https://docs.cloud.google.com/workflows/docs/reference/syntax/maps
- Google Cloud Workflows built-in environment variables: https://docs.cloud.google.com/workflows/docs/reference/environment-variables
- Google Cloud Workflows service account authentication: https://docs.cloud.google.com/workflows/docs/authentication
- Google Cloud Workflows IAM invocation guidance: https://docs.cloud.google.com/workflows/docs/use-iam-for-access
- Schedule a workflow using Cloud Scheduler: https://docs.cloud.google.com/workflows/docs/schedule-workflow
- gcloud workflows deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/deploy
- gcloud scheduler jobs create http reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Workflows monitoring metrics: https://docs.cloud.google.com/workflows/docs/monitor
- Compute Engine IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/compute

## Issues Found
- The setup text said to create a service account but did not include the service account or IAM binding commands needed for the later workflow and Scheduler examples. Added `gcloud iam service-accounts create` and IAM bindings for `roles/compute.storageAdmin`, `roles/logging.logWriter`, and `roles/workflows.invoker`.
- The disk cleanup workflow used `${"users" not in disk}`, but Workflows map syntax documents `not("key" in map)` for negated key checks. Changed it to `${not("users" in disk)}`.
- The disk cleanup workflow iterated over `${disk_list.items}`, which can fail when the Compute Engine list response omits `items`. Changed it to `${default(map.get(disk_list, "items"), [])}`.
- The error-handling example called a `cleanup_disks` subworkflow that was not defined in the snippet. Added a minimal placeholder subworkflow so the example has a defined call target.
- The Cloud Monitoring alert command used non-current threshold flags. Replaced them with the documented `--duration=60s` and `--if="> 0"` flags for a threshold condition.

## Review Notes
The post is technically valid after the fixes. Future improvements could include replacing the Slack webhook literal with Secret Manager and adding a dry-run parameter directly to the cleanup workflow example.
