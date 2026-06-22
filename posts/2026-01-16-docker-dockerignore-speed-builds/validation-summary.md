# Validation Summary: How to Use .dockerignore to Speed Up Docker Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Build / BuildKit
- `.dockerignore` configuration
- Shell commands for Docker builds
- Node.js, Python, Go, and Next.js project ignore patterns

## Sources Consulted
- Docker Docs: Build context and `.dockerignore` files - https://docs.docker.com/build/concepts/context/
- Docker Docs: Dockerfile reference, `.dockerignore` file - https://docs.docker.com/reference/dockerfile/
- Docker Docs: `docker buildx build` CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Local Docker CLI help for `docker build` / `docker buildx build`
- Local Docker build checks using temporary contexts to verify `.dockerignore` matching for `*.md`, leading slashes, trailing slashes, `**/node_modules`, and negation patterns

## Issues Found
- The post said `.dockerignore` uses the same syntax as `.gitignore`. Docker documents it as similar, but not identical, so the wording was corrected.
- The post said the `.dockerignore` file should be in the project root next to the Dockerfile. Docker looks for `.dockerignore` in the build context root, and Dockerfile-specific ignore files have their own naming convention, so this was corrected.
- Several examples implied patterns like `*.md`, `*.test.js`, and `*_test.go` match files in all subdirectories. Docker's matching treats those as root-level patterns, so examples that intended recursive matching were changed to `**/*.md`, `**/*.test.js`, and similar forms.
- The post claimed leading slashes and trailing slashes change matching behavior. Docker disregards leading and trailing slashes in ignore patterns, so those "common mistakes" examples were corrected.
- The debugging examples used `tar --exclude-from` and `rsync --exclude-from` as if they exactly simulate `.dockerignore`. Those tools do not implement Docker's full pattern and negation rules, so the commands were corrected to use `docker build --progress=plain` for context size and label `rsync` as an approximation only.
- Comments saying Docker files are "not needed in context" were clarified. Docker still sends the Dockerfile and `.dockerignore` to the builder when needed, but excluded versions are not available to `COPY`, `ADD`, or bind mounts.
- The separate-Dockerfiles strategy was corrected to mention Dockerfile-specific ignore files such as `Dockerfile.dev.dockerignore` and `Dockerfile.prod.dockerignore`.

## Review Notes
The post is technically relevant and useful. The build time and context size examples are plausible illustrative values, but actual improvements depend on the project size, builder location, cache state, and which files are copied into the final image.
