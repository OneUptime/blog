# Validation Summary: How to Integrate Flux CD with Google Cloud Build

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller and image-automation-controller
- Flux notification-controller Receiver resources
- Google Cloud Build
- Google Artifact Registry
- Google Cloud Pub/Sub
- Google Kubernetes Engine
- Kubernetes Deployments and Secrets
- Docker container builds

## Sources Consulted
- Google Cloud Build build config schema: https://cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build GitHub trigger CLI reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build trigger management guide: https://cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Google Artifact Registry Cloud Build integration: https://cloud.google.com/artifact-registry/docs/configure-cloud-build
- Google Artifact Registry Docker authentication: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Artifact Registry Container Registry shutdown guidance: https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown
- Google Cloud Build Pub/Sub notifications: https://cloud.google.com/build/docs/subscribe-build-notifications
- Flux ImageRepository CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Flux ImageUpdateAutomation CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/
- Flux Image Policies documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image Update Automations documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/

## Issues Found
- The post listed Google Container Registry/GCR as a configured prerequisite and tag even though Container Registry is deprecated and Artifact Registry is the recommended replacement. Removed the GCR tag and changed the prerequisite to Artifact Registry only.
- The Cloud Build test step used `docker build --target test ... || echo "No test stage"`, which would mask real test failures as well as a missing test stage. Removed the fallback and clarified that users should replace the command if their Dockerfile has no test stage.
- The Cloud Build configuration comment said `logging: CLOUD_LOGGING_ONLY` enabled Docker layer caching. That field controls log storage, not Docker layer caching. Updated the comment to describe Cloud Logging accurately.
- The semantic version example generated `1.0.${BUILD_ID:0:8}` for non-tag builds. Cloud Build `BUILD_ID` values are not guaranteed to be numeric, so this could produce tags that do not match Flux semver policies. Changed the example to require a tag like `v1.2.3` and fail otherwise.
- The Pub/Sub webhook example used a fixed `/hook/gcb-receiver` URL, but Flux Receivers generate a unique webhook path based on the Receiver and secret. Added the required `webhook-token` secret creation and changed the Pub/Sub push endpoint to use `.status.webhookPath`.
- The Pub/Sub section said Cloud Build publishes only when a build completes. Cloud Build publishes messages when build state changes, including completion. Updated the wording in the command comments.

## Review Notes
- The Cloud Build `images` field and explicit Docker push step are redundant together, but both are valid. Future edits could simplify the example by using one push method consistently.
- The Flux image automation examples use the current `image.toolkit.fluxcd.io/v1` API and the supported `Setters` update strategy.
- The local environment did not have `gcloud` or `flux` installed, so CLI behavior was verified against official command references instead of local `--help` output.
