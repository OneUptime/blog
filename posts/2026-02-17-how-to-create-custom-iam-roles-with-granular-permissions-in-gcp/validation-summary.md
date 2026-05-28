# Validation Summary: How to Create Custom IAM Roles with Granular Permissions in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- IAM custom roles
- Google Cloud CLI (`gcloud`)
- Compute Engine IAM permissions
- Cloud Storage IAM permissions
- Cloud SQL IAM permissions
- Cloud Run and Google Kubernetes Engine IAM permissions
- Cloud Logging IAM permissions

## Sources Consulted
- Google Cloud IAM custom role management documentation: https://cloud.google.com/iam/docs/creating-custom-roles
- Google Cloud IAM roles overview: https://cloud.google.com/iam/docs/roles-overview
- Google Cloud IAM support levels for permissions in custom roles: https://cloud.google.com/iam/docs/custom-roles-permissions-support
- Google Cloud IAM quotas and limits: https://cloud.google.com/iam/quotas
- Google Cloud SDK reference for `gcloud iam roles create`: https://cloud.google.com/sdk/gcloud/reference/iam/roles/create
- Google Cloud SDK reference for `gcloud iam roles update`: https://cloud.google.com/sdk/gcloud/reference/iam/roles/update
- Google Cloud SDK reference for `gcloud iam list-testable-permissions`: https://cloud.google.com/sdk/gcloud/reference/iam/list-testable-permissions
- Cloud Storage IAM roles documentation: https://cloud.google.com/storage/docs/access-control/iam-roles
- Compute Engine stop/start and reset permissions documentation: https://cloud.google.com/compute/docs/instances/stop-start-instance
- Cloud Logging IAM roles and permissions documentation: https://cloud.google.com/iam/docs/roles-permissions/logging
- Cloud SQL IAM roles and permissions documentation: https://cloud.google.com/iam/docs/roles-permissions/cloudsql
- Google Kubernetes Engine IAM roles and permissions documentation: https://cloud.google.com/iam/docs/roles-permissions/container

## Issues Found
- The introduction said Storage Object Viewer lets someone list all buckets in the project. Google Cloud documents `roles/storage.objectViewer` as allowing object and folder listing within buckets, not project-wide bucket listing. Changed the example to say it can list objects in a bucket.
- The launch stage list omitted current stage values supported by `gcloud iam roles create`, including `DEPRECATED` and `EAP`. Added those values.
- The log-viewer example claimed the role could view application logs but not Data Access or Admin Activity logs. Cloud Logging uses `logging.privateLogEntries.list` for private/Data Access audit logs, while Admin Activity logs are not excluded by the listed IAM permissions alone. Renamed and reworded the example to focus on excluding the private log entries permission required for Data Access audit logs.
- The custom role permissions limit was described as project-level only. Google Cloud IAM limits apply 3,000 permissions per custom role. Updated the wording.
- The deletion timing said a role ID becomes reusable after 30 days. Google Cloud documents a 7-day undelete window, scheduling for permanent deletion 7 to 14 days after deletion, and a 30-day permanent deletion process; reuse can take up to 44 days after the initial deletion request. Updated the statement.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command syntax was verified against the official Google Cloud SDK reference instead of local `--help` output. The remaining commands, YAML field names, IAM role name formats, permission support checks, and custom role assignment examples are consistent with current Google Cloud documentation.
