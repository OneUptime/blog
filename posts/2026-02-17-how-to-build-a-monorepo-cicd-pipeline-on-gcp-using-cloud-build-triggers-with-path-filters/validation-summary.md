# Validation Summary: How to Build a Monorepo CI/CD Pipeline on GCP Using Cloud Build Triggers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Cloud SDK `gcloud`
- Cloud Build triggers
- Cloud Build build configuration YAML
- Artifact Registry image paths
- Cloud Run deployment
- Docker
- Node.js
- Python
- Go

## Sources Consulted
- Google Cloud SDK reference for `gcloud builds triggers create github`: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud SDK reference for `gcloud builds triggers run`: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/run
- Google Cloud Build documentation for creating and managing build triggers: https://cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Google Cloud Build REST API `BuildTrigger` resource: https://cloud.google.com/build/docs/api/reference/rest/v1/projects.triggers#BuildTrigger
- Google Cloud Build build config file schema: https://cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build substitution variables documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values

## Issues Found
- The shared-library trigger section suggested adding a dedicated `libs/**` trigger in addition to per-service triggers that already include shared library paths. That would cause duplicate rebuilds for shared-library changes. Updated the wording to make the dedicated shared-library trigger an alternative to including `libs/` paths in every per-service trigger.
- The PR validation test step used the `node:20` image while also attempting to run Python and Go commands. Updated the step to use the Cloud Build Docker builder and run Node, Python, and Go tests in language-specific containers.
- The PR trigger comment said "with broad path filters", but the command does not include `--included-files` or `--ignored-files`. Updated the comment to avoid implying path filters are configured there.

## Review Notes
The Cloud Build trigger flags, `included-files` and `ignored-files` glob behavior, `waitFor` and `id` build-step fields, and default substitutions such as `$PROJECT_ID` and `$SHORT_SHA` were checked against official Google Cloud documentation. The examples remain illustrative and assume the required Artifact Registry repository, Cloud Run permissions, and trigger service account permissions are already configured.
