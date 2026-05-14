# Validation Summary: How to Integrate Flux CD with Buildkite

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Flux CD image automation
- Flux notification receivers
- Buildkite pipelines and agents
- Buildkite Docker Compose and ECR plugins
- Docker container builds and registry pushes
- Kubernetes manifests and secrets
- Amazon ECR

## Sources Consulted
- Buildkite pipeline upload and interpolation documentation: https://buildkite.com/docs/agent/cli/reference/pipeline
- Buildkite step dependency documentation: https://buildkite.com/docs/pipelines/configure/depends-on
- Buildkite agent Linux install documentation: https://buildkite.com/docs/agent/self-hosted/install/linux
- Buildkite agent start command documentation: https://buildkite.com/docs/agent/v3/cli/reference/start
- Buildkite Docker Compose plugin documentation: https://buildkite.com/resources/plugins/buildkite-plugins/docker-compose-buildkite-plugin/
- Buildkite Docker Login plugin documentation: https://buildkite.com/resources/plugins/buildkite-plugins/docker-login-buildkite-plugin/
- Buildkite ECR plugin documentation: https://buildkite.com/resources/plugins/buildkite-plugins/ecr-buildkite-plugin/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux CLI reconcile image repository documentation: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/

## Issues Found
- The first Buildkite test step used `make test || echo "Tests passed"`, which would hide test failures and print a success message. Changed it to run `make test` directly.
- The Flux notification step used `depends_on: "build-and-push"` without defining a `key` on the build step. Added `key: "build-and-push"` to the build-and-push step.
- The Docker Compose plugin examples included unsupported `image-repository` and `image-name` keys. Removed those keys and kept the supported `build`, `cache-from`, and `push` configuration.
- The Docker Compose plugin example pushed to Docker Hub without showing registry authentication. Added the official `docker-login` plugin before the `docker-compose` plugin.
- Updated the Docker Compose and ECR plugin versions in examples to the current documented versions.
- The semver `ImagePolicy` example did not apply to SHA-only image tags from the basic Buildkite example. Added a note clarifying that the semver policy matches semver tags and that SHA-only tags need a sortable policy.
- The Flux Receiver example referenced a secret but did not show how to create the required `token` key. Added a `kubectl create secret generic` command.
- The webhook notification step used a predictable `/hook/buildkite-receiver` URL and referenced `IMAGE_TAG` from a previous step where it would not exist. Updated it to recompute `IMAGE_TAG` and use a `FLUX_WEBHOOK_URL` containing the externally reachable notification-controller host plus the receiver's generated `.status.webhookPath`.

## Review Notes
- The Kubernetes Buildkite agent example mounts the host Docker socket, which is technically functional but has security implications. A production setup should review this carefully and consider Buildkite Agent Stack for Kubernetes or another isolated build strategy.
- The Flux image automation examples assume the image automation controllers are installed and that the referenced `GitRepository` named `flux-system` exists in the same namespace.
