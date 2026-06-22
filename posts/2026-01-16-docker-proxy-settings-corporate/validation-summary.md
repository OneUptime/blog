# Validation Summary: How to Configure Docker Proxy Settings for Corporate Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Desktop
- Docker CLI
- Docker Compose
- Dockerfile / Docker Build
- systemd service overrides
- HTTP/HTTPS proxy configuration
- NO_PROXY configuration
- Corporate CA certificates for TLS interception
- cntlm for NTLM/Kerberos proxy workflows

## Sources Consulted
- Docker Docs: Daemon proxy configuration - https://docs.docker.com/engine/daemon/proxy/
- Docker Docs: Use a proxy server with the Docker CLI - https://docs.docker.com/engine/cli/proxy/
- Docker Docs: Build variables and proxy arguments - https://docs.docker.com/build/building/variables/
- Docker Docs: Dockerfile reference, predefined ARGs - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Docker Desktop settings, proxies - https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Docs: Use CA certificates with Docker - https://docs.docker.com/engine/network/ca-certs/
- Docker Docs: Set environment variables within your container's environment with Compose - https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker Docs: Compose file version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI help for Docker 29.4.2 and Docker Compose v5.1.3

## Issues Found
- The post described `daemon.json` proxy configuration as suitable for Docker Desktop on Windows and macOS. Docker's daemon proxy documentation states that Docker Desktop ignores proxy settings in `daemon.json`, so this section was narrowed to Docker Engine and Docker Desktop was directed to use Desktop settings.
- The post claimed containers inherit proxy settings from the daemon in newer Docker versions. Docker documents automatic container proxy configuration through Docker client `~/.docker/config.json` and Docker Desktop container proxy settings, not daemon proxy inheritance. The section was corrected and a client configuration example was added.
- The `.env` example used `docker-compose --env-file .env.proxy up` as if it injected variables into containers. Compose `.env` and `--env-file` are for interpolation/project environment unless services explicitly pass variables through. The example was changed to use the service-level `env_file` attribute for container environment variables.
- The Dockerfile example set proxy values with `ENV`, then cleared them. Docker recommends using proxy build arguments directly and warns that using `ENV` embeds proxy configuration into the image. The Dockerfile was simplified to rely on predefined proxy build arguments.
- The `NO_PROXY` table called `172.16.0.0/12` Docker's default bridge network. This is a private IPv4 range often used by Docker bridge networks, while Docker's default bridge is commonly a narrower subnet such as `172.17.0.0/16`. The description was corrected.
- The troubleshooting command comment said `docker pull alpine 2>&1 | grep -i proxy` enabled debug mode. It does not. The example was simplified to `docker --debug pull alpine`.

## Review Notes
- The remaining Compose examples still include the obsolete top-level `version` key. Docker Compose keeps it for backward compatibility but now warns that it is obsolete; this is not a functional error, but future updates could remove it from examples.
- Proxy environment variable behavior is not standardized across all applications. The post correctly includes both uppercase and lowercase variants where explicit runtime variables are used.
