# Validation Summary: How to Use RUN --mount=type=secret for Build-Time Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Dockerfile
- Docker BuildKit
- Build secrets
- SSH mounts
- Docker Compose build secrets
- GitHub Actions with Docker Buildx
- npm private registry authentication
- pip private package index configuration

## Sources Consulted
- Docker Docs: Build secrets - https://docs.docker.com/build/building/secrets/
- Docker Docs: Dockerfile reference for `RUN --mount=type=secret`, `RUN --mount=type=ssh`, and `COPY` - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose Build Specification, build `secrets` - https://docs.docker.com/reference/compose-file/build/
- Docker Docs: Compose file secrets reference - https://docs.docker.com/reference/compose-file/secrets/
- Docker Docs: Using secrets with GitHub Actions - https://docs.docker.com/build/ci/github-actions/secrets/
- Local Docker CLI help for `docker build --secret` and `docker buildx build --secret`

## Issues Found
- The pip example mounted the secret at `target=/etc/pip.conf`, but the nearby comment said it was available at `/run/secrets/pip_conf`. Updated the comment to `/etc/pip.conf`, matching Docker's documented `target` behavior.
- The examples created `pip.conf`, `.npmrc`, and `github_token.txt` in the build context while later using `COPY . .`, which could copy those secret files into the image. Updated the examples to use `/tmp/...` paths outside the build context.
- The introductory explanation said secrets disappeared from the build context. Updated it to say they disappear from the build container, because BuildKit exposes secrets to build containers for the duration of the instruction.
- The post overstated that secret mounts can never leak into layers. Updated the wording to clarify that the mounted secret file itself is not baked into layers; commands can still leak data if they copy or write secret contents.
- The SSH secret example used `StrictHostKeyChecking=no` after populating `known_hosts`. Updated it to use `UserKnownHostsFile=/root/.ssh/known_hosts` so host key verification remains meaningful.
- The GitHub Actions example used older Docker action versions. Updated it to the current official examples: `actions/checkout@v6`, `docker/setup-buildx-action@v4`, and `docker/build-push-action@v7`.

## Review Notes
The Docker and Compose secret mount syntax is otherwise consistent with official documentation. The post could later mention `required=true`, secret `uid`/`gid`/`mode`, and `RUN --mount=type=secret,env=...` for direct environment-variable mounting, but those are optional improvements rather than correctness issues.
