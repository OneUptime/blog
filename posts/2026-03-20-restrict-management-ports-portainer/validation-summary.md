# Validation Summary: How to Restrict Management Ports in Portainer - A Practical Guide

## Status
validated

## Post Type
Security hardening guide

## Technologies Covered
- Portainer CE
- Portainer Agent and Edge Agent
- Docker Engine
- Docker Compose
- Nginx
- UFW
- iptables

## Sources Consulted
- Portainer CE Docker Standalone installation documentation: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Edge Agent documentation: https://docs.portainer.io/advanced/edge-agent
- Portainer architecture documentation: https://docs.portainer.io/start/architecture
- Docker port publishing documentation: https://docs.docker.com/engine/network/port-publishing/
- Docker packet filtering and firewall documentation: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker iptables documentation: https://docs.docker.com/engine/network/firewall-iptables/
- Docker Compose file reference and version element documentation: https://docs.docker.com/reference/compose-file/ and https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services and ports documentation: https://docs.docker.com/reference/compose-file/services/
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Ubuntu UFW firewall documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/

## Issues Found
- The first `docker run` example used inline comments after line-continuation backslashes, which breaks Bash command continuation. Removed the invalid inline-comment pattern and kept the command syntactically valid.
- The post said to disable Portainer HTTP, but the example only omitted the host port mapping for `9000`. Added Portainer's `--http-disabled` flag so the example actually disables HTTP, and added the standard Docker socket and data volume mounts used by Portainer's Docker install guidance.
- The Nginx example used `listen 443 ssl http2;`, which is deprecated in current Nginx. Updated it to `listen 443 ssl;` plus `http2 on;`, and added standard forwarded headers.
- The UFW section implied that `ufw deny` reliably blocks Docker-published ports. Docker's official firewall documentation notes that Docker-published traffic can bypass UFW, so the section now states that UFW applies to host-level listeners and that Docker traffic should be restricted by localhost binding or `DOCKER-USER`.
- The Portainer Agent iptables example used the `INPUT` chain, which does not reliably filter Docker-published container ports. Updated it to use Docker's `DOCKER-USER` chain for port `9001`, added `sudo`, and fixed the privileged `iptables-save` redirection.
- The Docker Compose example used the obsolete top-level `version` field and referenced `portainer_data` without declaring it. Removed `version`, declared the named volume, added the Docker socket mount, and passed `--http-disabled` to Portainer.

## Review Notes
Docker and Nginx were not installed in the local environment, so runtime validation of those binaries was not possible. UFW and iptables were present locally, but UFW dry-run commands require root; command forms were verified against Ubuntu documentation and local `iptables` help output.
