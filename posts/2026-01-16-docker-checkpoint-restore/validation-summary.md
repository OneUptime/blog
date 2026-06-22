# Validation Summary: How to Use Docker Checkpoint and Restore (CRIU)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker checkpoint and restore
- CRIU
- Docker Compose
- Bash, scp, rsync, ssh

## Sources Consulted
- Docker CLI reference: docker checkpoint - https://docs.docker.com/reference/cli/docker/checkpoint/
- Docker CLI reference: docker checkpoint create - https://docs.docker.com/reference/cli/docker/checkpoint/create/
- Docker CLI reference: docker container start - https://docs.docker.com/reference/cli/docker/container/start/
- Docker CLI reference: dockerd experimental features - https://docs.docker.com/reference/cli/dockerd/
- Docker Compose reference: version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- CRIU main page - https://criu.org/Main_Page
- CRIU check/kernel support documentation - https://criu.org/Check_the_kernel
- CRIU manual page - https://manpages.debian.org/unstable/criu/criu.8.en.html

## Issues Found
- The Docker Compose example used `version: '3.8'`. Docker Compose now treats the top-level `version` property as obsolete and emits a warning, so it was removed.
- The troubleshooting section used `docker checkpoint create --debug`, but Docker's documented `checkpoint create` options are only `--checkpoint-dir` and `--leave-running`. The unsupported command was replaced with supported Docker daemon log inspection and a command to locate CRIU dump logs under the checkpoint directory.
- The limitations table said volumes were simply "Supported." This was imprecise because Docker checkpoints process state and open file descriptors, but does not back up external volume contents. The wording now clarifies that mounted files can be used, while volume data must be preserved separately.

## Review Notes
Docker checkpoint/restore remains an experimental Docker daemon feature. Docker's own documentation says the feature is focused on single-host checkpoint/restore use cases; cross-host live migration is possible but the workflow is not optimized. The migration examples should therefore be treated as a starting point and tested carefully with matching Docker, kernel, CRIU, image, mount, and network configuration on both hosts.
