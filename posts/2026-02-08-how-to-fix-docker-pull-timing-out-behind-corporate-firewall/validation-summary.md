# Validation Summary: How to Fix Docker Pull Timing Out Behind Corporate Firewall

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Hub
- Docker daemon configuration
- systemd service drop-ins
- HTTP/HTTPS proxy configuration
- Corporate CA certificates
- Docker Registry pull-through cache / registry mirrors
- cntlm proxy relay

## Sources Consulted
- Docker Docs: Daemon proxy configuration - https://docs.docker.com/engine/daemon/proxy/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: Use a proxy server with the Docker CLI - https://docs.docker.com/engine/cli/proxy/
- Docker Docs: Docker CLI reference and config.json properties - https://docs.docker.com/reference/cli/docker/
- Docker Docs: Use CA certificates with Docker - https://docs.docker.com/engine/network/ca-certs/
- Docker Docs: Verify repository client with certificates - https://docs.docker.com/engine/security/certificates/
- Docker Docs: Mirror the Docker Hub library - https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Docs: Allowlist for Docker Desktop - https://docs.docker.com/desktop/setup/allow-list/
- Local Docker CLI help: `docker pull --help`, `docker info --help`, and `dockerd --help`

## Issues Found
- The Docker client proxy section incorrectly said `~/.docker/config.json` proxy settings are needed for `docker login` and `docker search`. Docker's documentation says these settings configure proxy environment variables for containers and build arguments, not the Docker CLI or daemon proxy itself. I changed the section to describe container and build proxy configuration.
- The certificate conversion text said a PEM certificate might need conversion while the command converted DER to PEM. I changed the wording to DER format.
- The registry mirror test claimed `docker inspect ... | grep -i registry` checks which registry the image came from. Docker image metadata does not reliably identify the mirror used for a pull. I changed the example to inspect the pulled image digest instead.
- The Docker Hub allowlist omitted current Docker-documented layer delivery domains and included older/less precise entries for the website/index. I added `production.cloudfront.docker.com` and Docker's documented R2 storage hostname, and changed the website entry to `hub.docker.com`.
- The timeout section referred to a `docker pull --timeout` flag and pulling individual layers. Current `docker pull --help` does not include a timeout flag, and users do not pull individual image layers directly with `docker pull`. I changed the section to describe increasing download retry attempts and using `--platform` for architecture-specific pulls.

## Review Notes
- The daemon proxy examples are accurate for Docker Engine on Linux. Docker Desktop handles proxy configuration through Docker Desktop settings, and Docker's docs note that daemon proxy settings in `daemon.json` are ignored by Docker Desktop.
- Proxy credentials in systemd environment variables or Docker config files can expose sensitive data in plaintext or metadata. Docker's docs warn about this for container proxy environment variables.
