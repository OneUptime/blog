# Validation Summary: How to Use Google Cloud Buildpacks to Create Reproducible Container Images for

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Buildpacks
- Cloud Native Buildpacks
- Node.js
- Express
- npm
- Docker container images
- Cloud Build
- Cloud Run
- pack CLI
- Artifact Registry

## Sources Consulted
- Google Cloud Buildpacks Node.js documentation: https://docs.cloud.google.com/docs/buildpacks/nodejs
- Google Cloud Buildpacks build application documentation: https://docs.cloud.google.com/docs/buildpacks/build-application
- Google Cloud Buildpacks service-specific configuration documentation: https://docs.cloud.google.com/docs/buildpacks/service-specific-configs
- Cloud Native Buildpacks project descriptor reference: https://buildpacks.io/docs/reference/config/project-descriptor/
- Cloud Native Buildpacks inspect application image documentation: https://buildpacks.io/docs/for-app-developers/how-to/build-outputs/inspect-app/
- Cloud Native Buildpacks SBOM download CLI documentation: https://buildpacks.io/docs/for-platform-operators/how-to/integrate-ci/pack/cli/pack_sbom_download/
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud builds triggers create github reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci

## Issues Found
- The post used `BP_NODE_RUN_SCRIPTS=false`, which is not the documented Google Cloud Buildpacks variable for Node.js build scripts. Changed examples to use `GOOGLE_NODE_RUN_SCRIPTS=` and updated the explanation to say this disables the default `npm run build` behavior.
- The `project.toml` example used `[project]`, `[build]`, and `[[build.env]]`, which do not match the Cloud Native Buildpacks project descriptor schema. Changed it to use `[_]`, `[io.buildpacks]`, and `[[io.buildpacks.build.env]]` with `schema-version = "0.2"`.
- The image inspection command used `pack inspect express-demo`; current Cloud Native Buildpacks documentation uses `pack inspect-image` for application images. Updated the command.
- The Cloud Build `pack` examples omitted the `entrypoint: 'pack'` and `--network=cloudbuild` settings shown in Google Cloud's documented Cloud Build buildpack example. Added both.
- The dependency-locking section claimed Google Buildpacks runs `npm ci` when a lockfile is present. Google’s current public Node.js Buildpacks documentation recommends `package-lock.json` for cache performance and documents npm as the default package manager, but does not state that behavior. Reworded the claim to avoid over-specifying the internal install command.
- The reproducibility verification section said to compare digests while the example compared Docker image IDs. Updated the wording to match the command.
- The builder digest lookup example inspected a potentially absent local image. Added `docker pull gcr.io/buildpacks/builder:v1` before `docker inspect`.
- The Node.js version wording said `engines.node` was pinned while the example used `20.x`, a semver range. Changed the text to say it constrains the version.

## Review Notes
The post remains a useful tutorial, but the builder tag `gcr.io/buildpacks/builder:v1` is still a moving tag in examples until the digest-pinning section. For the strongest reproducibility, readers should use the pinned digest form consistently in CI.
