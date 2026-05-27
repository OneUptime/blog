# Validation Summary: Use Kaniko in Cloud Build to Build Docker Images Without Privileged Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Kaniko
- Dockerfiles and Docker image builds
- Google Artifact Registry
- Google Secret Manager
- Google Kubernetes Engine
- Kubernetes Jobs
- Node.js container images

## Sources Consulted
- Google Cloud Build overview: https://docs.cloud.google.com/build/docs/overview
- Google Cloud Build configuration schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build step ordering: https://docs.cloud.google.com/build/docs/configuring-builds/configure-build-step-order
- Google Cloud Build Secret Manager integration: https://docs.cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud SDK `gcloud builds submit` reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Kaniko original repository README: https://github.com/GoogleContainerTools/kaniko
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The post described Kaniko as a current Google tool. The original GoogleContainerTools Kaniko repository is archived and no longer maintained, and its README says Kaniko is not an officially supported Google product. Updated the wording to say it was originally developed by Google and avoids presenting it as actively maintained.
- The post said Cloud Build uses Kaniko under the hood for some operations. Updated this to the documented `gcloud builds submit --tag` behavior when `builds/use_kaniko` is enabled.
- Several Cloud Build examples used `--context=.`. Kaniko accepts local directories, but the official Cloud Build example uses the explicit `dir://` context prefix. Updated examples to use `dir://.` or `dir://services/frontend`.
- The Node.js Dockerfile installed only production dependencies before running `npm run build`, which often fails when build tools are dev dependencies. Updated it to run `npm ci`, build, then prune dev dependencies with `npm prune --omit=dev`.
- The multiple-image Cloud Build example implied steps run in parallel by setting `options.pool: {}`. Cloud Build runs steps sequentially by default; concurrency is controlled with `waitFor`. Added `waitFor: ['-']` to the later independent build steps and removed the misleading `options.pool` block.
- The Secret Manager example passed `$$NPM_TOKEN` directly to Kaniko without a shell. The standard Kaniko executor image is scratch-based and has no shell, and Cloud Build secret expansion through shell syntax requires an entrypoint that can expand the variable. Updated the example to use `gcr.io/kaniko-project/executor:debug` with `/busybox/sh` and invoke `/kaniko/executor`.
- The post implied Kaniko runs as a fully unprivileged container. Kaniko does not require Docker or privileged mode, but the upstream documentation notes it can still require permissions inside the container depending on the base image and Dockerfile commands. Adjusted the wording to focus on avoiding privileged mode and Docker daemon access.
- The reproducible build section said `--snapshot-mode=redo` is more accurate. Kaniko documents `full` as the most robust snapshot mode and `redo` as faster while considering selected metadata. Corrected the comment.

## Review Notes
- Kaniko remains usable in examples, but because the original repository is archived as of June 3, 2025, a future update should consider whether the post should recommend a maintained alternative for new production pipelines.
- The performance numbers are presented as the author's experience and are plausible, but they are workload-specific and were not independently benchmarked during this review.
