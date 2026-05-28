# Validation Summary: How to Integrate Cloud Deploy with GitLab CI/CD for Software Delivery Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deploy
- GitLab CI/CD
- Google Cloud IAM
- Workload Identity Federation
- Artifact Registry
- Docker and Docker-in-Docker
- Skaffold
- Kubernetes manifests
- Google Cloud CLI

## Sources Consulted
- Google Cloud SDK reference for `gcloud deploy releases create`: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Google Cloud SDK reference for `gcloud deploy releases promote`: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/promote
- Google Cloud SDK reference for `gcloud deploy rollouts list`: https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/list
- Cloud Deploy service account and IAM guidance: https://cloud.google.com/deploy/docs/cloud-deploy-service-account
- Cloud Deploy IAM roles and permissions: https://cloud.google.com/deploy/docs/iam-roles-permissions
- Cloud Deploy Skaffold guidance: https://cloud.google.com/deploy/docs/using-skaffold/getting-started-skaffold
- Cloud Deploy tool version and Skaffold schema guidance: https://cloud.google.com/deploy/docs/using-skaffold/select-skaffold
- Cloud Deploy manifest management: https://cloud.google.com/deploy/docs/using-skaffold/managing-manifests
- GitLab OIDC with Google Cloud Workload Identity Federation: https://docs.gitlab.com/ci/cloud_services/google_cloud/
- GitLab ID token syntax: https://docs.gitlab.com/ci/secrets/id_token_authentication/
- GitLab Docker-in-Docker build guidance: https://docs.gitlab.com/ci/docker/using_docker_build/
- Google Cloud CLI Docker image documentation: https://cloud.google.com/sdk/docs/downloads-docker
- Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Node.js release schedule: https://github.com/nodejs/Release

## Issues Found
- The GitLab build job used `docker:24.0` and attempted to install the Google Cloud CLI with `pip3 install google-cloud-sdk`, which is not the documented way to use `gcloud` in the official Docker images. Changed the job image to `google/cloud-sdk:alpine`, installed `docker-cli` with `apk`, and kept Docker-in-Docker as the Docker daemon.
- The Docker-in-Docker job did not define the connection settings needed for a no-TLS DinD service. Added `DOCKER_HOST: tcp://docker:2375` and `DOCKER_TLS_CERTDIR: ""`, matching GitLab's documented no-TLS DinD configuration.
- The test job used `node:18`, which is end-of-life. Updated it to `node:24`.
- The Workload Identity Federation OIDC provider used `--issuer-uri="https://gitlab.com"`. GitLab's Google Cloud OIDC guide specifies the issuer URL with a trailing slash and the audience without a trailing slash, so the issuer was changed to `https://gitlab.com/`.
- The Workload Identity Federation sample created the credential config before writing the token file referenced by `--credential-source-file`. Moved the token write before the credential config command.
- The Skaffold sample used `skaffold/v4beta7`. Updated it to `skaffold/v4beta13`, the current Skaffold config API supported by the current Cloud Deploy default Skaffold version.
- The article said the status job reports back to GitLab using the deployment API, but the snippet only queries Cloud Deploy from a GitLab job. Reworded the sentence to match the actual example.
- The IAM comment described only the deploy execution service account. Adjusted it to mention the Cloud Deploy render/deploy execution service account, consistent with Cloud Deploy's documented `iam.serviceAccount.actAs` requirements.

## Review Notes
- The Cloud Deploy release, rollout-list, and promote command flags are current and match the Google Cloud SDK reference.
- The `--images` and `--source=.` release creation pattern is valid for a repository that includes a matching `skaffold.yaml` and Kubernetes manifests.
- Docker-in-Docker also requires a GitLab runner configured with privileged mode; the article assumes that runner prerequisite but does not spell it out.
