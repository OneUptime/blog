# Validation Summary: How to Harden IAM Permissions in a New GCP Project Using the Principle of Least

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud predefined, basic, and custom roles
- Google Cloud service accounts
- IAM Conditions
- Google Cloud CLI (`gcloud`)
- BigQuery CLI (`bq`)
- Cloud Run
- Compute Engine
- Google Kubernetes Engine Workload Identity
- IAM Recommender
- Cloud Asset Inventory Policy Analyzer
- Cloud Logging log-based metrics

## Sources Consulted
- Google Cloud IAM service account types: https://cloud.google.com/iam/docs/service-account-types
- Google Cloud IAM roles overview: https://cloud.google.com/iam/docs/roles-overview
- Google Cloud IAM Conditions overview: https://cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- `gcloud projects add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- `gcloud asset analyze-iam-policy` reference: https://cloud.google.com/sdk/gcloud/reference/asset/analyze-iam-policy
- Google Cloud IAM custom roles documentation: https://cloud.google.com/iam/docs/creating-custom-roles
- `gcloud iam roles create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/roles/create
- Google Cloud Compute Engine service account documentation: https://cloud.google.com/compute/docs/access/service-accounts
- Google Cloud Run service identity documentation: https://cloud.google.com/run/docs/configuring/services/service-identity
- Google Kubernetes Engine Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud IAM role references for Compute Engine, Cloud Build, Artifact Registry, Cloud SQL, Cloud Storage, Cloud Run, and GKE: https://cloud.google.com/iam/docs/roles-permissions
- BigQuery IAM and `bq` CLI access control documentation: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- Google Cloud service account key rotation documentation: https://cloud.google.com/iam/docs/key-rotation
- `gcloud logging metrics create` documentation: https://cloud.google.com/logging/docs/reference/tools/gcloud-logging

## Issues Found
- The post stated that new projects and the default Compute Engine service account automatically receive default Editor access. Google Cloud now makes this conditional on organization policy, and organizations created after May 3, 2024 have automatic grants disabled by default. Updated the wording to say default Editor grants might exist depending on organization policy and that the removal commands apply if the bindings were granted.
- The role mapping used `roles/compute.instanceAdmin` for Compute Engine instance administration, while the command examples used the GA `roles/compute.instanceAdmin.v1` role. Updated the role mapping to `roles/compute.instanceAdmin.v1`.
- The IAM Conditions example used `roles/viewer`. Google Cloud does not allow IAM Conditions on legacy basic roles such as Viewer, Editor, and Owner. Changed the temporary-access example to use `roles/browser`.
- The common mistakes section suggested Editor as a fallback for developers. Google Cloud recommends avoiding basic roles in production unless there is no alternative. Updated the advice to recommend specific predefined roles instead.

## Review Notes
The remaining commands and examples were consistent with current official documentation. The local workspace did not have `gcloud` or `bq` installed, so CLI verification was performed against official Google Cloud command references rather than local `--help` output.
