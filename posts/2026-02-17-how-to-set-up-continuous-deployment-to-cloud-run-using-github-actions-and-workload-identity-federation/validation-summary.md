# Validation Summary: How to Set Up Continuous Deployment to Cloud Run Using GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud IAM
- Workload Identity Federation
- GitHub Actions OIDC
- google-github-actions/auth
- google-github-actions/setup-gcloud
- Artifact Registry
- Docker
- gcloud CLI

## Sources Consulted
- Google Cloud IAM: Configure Workload Identity Federation with deployment pipelines: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud IAM: Workload Identity Federation overview: https://cloud.google.com/iam/docs/workload-identity-federation
- GitHub Docs: OpenID Connect reference: https://docs.github.com/en/actions/reference/security/oidc
- google-github-actions/auth README: https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud README: https://github.com/google-github-actions/setup-gcloud
- Google Cloud Artifact Registry Docker authentication: https://cloud.google.com/artifact-registry/docs/docker/authentication
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run HTTPS request and service URL documentation: https://cloud.google.com/run/docs/triggering/https-request
- Cloud Run TrafficTarget API reference: https://cloud.google.com/run/docs/reference/rest/v1/TrafficTarget

## Issues Found
- The required API list omitted the Security Token Service API. Added `sts.googleapis.com`, which is required for Workload Identity Federation token exchange.
- The workflow examples used `google-github-actions/auth@v2` and `google-github-actions/setup-gcloud@v2`. Updated both examples to the current `@v3` major versions shown in the upstream action documentation.
- The description of the repository attribute condition overstated the effect of omitting it. Clarified that other GitHub tokens could be accepted by the provider, while resource access still depends on IAM bindings.
- The staging workflow hard-coded a fake Cloud Run preview URL containing `xxxxx`. Replaced it with a command that reads the tagged revision URL from `status.traffic[].url` after deployment and passes that URL to the PR comment step.
- The PR comment step called `github.rest.issues.createComment` without awaiting it. Updated the example to `await` the API call, matching the async execution model used by `actions/github-script`.

## Review Notes
- The guide uses repository names in the GitHub OIDC condition and IAM principal set. Google recommends using numeric GitHub claims such as `repository_id` or owner ID when possible because repository and owner names can be reused after deletion.
- The IAM grants are functional for a simple tutorial, but production setups should scope roles to the narrowest resources possible, such as granting Artifact Registry access on the repository instead of the whole project.
