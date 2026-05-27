# Validation Summary: How to Roll Back a Failed Cloud Run Deployment to a Previous Stable Revision

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- gcloud CLI
- Cloud Run revisions and traffic splitting
- Cloud Run revision tags
- Cloud Logging
- Cloud Build
- Artifact Registry

## Sources Consulted
- Google Cloud SDK reference: gcloud run services update-traffic - https://cloud.google.com/sdk/gcloud/reference/run/services/update-traffic
- Google Cloud SDK reference: gcloud run deploy - https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run documentation: Rollbacks, gradual rollouts, and traffic migration - https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Cloud Run documentation: Manage revisions - https://cloud.google.com/run/docs/managing/revisions
- Cloud Build documentation: Deploying to Cloud Run using Cloud Build - https://cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Artifact Registry documentation: Prepare for Container Registry shutdown - https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown

## Issues Found
- The revision listing examples used display column names such as `REVISION` in `--format` expressions. Updated the commands that need custom output to use resource fields such as `metadata.name` and `metadata.creationTimestamp`.
- The examples used `creationTimestamp` for revision sorting. Updated those examples to sort by `metadata.creationTimestamp`, matching the Cloud Run revision resource field.
- The deployment and Cloud Build examples used user images under `gcr.io` and described pushing to Container Registry. Updated user image paths and wording to Artifact Registry because Container Registry is deprecated and writes to Container Registry are no longer available.
- The Cloud Build smoke test called a `canary` revision URL without creating the `canary` tag. Added `--tag=canary` to the no-traffic deploy step.
- The rollback script described a percentage-based error rate, but the command counted matching 5xx log entries. Updated variable names, comments, and output text to describe an error count.

## Review Notes
The `gcr.io/cloud-builders/*` and `gcr.io/google.com/cloudsdktool/cloud-sdk` builder images were left unchanged because Google-owned `gcr.io` builder images remain valid. The automated rollback script is still intentionally simplified and notes that Cloud Monitoring is more appropriate for production.
