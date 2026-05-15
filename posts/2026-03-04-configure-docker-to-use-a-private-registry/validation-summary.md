# Validation Summary: How to Configure Docker to Use a Private Registry on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Docker Engine
- Docker CLI
- Docker private registries
- Docker daemon configuration
- TLS and registry CA certificates
- firewalld
- systemd

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd reference, insecure registries - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Verify repository client with certificates - https://docs.docker.com/engine/security/certificates/
- Docker Docs: docker login - https://docs.docker.com/reference/cli/docker/login/
- Docker Docs: docker image pull - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs: docker image tag - https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Docs: docker image push - https://docs.docker.com/engine/reference/commandline/image_push/
- Red Hat Enterprise Linux 8 documentation: Building, running, and managing containers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/

## Issues Found
- The original post used placeholder package commands such as `sudo dnf install -y <package-name>` and `rpm -qi <package-name>`. These were replaced with Docker's documented RHEL package installation commands for `docker-ce`, `docker-ce-cli`, `containerd.io`, and related plugins.
- The original setup installed `epel-release` and "Development Tools", which are not required by Docker's official RHEL installation path. These were replaced with `dnf-plugins-core` and Docker's official RHEL repository configuration.
- The original service configuration used placeholder paths such as `/etc/<service>/config.conf`. This was replaced with Docker's documented `/etc/docker/daemon.json` configuration and `/etc/docker/certs.d/<registry-host>:<port>/ca.crt` certificate location.
- The original start, status, test, log, and tuning commands used `<service>` placeholders. These were replaced with Docker-specific `systemctl`, `docker login`, `docker pull`, `docker system df`, and `docker stats` commands.
- The original firewall command used `--add-service=<service>`, which would not work for a private registry without a matching firewalld service definition. This was replaced with a concrete `--add-port=5000/tcp` example for a registry listening on port `5000`.
- The original troubleshooting section was generic. It was updated with Docker-specific checks for daemon JSON syntax, registry CA certificate placement, authentication, and port conflicts.

## Review Notes
- Red Hat's supported container tooling on current RHEL releases is centered on Podman rather than Docker Engine; Docker's own documentation provides the upstream Docker Engine installation path for RHEL. The post is still technically relevant because it explicitly targets Docker.
- The `insecure-registries` setting is technically valid but weakens transport security. The post now scopes it to trusted test or internal environments and recommends HTTPS with a trusted CA certificate whenever possible.
