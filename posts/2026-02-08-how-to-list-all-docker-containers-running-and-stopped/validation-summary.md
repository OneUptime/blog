# Validation Summary: How to List All Docker Containers (Running and Stopped)

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Docker CLI
- Docker containers
- Docker container filters
- Docker Go template formatting
- Bash scripting

## Sources Consulted
- Docker CLI reference: `docker container ls` / `docker ps` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI filtering reference - https://docs.docker.com/engine/cli/filter/
- Local Docker CLI help: `docker ps --help`, Docker Engine 29.4.2
- Local Docker CLI behavior checks for `--filter status=...`, `--filter name=...`, and `docker ps -l`

## Issues Found
- The post implied `docker ps -l -a` is needed to show the latest container if it has exited. Docker's current CLI help documents `-l, --latest` as showing the latest created container and including all states. Updated the example to state that `docker ps -l` already includes exited containers.
- The post did not mention that `docker ps -n` includes containers in all states. Docker's CLI help documents `-n, --last` as including all states, so the explanation was clarified.

## Review Notes
The remaining commands and examples match Docker's current CLI reference. Some cleanup examples use shell command substitution and may fail with an empty result set, but they are common examples for interactive use and are not technically incorrect.
