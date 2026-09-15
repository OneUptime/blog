# Validation Summary: Drone Docker Publish Says “No Basic Auth Credentials”: Separate Plugin Secrets from Pull Secrets

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Drone Docker pipelines
- Drone repository secrets and `image_pull_secrets`
- Drone Docker plugin
- Docker registries and Docker `config.json` authentication
- Dockerfiles and private base-image pulls
- BuildKit and `buildctl`

## Sources Consulted

- Drone pipeline image documentation: https://docs.drone.io/pipeline/docker/syntax/images/
- Drone Docker pipeline step documentation: https://docs.drone.io/pipeline/docker/syntax/steps/
- Drone repository secret documentation: https://docs.drone.io/secret/repository/
- Drone Docker plugin documentation: https://plugins.drone.io/plugins/docker
- Drone Docker plugin guide: https://docs.drone.io/plugins/popular/docker/
- Official `drone-plugins/drone-docker` repository: https://github.com/drone-plugins/drone-docker
- Official Moby BuildKit documentation: https://github.com/moby/buildkit

## Issues Found

- The Docker plugin prerequisite was described only as unspecified “execution requirements.” The post now states that the plugin's integrated Docker daemon requires privileged capabilities, matching the official plugin repository documentation and making the example's operational prerequisite explicit.

## Review Notes

- The YAML fields and nesting are consistent with Drone's Docker pipeline and Docker plugin documentation.
- `image_pull_secrets` correctly refers to a Docker `config.json`-format secret used to pull pipeline step images; it does not populate plugin settings.
- The distinction among runner step-image pulls, builder base-image pulls, and plugin image pushes is technically sound.
- Drone's documentation confirms that repository secrets are withheld from pull requests by default.
- BuildKit's official documentation confirms that `buildctl` reads registry credentials from `$DOCKER_CONFIG/config.json`, which supports the suggested explicit multi-registry alternative.
- The unversioned `plugins/docker` image is valid, and the post appropriately recommends pinning an approved version or digest for production.
