# Validation Summary: How to Push Docker Images to GitLab Container Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- GitLab Container Registry
- GitLab CI/CD
- Docker-in-Docker
- Docker BuildKit
- BuildKit rootless
- GitLab Container Registry API
- GitLab deploy tokens and personal access tokens

## Sources Consulted
- GitLab Docs: GitLab container registry naming, UI paths, and default project registry behavior: https://docs.gitlab.com/user/packages/container_registry/
- GitLab Docs: Authenticate with the container registry, token scopes, CI variables, and deploy tokens: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab Docs: Predefined CI/CD variables reference for `CI_REGISTRY`, `CI_REGISTRY_IMAGE`, `CI_REGISTRY_USER`, and `CI_REGISTRY_PASSWORD`: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Docs: Use Docker to build Docker images with Docker-in-Docker: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Build Docker images with BuildKit, including rootless BuildKit as a replacement for Kaniko: https://docs.gitlab.com/ci/docker/using_buildkit/
- GitLab Docs: Container registry API endpoints for listing repositories, listing tags, and bulk tag deletion: https://docs.gitlab.com/api/container_registry/
- GitLab Docs: Reduce container registry storage and cleanup policy behavior: https://docs.gitlab.com/user/packages/container_registry/reduce_container_registry_storage/
- Docker Docs: `docker login` CLI options, including `--password-stdin`: https://docs.docker.com/reference/cli/docker/login/
- GoogleContainerTools Kaniko GitHub repository/releases, confirming the original project is archived: https://github.com/GoogleContainerTools/kaniko/releases
- Moby BuildKit documentation for `buildctl` image output and registry pushes: https://github.com/moby/buildkit

## Issues Found
- The introduction and conclusion stated that every project gets a registry without qualification. Updated the wording to clarify that the project registry path is available when the container registry feature is enabled.
- The CI/CD authentication section said registry variables are available in every pipeline job. Updated it to clarify they are available when the container registry is enabled.
- The section title "Using Docker BuildKit and Buildx" did not match the example, which used `docker build` with BuildKit but not `docker buildx`. Renamed it to "Using Docker BuildKit Caching."
- The Kaniko section recommended Kaniko as the secure no-Docker-in-Docker path. Current GitLab documentation has removed the Kaniko page and recommends BuildKit rootless as a replacement, and the original Google Kaniko repository is archived. Replaced the Kaniko example and explanation with a BuildKit rootless example.
- The GitLab API comment said the repository-listing endpoint listed tags. Corrected the comment to say it lists registry repositories.
- The cleanup section said cleanup could be configured via `.gitlab-ci.yml`, but the snippet was a custom API cleanup job. Updated the prose and replaced the loop over tags with GitLab's documented bulk tag deletion API using `name_regex_delete`, `keep_n`, and `older_than`.

## Review Notes
- The Docker-in-Docker examples are technically consistent with GitLab's documented Docker executor pattern, but GitLab recommends pinning exact Docker image versions instead of broad tags such as `docker:24`.
- The cleanup API example still requires `REPO_ID` to be supplied, which is appropriate for a concise example but should be called out in a fuller production guide.
