# Validation Summary: How to Fix Port Conflicts When Installing Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Portainer Agent
- Docker
- Docker Compose
- Linux networking tools (`ss`, `lsof`, `fuser`)
- Nginx

## Sources Consulted
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer FAQ on changing the Portainer port: https://docs.portainer.io/faqs/installing/how-do-i-change-the-port-that-portainer-runs-on
- Portainer Agent install docs for Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer reverse proxy overview: https://docs.portainer.io/advanced/reverse-proxy
- Portainer nginx reverse proxy docs: https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Docker port publishing docs: https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Docker `docker container ls` reference: https://docs.docker.com/reference/cli/docker/container/ls/
- NGINX HTTPS server configuration docs: https://nginx.org/en/docs/http/configuring_https_servers.html
- NGINX proxy module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Local CLI help for `ss`
- Local CLI usage output for `fuser`

## Issues Found
- The post said Portainer uses `9000` and `9443` by default. Current Portainer docs state the default UI port is `9443`, while `9000` is a legacy HTTP port that can be published if needed. I corrected the introduction and description to reflect that.
- The example remapped Portainer HTTP to host port `9001`, which conflicts with the Portainer Agent's default port. I changed the legacy HTTP example to use host port `9010` instead and updated the related `docker run` and Compose snippets.
- The Docker container detection command used `docker ps | grep "9000"`, which is less precise than Docker's documented publish filter. I changed it to `docker ps --filter "publish=9000"` and updated the stop command accordingly.
- The validation step tested `http://localhost:9001`, but the supported default UI access path is HTTPS on the remapped `9443` listener. I changed the check to `curl -vk https://localhost:9444`.
- The Nginx reverse-proxy sample enabled `listen 443 ssl;` without defining `ssl_certificate` and `ssl_certificate_key`, which would make the configuration incomplete for HTTPS. I added the required certificate directives and adjusted the explanatory text so it no longer overstates that the pattern avoids all port conflicts.
- The ad-hoc process kill example used `kill -9 $(sudo fuser 9000/tcp)`. I replaced it with `sudo fuser -k 9000/tcp`, which matches the tool's documented kill mode more directly.

## Review Notes
- Portainer's current Docker install documentation also publishes port `8000` for the optional Edge tunnel service. This post focuses on `9443` and legacy `9000`, which is acceptable for its scope, but readers using Edge features may also need to account for `8000`.
