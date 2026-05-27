# Validation Summary: How to Use Artifact Registry with Cloud Build for End-to-End CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Google Artifact Registry
- Artifact Analysis / Container Scanning
- On-Demand Scanning
- Docker
- Google Kubernetes Engine
- gcloud CLI
- Node.js

## Sources Consulted
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build GitHub trigger documentation: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Artifact Registry Cloud Build integration: https://docs.cloud.google.com/artifact-registry/docs/configure-cloud-build
- Artifact Registry push and pull documentation: https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- Artifact Analysis automatic scanning documentation: https://docs.cloud.google.com/artifact-analysis/docs/enable-automatic-scanning
- Artifact Analysis on-demand scanning documentation: https://docs.cloud.google.com/artifact-analysis/docs/scan-os-on-demand
- gcloud `artifacts docker images scan` reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/scan
- gcloud `artifacts docker images list-vulnerabilities` reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list-vulnerabilities
- Artifact Registry cleanup policy documentation: https://docs.cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- On-Demand Scanning IAM roles: https://docs.cloud.google.com/iam/docs/roles-permissions/ondemandscanning
- Node.js release schedule: https://nodejs.org/en/about/releases/

## Issues Found
- The API enablement list included automatic scanning APIs but not the On-Demand Scanning API used later by `gcloud artifacts docker images scan`. Added `ondemandscanning.googleapis.com`.
- The Cloud Build IAM section assumed a single Cloud Build service account form and did not grant permissions required for the on-demand scan. Clarified the legacy and Compute Engine default service account options and added `roles/ondemandscanning.admin`.
- The scan example used `--location=us-central1`, but on-demand scanning uses multi-regions such as `us`, `europe`, and `asia`. Changed it to `--location=us`.
- The scan example scanned an Artifact Registry image without `--remote`. Added `--remote` so the command scans the pushed image in Artifact Registry.
- The test step used `node:18`, which is EOL. Updated it to `node:22`, a supported LTS line.
- The cleanup policy JSON used `id`; current Artifact Registry cleanup policy examples use `name`. Updated all policy identifiers to `name`.
- The cleanup policy keep rule matched tag prefixes without an explicit tagged state. Added `tagState: "tagged"` to match the documented conditional policy shape.
- The cleanup policy example used a seconds duration and did not explicitly disable dry run. Changed the duration to documented `30d` syntax and added `--no-dry-run` so the command matches the text about cleaning up old images automatically.

## Review Notes
- The Cloud Build YAML snippets use `$SHORT_SHA`, which is primarily populated by trigger-invoked builds. For manual `gcloud builds submit` usage, pass an appropriate substitution value.
- The multi-service example pushes images explicitly and also lists them in the `images` field. This is redundant but not technically incorrect.
