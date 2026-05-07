# Validation Summary: How to Audit Container Security with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine and Docker CLI
- Docker Bench for Security
- Trivy
- Bash
- `jq`
- Container networking

## Sources Consulted
- Docker Bench for Security README: https://github.com/docker/docker-bench-security
- Docker `inspect` CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker `docker run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run
- Docker port publishing documentation: https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker `docker network inspect` CLI reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Portainer container inspect documentation: https://docs.portainer.io/user/docker/containers/inspect
- Portainer service webhooks documentation: https://docs.portainer.io/user/docker/services/webhooks
- Trivy `image` CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/

## Issues Found
- The Docker Bench section used the published `docker/docker-bench-security` image as if it were current. The upstream project now documents that image as out of date and recommends building the image locally, so I changed the example to clone the repository, build `docker-bench-security`, and run that image instead.
- The "Save results to file" example used `docker run --rm ...`, which was a placeholder rather than a runnable command. I expanded it into a complete command so the snippet can be executed as written.
- The exposed-port audit searched raw JSON for `0.0.0.0` followed by the service port number. That misses containers whose sensitive container port is published on a different host port, such as `15432:5432`. I changed the check to query the specific container port binding and detect external bindings on `0.0.0.0` or `::`.
- The Trivy example relied on current default scanners even though the script only counts vulnerabilities. Current Trivy defaults include `secret` scanning for images, so I added `--scanners vuln` to make the command match the post's stated purpose and JSON-processing logic.
- The conclusion said Docker Bench provides a CIS-based "score". Docker Bench reports benchmark checks rather than a numeric score, so I corrected that wording.
- The conclusion implied Portainer webhooks are what run the audits in CI/CD. Portainer documents webhooks as redeploy or update triggers for supported resources, so I adjusted the wording to describe Inspect and webhook usage accurately.

## Review Notes
- Docker Bench's required bind mounts vary by host operating system. The upstream README includes additional mount-path examples for platforms such as Ubuntu and macOS.
- Portainer webhooks are not universally available for every deployment mode. Current Portainer docs note environment and resource-type limitations, including non-Edge requirements for service webhooks.
