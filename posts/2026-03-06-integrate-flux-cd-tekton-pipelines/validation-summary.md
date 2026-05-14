# Validation Summary: How to Integrate Flux CD with Tekton Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Tekton Pipelines
- Tekton Triggers
- Kubernetes
- Kaniko
- Docker-compatible container registries
- GitOps image automation

## Sources Consulted
- Tekton Pipelines installation documentation: https://tekton.dev/docs/installation/pipelines/
- Tekton Triggers installation documentation: https://tekton.dev/docs/triggers/install/
- Tekton Triggers EventListener documentation: https://tekton.dev/docs/triggers/eventlisteners/
- Tekton Triggers interceptor documentation: https://tekton.dev/docs/triggers/interceptors/
- Tekton Pipelines v1 API reference: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton v1beta1 to v1 migration guide: https://tekton.dev/docs/pipelines/migrating-v1beta1-to-v1/
- Tekton runtime authentication documentation: https://tekton.dev/docs/pipelines/auth/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux CLI image repository command documentation: https://fluxcd.io/flux/cmd/flux_get_images_repository/

## Issues Found
- The Tekton Pipelines install command used the older `storage.googleapis.com` pipeline release URL. Updated it to the current official `https://infra.tekton.dev/tekton-releases/pipeline/latest/release.yaml` URL from Tekton's installation docs.
- The Kaniko task attempted to use shell command substitution inside a Tekton `args` item: `$(cat $(workspaces.source.path)/commit-sha)`. Tekton performs variable substitution in `args`, but does not execute shell command substitution there. Replaced this with a Tekton task result emitted by the clone task and consumed by the build task.
- The original image tags were raw short commit SHAs, while the Flux `ImagePolicy` used alphabetical ordering to select the latest tag. Raw commit hashes are not chronologically sortable, so Flux could select the wrong image. Updated the tag format to a UTC timestamp plus commit SHA and changed the Flux filter to extract the timestamp before applying the alphabetical policy.
- The Kaniko task defined a `context` parameter but ignored it. Updated the Kaniko `--context` argument to use the parameter.
- The Kaniko task relied on Tekton registry credentials but did not set `DOCKER_CONFIG`. Added `DOCKER_CONFIG=/tekton/home/.docker/` so Kaniko can find the Docker config created by Tekton credential initialization.
- The `tekton.dev/v1` `PipelineRun` examples used top-level `spec.serviceAccountName`, which was moved under `spec.taskRunTemplate.serviceAccountName` in Tekton v1. Updated both the manual `PipelineRun` and TriggerTemplate-generated `PipelineRun`.

## Review Notes
- The Flux image automation examples are valid for Flux image toolkit `image.toolkit.fluxcd.io/v1`; the `Setters` update strategy remains the supported/default strategy.
- The GitHub interceptor example filters push events, but a production webhook should also configure webhook secret validation.
- The local environment did not have `kubectl`, `flux`, or `tkn` installed, so CLI behavior was checked against official command documentation instead of local `--help` output.
