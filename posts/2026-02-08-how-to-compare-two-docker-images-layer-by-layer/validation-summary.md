# Validation Summary: How to Compare Two Docker Images Layer by Layer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker images and image layers
- Docker image inspection and history
- container-diff
- Docker Scout
- Bash scripting
- GitHub Actions

## Sources Consulted
- Docker CLI reference: docker image inspect - https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker CLI reference: docker image history - https://docs.docker.com/reference/cli/docker/image/history/
- Docker CLI reference: docker container export - https://docs.docker.com/reference/cli/docker/container/export/
- Docker Scout compare reference - https://docs.docker.com/reference/cli/docker/scout/compare/
- Docker Scout cves reference - https://docs.docker.com/reference/cli/docker/scout/cves/
- GoogleContainerTools container-diff README - https://github.com/GoogleContainerTools/container-diff
- Local Docker CLI help output for Docker 29.4.2

## Issues Found
- The container-diff section described the tool without noting its current support status. Updated the description to call it an archived tool because the official repository is archived and read-only.
- The macOS container-diff install command used `brew install container-diff`, but the official container-diff README documents installation with the downloaded Darwin binary. Replaced it with the official `curl`, `chmod`, and `mv` steps.
- The remote image example used `docker://` prefixes for container-diff. The official container-diff README documents `remote://` for explicitly remote registry images, so the example now uses `remote://nginx:1.24` and `remote://nginx:1.25`.
- The Docker Scout example labeled `docker scout cves myapp:v2 --only-severity critical,high` as showing only new vulnerabilities, but that command scans one image and filters by severity. Replaced it with a `docker scout compare` command using `--to`, `--only-severity`, and `--ignore-unchanged` to compare vulnerability differences between two images.

## Review Notes
- Docker Scout `compare` is documented as experimental by Docker, so its behavior may change in future releases.
- The filesystem export method compares the flattened container filesystem created from each image, not the individual tar archives for each layer.
