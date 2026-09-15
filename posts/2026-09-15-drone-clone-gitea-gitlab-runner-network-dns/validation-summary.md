# Validation Summary: Drone Clone Step Cannot Resolve Gitea or GitLab: Fix Runner Networks and DNS

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Drone CI Docker runner and automatic repository cloning
- Docker Engine networking, user-defined bridge networks, and embedded DNS
- Docker Compose service-name resolution and network membership
- Gitea and GitLab repository clone URLs
- DNS, HTTP, TLS, and Git connectivity diagnostics

## Sources Consulted

- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker networking overview and DNS services: https://docs.docker.com/engine/network/
- Docker daemon troubleshooting and DNS configuration: https://docs.docker.com/engine/daemon/troubleshoot/
- Docker CLI `network ls` reference: https://docs.docker.com/reference/cli/docker/network/ls/
- Docker CLI `network inspect` reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker CLI `run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Drone Docker pipeline cloning documentation: https://docs.drone.io/pipeline/docker/syntax/cloning/
- Drone Docker runner `DRONE_RUNNER_NETWORKS` reference: https://docs.drone.io/runner/docker/configuration/reference/drone-runner-networks/
- Drone Gitea provider installation documentation: https://docs.drone.io/server/provider/gitea/
- curl command-line manual: https://curl.se/docs/manpage.html

## Issues Found
No technical issues found.

## Review Notes
The examples use mutable container image tags, but the post explicitly recommends approved image digests where repeatability matters. The `DRONE_RUNNER_NETWORKS` setting grants the additional network access to every pipeline step handled by the runner, and the post appropriately calls out the resulting security scope. The diagnostic pipeline correctly disables Drone's automatic clone before running DNS checks. No version-specific claims or deprecated interfaces were found.
