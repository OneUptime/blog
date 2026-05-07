# Validation Summary: How to Cache Podman Images in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Buildah / Containerfile image builds
- Container registries
- GitHub Actions cache
- GitLab CI cache
- npm

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman save` documentation: https://docs.podman.io/en/v4.4/markdown/podman-save.1.html
- Podman `podman load` documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- GitHub Actions dependency caching documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitLab CI/CD caching documentation: https://docs.gitlab.com/ci/caching/
- npm `npm ci` documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/

## Issues Found
- The Node Containerfile installed only production dependencies before running `npm run build`. Many Node builds rely on build tooling in `devDependencies`, so the example could fail. Changed `RUN npm ci --production` to `RUN npm ci` so the locked dependency tree is available for the build step.
- The registry-based Podman cache example used the final `latest` image tag as `--cache-from` and pulled it manually. Podman documents remote build cache usage through a cache repository populated with `--cache-to` and read with `--cache-from`; `--cache-to` also requires layers to be enabled. Added a dedicated `CACHE_IMAGE`, explicit `--layers`, `--cache-from`, and `--cache-to`, and corrected the push comment to clarify that the final image tags are pushed separately.

## Review Notes
- The GitHub Actions cache example is syntactically valid, but cache entries are immutable for a given key. With a key based on `Containerfile` and `package-lock.json`, source-only changes may reuse an older saved image tar until the key changes. This can still help dependency-layer caching, but teams may want a more explicit cache key strategy for their workflow.
