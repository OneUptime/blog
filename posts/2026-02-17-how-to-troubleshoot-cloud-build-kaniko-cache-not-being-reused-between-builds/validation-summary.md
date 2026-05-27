# Validation Summary: How to Troubleshoot Cloud Build Kaniko Cache Not Being Reused Between Builds

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Build
- Kaniko
- Artifact Registry
- Dockerfiles
- gcloud CLI
- CI/CD container builds

## Sources Consulted
- Google Cloud Build Kaniko cache documentation: https://cloud.google.com/build/docs/optimize-builds/kaniko-cache
- Kaniko README and flag reference: https://github.com/GoogleContainerTools/kaniko/blob/main/README.md
- Kaniko releases: https://github.com/GoogleContainerTools/kaniko/releases
- gcloud artifacts docker images list reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list
- gcloud builds log reference: https://cloud.google.com/sdk/gcloud/reference/builds/log
- gcloud builds get-default-service-account reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/get-default-service-account
- Cloud Build default service account documentation: https://cloud.google.com/build/docs/cloud-build-service-account
- Artifact Registry IAM access control documentation: https://docs.cloud.google.com/artifact-registry/docs/access-control

## Issues Found
- The post described Kaniko as checking the cache for every layer throughout the build. Updated it to note that Kaniko checks cacheable `RUN` or `COPY` commands before execution and stops consulting the cache after a cache miss in that build stage.
- The Artifact Registry image listing command used a custom `--format` with fields that are not shown in the official command examples. Simplified the command to the documented image-list form.
- The sample cache log messages included `"Using cacheFrom"`, which is Docker-oriented rather than typical Kaniko cache output. Replaced it with Kaniko-style cache hit and miss log messages.
- The permissions section assumed the legacy `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` account. Updated it to account for current Cloud Build behavior, where builds may use the Compute Engine default service account, the legacy Cloud Build service account, or a user-specified service account.
- The post said every Dockerfile instruction creates a layer. Updated this to "most Dockerfile instructions that change the filesystem" because metadata instructions do not create filesystem layers.
- The non-deterministic instruction section said changing command output prevents cache hits. Updated it to clarify that Kaniko can reuse stale cached output until TTL expiry, then rebuild a different layer.
- The cache TTL section said the default Kaniko TTL is 6 hours. Updated it to distinguish direct Kaniko executor usage, where the default is two weeks, from Cloud Build `gcloud builds submit --tag` Kaniko integration, where the default is 6 hours.
- The version section recommended `v1.23.0` as a recent/latest version. Updated it to `v1.24.0`, the final upstream release, and noted that the original Kaniko project was archived in June 2025.
- The snapshot mode example used the wrong flag name, `--snapshotMode`. Corrected it to `--snapshot-mode` and added the documented caveat that `--use-new-run` is experimental and can miss file changes.

## Review Notes
Kaniko remains technically usable in existing Cloud Build configurations, but the upstream GoogleContainerTools project is archived and no longer maintained. Future posts should consider mentioning maintained alternatives such as Docker BuildKit or Cloud Native Buildpacks where appropriate.
