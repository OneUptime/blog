# Validation Summary: How to Use Custom Cloud Builders in Cloud Build for Specialized Build Steps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Cloud Build custom builders
- Cloud Build build configuration YAML
- Google Cloud SDK builder image
- Google Cloud Secret Manager integration for Cloud Build
- Artifact Registry
- Docker and Dockerfiles
- Alpine Linux packages
- Node.js, Python, Go, Terraform, Helm, AWS CLI, Prisma, Knex

## Sources Consulted
- Cloud Build cloud builders documentation: https://cloud.google.com/build/docs/cloud-builders
- Cloud Build basic build configuration documentation: https://docs.cloud.google.com/build/docs/configuring-builds/create-basic-configuration
- Cloud Build build config schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Cloud Build Secret Manager documentation: https://docs.cloud.google.com/build/docs/securing-builds/use-secrets
- Cloud Build deploy to Cloud Run documentation: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- gcloud builds triggers create github reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Official Node Docker image documentation: https://github.com/nodejs/docker-node
- Node.js release schedule: https://github.com/nodejs/Release
- Go release history and support policy: https://go.dev/doc/devel/release
- Terraform Docker image documentation: https://hub.docker.com/r/hashicorp/terraform
- Helm release history: https://github.com/helm/helm/releases
- Alpine Linux bash package documentation: https://pkgs.alpinelinux.org/package/v3.21/main/x86/bash
- Alpine Linux postgresql17-client package documentation: https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/postgresql17-client
- Alpine Linux mariadb-client package documentation: https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/mariadb-client

## Issues Found
- The post described `gcr.io/cloud-builders/` as a Google-maintained repository of community builders. Google documents these as supported builder images, while community-contributed builders are not officially maintained by Cloud Build. Updated the heading and wording.
- The Cloud SDK example passed `gcloud` as the first argument. That can work when an image has no entrypoint, but current Google examples use `entrypoint: 'gcloud'` with command arguments separately. Updated the snippet to match official Cloud Build usage.
- Several example image tags were stale or out of support for a May 2026 post. Updated Node.js examples from `node:20` to `node:22`, Go examples from `golang:1.22` to `golang:1.26`, Terraform from `hashicorp/terraform:1.7` to `hashicorp/terraform:1.15`, Helm from `alpine/helm:3.14` to `alpine/helm:3.20`, and the Alpine base image from `alpine:3.19` to `alpine:3.22`.
- The multi-cloud Dockerfile installed AWS CLI with `pip3 install awscli` and then installed `jq` in a separate `apt-get` layer after cleaning apt state. Replaced this with one apt install of `awscli` and `jq`, and corrected the entrypoint comment from gcloud to bash.
- The Node Alpine database migration builder set `ENTRYPOINT ["bash"]` without installing bash. Added `bash` and replaced generic database client package names with current Alpine packages `postgresql17-client` and `mariadb-client`.
- The notification step used `secretEnv: ['SLACK_TOKEN']` without an `availableSecrets` mapping. Added the required Secret Manager mapping for the Slack token.
- The smoke-test pipeline built only the local `my-builder:test` tag but later pushed the Artifact Registry `latest` tag. Added the Artifact Registry tag to the Docker build command so the push step has a tagged image to push.

## Review Notes
The Cloud Build trigger command flags shown in the post are still valid for 1st-generation GitHub repository triggers. Newer 2nd-generation repository connections can use the `--repository` flag instead of `--repo-owner` and `--repo-name`.
