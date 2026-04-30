# Validation Summary: How to Configure GitLab CI/CD with IPv6 Runners

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- GitLab CI/CD
- GitLab Runner
- Docker
- Docker-in-Docker (DinD)
- IPv6 networking
- Kubernetes (`kubectl`)

## Sources Consulted
- GitLab Docs: Registering runners - https://docs.gitlab.com/runner/register/
- GitLab Docs: Migrating to the new runner registration workflow - https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab Docs: Docker executor - https://docs.gitlab.com/runner/executors/docker/
- GitLab Docs: Advanced configuration - https://docs.gitlab.com/runner/configuration/advanced-configuration/
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Services - https://docs.gitlab.com/ci/services/
- GitLab Docs: Using GitLab CI/CD with a Kubernetes cluster - https://docs.gitlab.com/user/clusters/agent/ci_cd_workflow/
- GitLab Docs: Get started deploying to Kubernetes - https://docs.gitlab.com/user/clusters/agent/getting_started_deployments/
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: `docker network create` - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `dockerd` reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Bridge network driver - https://docs.docker.com/network/drivers/bridge/

## Issues Found
- The `config.toml` example used the runner `token` field as if it were a registration token. I changed it to a runner authentication token placeholder because GitLab stores an authentication token in `config.toml`, not a registration token.
- The Docker executor example had `privileged = false` and did not mount `/certs/client`, which breaks the later `docker:dind` job with TLS. I changed the runner example to `privileged = true` and added the shared cert volume so the DinD service and job container can communicate correctly.
- The TOML used `[[runners.docker.sysctls]]`, which is the wrong shape for a TOML table. I corrected it to `[runners.docker.sysctls]`.
- The IPv6 subnet and gateway examples used `2001:db8:ci::/64` and `2001:db8:ci::1`, which are invalid because `ci` is not hexadecimal. I replaced them with valid documentation-range IPv6 addresses.
- The `daemon.json` example included `"experimental": true` even though Docker does not require experimental mode for IPv6. I removed it and added the required Docker daemon restart step after editing `daemon.json`.
- The runner registration command used the deprecated `--registration-token` flow and included flags that are no longer configured there when using the current runner authentication token workflow. I updated it to the current `--token` flow and made the shell example copy-paste safe by using `$RUNNER_AUTHENTICATION_TOKEN`.
- The `docker:dind` example did not enable IPv6 inside the DinD daemon, so child containers would not actually receive IPv6 addresses. I added daemon flags to start DinD with IPv6 enabled and a valid IPv6 pool.
- The container connectivity test assumed the built application image already contained `curl`, which is not generally true. I changed the check to run a known Ubuntu test container and install `curl` there before testing IPv6 connectivity.
- The deploy job called `kubectl` without ensuring the tool existed in the job image. I added an image that includes `kubectl`, matching GitLab’s documented pattern for Kubernetes CI jobs.
- The `ping6` examples were replaced with `ping -6` for better portability with current `iputils`.

## Review Notes
- The IPv6 prefixes in the examples use the `2001:db8::/32` documentation range. For a real deployment, replace them with a routed prefix or a ULA prefix appropriate for your environment.
- The updated registration example assumes the runner is created first in the GitLab UI or API so you can supply a runner authentication token.
- The post is technically correct after the fixes, but pinning container image versions more tightly than `docker:24` and `docker:24-dind` would reduce drift over time.
