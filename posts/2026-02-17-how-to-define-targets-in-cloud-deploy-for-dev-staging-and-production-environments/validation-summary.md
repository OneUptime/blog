# Validation Summary: How to Define Targets in Cloud Deploy for Dev Staging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deploy
- Google Kubernetes Engine
- Cloud Run
- GKE attached clusters
- Skaffold
- gcloud CLI
- IAM service accounts
- Cloud Storage artifact storage

## Sources Consulted
- Google Cloud Deploy configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy execution environments: https://docs.cloud.google.com/deploy/docs/execution-environment
- Google Cloud Deploy service accounts: https://docs.cloud.google.com/deploy/docs/cloud-deploy-service-account
- Google Cloud Deploy deploy parameters: https://docs.cloud.google.com/deploy/docs/parameters
- gcloud deploy apply reference: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/apply
- Google Cloud Deploy Skaffold getting started guide: https://docs.cloud.google.com/deploy/docs/using-skaffold/getting-started-skaffold
- Google Cloud Deploy Skaffold tool version guide: https://docs.cloud.google.com/deploy/docs/using-skaffold/select-skaffold
- Skaffold configuration reference: https://skaffold.dev/docs/design/config/

## Issues Found
- The introduction described a target as pointing to a "Cloud Run service" and "Anthos cluster." Cloud Deploy target configuration for Cloud Run specifies a Cloud Run location, and current documentation uses GKE attached clusters. Updated the wording to "Cloud Run region" and "GKE attached cluster."
- The Skaffold example used `apiVersion: skaffold/v4beta7`. Google Cloud Deploy examples still accept this shape, but the current Skaffold schema is `skaffold/v4beta13` and Cloud Deploy's current default Skaffold tool version supports that schema. Updated the example to `skaffold/v4beta13`.
- The cross-project target section said you only need the full cluster path and service account permissions in the target project. That is incomplete when the execution service account is in a different project. Added the required cross-project service account policy and service-agent permission caveat.
- The service account permissions section listed `roles/clouddeploy.jobRunner` and `roles/container.developer` only. Google Cloud documentation also calls out `roles/iam.serviceAccountUser` for common GKE deployments and bucket access when using custom artifact storage. Updated the guidance.

## Review Notes
The Cloud Deploy target, delivery pipeline, execution config, deploy parameter, and `gcloud deploy apply`, `targets list`, and `describe` examples are consistent with current official documentation after the fixes above.
