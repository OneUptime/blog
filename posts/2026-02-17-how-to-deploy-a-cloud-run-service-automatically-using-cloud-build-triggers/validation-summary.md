# Validation Summary: How to Deploy a Cloud Run Service Automatically Using Cloud Build Triggers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Google Cloud Build
- Cloud Build triggers
- Artifact Registry
- Secret Manager
- Google Cloud IAM
- Google Cloud CLI
- Docker
- YAML

## Sources Consulted
- Cloud Build: Deploying to Cloud Run using Cloud Build: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Cloud Build: Default Cloud Build service account: https://cloud.google.com/build/docs/cloud-build-service-account
- Cloud Build: Configure user-specified service accounts: https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Cloud Build: Substituting variable values: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Cloud Build trigger CLI reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Cloud Run deploy CLI reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run traffic migration and rollback docs: https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Cloud Run IAM roles: https://docs.cloud.google.com/run/docs/reference/iam/roles
- Cloud Run secrets configuration: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Artifact Registry access control: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Artifact Registry Cloud Build integration: https://docs.cloud.google.com/artifact-registry/docs/configure-cloud-build

## Issues Found
- The prerequisites listed only the Cloud Run API, but the Cloud Build deployment flow also requires Cloud Build, Artifact Registry, and Resource Manager APIs. Updated the prerequisite text and API enablement commands to include Resource Manager.
- The IAM example assumed the legacy Cloud Build service account is always used. Current Cloud Build projects may use the Compute Engine default service account, the legacy Cloud Build service account, or a user-specified service account. Updated the example to make the build identity explicit and note both default possibilities.
- The IAM example did not grant Artifact Registry write permissions to the build service account. Added the Artifact Registry Writer role so the build can push Docker images.
- The test step attempted to run the just-built image as a Cloud Build step image before pushing it to Artifact Registry. Replaced it with a Docker builder step that runs `docker run --rm IMAGE npm test` against the locally built image.
- The Cloud SDK deployment snippets did not use the documented Cloud Build pattern for `gcr.io/google.com/cloudsdktool/cloud-sdk`. Added `entrypoint: 'gcloud'` and removed `gcloud` from the argument lists.
- The Secret Manager section did not mention that the Secret Manager API must be enabled and the Cloud Run runtime service account needs Secret Manager Secret Accessor on referenced secrets. Added that requirement.

## Review Notes
The `gcloud` CLI is not installed in this workspace, so CLI flags were checked against official Google Cloud SDK reference pages rather than local `--help` output. The remaining commands and YAML snippets align with current Google Cloud documentation as of 2026-05-28.
