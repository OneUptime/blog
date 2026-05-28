# Validation Summary: How to Migrate from Jenkins to Google Cloud Build for CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Build
- Jenkins Pipeline
- Google Cloud CLI
- Secret Manager
- Artifact Registry
- Google Kubernetes Engine / kubectl
- Cloud Scheduler
- Cloud Deploy
- Pub/Sub notifications
- Docker
- SonarQube scanner

## Sources Consulted
- Cloud Build build config schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Cloud Build Secret Manager integration: https://cloud.google.com/build/docs/securing-builds/use-secrets
- gcloud secrets create reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- gcloud builds submit reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Cloud Build triggers: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Cloud Build approvals: https://docs.cloud.google.com/build/docs/securing-builds/gate-builds-on-approval
- Cloud Build scheduled builds: https://cloud.google.com/build/docs/schedule-builds
- Cloud Build GKE deployment: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-gke
- Cloud Build container image builds: https://docs.cloud.google.com/build/docs/building/build-containers
- Artifact Registry transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Cloud Build notifications: https://cloud.google.com/build/docs/subscribe-build-notifications

## Issues Found
- The Cloud Build examples used `gcr.io/$PROJECT_ID/...` as the target image location. Container Registry writes are shut down as of March 18, 2025 unless `gcr.io` is backed by Artifact Registry, and Google now recommends Artifact Registry image paths. Updated the migrated Cloud Build snippets to use `${_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/...`.
- The Secret Manager section omitted the required IAM access for the Cloud Build service account. Added a note that the build service account needs the Secret Manager Secret Accessor role.
- The manual approval workaround said Cloud Build does not have built-in approval steps. Cloud Build supports trigger-level build approvals, but not approval steps inside `cloudbuild.yaml`. Updated the wording to reflect that distinction.
- The cron-based builds workaround said to use Cloud Scheduler to trigger builds generally. Official Cloud Build docs describe scheduling builds by using Cloud Scheduler to invoke a manual trigger. Updated the wording accordingly.

## Review Notes
- The `waitFor`, `availableSecrets.secretManager`, `secretEnv`, substitutions, `gcloud builds submit --substitutions`, and `gcloud secrets create --data-file=-` examples match current official documentation.
- The `gcr.io/cloud-builders/docker` and `gcr.io/cloud-builders/kubectl` builder image references remain valid because Google-owned `gcr.io` builder images are not affected by the Container Registry shutdown.
