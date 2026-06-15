# Validation Summary: How to Use Docker Ignore Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Build / BuildKit
- .dockerignore files
- Dockerfile
- Multi-stage Docker builds
- Node.js, Python, and Go project ignore examples

## Sources Consulted
- Docker Docs: Build context and .dockerignore files - https://docs.docker.com/build/concepts/context/
- Docker Docs: docker image build reference - https://docs.docker.com/reference/cli/docker/image/build/
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Build secrets - https://docs.docker.com/build/building/secrets/
- Local Docker CLI help: `docker build --help`
- Local Docker BuildKit test builds to verify .dockerignore root-only and recursive pattern behavior

## Issues Found
- The post stated that `docker build` sends the entire build context to the Docker daemon. This is accurate for the legacy builder, but current Docker documentation notes that BuildKit loads and transfers only the files it needs. Updated the wording and example command to use BuildKit progress output.
- Several `.dockerignore` comments implied that root-level glob patterns such as `*.md`, `*.log`, `*.test.js`, and `logs` match files or directories anywhere in the tree. Docker's pattern rules make these root-context examples unless `**` is used. Updated comments and templates to use `**/...` where the text intended recursive matching.
- The syntax section said comments start with `#`. Docker documentation specifies that comment lines start with `#` in column 1, so the wording was tightened.
- The environment-file section suggested using build args or secrets for sensitive data. Docker documentation says build arguments and environment variables are inappropriate for secrets because they can persist in the final image. Updated the recommendation to use build secrets.

## Review Notes
The examples are broadly correct after the fixes. The template remains intentionally generic, so teams should still adjust it for files required by their own Dockerfile, tests, or build process.
