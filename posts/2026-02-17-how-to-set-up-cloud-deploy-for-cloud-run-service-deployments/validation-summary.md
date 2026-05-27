# Validation Summary: How to Set Up Cloud Deploy for Cloud Run Service Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deploy
- Cloud Run
- Skaffold
- Google Cloud CLI
- Artifact Registry
- IAM service accounts and roles

## Sources Consulted
- Google Cloud Deploy: Deploy a Cloud Run service, job, or worker pool - https://docs.cloud.google.com/deploy/docs/run-targets
- Google Cloud Deploy configuration schema reference - https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy: Canary deployments to Cloud Run - https://docs.cloud.google.com/deploy/docs/deployment-strategies/canary/cloud-run
- Google Cloud Deploy: Verify your deployment - https://docs.cloud.google.com/deploy/docs/verify-deployment
- Google Cloud SDK reference: gcloud deploy releases create - https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Google Cloud Deploy service accounts - https://docs.cloud.google.com/deploy/docs/cloud-deploy-service-account
- Cloud Run IAM roles and deployment permissions - https://docs.cloud.google.com/run/docs/reference/iam/roles

## Issues Found
- The Skaffold profiles listed a base Cloud Run service YAML plus an environment-specific "overlay" YAML under `manifests.rawYaml`. Raw YAML manifests are rendered as separate manifests, not merged as patches. Changed the profiles to point to complete environment-specific Cloud Run service definitions and clarified that each profile should use a full service definition.
- The verification container used `curlimages/curl`, but the script called `gcloud run services describe`; that image does not provide the Google Cloud CLI. Changed the verification image to `gcr.io/google.com/cloudsdktool/google-cloud-cli:alpine` and used `wget` for the health check.
- The execution service account section created and granted roles to `deploy-sa`, but did not configure Cloud Deploy targets to use that service account. Added the `executionConfigs` snippet needed to bind the service account to render, deploy, and verify operations.
- The execution service account permissions omitted Artifact Registry read access, which is required for deploying container images from Artifact Registry. Added a `roles/artifactregistry.reader` grant on the repository.

## Review Notes
Cloud Deploy's verification configuration has newer task-based examples in current documentation, while the Skaffold `verify` stanza with `strategy.standard.verify: true` is still documented for this workflow. The post's examples assume the Cloud Run service endpoint is reachable by the verification job; private or authenticated services would need additional networking or authentication configuration.
