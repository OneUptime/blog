# Validation Summary: How to Integrate Flux CD with Drone CI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Drone CI
- Flux CD image reflector and image automation controllers
- Kubernetes
- Docker and container registries
- Amazon ECR
- Google Container Registry
- GitOps

## Sources Consulted
- Drone pipeline environment substitution documentation: https://docs.drone.io/pipeline/environment/substitution/
- Drone pipeline trigger documentation: https://docs.drone.io/pipeline/docker/syntax/trigger/
- Drone CLI secret documentation: https://docs.drone.io/cli/secret/drone-secret-add/
- Drone Docker plugin documentation: https://docs.drone.io/plugins/popular/docker/
- Drone AWS ECR plugin documentation: https://plugins.drone.io/plugins/ecr
- Drone Google Container Registry plugin documentation: https://plugins.drone.io/plugins/gcr
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux reconcile image update command documentation: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/

## Issues Found
- The first Drone test step used `go test ./... || echo "Tests passed"`, which would report success and continue even when tests failed. Changed it to `go test ./...` so failed tests fail the pipeline.
- The semantic-versioning Drone trigger combined a branch trigger with a tag event. Drone documentation states branch triggers cannot be used with tag events because tag events are not associated with a branch. Changed the trigger to use `event` plus `ref` patterns for `refs/heads/main` and `refs/tags/v*`.
- The semantic-versioning example wrote `.version` but configured the Docker plugin tag from `${DRONE_TAG##v}` instead of reading the generated file. Changed the generated file to `.tags`, which the Drone Docker plugin automatically reads for dynamic tags.
- The ECR plugin example set `repo` to the full registry URL. The ECR plugin expects `repo` to be the image repository name and `registry` to hold the ECR registry hostname. Changed `repo` to `my-app`.
- The commit-SHA Flux image policy used alphabetical sorting over bare short SHA tags. That does not reliably select the newest build because Git SHAs are not chronological. Changed the examples to use build-number-prefixed SHA tags and a Flux numerical policy with `filterTags.extract`.

## Review Notes
The remaining snippets are syntactically valid YAML and align with current Drone and Flux documentation. The GCR plugin example is appropriate for `gcr.io`; Artifact Registry users should adjust the registry host and repository path for their Artifact Registry location and repository.
