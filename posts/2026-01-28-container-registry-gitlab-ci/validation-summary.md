# Validation Summary: How to Use Container Registry in GitLab CI

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GitLab CI/CD
- GitLab Container Registry
- Docker (docker:24.0, docker:dind)
- Kaniko (gcr.io/kaniko-project/executor)
- Trivy (aquasec/trivy) for container scanning
- Kubernetes (kubectl, image pull secrets)
- AWS ECR (registry mirroring)
- glab (GitLab CLI)
- GitLab Container Registry REST API

## Sources Consulted
- GitLab Container Registry API: https://docs.gitlab.com/ee/api/container_registry.html
- GitLab predefined CI/CD variables: https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab Docker build documentation: https://docs.gitlab.com/ee/ci/docker/using_docker_build.html
- GitLab CLI (glab) API documentation: https://docs.gitlab.com/cli/api/
- glab installation options: https://gitlab.com/gitlab-org/cli/-/blob/main/docs/installation_options.md
- Kaniko releases: https://github.com/GoogleContainerTools/kaniko/releases
- Trivy documentation: https://aquasecurity.github.io/trivy/
- Kubernetes imagePullSecrets documentation

## Issues Found

1. **Incorrect GitLab Container Registry API endpoint for bulk tag deletion.**
   - Original: `glab api -X DELETE "/projects/${CI_PROJECT_ID}/registry/repositories"` with `name_regex_delete`, `keep_n`, `older_than` fields.
   - Problem: The correct endpoint requires the repository ID and a `/tags` suffix. As written, the command would attempt to call a non-existent endpoint (or, if it resolved at all, attempt to delete the repository itself rather than bulk-delete tags). The `name_regex_delete`, `keep_n`, `older_than` parameters only apply to the `/tags` bulk delete endpoint.
   - Fix: Updated the URL to `/projects/${CI_PROJECT_ID}/registry/repositories/${REPOSITORY_ID}/tags` and added a step to look up `REPOSITORY_ID` via the registry repositories API.

2. **Incorrect glab image path.**
   - Original: `image: registry.gitlab.com/gitlab-org/cli:latest`
   - Problem: The official glab CLI image is published as `gitlab/glab` on Docker Hub, not at `registry.gitlab.com/gitlab-org/cli`. The official installation docs use `image: { name: "gitlab/glab", entrypoint: [""] }`.
   - Fix: Replaced with `gitlab/glab:latest` and added `entrypoint: [""]` so the container can run shell commands.

3. **Non-existent `container-registry-cli` tool.**
   - Original: A second cleanup example used `image: registry.gitlab.com/gitlab-org/container-registry/cli:latest` and a `container-registry delete --host ... --token ... --repository ... --keep-last ... --older-than ...` command.
   - Problem: No such image or CLI exists. The `gitlab-org/container-registry` project is the registry server implementation (forked from Docker Distribution); it does not ship a client-side cleanup CLI with these flags. Web search hits for this exact image trace back only to the post itself (circular citation), indicating it was fabricated.
   - Fix: Removed this example. The first (now corrected) glab example covers the same use case using a real, documented mechanism.

## Review Notes
- Predefined GitLab CI/CD variables used throughout the post (`CI_REGISTRY`, `CI_REGISTRY_IMAGE`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, `CI_COMMIT_SHA`, `CI_COMMIT_REF_SLUG`, `CI_COMMIT_BRANCH`, `CI_COMMIT_TAG`, `CI_DEPLOY_USER`, `CI_DEPLOY_PASSWORD`, `CI_PROJECT_PATH`, `CI_PROJECT_ID`, `CI_PROJECT_DIR`, `CI_PIPELINE_SOURCE`) are all verified against GitLab's predefined variables reference.
- Docker-in-Docker configuration (`DOCKER_HOST: tcp://docker:2376` with `DOCKER_TLS_CERTDIR: "/certs"`) is correct for TLS-enabled DinD. Note that with the Docker executor and Docker 19.03+, `DOCKER_HOST` is auto-set by the entrypoint script — it's redundant but harmless.
- Kaniko image `gcr.io/kaniko-project/executor:v1.19.0-debug` exists (confirmed in v1.19.x release notes), though it is older than current (v1.24.x as of mid-2026). Pinning to a specific version is good practice, but readers may want to use a newer release.
- The `only:` keyword is used in several examples; GitLab now recommends `rules:` as the modern equivalent. `only:` still works but is considered legacy.
- The bulk delete endpoint accepts `older_than` values like `1h`, `1d`, `1month`; `30d` is a valid format.
- Trivy `--severity CRITICAL,HIGH` and `--exit-code 1` flags are correct.
- `CI_REGISTRY_PASSWORD` equals the value of `CI_JOB_TOKEN`; the post's "Token for authentication" description is accurate.
- The `kubectl create secret docker-registry ... --dry-run=client -o yaml | kubectl apply -f -` idiom is correct and idiomatic.
