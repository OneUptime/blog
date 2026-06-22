# Validation Summary: How to Run Docker Inside Docker (DinD) Safely

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker-in-Docker (`docker:dind` and `docker:dind-rootless`)
- Docker Compose
- Docker socket binding
- Docker socket proxy (`tecnativa/docker-socket-proxy`)
- GitLab CI/CD
- GitHub Actions
- Jenkins Pipeline

## Sources Consulted
- Docker Official Image documentation for `docker` / `docker:dind`: https://hub.docker.com/_/docker
- Docker Docs, Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, rootless Docker-in-Docker tips: https://docs.docker.com/engine/security/rootless/tips/
- Docker Docs, rootless mode: https://docs.docker.com/engine/security/rootless/
- Docker Docs, protecting Docker daemon socket access: https://docs.docker.com/engine/security/protect-access/
- GitLab Docs, Docker-in-Docker: https://docs.gitlab.com/ci/docker/docker_in_docker/
- GitLab Docs, using Docker to build Docker images: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitHub Docs, running jobs in a container: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container
- GitHub Docs, communicating with Docker service containers: https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers
- Tecnativa docker-socket-proxy documentation: https://github.com/Tecnativa/docker-socket-proxy

## Issues Found
- The basic DinD setup used legacy `--link` behavior and did not configure TLS client certificates, but modern `docker:dind` enables TLS by default. Updated the example to use a user-defined Docker network, shared certificate volumes, and `DOCKER_TLS_CERTDIR=/certs`.
- Compose examples used the obsolete top-level `version` property. Removed it from the Compose snippets so they match the current Compose Specification behavior.
- The GitLab CI example used an unquoted numeric value for `DOCKER_TLS_VERIFY`. Quoted it as a string to match CI variable expectations.
- The GitHub Actions DinD example ran the job inside `docker:latest` and used the service hostname without mapping the daemon port. Updated it to run on the Ubuntu runner, publish port `2375`, and set `DOCKER_HOST=tcp://localhost:2375` for the build step.
- The comparison and recommendation text overstated DinD isolation as "Full" and implied it was generally appropriate for untrusted code. Adjusted the wording to reflect that privileged DinD still requires dedicated or ephemeral hosts for less-trusted workloads.
- The clean-state comparison said each DinD run is always fresh, but examples in the post persist `/var/lib/docker` in a named volume. Clarified that DinD is fresh only when storage is not persisted.

## Review Notes
The post is technically valid after the fixes. Docker socket binding remains intentionally described as high risk; the socket proxy example can reduce API exposure, but it does not make socket access safe for untrusted workloads.
