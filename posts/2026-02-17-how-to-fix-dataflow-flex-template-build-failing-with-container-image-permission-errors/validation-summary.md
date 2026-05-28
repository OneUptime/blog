# Validation Summary: How to Fix Dataflow Flex Template Build Failing

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud Dataflow Flex Templates
- Google Cloud CLI
- Cloud Build
- Artifact Registry
- Cloud Storage
- Dockerfiles for Python and Java Flex Templates
- Google Cloud IAM service accounts and roles

## Sources Consulted
- Google Cloud Dataflow: Use Flex Templates to package a Dataflow pipeline for deployment: https://cloud.google.com/dataflow/docs/guides/templates/configuring-flex-templates
- Google Cloud Dataflow: Build and run an example Flex Template: https://cloud.google.com/dataflow/docs/guides/templates/using-flex-templates
- Google Cloud Dataflow: Run Flex Templates in Dataflow: https://cloud.google.com/dataflow/docs/guides/templates/run-flex-templates
- Google Cloud Dataflow: Dataflow security and permissions: https://cloud.google.com/dataflow/docs/concepts/security-and-permissions
- Google Cloud Dataflow: Troubleshoot Flex Templates: https://cloud.google.com/dataflow/docs/guides/troubleshoot-templates
- Google Cloud SDK: gcloud dataflow flex-template build: https://cloud.google.com/sdk/gcloud/reference/dataflow/flex-template/build
- Google Cloud SDK: gcloud dataflow flex-template run: https://cloud.google.com/sdk/gcloud/reference/dataflow/flex-template/run
- Google Cloud SDK: gcloud builds log: https://cloud.google.com/sdk/gcloud/reference/builds/log
- Google Cloud SDK: gcloud artifacts docker images list: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list
- Google Cloud SDK: gcloud artifacts docker tags list: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/tags/list
- Artifact Registry access control with IAM: https://cloud.google.com/artifact-registry/docs/access-control
- Artifact Registry: Prepare for Container Registry shutdown: https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown
- Cloud Build default service account: https://cloud.google.com/build/docs/cloud-build-service-account

## Issues Found
- The post said Cloud Build uses `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` by default. Google Cloud documentation now says the default build service account can be either the Compute Engine default service account or the legacy Cloud Build service account, depending on project and organization settings. Updated the explanation and IAM examples to use `BUILD_SERVICE_ACCOUNT_EMAIL`.
- The post granted only `roles/storage.objectCreator` for the template bucket. Flex Template builds need read and write access to Cloud Storage, and the build can overwrite the template specification file. Updated the example to use `roles/storage.objectAdmin`.
- The post said the Dataflow service account needs Artifact Registry read access for worker image pulls, while the examples granted the worker service account. Updated the wording to clarify that launcher and worker VMs use the worker service account for this access.
- The post implied new pushes could target Container Registry. Container Registry is shut down for writes, while `gcr.io` URLs hosted on Artifact Registry are not affected. Updated the build-process description to refer to Artifact Registry, including `gcr.io` repositories hosted on Artifact Registry.
- The `gcloud artifacts docker images list` example used a brittle custom format with fields not shown in the current command reference. Replaced it with the documented `--include-tags` option.

## Review Notes
The local environment does not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK command reference instead of local `--help` output.
