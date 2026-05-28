# Validation Summary: How to Configure an npm Repository in Artifact Registry for Node.js Packages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Artifact Registry
- Google Cloud CLI (`gcloud`)
- npm
- Node.js packages
- Yarn 1.x and Yarn Berry
- Google Cloud Build
- Google Cloud IAM

## Sources Consulted
- Google Cloud Artifact Registry npm authentication documentation: https://docs.cloud.google.com/artifact-registry/docs/nodejs/authentication
- Google Cloud Artifact Registry Node.js package management documentation: https://docs.cloud.google.com/artifact-registry/docs/nodejs/manage-packages
- Google Cloud Artifact Registry Cloud Build integration documentation: https://docs.cloud.google.com/artifact-registry/docs/configure-cloud-build
- Google Cloud CLI reference for `gcloud artifacts repositories create`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud CLI reference for `gcloud artifacts print-settings npm`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/print-settings/npm
- Google Cloud CLI reference for `gcloud artifacts versions delete`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/versions/delete
- GoogleCloudPlatform Artifact Registry npm tools README: https://github.com/GoogleCloudPlatform/artifact-registry-npm-tools

## Issues Found
- The post described Method 1 as "Using gcloud as a Credential Helper." `gcloud artifacts print-settings npm` prints npm configuration, while `google-artifactregistry-auth` is the credential helper. Updated the heading to clarify the split between gcloud-generated settings and the credential helper.
- The post said `npx google-artifactregistry-auth` reads Application Default Credentials and writes an auth token to "your .npmrc file." Official documentation states that the helper reads repository settings from the project `.npmrc`, uses ADC or gcloud credentials, and writes token credentials to the user npm config by default. Updated the explanation accordingly.
- The Method 2 command comment said credentials were refreshed "in your .npmrc." Updated it to say the helper refreshes credentials using the project `.npmrc` settings, avoiding the incorrect implication that the token is written to the project config by default.

## Review Notes
- The `gcloud artifacts repositories create`, `gcloud artifacts print-settings npm`, npm registry configuration, `publishConfig.registry`, package listing/version deletion, and IAM role examples align with current Google Cloud documentation.
- Cloud Build examples are broadly consistent with Google Cloud's Node.js package publishing guidance. The official examples use `gcr.io/cloud-builders/npm`; this post uses `node:18` with shell commands, which is still technically workable if `npx` can download the credential helper and the build service account has the required permissions.
