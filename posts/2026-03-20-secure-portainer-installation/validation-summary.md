# Validation Summary: How to Secure Your Portainer Installation - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition / Business Edition
- Docker CLI and Docker port publishing
- Nginx reverse proxy access controls
- TLS/HTTPS certificates
- Portainer authentication, Edge Compute, Docker security settings, logs, and backup practices

## Sources Consulted
- Portainer Documentation: Install Portainer CE with Docker on Linux - https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Documentation: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Portainer Documentation: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer Documentation: Initial setup - https://docs.portainer.io/start/install-ce/server/setup
- Portainer Documentation: Authentication settings - https://docs.portainer.io/admin/settings/authentication
- Portainer Documentation: Edge Compute settings - https://docs.portainer.io/admin/settings/edge
- Portainer Documentation: Docker Host Setup / Docker Security Settings - https://docs.portainer.io/sts/user/docker/host/setup
- Portainer Documentation: Updating on Docker Standalone - https://docs.portainer.io/sts/start/upgrade/docker
- Portainer Documentation: Authentication logs - https://docs.portainer.io/sts/admin/logs/authentication
- Portainer Documentation: Backup contents and General settings backup - https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer how-to: How to correctly secure Portainer when presented on the internet - https://www.portainer.io/how-to/how-to-correctly-secure-portainer-when-presented-on-the-internet
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Nginx Documentation: ngx_http_access_module - https://nginx.org/en/docs/http/ngx_http_access_module.html
- Nginx Documentation: ngx_http_proxy_module / proxy_pass - https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- Removed the outdated `--ssl` flag from the TLS `docker run` example. Current Portainer documentation uses `--sslcert` and `--sslkey`, with HTTPS served on port `9443`; `--http-disabled` was added to make the example HTTPS-only.
- Updated Portainer image tags from `portainer/portainer-ce:latest` to `portainer/portainer-ce:sts` to match current official Docker install and update examples.
- Added the Docker socket and persistent `portainer_data` volume to runnable Portainer examples so the installation matches the official Docker Standalone pattern.
- Changed "Rename the Default Admin Username" to "Set a Non-Default Admin Username" because Portainer documents changing the initial username during setup, not renaming an existing account.
- Replaced the native 2FA recommendation with external authentication guidance. Portainer's internal authentication does not provide native 2FA; official guidance recommends external authentication, especially OAuth, when MFA/2FA is required.
- Fixed the broken Bash line continuation in the network-binding example by moving the inline comment out of the continued command.
- Corrected the Edge Compute UI instruction from the nonexistent "Disable Edge portal" wording to turning off "Enable Edge Compute features."
- Corrected the nonexistent `Settings > Security` path and unsupported settings. The post now points to `Settings > Authentication` and uses documented controls for external authentication, minimum password length, and session lifetime.
- Replaced inaccurate Docker/Swarm security setting names such as host IPC and host network with the current Docker Security Settings labels documented by Portainer.
- Replaced the placeholder update command (`docker run -d ...`) with a complete Docker command based on current Portainer update documentation.
- Replaced the misleading `docker logs` access-log command with Portainer Business Edition authentication logs and reverse proxy/firewall log guidance for Community Edition.
- Updated the raw volume backup command to stop Portainer first, mount the data volume read-only, archive the data directory contents with `tar -C`, and restart Portainer.

## Review Notes
- The Nginx `allow`, `deny`, and `proxy_pass` directives are valid, but production deployments commonly need additional reverse proxy headers, TLS trust handling for upstream self-signed certificates, and websocket handling depending on the full Nginx configuration.
- Portainer exposes the Edge tunnel port `8000` in official install examples, but the reviewed post intentionally avoids exposing it because the checklist also recommends disabling unused Edge features.
