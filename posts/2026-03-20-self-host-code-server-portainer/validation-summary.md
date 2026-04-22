# Validation Summary: How to Self-Host a Code Server (VS Code) with Portainer - Self Host

## Status
validated

## Post Type
Tutorial / self-hosting guide

## Technologies Covered
- code-server
- Docker Compose
- Portainer Stacks
- Docker containers and volumes
- Nginx reverse proxy with HTTPS
- nvm and Node.js
- Python venv and pip
- Go
- OneUptime HTTP monitoring

## Sources Consulted
- code-server Docker install documentation: https://coder.com/docs/code-server/install#docker
- code-server FAQ, including extension storage and `/healthz`: https://coder.com/docs/code-server/FAQ
- code-server internet exposure and Nginx reverse proxy guide: https://coder.com/docs/code-server/guide#using-lets-encrypt-with-nginx
- code-server official Docker image Dockerfile: https://raw.githubusercontent.com/coder/code-server/main/ci/release-image/Dockerfile
- code-server official Docker image entrypoint: https://raw.githubusercontent.com/coder/code-server/main/ci/release-image/entrypoint.sh
- Docker Compose Specification docs for the obsolete `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack deployment documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- nvm install and LTS usage documentation: https://github.com/nvm-sh/nvm#installing-and-updating
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Go download page and Linux installation instructions: https://go.dev/dl/ and https://go.dev/doc/install
- Python Packaging User Guide for pip and virtual environments: https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/
- Nginx HTTPS server configuration documentation: https://nginx.org/en/docs/http/configuring_https_servers.html

## Issues Found
- The Compose stack mapped `8443:8443`, but the official `codercom/code-server` image exposes and starts code-server on container port `8080`. Changed the mapping to `8443:8080` so `http://<host>:8443` reaches the service.
- The Compose snippet used the top-level `version: "3.8"` key, which Docker now treats as obsolete and informational. Removed it.
- The Compose snippet set `SUDO_PASSWORD`, but the official code-server image does not use that variable; it configures sudo through its own image setup. Removed the ineffective environment variable.
- The nvm installer version was stale and the Node.js command hard-coded Node 20. Updated the nvm install URL to `v0.40.4` and changed the Node install command to `nvm install --lts`.
- The Python tools command assumed `pip3` was already installed and performed a direct pip install. Updated it to install Python, venv, and pip through apt, then install the tools inside a virtual environment.
- The Go install command used outdated Go 1.22 and omitted the official guidance to remove an existing `/usr/local/go` tree before extracting. Updated it to Go 1.26.2 and added `sudo rm -rf /usr/local/go`.
- The Nginx HTTPS snippet did not include certificate directives. Added `ssl_certificate` and `ssl_certificate_key` placeholders and included the gzip proxy header used in the code-server Nginx guidance.
- The monitoring section checked the root URL for 200/302. Updated it to use code-server's unauthenticated `/healthz` endpoint and expect HTTP 200.

## Review Notes
- Docker Compose was not available in the local workspace, so snippet validation was source-based rather than executed with `docker compose config`.
- code-server uses Open VSX by default rather than the Microsoft Marketplace, so some proprietary Microsoft extensions may not be available.
- The Go command is for Linux x86-64. ARM hosts should use the matching archive from the Go download page.
- For production deployments, pinning a specific code-server image tag is more reproducible than `latest`, although `latest` is valid for a simple tutorial.
