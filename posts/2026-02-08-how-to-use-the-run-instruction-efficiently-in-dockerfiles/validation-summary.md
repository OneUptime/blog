# Validation Summary: How to Use the RUN Instruction Efficiently in Dockerfiles

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfile `RUN` instruction
- BuildKit cache and secret mounts
- Debian/Ubuntu `apt-get`
- Python `pip`
- npm
- Bash and POSIX shell behavior

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker build cache invalidation: https://docs.docker.com/build/cache/invalidation/
- Docker build secrets: https://docs.docker.com/build/building/secrets/
- Docker Dockerfile best practices: https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/
- Debian `apt-get` manpage: https://manpages.debian.org/bookworm/apt/apt-get.8
- pip caching documentation: https://pip.pypa.io/en/stable/topics/caching/
- npm `ci` documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- GNU Bash manual: https://www.gnu.org/software/bash/manual/bash.html
- Local Docker CLI help output for `docker build`
- Local pip CLI help output for `pip install --no-cache-dir`

## Issues Found
- The apt cache mount example omitted `sharing=locked` and mounted `/var/lib/apt/lists` rather than Docker's documented `/var/lib/apt` cache mount. I updated the example to use `sharing=locked` for both apt cache mounts and to mount `/var/lib/apt`, because Docker documents that apt needs exclusive access to its data during concurrent builds.
- The shell-safety section implied that `set -o pipefail` could be used directly with the default `/bin/sh -c` shell. I revised the sentence to recommend `set -e` for multi-command scripts and a shell that supports `pipefail`, such as bash, for pipelines.

## Review Notes
- The examples are intentionally generic and assume the referenced base images include the relevant tools, such as `pip`, `npm`, or `bash`, where those commands are shown.
- The Dockerfile `RUN --mount` examples require BuildKit-capable Dockerfile syntax. Docker documents `RUN --mount` as available with Dockerfile syntax version 1.2 or newer.
