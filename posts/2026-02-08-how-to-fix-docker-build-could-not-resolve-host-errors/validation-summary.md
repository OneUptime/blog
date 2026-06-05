# Validation Summary: How to Fix Docker Build 'Could Not Resolve Host' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker Build and BuildKit
- Docker Compose build configuration
- Docker daemon and client configuration
- DNS and `/etc/resolv.conf`
- systemd-resolved
- Linux iptables
- HTTP/HTTPS proxy configuration for Docker builds

## Sources Consulted
- Docker Docs: Troubleshooting the Docker daemon, "Specify DNS servers for Docker" - https://docs.docker.com/engine/daemon/troubleshoot/
- Docker Docs: `docker buildx build` / `docker build --network` CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Docker Build overview - https://docs.docker.com/build/concepts/overview/
- Docker Docs: Compose Build Specification, `build.network` - https://docs.docker.com/reference/compose-file/build/
- Docker Docs: Use a proxy server with the Docker CLI - https://docs.docker.com/engine/cli/proxy/
- Docker Docs: Daemon proxy configuration - https://docs.docker.com/engine/daemon/proxy/
- Docker Docs: Dockerfile reference, predefined proxy build arguments - https://docs.docker.com/reference/builder
- systemd `resolved.conf(5)` manual page for `DNSStubListenerExtra`
- Local Docker CLI help for `docker build --network`, `--build-arg`, and `--progress`

## Issues Found
- The proxy section said daemon-level proxy settings in `/etc/docker/daemon.json` apply to all builds. Docker's daemon proxy configuration is for daemon operations such as pulling images and registry access, while proxy variables for `RUN` instructions should be passed with build arguments or configured in the Docker client config. Changed the alternative proxy configuration to use `~/.docker/config.json` with `proxies.default`.
- The proxy-aware Dockerfile persisted proxy values with `ENV`. Docker's official guidance says not to use `ENV` for build proxy settings because it embeds proxy data in the image. Removed the `ENV` instructions and noted that Docker provides predefined proxy build arguments.
- The summary repeated the daemon-level proxy recommendation for corporate environments. Updated it to recommend Docker client proxy settings or proxy build arguments.

## Review Notes
The DNS daemon configuration, `docker build --network=host`, Compose `build.network`, systemd-resolved `DNSStubListenerExtra`, and diagnostic command examples matched official documentation or local CLI help. The hard-coded Docker bridge address `172.17.0.1` is common for the default bridge, but users with custom Docker bridge settings should use the address returned by `ip addr show docker0`.
