# Validation Summary: How to Fix 'Cloud Build' Pipeline Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Build
- Google Cloud SDK / gcloud CLI
- Artifact Registry
- Secret Manager
- Cloud Run
- Google Kubernetes Engine
- Docker
- cloud-build-local
- Private npm registries

## Sources Consulted
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build REST Build and BuildStep resource reference: https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.builds
- Google Cloud Build default service account documentation: https://docs.cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build user-specified service accounts documentation: https://docs.cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Google Cloud Build Secret Manager integration: https://docs.cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud Build private pools documentation: https://docs.cloud.google.com/build/docs/private-pools/run-builds-in-private-pool
- Google Cloud Build build logs documentation: https://docs.cloud.google.com/build/docs/view-build-results
- gcloud builds submit reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- gcloud builds log reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/log
- gcloud builds triggers create github reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Artifact Registry transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Artifact Registry Docker authentication: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- Docker buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker image push reference: https://docs.docker.com/reference/cli/docker/image/push/

## Issues Found
- The post assumed the Cloud Build service account is always `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`. Updated the text and command comments to account for the legacy Cloud Build service account, the Compute Engine default service account, and user-specified service accounts.
- The post referred to Container Registry for application images even though Container Registry is shut down for writes. Updated application image examples to use Artifact Registry `pkg.dev` image paths while leaving Google-maintained `gcr.io/cloud-builders/...` builder images intact.
- The registry credential example implied Cloud Build needs `gcloud auth configure-docker` for Artifact Registry. Updated it to explain that Cloud Build needs IAM permission for Artifact Registry, and moved `gcloud auth configure-docker` to a local/non-Cloud Build automation command.
- The post stated the default step timeout is 10 minutes. Corrected this to match Cloud Build docs: build steps have no step-level timeout unless configured, and the default overall build timeout is 60 minutes.
- The Secret Manager Docker build example passed `$$API_KEY` directly as a Docker CLI argument, which would not expand the secret without a shell. Updated the step to use a `bash` entrypoint and execute `docker build` from the shell.
- The Secret Manager IAM command hard-coded the legacy Cloud Build service account. Updated it to use the `SERVICE_ACCOUNT` variable established earlier in the post.
- The `COPY failed` example mixed a Dockerfile `COPY` instruction into a YAML code block. Split it into separate YAML and Dockerfile code fences.
- The private pool example used `$PROJECT_ID` inside `options.pool.name`. Replaced it with a literal project placeholder because official examples use the full worker pool resource name.
- The logs example referenced `steps[0].logs`, which is not a BuildStep field. Replaced it with supported `logUrl`, `steps.status`, and `steps.exitCode` fields.
- The debug step claimed to keep a container running and used the gcloud builder while running `docker images`. Updated the description and switched the debug step to the Docker builder.
- The Docker base image guidance called `node:lts-alpine` a tag that does not exist or was removed, and the digest-pinned example used a placeholder digest. Updated the explanation to identify the mutable tag issue and replaced the placeholder with a valid `node:20.11-alpine` digest.

## Review Notes
The `cloud-build-local` section is technically usable, but the upstream local builder is maintained only as a best-effort local debugging tool and is not fully feature-compatible with hosted Cloud Build.
