# Validation Summary: How to Set Up Docker Builds in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`)
- Docker / Docker-in-Docker (dind)
- Docker BuildKit & `docker buildx` (multi-platform builds)
- GitLab Container Registry (`CI_REGISTRY_*` predefined variables)
- Kaniko (rootless image builds)
- Multi-stage Dockerfiles (Node.js / Alpine)
- container-structure-test
- Trivy (container image security scanning)
- kubectl (deploy step)

## Sources Consulted
- GitLab Docs — Use Docker to build Docker images: https://docs.gitlab.com/ee/ci/docker/using_docker_build.html
- GitLab Docs — Predefined CI/CD variables (`CI_REGISTRY`, `CI_REGISTRY_IMAGE`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, `CI_COMMIT_SHA`, `CI_COMMIT_TAG`, `CI_COMMIT_REF_SLUG`): https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab Docs — Use kaniko to build Docker images: https://docs.gitlab.com/ee/ci/docker/using_kaniko.html
- Docker docs — `docker buildx build` / BuildKit secrets / `--cache-from` / `BUILDKIT_INLINE_CACHE`: https://docs.docker.com/build/
- npm CLI docs — `npm ci` and dependency installation (`--omit`/`--only`): https://docs.npmjs.com/cli/commands/npm-ci
- Docker Hub `docker` image tags (`24.0`, `24.0-dind`, `24.0.7-alpine`): https://hub.docker.com/_/docker
- GoogleContainerTools/container-structure-test schema reference: https://github.com/GoogleContainerTools/container-structure-test
- Aqua Security Trivy docs — GitLab CI integration / `/contrib/gitlab.tpl` template: https://aquasecurity.github.io/trivy/

## Issues Found
- **Multi-stage Dockerfile builder stage (`npm ci --only=production` before `npm run build`)** — The builder stage installed production dependencies only and then ran `npm run build`. Build tooling (bundlers, transpilers such as webpack/tsc/vite) are normally `devDependencies`, so `--only=production` omits them and `npm run build` would fail. Changed to `RUN npm ci` so the builder installs all dependencies (the lean production stage already copies only the built `dist` plus `node_modules`, so the final image stays small). This also avoids the deprecated `--only` flag (superseded by `--omit=dev` in npm 7+).

## Review Notes
- **Multi-platform build (QEMU/binfmt)** — The `build_multiplatform` job uses `docker buildx build --platform linux/amd64,linux/arm64` inside dind but does not register QEMU emulators. Cross-architecture builds on an amd64 runner typically require a binfmt setup step (e.g. `docker run --privileged --rm tonistiigi/binfmt --install all`) before `buildx build`. The snippet is otherwise syntactically correct; this is a completeness caveat rather than an error, so the post text was left unchanged.
- The production-stage Dockerfile copies `node_modules` from the builder. Since the builder now installs all dependencies, the copied `node_modules` may include devDependencies. For a strictly minimal production image, a dedicated `npm ci --omit=dev` in the production stage would be slightly leaner, but copying is functionally correct and a common pattern.
- The first dind example (`docker push myapp:latest`) pushes an unqualified, un-authenticated image name; it is clearly illustrative (the registry-authenticated examples follow), so it was left as-is.
- Image/version references (`docker:24.0`, `docker:24.0-dind`, `docker:24.0.7-alpine`, `gcr.io/kaniko-project/executor:v1.18.0-debug`, Trivy `/contrib/gitlab.tpl`, container-structure-test `schemaVersion: 2.0.0`) are all valid as written. Pinning to specific minor versions over `latest` (as the post itself recommends) remains good practice going forward.
