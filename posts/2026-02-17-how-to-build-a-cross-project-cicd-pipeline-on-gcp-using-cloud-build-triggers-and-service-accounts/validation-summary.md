# Validation Summary: How to Build a Cross-Project CI/CD Pipeline on GCP Using Cloud Build Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Cloud Build triggers
- Google Cloud IAM and service accounts
- Artifact Registry
- Google Kubernetes Engine
- Cloud Source Repositories
- GitHub triggers
- Secret Manager
- gcloud CLI

## Sources Consulted
- Google Cloud Build user-specified service accounts: https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Google Cloud Build trigger management: https://cloud.google.com/build/docs/automating-builds/create-manage-triggers
- gcloud Cloud Source Repositories trigger reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/cloud-source-repositories
- gcloud GitHub trigger reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- gcloud manual trigger reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/manual
- Cloud Build build config schema: https://cloud.google.com/build/docs/build-config-file-schema
- Cloud Build Secret Manager integration: https://cloud.google.com/build/docs/securing-builds/use-secrets
- Cloud Build GKE deployment guide: https://cloud.google.com/build/docs/deploying-builds/deploy-gke
- GKE RBAC and IAM interaction: https://cloud.google.com/kubernetes-engine/docs/how-to/role-based-access-control
- Cloud Source Repositories availability notice: https://cloud.google.com/source-repositories/docs/release-notes

## Issues Found
- The post put `serviceAccount` inside build config files used by Cloud Build triggers. Cloud Build triggers ignore the build config `serviceAccount` field; the service account must be set on the trigger with `--service-account`. Removed the field from trigger-oriented YAML snippets and clarified the behavior.
- The post said `CLOUD_LOGGING_ONLY` was required with a custom service account but did not grant the custom service account permission to write logs. Added the `roles/logging.logWriter` binding in the CI/CD project.
- The post described `${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com` as the default service account. Current Cloud Build behavior distinguishes default service account selection from the legacy Cloud Build service account. Reworded the section to identify it as the legacy account.
- The Cloud Source Repositories trigger example did not mention that Cloud Source Repositories is unavailable to new customers after June 17, 2024. Added a short caveat while keeping the example for existing customers.
- The Secret Manager section said staging and production secrets but only granted the staging project role. Added the matching production project binding.
- The debugging section described `gcloud iam service-accounts get-iam-policy` as testing target resource access. That command shows the service account resource IAM policy, such as impersonation/admin bindings. Corrected the comment.
- The GitHub trigger example used `--repo-name=my-org/my-app` while also setting `--repo-owner=my-org`. Updated `--repo-name` to just `my-app`, which matches the gcloud reference.
- The GKE IAM section implied project IAM roles were the whole authorization story. Added a note that Kubernetes RBAC bindings are also required when clusters use RBAC and the service account needs to apply Kubernetes resources.

## Review Notes
The GKE IAM roles and `gke-deploy` syntax are broadly aligned with Google Cloud documentation.
